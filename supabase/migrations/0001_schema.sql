-- MEGASPRINT schema. Virtual points only: no balances, deposits, or payouts exist anywhere in this schema.
create extension if not exists "pgcrypto";

-- ---------- enums ----------
create type race_status as enum ('draft', 'published', 'live', 'settled', 'void', 'archived');
create type pick_role as enum ('leader', 'challenger', 'wildcard');
create type lineup_kind as enum ('human', 'ai');
create type lineup_status as enum ('locked', 'settled', 'void');
create type snapshot_kind as enum ('reference', 'prelock', 'interval', 'final');
create type data_quality as enum ('ok', 'unavailable');

-- ---------- profiles ----------
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9._-]{3,32}$'),
  display_name text not null check (char_length(display_name) between 1 and 48),
  avatar_seed text not null default '',
  bio text check (bio is null or char_length(bio) <= 240),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- narratives & constituents ----------
create table narratives (
  id text primary key,
  slug text not null unique,
  name text not null,
  short_name text not null,
  description text not null default '',
  icon text not null default 'Sparkles',
  accent_color text not null default '#B6F36B',
  active boolean not null default true,
  current_constituent_version_id text,
  created_at timestamptz not null default now()
);

create table assets (
  id text primary key,
  symbol text not null unique,
  name text not null
);

create table narrative_constituent_versions (
  id text primary key default ('ncv_' || replace(gen_random_uuid()::text, '-', '')),
  narrative_id text not null references narratives (id) on delete cascade,
  version integer not null,
  note text,
  created_at timestamptz not null default now(),
  unique (narrative_id, version)
);

create table narrative_constituents (
  version_id text not null references narrative_constituent_versions (id) on delete cascade,
  asset_id text not null references assets (id),
  weight numeric(8, 6) not null check (weight > 0 and weight <= 1),
  primary key (version_id, asset_id)
);

alter table narratives
  add constraint narratives_current_version_fk
  foreign key (current_constituent_version_id) references narrative_constituent_versions (id);

-- ---------- races ----------
create table races (
  id text primary key default ('race_' || replace(gen_random_uuid()::text, '-', '')),
  number integer not null unique,
  name text not null,
  status race_status not null default 'draft',
  published_at timestamptz,
  locks_at timestamptz not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  settled_at timestamptz,
  void_reason text,
  formula_version text not null default 'rs-v1',
  featured boolean not null default false,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  check (locks_at <= starts_at and starts_at < ends_at)
);
create index races_status_idx on races (status);

-- Constituents may not change while a Race is live.
create or replace function guard_constituents_during_live_race() returns trigger
language plpgsql as $$
begin
  if exists (select 1 from races where status = 'live') then
    raise exception 'Constituents cannot change while a Race is live';
  end if;
  return new;
end $$;
create trigger narrative_constituents_live_guard
  before insert or update or delete on narrative_constituents
  for each row execute function guard_constituents_during_live_race();

-- ---------- snapshots ----------
create table narrative_snapshots (
  id text primary key default ('snp_' || replace(gen_random_uuid()::text, '-', '')),
  race_id text not null references races (id) on delete cascade,
  narrative_id text not null references narratives (id),
  kind snapshot_kind not null,
  taken_at timestamptz not null,
  raw jsonb not null,
  normalized jsonb not null,
  score numeric(6, 2) not null check (score >= 0 and score <= 100),
  rank integer not null check (rank >= 1),
  source text not null,
  constituent_version_id text not null references narrative_constituent_versions (id),
  formula_version text not null,
  quality data_quality not null default 'ok',
  created_at timestamptz not null default now(),
  unique (race_id, narrative_id, kind, taken_at)
);
create index narrative_snapshots_race_idx on narrative_snapshots (race_id, taken_at);

-- ---------- AI ----------
create table ai_profiles (
  id text primary key,
  code text not null unique,
  name text not null,
  tagline text not null,
  description text not null,
  strategy_version text not null,
  accent_color text not null
);

-- ---------- lineups ----------
create table lineups (
  id text primary key default ('lnp_' || replace(gen_random_uuid()::text, '-', '')),
  race_id text not null references races (id) on delete cascade,
  kind lineup_kind not null default 'human',
  user_id uuid references profiles (id) on delete cascade,
  ai_profile_id text references ai_profiles (id),
  thesis text check (thesis is null or char_length(thesis) <= 240),
  created_at timestamptz not null default now(),
  locked_at timestamptz not null default now(),
  status lineup_status not null default 'locked',
  strategy_version text,
  input_snapshot_id text references narrative_snapshots (id),
  check ((kind = 'human' and user_id is not null and ai_profile_id is null) or (kind = 'ai' and ai_profile_id is not null and user_id is null)),
  unique (race_id, user_id),
  unique (race_id, ai_profile_id)
);
create index lineups_user_idx on lineups (user_id);

create table lineup_picks (
  lineup_id text not null references lineups (id) on delete cascade,
  role pick_role not null,
  narrative_id text not null references narratives (id),
  energy integer not null check (energy >= 0 and energy <= 100),
  primary key (lineup_id, role),
  unique (lineup_id, narrative_id)
);

-- Lineups are immutable once locked. Only the status column may change (settlement / void), and only by the service role.
create or replace function lineups_immutable() returns trigger
language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Locked lineups cannot be deleted';
  end if;
  if new.race_id <> old.race_id or new.user_id is distinct from old.user_id or new.ai_profile_id is distinct from old.ai_profile_id
     or new.thesis is distinct from old.thesis or new.locked_at <> old.locked_at or new.kind <> old.kind then
    raise exception 'Locked lineups are immutable';
  end if;
  return new;
end $$;
create trigger lineups_immutable_trigger before update or delete on lineups
  for each row execute function lineups_immutable();

create or replace function lineup_picks_immutable() returns trigger
language plpgsql as $$
begin
  raise exception 'Lineup picks are immutable after lock';
end $$;
create trigger lineup_picks_immutable_trigger before update or delete on lineup_picks
  for each row execute function lineup_picks_immutable();

-- Energy must total exactly 100 across the three picks (deferred so the three rows insert together).
create or replace function check_lineup_energy() returns trigger
language plpgsql as $$
declare
  total integer;
  n integer;
begin
  select coalesce(sum(energy), 0), count(*) into total, n from lineup_picks where lineup_id = new.lineup_id;
  if n <> 3 or total <> 100 then
    raise exception 'A lineup needs exactly three picks whose Energy totals 100 (got % picks, % Energy)', n, total;
  end if;
  return new;
end $$;
create constraint trigger lineup_energy_total
  after insert on lineup_picks deferrable initially deferred
  for each row execute function check_lineup_energy();

-- ---------- results / rewards ----------
create table race_results (
  id text primary key default ('res_' || replace(gen_random_uuid()::text, '-', '')),
  race_id text not null references races (id) on delete cascade,
  lineup_id text not null unique references lineups (id) on delete cascade,
  user_id uuid references profiles (id) on delete cascade,
  ai_profile_id text references ai_profiles (id),
  race_score numeric(7, 2) not null,
  leader_points numeric(7, 2) not null,
  challenger_points numeric(7, 2) not null,
  wildcard_points numeric(7, 2) not null,
  leader_finish integer not null,
  challenger_finish integer not null,
  wildcard_finish integer not null,
  wildcard_start integer not null,
  leader_hit boolean not null,
  challenger_hit boolean not null,
  wildcard_hit boolean not null,
  best_role pick_role,
  xp_awarded integer not null default 0,
  rank integer not null,
  settled_at timestamptz not null default now(),
  formula_version text not null
);
create index race_results_user_idx on race_results (user_id);

create table xp_ledger (
  id text primary key default ('xp_' || replace(gen_random_uuid()::text, '-', '')),
  user_id uuid not null references profiles (id) on delete cascade,
  race_id text references races (id) on delete set null,
  reason text not null,
  amount integer not null check (amount > 0),
  created_at timestamptz not null default now(),
  idempotency_key text not null unique
);

create table badges (
  code text primary key,
  name text not null,
  description text not null,
  icon text not null
);

create table user_badges (
  user_id uuid not null references profiles (id) on delete cascade,
  badge_code text not null references badges (code),
  awarded_at timestamptz not null default now(),
  race_id text references races (id) on delete set null,
  primary key (user_id, badge_code)
);

create table admin_audit_log (
  id text primary key default ('aud_' || replace(gen_random_uuid()::text, '-', '')),
  actor_id text not null,
  actor_label text not null,
  action text not null,
  target_type text not null,
  target_id text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------- profile auto-create ----------
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, username, display_name, avatar_seed)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', 'player-' || substr(replace(new.id::text, '-', ''), 1, 8)),
    coalesce(new.raw_user_meta_data ->> 'display_name', 'New Forecaster'),
    new.id::text
  )
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- ---------- lock_lineup RPC ----------
-- Atomically creates a lineup + three picks for the calling user, re-checking every rule server-side.
create or replace function lock_lineup(p_race_id text, p_thesis text, p_picks jsonb)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_race races%rowtype;
  v_lineup_id text;
  v_pick jsonb;
  v_total integer := 0;
  v_count integer := 0;
begin
  if v_user is null then raise exception 'Sign in to lock a lineup'; end if;
  select * into v_race from races where id = p_race_id;
  if not found then raise exception 'Race not found'; end if;
  if v_race.status <> 'published' then raise exception 'This Race is not accepting lineups'; end if;
  if now() >= v_race.locks_at then raise exception 'The lock deadline has passed'; end if;
  if exists (select 1 from lineups where race_id = p_race_id and user_id = v_user) then
    raise exception 'You already locked a lineup for this Race';
  end if;
  if jsonb_array_length(p_picks) <> 3 then raise exception 'A lineup needs exactly three picks'; end if;
  if p_thesis is not null and char_length(p_thesis) > 240 then raise exception 'Thesis is limited to 240 characters'; end if;

  insert into lineups (race_id, kind, user_id, thesis, created_at, locked_at)
  values (p_race_id, 'human', v_user, nullif(trim(p_thesis), ''), now(), now())
  returning id into v_lineup_id;

  for v_pick in select * from jsonb_array_elements(p_picks) loop
    if (v_pick ->> 'energy')::integer < 0 then raise exception 'Energy values must be non-negative'; end if;
    if not exists (select 1 from narratives where id = v_pick ->> 'narrative_id' and active) then
      raise exception 'Unknown narrative';
    end if;
    insert into lineup_picks (lineup_id, role, narrative_id, energy)
    values (v_lineup_id, (v_pick ->> 'role')::pick_role, v_pick ->> 'narrative_id', (v_pick ->> 'energy')::integer);
    v_total := v_total + (v_pick ->> 'energy')::integer;
    v_count := v_count + 1;
  end loop;
  if v_count <> 3 or v_total <> 100 then raise exception 'Energy must total exactly 100'; end if;

  insert into xp_ledger (user_id, race_id, reason, amount, idempotency_key)
  values (v_user, p_race_id, 'lineup_locked', 10, v_user::text || ':' || p_race_id || ':lineup_locked')
  on conflict (idempotency_key) do nothing;

  return v_lineup_id;
end $$;
