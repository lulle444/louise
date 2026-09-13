-- SHIPTRACE database setup v4: paste this whole file into the Supabase SQL editor and run it once.
-- Generated from supabase/migrations/0001_init.sql and 0002_rls.sql

-- SHIPTRACE initial schema
-- Text primary keys are used so Demo Mode identifiers and production identifiers share one shape.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- helpers
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9-]{3,32}$'),
  display_name text not null,
  role text not null default 'user' check (role in ('user', 'moderator', 'admin')),
  bio text,
  watchlist_public boolean not null default false,
  accepted_evidence_count integer not null default 0,
  helpful_corrections_count integer not null default 0,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

-- Role helpers (depend on profiles)
create or replace function public.current_role_name()
returns text language plpgsql stable security definer set search_path = public as $$
begin
  return coalesce((select role from public.profiles where id = auth.uid()), 'guest');
end;
$$;

create or replace function public.is_moderator()
returns boolean language plpgsql stable security definer set search_path = public as $$
begin
  return public.current_role_name() in ('moderator', 'admin');
end;
$$;

create or replace function public.is_admin()
returns boolean language plpgsql stable security definer set search_path = public as $$
begin
  return public.current_role_name() = 'admin';
end;
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    lower(regexp_replace(coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)), '[^a-zA-Z0-9-]', '-', 'g')) || '-' || substr(new.id::text, 1, 4),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------- projects
create table public.project_categories (
  slug text primary key,
  name text not null,
  description text
);

create table public.projects (
  id text primary key default gen_random_uuid()::text,
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  name text not null,
  description text not null,
  category text not null references public.project_categories(slug),
  ecosystem text not null,
  official_url text not null,
  status text not null default 'draft' check (status in ('published', 'draft', 'archived')),
  data_completeness numeric(4,2) not null default 0,
  last_verified_at timestamptz,
  is_demo boolean not null default false,
  transparency jsonb not null default '{"datedRoadmapUpdates":0,"explanationRate":0,"hasPublicDocs":false,"changeDisclosureRate":0}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger projects_updated_at before update on public.projects for each row execute procedure public.set_updated_at();

create table public.project_links (
  id text primary key default gen_random_uuid()::text,
  project_id text not null references public.projects(id) on delete cascade,
  label text not null,
  url text not null,
  kind text not null check (kind in ('website', 'docs', 'repository', 'social', 'app', 'other'))
);
create index on public.project_links(project_id);

-- ---------------------------------------------------------------- milestones
create table public.milestones (
  id text primary key default gen_random_uuid()::text,
  project_id text not null references public.projects(id) on delete cascade,
  title text not null,
  commitment_paraphrase text not null,
  source_url text not null,
  source_accessed_at timestamptz not null default now(),
  claim_date date not null,
  deadline date not null,
  original_deadline date not null,
  importance text not null check (importance in ('core', 'major', 'minor')),
  status text not null default 'planned' check (status in ('planned','in_progress','submitted_for_review','shipped','partially_shipped','delayed','no_evidence','cancelled','disputed')),
  moderator_approved boolean not null default false,
  moderator_note text,
  delivered_at timestamptz,
  has_updated_explanation boolean not null default false,
  audit_id text not null default upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 8)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.milestones(project_id);
create index on public.milestones(deadline);
create index on public.milestones(status);
create trigger milestones_updated_at before update on public.milestones for each row execute procedure public.set_updated_at();

create table public.milestone_status_events (
  id text primary key default gen_random_uuid()::text,
  milestone_id text not null references public.milestones(id) on delete cascade,
  project_id text not null references public.projects(id) on delete cascade,
  actor_id text not null,
  actor_name text not null,
  actor_kind text not null check (actor_kind in ('project', 'community', 'automated', 'moderator')),
  prior_status text,
  new_status text not null,
  reason text not null check (length(reason) >= 10),
  evidence_ids text[] not null default '{}',
  audit_id text not null default upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 8)),
  created_at timestamptz not null default now()
);
create index on public.milestone_status_events(milestone_id);

-- Status events are immutable: no updates or deletes, even by moderators.
create or replace function public.prevent_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'This record is part of the audit history and cannot be modified.';
end;
$$;
create trigger status_events_immutable before update or delete on public.milestone_status_events for each row execute procedure public.prevent_mutation();

-- ---------------------------------------------------------------- evidence
create table public.evidence (
  id text primary key default gen_random_uuid()::text,
  project_id text not null references public.projects(id) on delete cascade,
  milestone_id text references public.milestones(id) on delete set null,
  url text not null check (url ~* '^https?://'),
  type text not null check (type in ('product_release','repository_release','official_announcement','independent_reporting','community_observation')),
  title text not null,
  summary text not null,
  published_at date,
  accessed_at timestamptz not null default now(),
  submitter_id text not null,
  submitter_name text not null,
  submitter_kind text not null check (submitter_kind in ('project', 'community', 'automated', 'moderator')),
  review_state text not null default 'pending' check (review_state in ('pending', 'accepted', 'rejected', 'needs_clarification')),
  review_reason text,
  reviewed_by_id text,
  reviewed_at timestamptz,
  support_count integer not null default 0,
  challenge_count integer not null default 0,
  conflict_of_interest text,
  audit_id text not null default upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 8)),
  created_at timestamptz not null default now()
);
create index on public.evidence(project_id);
create index on public.evidence(milestone_id);
create index on public.evidence(review_state);

create table public.evidence_sources (
  id text primary key default gen_random_uuid()::text,
  evidence_id text not null references public.evidence(id) on delete cascade,
  url text not null check (url ~* '^https?://'),
  kind text not null check (kind in ('primary', 'archive', 'supplementary')),
  accessed_at timestamptz not null default now()
);

create table public.evidence_reviews (
  id text primary key default gen_random_uuid()::text,
  evidence_id text not null references public.evidence(id) on delete cascade,
  reviewer_id text not null,
  reviewer_name text not null,
  decision text not null check (decision in ('accepted', 'rejected', 'needs_clarification')),
  reason text not null check (length(reason) >= 10),
  created_at timestamptz not null default now()
);
create trigger evidence_reviews_immutable before update or delete on public.evidence_reviews for each row execute procedure public.prevent_mutation();

create table public.evidence_votes (
  evidence_id text not null references public.evidence(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  vote text not null check (vote in ('support', 'challenge')),
  created_at timestamptz not null default now(),
  primary key (evidence_id, user_id)
);

-- ---------------------------------------------------------------- disputes
create table public.disputes (
  id text primary key default gen_random_uuid()::text,
  project_id text not null references public.projects(id) on delete cascade,
  milestone_id text references public.milestones(id) on delete set null,
  evidence_id text references public.evidence(id) on delete set null,
  kind text not null check (kind in ('correction', 'dispute')),
  submitter_id text not null,
  submitter_name text not null,
  submitter_kind text not null check (submitter_kind in ('project', 'community', 'automated', 'moderator')),
  claim text not null check (length(claim) >= 30),
  source_url text check (source_url is null or source_url ~* '^https?://'),
  state text not null default 'open' check (state in ('open', 'under_review', 'resolved', 'rejected')),
  resolution text,
  resolved_by_id text,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.disputes(project_id);
create index on public.disputes(state);

-- ---------------------------------------------------------------- integrations
create table public.github_repositories (
  id text primary key default gen_random_uuid()::text,
  project_id text not null references public.projects(id) on delete cascade,
  owner text not null,
  repo text not null,
  url text not null,
  is_primary boolean not null default true,
  unique (owner, repo)
);

create table public.github_snapshots (
  id text primary key default gen_random_uuid()::text,
  repository_id text not null references public.github_repositories(id) on delete cascade,
  project_id text not null references public.projects(id) on delete cascade,
  default_branch text,
  stars integer,
  open_issues integer,
  latest_release_tag text,
  latest_release_at timestamptz,
  releases_last_90d integer not null default 0,
  tags_last_90d integer not null default 0,
  active_weeks_last_12 integer not null default 0,
  last_push_at timestamptz,
  source text not null check (source in ('github_api', 'demo')),
  retrieved_at timestamptz not null default now(),
  retrieved_day date not null,
  unique (repository_id, retrieved_day)
);
create index on public.github_snapshots(project_id, retrieved_at desc);

create or replace function public.set_github_snapshot_day()
returns trigger language plpgsql as $$
begin
  new.retrieved_day := (new.retrieved_at at time zone 'utc')::date;
  return new;
end;
$$;
create trigger github_snapshots_day before insert or update on public.github_snapshots
for each row execute procedure public.set_github_snapshot_day();

create table public.website_endpoints (
  id text primary key default gen_random_uuid()::text,
  project_id text not null references public.projects(id) on delete cascade,
  label text not null,
  url text not null check (url ~* '^https?://'),
  approved boolean not null default false
);

create table public.website_checks (
  id text primary key default gen_random_uuid()::text,
  endpoint_id text not null references public.website_endpoints(id) on delete cascade,
  project_id text not null references public.projects(id) on delete cascade,
  http_status integer,
  ok boolean not null,
  latency_ms integer,
  error text,
  checked_at timestamptz not null default now(),
  checked_bucket bigint not null,
  unique (endpoint_id, checked_bucket)
);
create index on public.website_checks(project_id, checked_at desc);

create or replace function public.set_website_check_bucket()
returns trigger language plpgsql as $$
begin
  new.checked_bucket := floor(extract(epoch from new.checked_at) / 600)::bigint;
  return new;
end;
$$;
create trigger website_checks_bucket before insert or update on public.website_checks
for each row execute procedure public.set_website_check_bucket();

-- ---------------------------------------------------------------- scores
create table public.ship_score_snapshots (
  id text primary key default gen_random_uuid()::text,
  project_id text not null references public.projects(id) on delete cascade,
  total integer check (total between 0 and 100),
  components jsonb not null,
  confidence numeric(4,2) not null,
  data_completeness numeric(4,2) not null,
  formula_version text not null,
  insufficient_data boolean not null default false,
  insufficient_reasons text[] not null default '{}',
  explanation text[] not null default '{}',
  calculated_at timestamptz not null default now()
);
create index on public.ship_score_snapshots(project_id, calculated_at desc);
-- Score history is append-only.
create trigger score_snapshots_immutable before update or delete on public.ship_score_snapshots for each row execute procedure public.prevent_mutation();

-- ---------------------------------------------------------------- feed
create table public.feed_events (
  id text primary key default gen_random_uuid()::text,
  type text not null check (type in ('shipped','partially_shipped','delayed','no_evidence','new_commitment','deadline_changed','evidence_added','dispute_resolved','cancelled')),
  project_id text not null references public.projects(id) on delete cascade,
  milestone_id text references public.milestones(id) on delete set null,
  evidence_id text references public.evidence(id) on delete set null,
  title text not null,
  summary text not null,
  source_url text not null,
  occurred_at timestamptz not null default now(),
  verified boolean not null default true
);
create index on public.feed_events(occurred_at desc);

-- ---------------------------------------------------------------- watchlists
create table public.watchlists (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Following',
  is_public boolean not null default false,
  unique (user_id, name)
);

create table public.watchlist_items (
  id text primary key default gen_random_uuid()::text,
  watchlist_id text not null references public.watchlists(id) on delete cascade,
  project_id text not null references public.projects(id) on delete cascade,
  added_at timestamptz not null default now(),
  unique (watchlist_id, project_id)
);

-- ---------------------------------------------------------------- badges
create table public.badges (
  id text primary key default gen_random_uuid()::text,
  slug text not null unique,
  name text not null,
  description text not null
);

create table public.user_badges (
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_id text not null references public.badges(id) on delete cascade,
  awarded_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

-- ---------------------------------------------------------------- suggestions & audit
create table public.project_suggestions (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  official_url text not null check (official_url ~* '^https?://'),
  category text not null,
  ecosystem text not null,
  description text not null,
  roadmap_url text not null check (roadmap_url ~* '^https?://'),
  submitter_id text not null,
  submitter_name text not null,
  state text not null default 'pending' check (state in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now()
);

create table public.admin_audit_log (
  id text primary key default gen_random_uuid()::text,
  actor_id text not null,
  actor_name text not null,
  action text not null,
  target_type text not null,
  target_id text not null,
  reason text not null,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);
create trigger audit_log_immutable before update or delete on public.admin_audit_log for each row execute procedure public.prevent_mutation();

-- ---------------------------------------------------------------- categories seed
insert into public.project_categories (slug, name) values
  ('L1', 'Layer 1'), ('L2', 'Layer 2'), ('DeFi', 'DeFi'), ('Infrastructure', 'Infrastructure'),
  ('Wallet', 'Wallet'), ('Gaming', 'Gaming'), ('Identity', 'Identity'), ('Data', 'Data'),
  ('Privacy', 'Privacy'), ('Social', 'Social')
on conflict do nothing;

insert into public.badges (id, slug, name, description) values
  ('badge_first-accepted', 'first-accepted', 'First accepted evidence', 'Submitted evidence that a moderator accepted.'),
  ('badge_primary-source', 'primary-source', 'Primary source finder', 'Submitted accepted primary evidence (product, repository, or official documentation).'),
  ('badge_helpful-correction', 'helpful-correction', 'Helpful correction', 'Filed a correction that led to a status update.'),
  ('badge_moderator', 'moderator', 'Moderator', 'Reviews evidence and records status conclusions with reasons.')
on conflict do nothing;

-- ---------------------------------------------------------------- contributor counters
create or replace function public.increment_accepted_evidence(p_user_id text)
returns void language sql security definer set search_path = public as $$
  update public.profiles set accepted_evidence_count = accepted_evidence_count + 1 where id::text = p_user_id;
$$;

-- Row Level Security policies.
-- Principles:
--   * Public reads only published projects and their accepted evidence, scores, and public profiles.
--   * Users submit evidence/disputes (pending) and manage their own watchlists.
--   * Only moderators/admins (or the service role) change verified status, review evidence, or write scores.
--   * Audit history and accepted evidence are never editable by ordinary users.

alter table public.profiles enable row level security;
alter table public.project_categories enable row level security;
alter table public.projects enable row level security;
alter table public.project_links enable row level security;
alter table public.milestones enable row level security;
alter table public.milestone_status_events enable row level security;
alter table public.evidence enable row level security;
alter table public.evidence_sources enable row level security;
alter table public.evidence_reviews enable row level security;
alter table public.evidence_votes enable row level security;
alter table public.disputes enable row level security;
alter table public.github_repositories enable row level security;
alter table public.github_snapshots enable row level security;
alter table public.website_endpoints enable row level security;
alter table public.website_checks enable row level security;
alter table public.ship_score_snapshots enable row level security;
alter table public.feed_events enable row level security;
alter table public.watchlists enable row level security;
alter table public.watchlist_items enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;
alter table public.project_suggestions enable row level security;
alter table public.admin_audit_log enable row level security;

-- profiles: public read (profiles are public contributor pages); users update their own non-role fields.
create policy "profiles_public_read" on public.profiles for select using (true);
create policy "profiles_self_update" on public.profiles for update using (auth.uid() = id)
  with check (auth.uid() = id and role = (select role from public.profiles p where p.id = auth.uid()));

create policy "categories_public_read" on public.project_categories for select using (true);

-- projects: public read of published; moderators see everything and can write.
create policy "projects_public_read" on public.projects for select using (status = 'published' or public.is_moderator());
create policy "projects_moderator_write" on public.projects for all using (public.is_moderator()) with check (public.is_moderator());

create policy "project_links_public_read" on public.project_links for select
  using (exists (select 1 from public.projects p where p.id = project_id and (p.status = 'published' or public.is_moderator())));
create policy "project_links_moderator_write" on public.project_links for all using (public.is_moderator()) with check (public.is_moderator());

-- milestones and their status history
create policy "milestones_public_read" on public.milestones for select
  using (exists (select 1 from public.projects p where p.id = project_id and (p.status = 'published' or public.is_moderator())));
create policy "milestones_moderator_write" on public.milestones for all using (public.is_moderator()) with check (public.is_moderator());

create policy "status_events_public_read" on public.milestone_status_events for select
  using (exists (select 1 from public.projects p where p.id = project_id and (p.status = 'published' or public.is_moderator())));
create policy "status_events_moderator_insert" on public.milestone_status_events for insert with check (public.is_moderator());

-- evidence: accepted evidence is public; pending is visible to its submitter and moderators.
create policy "evidence_public_read" on public.evidence for select
  using (
    (review_state = 'accepted' and exists (select 1 from public.projects p where p.id = project_id and p.status = 'published'))
    or submitter_id = auth.uid()::text
    or public.is_moderator()
  );
create policy "evidence_user_insert" on public.evidence for insert
  with check (
    auth.uid() is not null
    and submitter_id = auth.uid()::text
    and review_state = 'pending'
    and submitter_kind in ('community', 'project')
  );
-- Users cannot edit evidence after submission; moderators update review fields.
create policy "evidence_moderator_update" on public.evidence for update using (public.is_moderator()) with check (public.is_moderator());

create policy "evidence_sources_read" on public.evidence_sources for select
  using (exists (select 1 from public.evidence e where e.id = evidence_id));
create policy "evidence_sources_moderator_write" on public.evidence_sources for all using (public.is_moderator()) with check (public.is_moderator());

create policy "evidence_reviews_public_read" on public.evidence_reviews for select using (true);
create policy "evidence_reviews_moderator_insert" on public.evidence_reviews for insert with check (public.is_moderator() and reviewer_id = auth.uid()::text);

create policy "evidence_votes_self" on public.evidence_votes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "evidence_votes_read" on public.evidence_votes for select using (true);

-- disputes: visible to everyone once filed (correction process is public), insert by users, update by moderators.
create policy "disputes_public_read" on public.disputes for select using (true);
create policy "disputes_user_insert" on public.disputes for insert
  with check (auth.uid() is not null and submitter_id = auth.uid()::text and state = 'open');
create policy "disputes_moderator_update" on public.disputes for update using (public.is_moderator()) with check (public.is_moderator());

-- integrations: public read; admin write
create policy "github_repos_read" on public.github_repositories for select using (true);
create policy "github_repos_admin_write" on public.github_repositories for all using (public.is_admin()) with check (public.is_admin());
create policy "github_snapshots_read" on public.github_snapshots for select using (true);
create policy "website_endpoints_read" on public.website_endpoints for select using (true);
create policy "website_endpoints_admin_write" on public.website_endpoints for all using (public.is_admin()) with check (public.is_admin());
create policy "website_checks_read" on public.website_checks for select using (true);
-- Snapshot/check inserts happen through the service role from scheduled jobs.

-- scores and feed: public read; writes via service role only
create policy "scores_public_read" on public.ship_score_snapshots for select
  using (exists (select 1 from public.projects p where p.id = project_id and (p.status = 'published' or public.is_moderator())));
create policy "feed_public_read" on public.feed_events for select using (true);

-- watchlists: owner only (public lists are readable by anyone)
create policy "watchlists_owner" on public.watchlists for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "watchlists_public_read" on public.watchlists for select using (is_public or auth.uid() = user_id);
create policy "watchlist_items_owner" on public.watchlist_items for all
  using (exists (select 1 from public.watchlists w where w.id = watchlist_id and w.user_id = auth.uid()))
  with check (exists (select 1 from public.watchlists w where w.id = watchlist_id and w.user_id = auth.uid()));
create policy "watchlist_items_public_read" on public.watchlist_items for select
  using (exists (select 1 from public.watchlists w where w.id = watchlist_id and (w.is_public or w.user_id = auth.uid())));

create policy "badges_read" on public.badges for select using (true);
create policy "user_badges_read" on public.user_badges for select using (true);

create policy "suggestions_user_insert" on public.project_suggestions for insert
  with check (auth.uid() is not null and submitter_id = auth.uid()::text and state = 'pending');
create policy "suggestions_read" on public.project_suggestions for select using (submitter_id = auth.uid()::text or public.is_moderator());
create policy "suggestions_moderator_update" on public.project_suggestions for update using (public.is_moderator()) with check (public.is_moderator());

create policy "audit_moderator_read" on public.admin_audit_log for select using (public.is_moderator());
create policy "audit_moderator_insert" on public.admin_audit_log for insert with check (public.is_moderator());
