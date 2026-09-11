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
