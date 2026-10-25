-- Isolate explicitly identified, noncommercial QA companies from real commercial buyers
-- at the PostgreSQL RLS/RPC boundary, even when REST or RPC are called directly.
-- No frontend role "seller" is introduced.
begin;

alter table public.organizations
  add column qa_only boolean not null default false;

comment on column public.organizations.qa_only
  is 'True only for designated noncommercial homologation organizations; excludes their offers from real buyers.';

do $qa$
declare
  matched_count integer;
  updated_count integer;
begin
  select count(*)::integer into matched_count
  from public.organizations o
  where o.trade_name in (
    'PROVISIO QA COMPRADOR INDEPENDENTE - NAO COMERCIAL',
    'PROVISIO QA FORNECEDOR A - NAO COMERCIAL',
    'PROVISIO QA FORNECEDOR B - NAO COMERCIAL'
  );
  -- Fresh disposable local databases have no QA companies until fixtures are seeded.
  -- A populated hosted database must have all three exact approved identities.
  if matched_count not in (0,3) then
    raise exception 'QA organization seed incomplete: % matching names', matched_count;
  end if;
  update public.organizations o set qa_only = true
  where (o.trade_name,o.kind) in (
    ('PROVISIO QA COMPRADOR INDEPENDENTE - NAO COMERCIAL','BUYER'),
    ('PROVISIO QA FORNECEDOR A - NAO COMERCIAL','SUPPLIER'),
    ('PROVISIO QA FORNECEDOR B - NAO COMERCIAL','SUPPLIER')
  ) and o.status='approved' and not o.is_platform_owned;
  get diagnostics updated_count = row_count;
  if updated_count <> matched_count then
    raise exception 'QA organization mismatch: names %, approved exact IDs %', matched_count, updated_count;
  end if;
end
$qa$;

-- Approved buyer eligibility AND delivery-region entitlement must belong to
-- the SAME company in the SAME QA/commercial realm as the supplier.
-- This replaces the earlier region-only buyer check, so direct PostgREST/RPC
-- requests cannot bypass the Next.js QA transaction guard.
create or replace function marketplace_private.buyer_can_see_offer(requested_offer_id uuid)
returns boolean language sql stable security definer set search_path=''
as $fn$
  select (select marketplace_private.has_live_auth_session()) and exists (
    select 1 from public.offers offer
    join public.supplier_products sp
      on sp.id=offer.supplier_product_id and sp.supplier_org_id=offer.supplier_org_id
    join public.products product on product.id=sp.product_id
    join public.organizations supplier on supplier.id=sp.supplier_org_id
    join public.organization_capabilities supplier_cap
      on supplier_cap.organization_id=supplier.id
      and supplier_cap.capability='SUPPLIER' and supplier_cap.status='approved'
    join public.inventory_positions stock
      on stock.supplier_product_id=sp.id and stock.supplier_org_id=sp.supplier_org_id
    join public.offer_regions region on region.offer_id=offer.id
    where offer.id=requested_offer_id
      and offer.status='approved' and offer.valid_from <= now()
      and (offer.valid_to is null or offer.valid_to > now())
      and offer.source_type in (
        'MANUAL_AUTHORIZED','SUPPLIER_CSV_AUTHORIZED','SUPPLIER_API_AUTHORIZED','PLATFORM_STOCK'
      )
      and product.status='active' and sp.status='approved'
      and supplier.status='approved'
      and supplier.kind in ('SUPPLIER','PLATFORM_OPERATOR')
      and stock.available_quantity-stock.reserved_quantity >= offer.min_quantity
      and exists (
        select 1 from public.organization_members membership
        join public.organizations buyer on buyer.id=membership.organization_id
        join public.organization_capabilities buyer_cap
          on buyer_cap.organization_id=buyer.id
          and buyer_cap.capability='BUYER' and buyer_cap.status='approved'
        join public.profiles buyer_profile on buyer_profile.id=membership.user_id
          and buyer_profile.status='active'
        join public.buyer_delivery_regions buyer_region on buyer_region.buyer_org_id=buyer.id
        where membership.user_id=(select auth.uid())
          and membership.status='active'
          and membership.role in ('ORG_ADMIN','BUYER','REQUESTER','APPROVER','FINANCE','READER')
          and buyer.kind='BUYER' and buyer.status='approved'
          and buyer.qa_only=supplier.qa_only
          and (
            region.region_code='BR'
            or region.region_code=buyer_region.region_code
            or region.region_code=substring(buyer_region.region_code from 4)
          )
      )
  );
$fn$;

revoke all on function marketplace_private.buyer_can_see_offer(uuid)
  from public,anon,authenticated;
grant execute on function marketplace_private.buyer_can_see_offer(uuid)
  to authenticated;

commit;
