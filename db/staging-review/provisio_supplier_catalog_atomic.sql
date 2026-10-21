-- Fase 3: atomic supplier catalog draft ingestion.
-- REVIEW AND RUN IN DISPOSABLE STAGING ONLY. NOT APPLIED TO PRODUCTION.
-- This function is SECURITY INVOKER. It requires existing RLS INSERT/SELECT
-- policies on products, supplier_products, offers, offer_regions and tiers.
-- If those policies do not exist, it FAILS CLOSED (no privileged bypass).
create or replace function public.provisio_submit_supplier_catalog(
  p_organization_id uuid,
  p_rows jsonb
) returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  r jsonb;
  v_product_id uuid;
  v_sku_id uuid;
  v_offer_id uuid;
  v_slug text;
  v_created integer := 0;
  v_sku text;
  v_name text;
  v_regions text[];
  v_region text;
  v_count integer;
begin
  if auth.uid() is null or p_organization_id is null then
    raise exception 'Acesso não autorizado' using errcode='42501';
  end if;
  if not exists (
    select 1 from public.organization_members m
    join public.organizations o on o.id=m.organization_id
    join public.organization_capabilities c on c.organization_id=o.id
    where m.user_id=auth.uid() and m.organization_id=p_organization_id
      and m.status='active' and m.role in ('ORG_ADMIN','SUPPLIER_ADMIN')
      and o.status='approved' and c.capability='SUPPLIER'
      and c.status='approved'
  ) then
    raise exception 'Fornecedor não homologado ou sem permissão' using errcode='42501';
  end if;
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) not between 1 and 100 then
    raise exception 'O lote deve conter entre 1 e 100 itens';
  end if;
  -- Serializes concurrent imports for this organization.
  perform pg_advisory_xact_lock(hashtextextended(p_organization_id::text, 17));
  for r in select value from jsonb_array_elements(p_rows) loop
    if jsonb_typeof(r) <> 'object' then raise exception 'Linha inválida'; end if;
    v_sku := btrim(r->>'supplierSku');
    v_name := btrim(r->>'productName');
    if length(v_sku) not between 1 and 100 or length(v_name) not between 1 and 200
       or r->>'baseUnit' not in ('un','kg','l')
       or r->>'packUnit' not in ('un','kg','l')
       or coalesce((r->>'packQuantity') ~ '^[0-9]+(\.[0-9]{1,3})?$' ,false) is false
       or (r->>'packQuantity')::numeric <= 0
       or coalesce((r->>'basePriceMinor') ~ '^[0-9]{1,15}$', false) is false
       or coalesce((r->>'minQuantity') ~ '^[1-9][0-9]{0,8}$', false) is false
       or jsonb_typeof(r->'regions') <> 'array'
       or jsonb_array_length(r->'regions') not between 1 and 27
    then raise exception 'Campos comerciais inválidos'; end if;
    if exists(select 1 from public.supplier_products where supplier_org_id=p_organization_id and supplier_sku=v_sku) then
      raise exception 'SKU já cadastrado: %', v_sku;
    end if;
    select array_agg(value order by value),count(distinct value) into v_regions,v_count
      from jsonb_array_elements_text(r->'regions');
    if v_count <> jsonb_array_length(r->'regions') or
      exists(select 1 from unnest(v_regions) code where code !~ '^[A-Z]{2}(-[A-Z0-9]{2,8})?$')
    then raise exception 'Regiões inválidas'; end if;
    -- Draft master products; never auto-publish a CSV.
    v_slug := 'pendente-' || replace(gen_random_uuid()::text,'-','');
    insert into public.products(slug,name,base_unit,status)
      values(v_slug,v_name,r->>'baseUnit','draft') returning id into v_product_id;
    insert into public.supplier_products(supplier_org_id,product_id,supplier_sku,pack_quantity,pack_unit,status)
      values(p_organization_id,v_product_id,v_sku,(r->>'packQuantity')::numeric,r->>'packUnit','pending')
      returning id into v_sku_id;
    insert into public.offers(supplier_product_id,supplier_org_id,source_type,base_price_minor,min_quantity,status,valid_from)
      values(v_sku_id,p_organization_id,'SUPPLIER_CSV_AUTHORIZED',
        (r->>'basePriceMinor')::bigint,(r->>'minQuantity')::integer,'pending',now())
      returning id into v_offer_id;
    foreach v_region in array v_regions loop
      insert into public.offer_regions(offer_id,region_code) values(v_offer_id,v_region);
    end loop;
    v_created := v_created+1;
  end loop;
  return jsonb_build_object('created',v_created,'status','pending');
end;
$$;
revoke all on function public.provisio_submit_supplier_catalog(uuid,jsonb) from public,anon;
grant execute on function public.provisio_submit_supplier_catalog(uuid,jsonb) to authenticated;
-- Important: this does not grant any table privileges or bypass RLS.
