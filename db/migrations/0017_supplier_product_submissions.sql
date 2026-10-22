-- Executar em homologacao apos testes de isolamento.
-- Fluxo de escrita fornecedor: requests isolados; SEM edicao direta do produto mestre e SEM publicacao.
begin;
create table public.supplier_product_submissions(
 id uuid primary key default gen_random_uuid(),
 supplier_org_id uuid not null references public.organizations(id),
 author_id uuid not null references auth.users(id),
 supplier_sku text not null check (length(btrim(supplier_sku)) between 1 and 100),
 product_name text not null check (length(btrim(product_name)) between 2 and 160),
 base_unit text not null check (base_unit in ('un','kg','l')),
 pack_quantity numeric not null check (pack_quantity>0 and pack_quantity<=1000000),
 pack_unit text not null check (pack_unit in ('un','kg','l')),
 base_price_minor bigint not null check (base_price_minor>0),
 available_quantity numeric not null default 0 check (available_quantity>=0),
 status text not null default 'pending' check (status in ('pending','approved','rejected')),
 created_at timestamptz not null default now(),
 unique(supplier_org_id,supplier_sku,status)
);
create index supplier_product_submissions_org_created on public.supplier_product_submissions(supplier_org_id,created_at desc);
alter table public.supplier_product_submissions enable row level security;
-- Confirma papel atual; SELLER legado ou READER nao podem gravar.
create policy supplier_submission_read on public.supplier_product_submissions
 for select to authenticated using (
 (select marketplace_private.is_verified_platform_admin()) or
 (marketplace_private.has_active_capability(supplier_org_id,'SUPPLIER') and exists(
  select 1 from public.organization_members m where m.organization_id=supplier_org_id
  and m.user_id=(select auth.uid()) and m.status='active'
  and m.role in ('ORG_ADMIN','SUPPLIER_ADMIN','PLATFORM_ADMIN')
 ))
);
create policy supplier_submission_create on public.supplier_product_submissions
 for insert to authenticated with check (
 author_id=(select auth.uid()) and status='pending'
 and marketplace_private.has_active_capability(supplier_org_id,'SUPPLIER')
 and exists(select 1 from public.organization_members m
  where m.organization_id=supplier_org_id and m.user_id=(select auth.uid())
  and m.status='active' and m.role in ('ORG_ADMIN','SUPPLIER_ADMIN','PLATFORM_ADMIN'))
);
grant select on public.supplier_product_submissions to authenticated;
grant insert(supplier_org_id,author_id,supplier_sku,product_name,base_unit,pack_quantity,pack_unit,base_price_minor,available_quantity,status)
 on public.supplier_product_submissions to authenticated;
-- Nao existe UPDATE de fornecedor: revisao/persistencia no catalogo exige acao administrativa auditada.
commit;
