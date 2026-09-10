-- Row Level Security. Public reads are limited to published/public data; all
-- privileged writes go through the service role (server only).

alter table profiles enable row level security;
alter table narratives enable row level security;
alter table assets enable row level security;
alter table narrative_constituent_versions enable row level security;
alter table narrative_constituents enable row level security;
alter table races enable row level security;
alter table narrative_snapshots enable row level security;
alter table ai_profiles enable row level security;
alter table lineups enable row level security;
alter table lineup_picks enable row level security;
alter table race_results enable row level security;
alter table xp_ledger enable row level security;
alter table badges enable row level security;
alter table user_badges enable row level security;
alter table admin_audit_log enable row level security;

-- Catalogue: public read.
create policy "public read profiles" on profiles for select using (true);
create policy "public read narratives" on narratives for select using (true);
create policy "public read assets" on assets for select using (true);
create policy "public read versions" on narrative_constituent_versions for select using (true);
create policy "public read constituents" on narrative_constituents for select using (true);
create policy "public read ai profiles" on ai_profiles for select using (true);
create policy "public read badges" on badges for select using (true);

-- Races: drafts are hidden from the public.
create policy "public read published races" on races for select using (status <> 'draft');

-- Snapshots of non-draft races are public (transparent data).
create policy "public read snapshots" on narrative_snapshots for select
  using (exists (select 1 from races r where r.id = race_id and r.status <> 'draft'));

-- Lineups: your own always; everyone's once the Race is locked (live/settled/void)
-- so Crowd Picks and AI lineups are never revealed to a user who has not locked.
create policy "read lineups" on lineups for select using (
  user_id = auth.uid()
  or exists (select 1 from races r where r.id = race_id and r.status in ('live', 'settled', 'void', 'archived'))
  or (kind = 'human' and exists (select 1 from lineups mine where mine.race_id = lineups.race_id and mine.user_id = auth.uid()))
);
create policy "read picks" on lineup_picks for select
  using (exists (select 1 from lineups l where l.id = lineup_id)); -- delegates to the lineups policy

-- Results, XP and badges are public once settled (they reference public Race Cards).
create policy "public read results" on race_results for select using (true);
create policy "public read xp" on xp_ledger for select using (true);
create policy "public read user badges" on user_badges for select using (true);

-- Profiles: users update only safe fields on their own row.
create policy "update own profile" on profiles for update using (id = auth.uid()) with check (id = auth.uid());
create or replace function profiles_safe_update() returns trigger
language plpgsql as $$
begin
  if auth.role() = 'authenticated' then
    if new.id <> old.id or new.username <> old.username or new.is_demo <> old.is_demo or new.created_at <> old.created_at then
      raise exception 'Only display_name, bio and avatar_seed can be changed';
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger profiles_safe_update_trigger before update on profiles for each row execute function profiles_safe_update();

-- No insert/update/delete policies for lineups, picks, snapshots, results, xp,
-- badges, races or the audit log: human lineups are created through the
-- lock_lineup() RPC (security definer), everything else requires the service role.
grant execute on function lock_lineup(text, text, jsonb) to authenticated;
revoke execute on function lock_lineup(text, text, jsonb) from anon;

-- Admin audit log is service-role only (not readable by anon/authenticated).
