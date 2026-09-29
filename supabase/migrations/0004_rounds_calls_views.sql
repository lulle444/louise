-- The app code reads/writes "rounds" and "calls"; the tables are named battles/predictions.
create or replace view public.rounds with (security_invoker = true) as select * from public.battles;
create or replace view public.calls with (security_invoker = true) as select * from public.predictions;
grant select, insert, update, delete on public.rounds, public.calls to anon, authenticated, service_role;
notify pgrst, 'reload schema';
