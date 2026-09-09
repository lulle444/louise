-- SIGNAL ARENA — initial schema
-- Run with: supabase db push   (or paste into the Supabase SQL editor)
--
-- Design notes
--  * All timestamps are timestamptz stored in UTC.
--  * Prices use NUMERIC to avoid floating-point drift.
--  * Catalogue tables (assets, signals, ai_profiles, badges) use stable text ids
--    so the application can reference them identically in Demo Mode and production.
--  * Row Level Security is enabled on every table. Writes that affect scoring
--    (battles, ai_predictions, xp_ledger, user_badges, settlement_runs) are only
--    possible with the service role, which the app uses server-side.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.direction as enum ('bullish', 'neutral', 'bearish');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.battle_status as enum ('draft', 'upcoming', 'open', 'locked', 'settling', 'settled', 'void', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.prediction_result as enum ('pending', 'correct', 'incorrect', 'void');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.xp_reason as enum ('lock', 'correct', 'streak_3', 'streak_5', 'seven_battles');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null check (char_length(display_name) between 1 and 40),
  avatar_url text,
  bio text check (bio is null or char_length(bio) <= 160),
  xp integer not null default 0 check (xp >= 0),
  current_streak integer not null default 0 check (current_streak >= 0),
  longest_streak integer not null default 0 check (longest_streak >= 0),
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists profiles_username_idx on public.profiles (lower(username));

-- Create a profile row automatically for every new auth user.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  base text;
  candidate text;
  n int := 0;
begin
  base := lower(coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)));
  base := regexp_replace(base, '[^a-z0-9_]', '', 'g');
  if char_length(base) < 3 then base := 'analyst' || substr(replace(new.id::text, '-', ''), 1, 6); end if;
  base := substr(base, 1, 20);
  candidate := base;
  while exists (select 1 from public.profiles where username = candidate) loop
    n := n + 1;
    candidate := substr(base, 1, 20 - char_length(n::text)) || n::text;
  end loop;
  insert into public.profiles (id, username, display_name)
  values (new.id, candidate, coalesce(new.raw_user_meta_data ->> 'display_name', candidate));
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Users may only edit cosmetic columns on their own profile.
create or replace function public.guard_profile_update()
returns trigger language plpgsql as $$
begin
  if auth.role() is distinct from 'service_role' then
    if new.xp <> old.xp or new.current_streak <> old.current_streak
       or new.longest_streak <> old.longest_streak or new.is_admin <> old.is_admin
       or new.username <> old.username or new.id <> old.id then
      raise exception 'Only the service role may change scoring or identity fields';
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists profiles_guard_update on public.profiles;
create trigger profiles_guard_update
  before update on public.profiles
  for each row execute function public.guard_profile_update();

-- ---------------------------------------------------------------------------
-- Catalogue
-- ---------------------------------------------------------------------------
create table if not exists public.assets (
  id text primary key,
  symbol text not null unique,
  name text not null,
  provider_id text not null,
  logo_url text,
  price_decimals smallint not null default 2,
  active boolean not null default true
);

create table if not exists public.signals (
  id text primary key,
  slug text not null unique,
  name text not null,
  description text not null,
  icon text not null,
  accent_color text not null,
  active boolean not null default true
);

create table if not exists public.ai_profiles (
  id text primary key,
  slug text not null unique,
  name text not null,
  tagline text not null default '',
  description text not null,
  strategy_type text not null,
  strategy_version text not null,
  accent_color text not null,
  prefers text[] not null default '{}',
  active boolean not null default true
);

create table if not exists public.badges (
  id text primary key,
  slug text not null unique,
  name text not null,
  description text not null,
  icon text not null
);

create table if not exists public.levels (
  level smallint primary key,
  name text not null,
  min_xp integer not null
);

-- ---------------------------------------------------------------------------
-- Battles
-- ---------------------------------------------------------------------------
create table if not exists public.battles (
  id uuid primary key default gen_random_uuid(),
  asset_id text not null references public.assets (id),
  title text not null,
  slug text not null unique,
  battle_type text not null default 'daily',
  status public.battle_status not null default 'draft',
  opens_at timestamptz not null,
  locks_at timestamptz not null,
  ends_at timestamptz not null,
  neutral_threshold_percent numeric(6,3) not null default 0.500 check (neutral_threshold_percent >= 0),
  start_price numeric(18,8) check (start_price is null or start_price > 0),
  start_price_at timestamptz,
  end_price numeric(18,8) check (end_price is null or end_price > 0),
  end_price_at timestamptz,
  outcome public.direction,
  settlement_source text,
  settlement_error text,
  ai_profile_ids text[] not null default '{}',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint battles_window check (locks_at > opens_at and ends_at >= locks_at)
);
create index if not exists battles_status_idx on public.battles (status, ends_at desc);

-- Is the Battle accepting predictions right now?
create or replace function public.battle_is_open(b public.battles)
returns boolean language sql stable as $$
  select b.status in ('upcoming', 'open', 'locked')
     and now() >= b.opens_at and now() < b.locks_at;
$$;

-- ---------------------------------------------------------------------------
-- Predictions
-- ---------------------------------------------------------------------------
create table if not exists public.predictions (
  id uuid primary key default gen_random_uuid(),
  battle_id uuid not null references public.battles (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  direction public.direction not null,
  confidence smallint not null check (confidence between 1 and 5),
  thesis text check (thesis is null or char_length(thesis) <= 240),
  reference_price numeric(18,8) check (reference_price is null or reference_price > 0),
  locked_at timestamptz not null default now(),
  result public.prediction_result not null default 'pending',
  battle_score smallint,
  xp_awarded integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (battle_id, user_id)
);
create index if not exists predictions_user_idx on public.predictions (user_id);
create index if not exists predictions_battle_idx on public.predictions (battle_id);

create table if not exists public.prediction_signals (
  prediction_id uuid not null references public.predictions (id) on delete cascade,
  signal_id text not null references public.signals (id),
  primary key (prediction_id, signal_id)
);

-- Exactly three signals per prediction, checked at commit time.
create or replace function public.check_prediction_signal_count()
returns trigger language plpgsql as $$
declare
  pid uuid;
  cnt int;
begin
  pid := coalesce(new.prediction_id, old.prediction_id);
  if tg_table_name = 'predictions' then pid := new.id; end if;
  select count(*) into cnt from public.prediction_signals where prediction_id = pid;
  if cnt <> 3 then
    raise exception 'A prediction must reference exactly three signals (found %)', cnt;
  end if;
  return null;
end $$;

drop trigger if exists prediction_signals_count on public.prediction_signals;
create constraint trigger prediction_signals_count
  after insert or delete on public.prediction_signals
  deferrable initially deferred
  for each row execute function public.check_prediction_signal_count();

drop trigger if exists predictions_signal_count on public.predictions;
create constraint trigger predictions_signal_count
  after insert on public.predictions
  deferrable initially deferred
  for each row execute function public.check_prediction_signal_count();

-- Locked predictions are immutable for users: only results may change, and only via the service role.
create or replace function public.guard_prediction_update()
returns trigger language plpgsql as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Locked predictions cannot be edited';
  end if;
  if new.direction <> old.direction or new.confidence <> old.confidence
     or new.thesis is distinct from old.thesis or new.locked_at <> old.locked_at
     or new.battle_id <> old.battle_id or new.user_id <> old.user_id then
    raise exception 'Forecast fields are immutable after lock';
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists predictions_guard_update on public.predictions;
create trigger predictions_guard_update
  before update on public.predictions
  for each row execute function public.guard_prediction_update();

-- ---------------------------------------------------------------------------
-- AI predictions
-- ---------------------------------------------------------------------------
create table if not exists public.ai_predictions (
  id uuid primary key default gen_random_uuid(),
  battle_id uuid not null references public.battles (id) on delete cascade,
  ai_profile_id text not null references public.ai_profiles (id),
  direction public.direction not null,
  signal_ids text[] not null check (array_length(signal_ids, 1) = 3),
  confidence smallint not null check (confidence between 1 and 5),
  thesis text,
  reference_price numeric(18,8),
  generated_at timestamptz not null default now(),
  locked_at timestamptz not null default now(),
  strategy_version text not null,
  input_snapshot jsonb not null default '{}'::jsonb,
  result public.prediction_result not null default 'pending',
  battle_score smallint,
  unique (battle_id, ai_profile_id)
);

-- AI forecasts must be locked before the Battle locks; never backfilled.
create or replace function public.guard_ai_prediction_insert()
returns trigger language plpgsql as $$
declare
  b public.battles;
begin
  select * into b from public.battles where id = new.battle_id;
  if new.locked_at >= b.locks_at then
    raise exception 'AI forecasts must be locked before the Battle locks';
  end if;
  return new;
end $$;

drop trigger if exists ai_predictions_guard_insert on public.ai_predictions;
create trigger ai_predictions_guard_insert
  before insert on public.ai_predictions
  for each row execute function public.guard_ai_prediction_insert();

-- ---------------------------------------------------------------------------
-- Badges, XP ledger, operations
-- ---------------------------------------------------------------------------
create table if not exists public.user_badges (
  user_id uuid not null references public.profiles (id) on delete cascade,
  badge_id text not null references public.badges (id),
  awarded_at timestamptz not null default now(),
  source_battle_id uuid references public.battles (id) on delete set null,
  primary key (user_id, badge_id)
);

create table if not exists public.xp_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  battle_id uuid references public.battles (id) on delete cascade,
  reason public.xp_reason not null,
  amount integer not null,
  created_at timestamptz not null default now()
);
-- Idempotency: one award per (user, battle, reason). NULL battle ids use a sentinel index.
create unique index if not exists xp_ledger_unique_award on public.xp_ledger (user_id, coalesce(battle_id, '00000000-0000-0000-0000-000000000000'::uuid), reason);

create table if not exists public.settlement_runs (
  id uuid primary key default gen_random_uuid(),
  battle_id uuid not null references public.battles (id) on delete cascade,
  status text not null check (status in ('running', 'succeeded', 'failed', 'skipped')),
  source text not null,
  triggered_by uuid,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  end_price numeric(18,8),
  error text
);

create table if not exists public.price_snapshots (
  id uuid primary key default gen_random_uuid(),
  asset_id text not null references public.assets (id),
  battle_id uuid references public.battles (id) on delete cascade,
  price numeric(18,8) not null check (price > 0),
  captured_at timestamptz not null,
  source text not null,
  kind text not null check (kind in ('start', 'end', 'reference', 'manual')),
  created_at timestamptz not null default now()
);

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  action text not null,
  target_type text not null,
  target_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Lock a prediction atomically (used by the app with the user's session).
-- ---------------------------------------------------------------------------
create or replace function public.lock_prediction(
  p_battle_id uuid,
  p_direction public.direction,
  p_signal_ids text[],
  p_confidence smallint,
  p_thesis text,
  p_reference_price numeric
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  b public.battles;
  pid uuid;
  sid text;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  select * into b from public.battles where id = p_battle_id for update;
  if b.id is null then raise exception 'Battle not found'; end if;
  if not public.battle_is_open(b) then raise exception 'This Battle is not accepting predictions'; end if;
  if p_signal_ids is null or array_length(p_signal_ids, 1) <> 3 then raise exception 'Select exactly three signals'; end if;
  if (select count(distinct s) from unnest(p_signal_ids) s) <> 3 then raise exception 'Signals must be unique'; end if;
  if (select count(*) from public.signals where id = any(p_signal_ids) and active) <> 3 then raise exception 'Unknown or inactive signal'; end if;
  if p_confidence < 1 or p_confidence > 5 then raise exception 'Confidence must be between 1 and 5'; end if;
  if p_thesis is not null and char_length(p_thesis) > 240 then raise exception 'Thesis too long'; end if;

  insert into public.predictions (battle_id, user_id, direction, confidence, thesis, reference_price, locked_at, xp_awarded)
  values (p_battle_id, uid, p_direction, p_confidence, nullif(btrim(p_thesis), ''), p_reference_price, now(), 10)
  returning id into pid;

  foreach sid in array p_signal_ids loop
    insert into public.prediction_signals (prediction_id, signal_id) values (pid, sid);
  end loop;

  insert into public.xp_ledger (user_id, battle_id, reason, amount) values (uid, p_battle_id, 'lock', 10)
  on conflict do nothing;
  update public.profiles set xp = xp + 10 where id = uid;
  insert into public.user_badges (user_id, badge_id, source_battle_id) values (uid, 'badge-first-signal', p_battle_id)
  on conflict do nothing;
  return pid;
end $$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.assets enable row level security;
alter table public.signals enable row level security;
alter table public.ai_profiles enable row level security;
alter table public.badges enable row level security;
alter table public.levels enable row level security;
alter table public.battles enable row level security;
alter table public.predictions enable row level security;
alter table public.prediction_signals enable row level security;
alter table public.ai_predictions enable row level security;
alter table public.user_badges enable row level security;
alter table public.xp_ledger enable row level security;
alter table public.settlement_runs enable row level security;
alter table public.price_snapshots enable row level security;
alter table public.admin_audit_log enable row level security;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- Has the current user locked a prediction in this Battle?
create or replace function public.viewer_has_locked(p_battle_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.predictions where battle_id = p_battle_id and user_id = auth.uid());
$$;

-- Crowd/AI positions are revealed once the viewer has locked or the Battle is no longer open.
create or replace function public.can_view_battle_positions(p_battle_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.battles b
    where b.id = p_battle_id
      and (not public.battle_is_open(b) or public.viewer_has_locked(p_battle_id) or public.is_admin())
  );
$$;

-- Catalogue: public read
drop policy if exists "assets public read" on public.assets;
create policy "assets public read" on public.assets for select using (true);
drop policy if exists "signals public read" on public.signals;
create policy "signals public read" on public.signals for select using (true);
drop policy if exists "ai_profiles public read" on public.ai_profiles;
create policy "ai_profiles public read" on public.ai_profiles for select using (true);
drop policy if exists "badges public read" on public.badges;
create policy "badges public read" on public.badges for select using (true);
drop policy if exists "levels public read" on public.levels;
create policy "levels public read" on public.levels for select using (true);

-- Profiles: public read; users update their own (guarded by trigger)
drop policy if exists "profiles public read" on public.profiles;
create policy "profiles public read" on public.profiles for select using (true);
drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- Battles: published Battles are public; admins see drafts
drop policy if exists "battles public read" on public.battles;
create policy "battles public read" on public.battles for select
  using (status not in ('draft', 'archived') or public.is_admin());

-- Predictions: own rows always; others' rows once positions may be viewed
drop policy if exists "predictions read" on public.predictions;
create policy "predictions read" on public.predictions for select
  using (user_id = auth.uid() or public.can_view_battle_positions(battle_id));
drop policy if exists "predictions insert own while open" on public.predictions;
create policy "predictions insert own while open" on public.predictions for insert
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.battles b where b.id = battle_id and public.battle_is_open(b))
  );
-- No update/delete policies for users: locked predictions are immutable.

drop policy if exists "prediction_signals read" on public.prediction_signals;
create policy "prediction_signals read" on public.prediction_signals for select
  using (exists (select 1 from public.predictions p where p.id = prediction_id
                 and (p.user_id = auth.uid() or public.can_view_battle_positions(p.battle_id))));
drop policy if exists "prediction_signals insert own" on public.prediction_signals;
create policy "prediction_signals insert own" on public.prediction_signals for insert
  with check (exists (select 1 from public.predictions p where p.id = prediction_id and p.user_id = auth.uid()));

-- AI predictions: revealed under the same gating as the crowd
drop policy if exists "ai_predictions read" on public.ai_predictions;
create policy "ai_predictions read" on public.ai_predictions for select
  using (public.can_view_battle_positions(battle_id));

-- Badges: public
drop policy if exists "user_badges public read" on public.user_badges;
create policy "user_badges public read" on public.user_badges for select using (true);

-- XP ledger: own rows (and admins)
drop policy if exists "xp_ledger read own" on public.xp_ledger;
create policy "xp_ledger read own" on public.xp_ledger for select using (user_id = auth.uid() or public.is_admin());

-- Operational tables: admin read only; writes via service role
drop policy if exists "settlement_runs admin read" on public.settlement_runs;
create policy "settlement_runs admin read" on public.settlement_runs for select using (public.is_admin());
drop policy if exists "price_snapshots admin read" on public.price_snapshots;
create policy "price_snapshots admin read" on public.price_snapshots for select using (public.is_admin());
drop policy if exists "audit admin read" on public.admin_audit_log;
create policy "audit admin read" on public.admin_audit_log for select using (public.is_admin());

grant execute on function public.lock_prediction(uuid, public.direction, text[], smallint, text, numeric) to authenticated;
