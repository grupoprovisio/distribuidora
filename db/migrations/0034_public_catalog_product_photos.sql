-- Explicit storefront publication for approved commercial products.
-- Photos are not copied and the private bucket stays private. Only the
-- selected image of a published product can be signed by anonymous visitors.
begin;

create table public.public_catalog_listings(
  product_id uuid primary key references public.products(id) on delete cascade,
  image_storage_path text null references public.product_images(storage_path) on delete set null,
  published_at timestamptz not null default now(),
  constraint public_catalog_listing_image_owner
    check(image_storage_path is null or
      split_part(image_storage_path,'/',1)=product_id::text)
);
create index public_catalog_listings_image_idx
  on public.public_catalog_listings(image_storage_path)
  where image_storage_path is not null;

alter table public.public_catalog_listings enable row level security;
grant select on public.public_catalog_listings to anon,authenticated;
grant insert,update,delete on public.public_catalog_listings to authenticated;

-- This table only stores intentionally public publication metadata.
create policy public_catalog_listings_read on public.public_catalog_listings
  for select to anon,authenticated using(true);
create policy public_catalog_listings_admin_insert on public.public_catalog_listings
  for insert to authenticated
  with check((select marketplace_private.is_verified_platform_admin()));
create policy public_catalog_listings_admin_update on public.public_catalog_listings
  for update to authenticated
  using((select marketplace_private.is_verified_platform_admin()))
  with check((select marketplace_private.is_verified_platform_admin()));
create policy public_catalog_listings_admin_delete on public.public_catalog_listings
  for delete to authenticated
  using((select marketplace_private.is_verified_platform_admin()));

-- The original Storage bucket remains private. Only the explicitly
-- published WebP is eligible for a short-lived signed URL.
create policy provisio_storefront_photo_read on storage.objects
  for select to anon,authenticated
  using(bucket_id='provisio-produtos' and exists(
    select 1 from public.public_catalog_listings listing
    where listing.image_storage_path=storage.objects.name
  ));

-- Existing public RPC changes its return type, so drop and recreate atomically.
drop function public.provisio_public_product_showcase(text,integer,integer);
create function public.provisio_public_product_showcase(
  p_search text default '',
  p_limit integer default 25,
  p_offset integer default 0
)
returns table(
  slug text,
  product_name text,
  category_name text,
  regions text[],
  image_storage_path text
)
language sql stable security definer set search_path=''
as $showcase$
  select p.slug,p.name,
         coalesce(min(category.name),'Outros produtos')::text,
         array_agg(distinct (
           case when region.region_code like 'BR-%'
             then substring(region.region_code from 4)
             else region.region_code end
         ))::text[],
         listing.image_storage_path
  from public.public_catalog_listings listing
  join public.products p on p.id=listing.product_id
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
  group by p.id,p.slug,p.name,listing.image_storage_path
  order by p.name asc,p.id
  limit least(greatest(coalesce(p_limit,25),1),50)
  offset least(greatest(coalesce(p_offset,0),0),10000);
$showcase$;

revoke all on function public.provisio_public_product_showcase(text,integer,integer)
  from public,anon,authenticated;
grant execute on function public.provisio_public_product_showcase(text,integer,integer)
  to anon,authenticated;

-- Explicitly publish the real catalog product requested by the operator.
-- Do NOT auto-publish products with test/non-commercial labels.
insert into public.public_catalog_listings(product_id,image_storage_path)
  select p.id,photo.storage_path
  from public.products p
  left join lateral (
    select pi.storage_path from public.product_images pi
    where pi.product_id=p.id and pi.mime_type='image/webp'
    order by pi.created_at desc limit 1
  ) photo on true
  where p.slug='papel-higienico-folha-dupla-24-unidades'
  on conflict(product_id) do nothing;
commit;
