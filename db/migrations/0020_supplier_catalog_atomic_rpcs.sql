-- RPCs atomicas, SECURITY INVOKER: sujeitas a todas as politicas RLS.
begin;
create function public.set_supplier_available_stock(p_org uuid,p_sku uuid,p_available numeric)
returns void language plpgsql security invoker set search_path=''
as $f$
begin
 if p_available is null or p_available < 0 or p_available > 100000000
   or round(p_available,3) <> p_available then
  raise exception 'Quantidade de estoque invalida' using errcode='22023';
 end if;
 if not marketplace_private.can_manage_supplier_sku(p_org,p_sku,false) then
  raise exception 'Sem permissao para este SKU' using errcode='42501';
 end if;
 insert into public.inventory_positions(supplier_org_id,supplier_product_id,available_quantity,reserved_quantity)
 values(p_org,p_sku,p_available,0)
 on conflict(supplier_product_id) do update
  set available_quantity=excluded.available_quantity
  where inventory_positions.supplier_org_id=excluded.supplier_org_id;
end;
$f$;
revoke execute on function public.set_supplier_available_stock(uuid,uuid,numeric) from public,anon;
grant execute on function public.set_supplier_available_stock(uuid,uuid,numeric) to authenticated;

create function public.create_supplier_pending_offer(
 p_org uuid,p_sku uuid,p_price_minor bigint,p_minimum int,p_region text,p_valid_to timestamptz default null
)
returns uuid language plpgsql security invoker set search_path=''
as $f$
declare created_id uuid;
begin
 if p_price_minor is null or p_price_minor<=0 or p_price_minor>1000000000
    or p_minimum is null or p_minimum<1 or p_minimum>10000000
    or p_region !~ '^BR-(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$'
    or (p_valid_to is not null and p_valid_to<=now())
 then
  raise exception 'Parametros comerciais invalidos' using errcode='22023';
 end if;
 if not marketplace_private.can_manage_supplier_sku(p_org,p_sku,true) then
  raise exception 'Sem permissao para este SKU' using errcode='42501';
 end if;
 insert into public.offers (
   supplier_org_id,supplier_product_id,source_type,base_price_minor,min_quantity,status,valid_from,valid_to
 ) values (
   p_org,p_sku,'MANUAL_AUTHORIZED',p_price_minor,p_minimum,'pending',now(),p_valid_to
 ) returning id into created_id;
 insert into public.offer_regions(offer_id,region_code) values(created_id,p_region);
 return created_id;
end;
$f$;
revoke execute on function public.create_supplier_pending_offer(uuid,uuid,bigint,int,text,timestamptz) from public,anon;
grant execute on function public.create_supplier_pending_offer(uuid,uuid,bigint,int,text,timestamptz) to authenticated;
create function marketplace_private.touch_inventory_timestamp()
returns trigger language plpgsql security invoker set search_path=''
as $f$
begin
 new.updated_at=now();
 return new;
end;
$f$;
create trigger inventory_update_time
 before update of available_quantity on public.inventory_positions
 for each row execute function marketplace_private.touch_inventory_timestamp();
revoke all on function marketplace_private.touch_inventory_timestamp() from public,anon,authenticated;
commit;
