-- Allow the Supabase dashboard (postgres role) to edit guarded profile and
-- prediction fields, in addition to the service role used by the app.
-- Ordinary authenticated users remain blocked.

create or replace function public.guard_profile_update()
returns trigger language plpgsql as $$
begin
  if auth.role() is distinct from 'service_role' and current_user not in ('postgres', 'supabase_admin') then
    if new.xp <> old.xp or new.current_streak <> old.current_streak
       or new.longest_streak <> old.longest_streak or new.is_admin <> old.is_admin
       or new.username <> old.username or new.id <> old.id then
      raise exception 'Only the service role may change scoring or identity fields';
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;

create or replace function public.guard_prediction_update()
returns trigger language plpgsql as $$
begin
  if auth.role() is distinct from 'service_role' and current_user not in ('postgres', 'supabase_admin') then
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
