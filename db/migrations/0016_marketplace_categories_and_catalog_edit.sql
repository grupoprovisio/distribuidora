-- Catalog P1. Aplicar somente na branch de homologacao após revisar RLS.
begin;
create table public.product_categories (
 id uuid primary key default gen_random_uuid(),
 name text not null unique check (length(btrim(name)) between 2 and 80),
 slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 created_at timestamptz not null default now()
);
create table public.product_category_assignments (
 product_id uuid not null references public.products(id) on delete cascade,
 category_id uuid not null references public.product_categories(id) on delete restrict,
 primary key (product_id,category_id)
);
create index product_category_assignment_by_category on public.product_category_assignments(category_id);
alter table public.product_categories enable row level security;
alter table public.product_category_assignments enable row level security;
create policy categories_read on public.product_categories for select to authenticated using (true);
create policy categories_admin_insert on public.product_categories for insert to authenticated
 with check ((select marketplace_private.is_verified_platform_admin()));
create policy category_assignments_read on public.product_category_assignments for select to authenticated
 using (exists (select 1 from public.products p where p.id=product_id));
create policy category_assignments_admin_insert on public.product_category_assignments for insert to authenticated
 with check ((select marketplace_private.is_verified_platform_admin()));
create policy category_assignments_admin_delete on public.product_category_assignments for delete to authenticated
 using ((select marketplace_private.is_verified_platform_admin()));
grant select on public.product_categories,public.product_category_assignments to authenticated;
grant insert (name,slug) on public.product_categories to authenticated;
grant insert (product_id,category_id),delete on public.product_category_assignments to authenticated;
-- Granular UPDATE column grants: admin-only RLS is supplemented by column grants.
grant update (name,gtin,base_unit) on public.products to authenticated;
grant update (base_price_minor,min_quantity,valid_to) on public.offers to authenticated;
grant update (supplier_sku,pack_quantity,pack_unit) on public.supplier_products to authenticated;
-- Existing update policies on products / offers / SKU are admin MFA only.
commit;
