-- Public product discovery: intentionally does not publish prices, SKU, stock,
-- tenant identifiers, QA offers or private Storage paths.
-- A bounded SECURITY DEFINER query is needed because anon has no table RLS reads.
-- Grant access ONLY to this read-only, argument-limited function.
begin;

create function public.provisio_public_product_showcase(
  p_search text default '',
  p_limit integer default 25,
  p_offset integer default 0
)
returns table (
  slug text,
  product_name text,
  category_name text,
  regions text[]
)
language sql stable security definer set search_path=''
as $showcase$
  select p.slug,p.name,
         coalesce(min(category.name),'Outros produtos')::text,
         array_agg(distinct (
           case when region.region_code like 'BR-%'
             then substring(region.region_code from 4)
             else region.region_code end
         ))::text[]
  from public.products p
  join public.supplier_products sku on sku.product_id=p.id
    and sku.status='approved'
  join public.offers offer on offer.supplier_product_id=sku.id
    and offer.supplier_org_id=sku.supplier_org_id
    and offer.status='approved'
    and offer.valid_from<=now()
    and (offer.valid_to is null or offer.valid_to>now())
    and offer.source_type in (
      'MANUAL_AUTHORIZED','SUPPLIER_CSV_AUTHORIZED','SUPPLIER_API_AUTHORIZED','PLATFORM_STOCK'
    )
  join public.organizations supplier on supplier.id=sku.supplier_org_id
    and supplier.status='approved'
    and supplier.qa_only=false
    and supplier.kind in ('SUPPLIER','PLATFORM_OPERATOR')
  join public.organization_capabilities capability on capability.organization_id=supplier.id
    and capability.capability='SUPPLIER' and capability.status='approved'
  join public.inventory_positions stock on stock.supplier_product_id=sku.id
    and stock.supplier_org_id=sku.supplier_org_id
    and stock.available_quantity-stock.reserved_quantity>=offer.min_quantity
  join public.offer_regions region on region.offer_id=offer.id
  left join public.product_category_assignments assignment on assignment.product_id=p.id
  left join public.product_categories category on category.id=assignment.category_id
  where p.status='active'
    and (coalesce(p_search,'')='' or p.name ilike '%'||left(p_search,80)||'%')
  group by p.id,p.slug,p.name
  order by p.name asc,p.id
  limit least(greatest(coalesce(p_limit,25),1),50)
  offset least(greatest(coalesce(p_offset,0),0),10000);
$showcase$;

revoke all on function public.provisio_public_product_showcase(text,integer,integer)
  from public,anon,authenticated;
grant execute on function public.provisio_public_product_showcase(text,integer,integer)
  to anon,authenticated;

comment on function public.provisio_public_product_showcase(text,integer,integer)
is 'Bounded public discovery of currently sellable non-QA product names, categories and offer regions; never exposes price, stock, supplier IDs, private image paths or QA records.';
commit;
