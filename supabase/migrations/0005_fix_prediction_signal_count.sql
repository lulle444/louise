-- The shared trigger function read new.prediction_id before checking which table fired it,
-- which fails on public.predictions ("record new has no field prediction_id").
create or replace function public.check_prediction_signal_count() returns trigger
language plpgsql as $$
declare
  pid uuid;
  cnt int;
begin
  if tg_table_name = 'predictions' then
    pid := new.id;
  elsif tg_op = 'DELETE' then
    pid := old.prediction_id;
  else
    pid := new.prediction_id;
  end if;
  -- Deleting a prediction cascades to its signals; nothing left to check.
  if not exists (select 1 from public.predictions where id = pid) then
    return null;
  end if;
  select count(*) into cnt from public.prediction_signals where prediction_id = pid;
  if cnt <> 3 then
    raise exception 'A prediction must reference exactly three signals (found %)', cnt;
  end if;
  return null;
end $$;
