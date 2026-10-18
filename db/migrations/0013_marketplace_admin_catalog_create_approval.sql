-- Provisio: primeiro fluxo real de cadastro para homologacao comercial.
-- Somente administrador PLATFORM_ADMIN com sessao viva + MFA AAL2.
-- Produtos/SKUs/ofertas entram como rascunho ou pendente; zero publicacao automatica.
begin;

create policy admin_products_draft_insert on public.products
for insert to authenticated with check (
  (select marketplace_private.is_verified_platform_admin()) and status='draft'
);
create policy admin_products_status_update on public.products
for update to authenticated
using ((select marketplace_private.is_verified_platform_admin()))
with check ((select marketplace_private.is_verified_platform_admin()));
grant insert (name,slug,gtin,base_unit,status) on public.products to authenticated;
grant update (status) on public.products to authenticated;

create policy admin_supplier_skus_pending_insert on public.supplier_products
for insert to authenticated with check (
  (select marketplace_private.is_verified_platform_admin()) and status='pending'
);
create policy admin_supplier_skus_status_update on public.supplier_products
for update to authenticated
using ((select marketplace_private.is_verified_platform_admin()))
with check ((select marketplace_private.is_verified_platform_admin()));
grant insert (supplier_org_id,product_id,supplier_sku,pack_quantity,pack_unit,status)
on public.supplier_products to authenticated;
grant update (status) on public.supplier_products to authenticated;

create policy admin_offers_pending_insert on public.offers
for insert to authenticated with check (
  (select marketplace_private.is_verified_platform_admin())
  and status='pending' and source_type in ('MANUAL_AUTHORIZED','PLATFORM_STOCK')
);
create policy admin_offers_status_update on public.offers
for update to authenticated
using ((select marketplace_private.is_verified_platform_admin()))
with check ((select marketplace_private.is_verified_platform_admin()));
grant insert (supplier_org_id,supplier_product_id,source_type,base_price_minor,min_quantity,status,valid_from,valid_to)
on public.offers to authenticated;
grant update (status) on public.offers to authenticated;

create policy admin_offer_regions_insert on public.offer_regions
for insert to authenticated with check (
  (select marketplace_private.is_verified_platform_admin())
  and exists (select 1 from public.offers o
    where o.id=offer_regions.offer_id and o.status='pending')
);
grant insert (offer_id,region_code) on public.offer_regions to authenticated;

create policy admin_inventory_initial_insert on public.inventory_positions
for insert to authenticated with check (
  (select marketplace_private.is_verified_platform_admin())
  and reserved_quantity=0
  and exists (select 1 from public.supplier_products sp
    where sp.id=inventory_positions.supplier_product_id
      and sp.supplier_org_id=inventory_positions.supplier_org_id
      and sp.status='approved')
);
create policy admin_inventory_available_update on public.inventory_positions
for update to authenticated
using ((select marketplace_private.is_verified_platform_admin()))
with check ((select marketplace_private.is_verified_platform_admin()));
grant insert (supplier_product_id,supplier_org_id,available_quantity,reserved_quantity)
on public.inventory_positions to authenticated;
grant update (available_quantity) on public.inventory_positions to authenticated;

create function marketplace_private.guard_product_catalog_lifecycle()
returns trigger language plpgsql security invoker set search_path=''
as $guard$
begin
  if new.status = old.status then return new; end if;
  if old.status='draft' and new.status='active' then return new; end if;
  if old.status='active' and new.status='archived' then return new; end if;
  raise exception 'invalid product lifecycle transition' using errcode='23514';
end;
$guard$;
create trigger products_guard_status
before update of status on public.products for each row
execute function marketplace_private.guard_product_catalog_lifecycle();

create function marketplace_private.guard_supplier_sku_lifecycle()
returns trigger language plpgsql security invoker set search_path=''
as $guard$
declare ready boolean;
begin
  if new.status = old.status then return new; end if;
  if old.status='pending' and new.status='rejected' then return new; end if;
  if old.status='approved' and new.status='suspended' then return new; end if;
  if new.status='approved' and old.status in ('pending','suspended') then
    select exists(
      select 1 from public.products p
      join public.organizations o on o.id=new.supplier_org_id
      join public.organization_capabilities c on c.organization_id=o.id and c.capability='SUPPLIER'
      where p.id=new.product_id and p.status='active'
      and o.status='approved' and o.kind in ('SUPPLIER','PLATFORM_OPERATOR')
      and c.status='approved'
    ) into ready;
    if ready then return new; end if;
    raise exception 'SKU approval requires active product and approved supplier'
      using errcode='23514';
  end if;
  raise exception 'invalid SKU lifecycle transition' using errcode='23514';
end;
$guard$;
create trigger supplier_skus_guard_status
before update of status on public.supplier_products for each row
execute function marketplace_private.guard_supplier_sku_lifecycle();

create function marketplace_private.guard_offer_lifecycle()
returns trigger language plpgsql security invoker set search_path=''
as $guard$
declare ready boolean;
begin
  if new.status=old.status then return new; end if;
  if old.status='pending' and new.status='rejected' then return new; end if;
  if old.status='approved' and new.status='suspended' then return new; end if;
  if new.status='approved' and old.status in ('pending','suspended') then
    select exists(
      select 1 from public.supplier_products sp
      join public.products p on p.id=sp.product_id
      join public.organizations o on o.id=sp.supplier_org_id
      join public.organization_capabilities c on c.organization_id=o.id and c.capability='SUPPLIER'
      join public.inventory_positions ip on ip.supplier_product_id=sp.id and ip.supplier_org_id=o.id
      where sp.id=new.supplier_product_id and sp.supplier_org_id=new.supplier_org_id
        and sp.status='approved' and p.status='active'
        and o.status='approved' and o.kind in ('SUPPLIER','PLATFORM_OPERATOR')
        and c.status='approved'
        and ip.available_quantity-ip.reserved_quantity>=new.min_quantity
        and exists(select 1 from public.offer_regions r where r.offer_id=new.id)
    ) into ready;
    if ready and new.valid_from<=now() and (new.valid_to is null or new.valid_to>now()) then
      return new;
    end if;
    raise exception 'offer approval requires active approved supplier, region, stock and valid dates'
      using errcode='23514';
  end if;
  raise exception 'invalid offer lifecycle transition' using errcode='23514';
end;
$guard$;
create trigger offers_guard_status
before update of status on public.offers for each row
execute function marketplace_private.guard_offer_lifecycle();

-- Regras acima nao adicionam GRANT para DELETE nem SELECT a anon/compradores.
revoke all on function marketplace_private.guard_product_catalog_lifecycle() from public,anon,authenticated;
revoke all on function marketplace_private.guard_supplier_sku_lifecycle() from public,anon,authenticated;
revoke all on function marketplace_private.guard_offer_lifecycle() from public,anon,authenticated;
commit;
