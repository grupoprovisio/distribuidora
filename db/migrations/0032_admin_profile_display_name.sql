-- Controlled admin profile name edits; no new tables or privileged RPCs.
begin;
grant update (display_name) on public.profiles to authenticated;
commit;
