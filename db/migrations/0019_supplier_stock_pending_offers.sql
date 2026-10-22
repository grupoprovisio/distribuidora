-- Fornecedor cadastra oferta PENDENTE e altera apenas seu estoque disponivel.
-- SECURITY DEFINER restrito a esquema privado evita recursao em RLS de offers/products.
begin;
create function marketplace_private.can_manage_supplier_sku(p_org uuid,p_sku uuid,p_need_active_product boolean)
returns boolean language sql stable security definer set search_path=''
as $fn$
 select coalesce((
  select true from public.supplier_products sp
   join public.products prod on prod.id=sp.product_id
   join public.organizations org on org.id=sp.supplier_org_id
   join public.organization_capabilities cap on cap.organization_id=org.id
   join public.organization_members m on m.organization_id=org.id
   join public.profiles profile on profile.id=m.user_id
  where (select marketplace_private.has_live_auth_session())
    and m.user_id=(select auth.uid()) and m.status='active'
    and profile.status='active'
    and m.role in ('ORG_ADMIN','SUPPLIER_ADMIN','PLATFORM_ADMIN')
    and org.status='approved' and org.kind in ('SUPPLIER','PLATFORM_OPERATOR')
    and cap.capability='SUPPLIER' and cap.status='approved'
    and sp.id=p_sku and sp.supplier_org_id=p_org and sp.status='approved'
    and (not p_need_active_product or prod.status='active')
  limit 1
 ), false);
$fn$;
revoke all on function marketplace_private.can_manage_supplier_sku(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function marketplace_private.can_manage_supplier_sku(uuid,uuid,boolean) to authenticated;
create function marketplace_private.can_manage_pending_offer(p_offer uuid)
returns boolean language sql stable security definer set search_path=''
as $fn$
 select coalesce((
  select true from public.offers o where o.id=p_offer and o.status='pending'
    and marketplace_private.can_manage_supplier_sku(o.supplier_org_id,o.supplier_product_id,true)
  limit 1
 ),false);
$fn$;
revoke all on function marketplace_private.can_manage_pending_offer(uuid) from public,anon,authenticated;
grant execute on function marketplace_private.can_manage_pending_offer(uuid) to authenticated;
create policy supplier_inventory_insert_own on public.inventory_positions for insert to authenticated
 with check (reserved_quantity=0 and marketplace_private.can_manage_supplier_sku(supplier_org_id,supplier_product_id,false));
create policy supplier_inventory_update_own on public.inventory_positions for update to authenticated
 using (marketplace_private.can_manage_supplier_sku(supplier_org_id,supplier_product_id,false))
 with check (marketplace_private.can_manage_supplier_sku(supplier_org_id,supplier_product_id,false));
create policy supplier_offers_pending_own on public.offers for insert to authenticated
 with check (
  status='pending' and source_type='MANUAL_AUTHORIZED'
  and marketplace_private.can_manage_supplier_sku(supplier_org_id,supplier_product_id,true)
 );
create policy supplier_offer_regions_pending_own on public.offer_regions for insert to authenticated
 with check (marketplace_private.can_manage_pending_offer(offer_id));
grant insert(supplier_product_id,supplier_org_id,available_quantity,reserved_quantity) on public.inventory_positions to authenticated;
grant update(available_quantity) on public.inventory_positions to authenticated;
grant insert(supplier_product_id,supplier_org_id,source_type,base_price_minor,min_quantity,status,valid_from,valid_to) on public.offers to authenticated;
grant insert(offer_id,region_code) on public.offer_regions to authenticated;
commit;
