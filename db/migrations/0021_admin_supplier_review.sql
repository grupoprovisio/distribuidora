-- Fila de homologacao, transacao atomica e sem publicacao automatica.
begin;
create policy admin_supplier_submission_review on public.supplier_product_submissions for update to authenticated
 using ((select marketplace_private.is_verified_platform_admin()))
 with check ((select marketplace_private.is_verified_platform_admin()));
grant update(status) on public.supplier_product_submissions to authenticated;

create function public.promote_supplier_submission(p_submission uuid,p_slug text,p_gtin text default null)
returns jsonb language plpgsql security invoker set search_path=''
as $fn$
declare source_row public.supplier_product_submissions%rowtype;
declare master_id uuid;
declare sku_id uuid;
declare offer_id uuid;
begin
 if not (select marketplace_private.is_verified_platform_admin()) then
  raise exception 'Acesso administrativo obrigatorio' using errcode='42501';
 end if;
 if p_slug is null or length(p_slug)>120 or p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    or (p_gtin is not null and p_gtin !~ '^[0-9]{8,14}$') then
  raise exception 'Identificador ou GTIN invalido' using errcode='22023';
 end if;
 select * into source_row from public.supplier_product_submissions
  where id=p_submission and status='pending' for update;
 if not found then raise exception 'Solicitacao pendente nao encontrada' using errcode='P0002'; end if;
 if not exists (
  select 1 from public.organizations org
  join public.organization_capabilities cap on cap.organization_id=org.id and cap.capability='SUPPLIER'
  where org.id=source_row.supplier_org_id and org.kind in ('SUPPLIER','PLATFORM_OPERATOR')
    and org.status='approved' and cap.status='approved'
 ) then raise exception 'Fornecedor nao homologado' using errcode='42501'; end if;
 insert into public.products(name,slug,gtin,base_unit,status)
 values(source_row.product_name,p_slug,p_gtin,source_row.base_unit,'draft') returning id into master_id;
 insert into public.supplier_products(supplier_org_id,product_id,supplier_sku,pack_quantity,pack_unit,status)
 values(source_row.supplier_org_id,master_id,source_row.supplier_sku,source_row.pack_quantity,source_row.pack_unit,'pending')
 returning id into sku_id;
 insert into public.offers(supplier_org_id,supplier_product_id,source_type,base_price_minor,min_quantity,status,valid_from)
 values(source_row.supplier_org_id,sku_id,'MANUAL_AUTHORIZED',source_row.base_price_minor,1,'pending',now())
 returning id into offer_id;
 insert into public.offer_regions(offer_id,region_code) values(offer_id,source_row.region_code);
 if source_row.category_id is not null then
  insert into public.product_category_assignments(product_id,category_id)
  values(master_id,source_row.category_id);
 end if;
 update public.supplier_product_submissions set status='approved' where id=p_submission;
 return jsonb_build_object('product_id',master_id,'sku_id',sku_id,'offer_id',offer_id,'initial_stock_requested',source_row.available_quantity);
end;
$fn$;
revoke execute on function public.promote_supplier_submission(uuid,text,text) from public,anon;
grant execute on function public.promote_supplier_submission(uuid,text,text) to authenticated;
commit;
