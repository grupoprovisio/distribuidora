-- Release only APPROVED Provisio catalog rows to APPROVED buyers in
-- explicitly authorized delivery regions. Never expose pending supplier data.
begin;
create table public.buyer_delivery_regions (
  buyer_org_id uuid not null references public.organizations(id) on delete restrict,
  region_code text not null check (region_code ~ '^BR-(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$'),
  created_at timestamptz not null default now(),
  primary key(buyer_org_id,region_code)
);
create index buyer_delivery_regions_code_idx on public.buyer_delivery_regions(region_code,buyer_org_id);
alter table public.buyer_delivery_regions enable row level security;
alter table public.buyer_delivery_regions force row level security;
revoke all on public.buyer_delivery_regions from public,anon,authenticated;
grant select on public.buyer_delivery_regions to authenticated;
grant insert(buyer_org_id,region_code) on public.buyer_delivery_regions to authenticated;
grant delete on public.buyer_delivery_regions to authenticated;

create policy buyer_delivery_regions_own_read on public.buyer_delivery_regions
for select to authenticated
using (marketplace_private.has_active_capability(buyer_org_id,'BUYER'));
create policy admin_buyer_delivery_regions_read on public.buyer_delivery_regions
for select to authenticated using ((select marketplace_private.is_verified_platform_admin()));
create policy admin_buyer_delivery_regions_insert on public.buyer_delivery_regions
for insert to authenticated with check (
  (select marketplace_private.is_verified_platform_admin())
  and exists (
    select 1 from public.organizations o
    join public.organization_capabilities c on c.organization_id=o.id
    where o.id=buyer_org_id and o.kind='BUYER' and o.status='approved'
      and c.capability='BUYER' and c.status='approved'
  )
);
create policy admin_buyer_delivery_regions_delete on public.buyer_delivery_regions
for delete to authenticated using ((select marketplace_private.is_verified_platform_admin()));

-- This helper is PRIVATE (not in exposed PostgREST schema). The only
-- responsibility is checking the active buyer's approved regional assignments.
create function marketplace_private.buyer_can_access_region(requested_region text)
returns boolean language sql stable security definer set search_path=''
as $$
  select (select marketplace_private.has_live_auth_session()) and exists (
    select 1
    from public.buyer_delivery_regions br
    join public.organizations buyer on buyer.id=br.buyer_org_id
    join public.organization_capabilities cap
      on cap.organization_id=buyer.id and cap.capability='BUYER' and cap.status='approved'
    join public.organization_members m
      on m.organization_id=buyer.id and m.user_id=(select auth.uid()) and m.status='active'
    join public.profiles p on p.id=m.user_id and p.status='active'
    where buyer.status='approved' and buyer.kind='BUYER'
      and m.role in ('ORG_ADMIN','BUYER','REQUESTER','APPROVER','FINANCE','READER')
      and (
        requested_region='BR'
        or requested_region=br.region_code
        or requested_region=substring(br.region_code from 4)
      )
  );
$$;
revoke all on function marketplace_private.buyer_can_access_region(text) from public,anon,authenticated;
grant execute on function marketplace_private.buyer_can_access_region(text) to authenticated;

-- Every visibility decision is recomputed against rows stored server-side.
-- SECURITY DEFINER prevents recursive RLS lookups, but cannot be called by anon
-- or via Data API. No client-supplied user/organization identity is trusted.
create function marketplace_private.buyer_can_see_offer(requested_offer_id uuid)
returns boolean language sql stable security definer set search_path=''
as $$
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
      and marketplace_private.buyer_can_access_region(region.region_code)
  );
$$;
revoke all on function marketplace_private.buyer_can_see_offer(uuid) from public,anon,authenticated;
grant execute on function marketplace_private.buyer_can_see_offer(uuid) to authenticated;

create policy buyer_offers_read_approved_region on public.offers
for select to authenticated
using (marketplace_private.buyer_can_see_offer(id));
create policy buyer_skus_read_eligible on public.supplier_products
for select to authenticated
using (exists(
 select 1 from public.offers o where o.supplier_product_id=supplier_products.id
   and o.supplier_org_id=supplier_products.supplier_org_id
   and marketplace_private.buyer_can_see_offer(o.id)
));
create policy buyer_products_read_eligible on public.products
for select to authenticated
using (exists(
 select 1 from public.offers o
 join public.supplier_products sp on sp.id=o.supplier_product_id and sp.supplier_org_id=o.supplier_org_id
 where sp.product_id=products.id and marketplace_private.buyer_can_see_offer(o.id)
));
create policy buyer_supplier_org_read_eligible on public.organizations
for select to authenticated using (exists(
 select 1 from public.offers o where o.supplier_org_id=organizations.id
 and marketplace_private.buyer_can_see_offer(o.id)
));
create policy buyer_supplier_cap_read_eligible on public.organization_capabilities
for select to authenticated using (
 capability='SUPPLIER' and exists(
 select 1 from public.offers o where o.supplier_org_id=organization_capabilities.organization_id
 and marketplace_private.buyer_can_see_offer(o.id)
));
create policy buyer_offer_regions_read_eligible on public.offer_regions
for select to authenticated using (
 marketplace_private.buyer_can_see_offer(offer_id)
 and marketplace_private.buyer_can_access_region(region_code)
);
create policy buyer_inventory_read_eligible on public.inventory_positions
for select to authenticated using (exists(
 select 1 from public.offers o
 where o.supplier_product_id=inventory_positions.supplier_product_id
 and o.supplier_org_id=inventory_positions.supplier_org_id
 and marketplace_private.buyer_can_see_offer(o.id)
));
create policy buyer_tiers_read_eligible on public.offer_price_tiers
for select to authenticated using (marketplace_private.buyer_can_see_offer(offer_id));
commit;
