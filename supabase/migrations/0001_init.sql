-- SHIPTRACE initial schema
-- Text primary keys are used so Demo Mode identifiers and production identifiers share one shape.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- helpers
create or replace function public.current_role_name()
returns text language sql stable security definer set search_path = public as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'guest');
$$;

create or replace function public.is_moderator()
returns boolean language sql stable security definer set search_path = public as $$
  select public.current_role_name() in ('moderator', 'admin');
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.current_role_name() = 'admin';
$$;

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
  retrieved_day date generated always as ((retrieved_at at time zone 'utc')::date) stored,
  unique (repository_id, retrieved_day)
);
create index on public.github_snapshots(project_id, retrieved_at desc);

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
  checked_bucket bigint generated always as (floor(extract(epoch from checked_at) / 600)::bigint) stored,
  unique (endpoint_id, checked_bucket)
);
create index on public.website_checks(project_id, checked_at desc);

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
