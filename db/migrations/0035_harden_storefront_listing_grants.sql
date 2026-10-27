-- Supabase project default privileges give anon/authenticated full table access.
-- RLS already blocks writes, but remove unnecessary grants as defense in depth.
begin;
revoke all on public.public_catalog_listings from anon,authenticated;
grant select on public.public_catalog_listings to anon,authenticated;
grant insert,update,delete on public.public_catalog_listings to authenticated;
commit;
