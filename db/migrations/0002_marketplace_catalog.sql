-- Fase 4 — esquema do catálogo comercial PRÓPRIO/autorizado do Grupo Provisio.
-- Preparação versionada: NÃO aplicado em nenhum Supabase.
-- Pré-requisito: db/migrations/0001_marketplace_foundation.sql.
-- RLS FORCED + nenhum acesso client-side até políticas auditadas em etapa posterior.
-- Fonte VTEX/Atacadão não pode abastecer estas tabelas.

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (length(btrim(name)) > 0),
  gtin text check (gtin is null or gtin ~ '^[0-9]{8,14}$'),
  base_unit text not null check (base_unit in ('un', 'kg', 'l')),
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_name_idx on public.products (name);
create index products_gtin_idx on public.products (gtin) where gtin is not null;

create table public.supplier_products (
  id uuid primary key default gen_random_uuid(),
  supplier_org_id uuid not null references public.organizations(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  supplier_sku text not null check (length(btrim(supplier_sku)) > 0),
  pack_quantity numeric(14,4) not null check (pack_quantity > 0),
  pack_unit text not null check (pack_unit in ('un', 'kg', 'l')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (supplier_org_id, supplier_sku),
  unique (id, supplier_org_id)
);
create index supplier_products_product_idx on public.supplier_products (product_id);
create index supplier_products_org_status_idx on public.supplier_products (supplier_org_id, status);

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  supplier_product_id uuid not null,
  supplier_org_id uuid not null,
  source_type text not null check (source_type in (
    'MANUAL_AUTHORIZED', 'SUPPLIER_CSV_AUTHORIZED', 'SUPPLIER_API_AUTHORIZED', 'PLATFORM_STOCK'
  )),
  base_price_minor bigint not null check (base_price_minor >= 0),
  min_quantity integer not null default 1 check (min_quantity > 0),
  status text not null default 'pending' check (status in ('pending', 'approved', 'suspended', 'rejected')),
  valid_from timestamptz not null,
  valid_to timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (valid_to is null or valid_to > valid_from),
  foreign key (supplier_product_id, supplier_org_id)
    references public.supplier_products(id, supplier_org_id) on delete restrict
);
create index offers_supplier_status_idx on public.offers (supplier_org_id, status);
create index offers_product_status_idx on public.offers (supplier_product_id, status);
create index offers_validity_idx on public.offers (valid_from, valid_to);

create table public.offer_price_tiers (
  offer_id uuid not null references public.offers(id) on delete cascade,
  min_quantity integer not null check (min_quantity > 1),
  unit_price_minor bigint not null check (unit_price_minor >= 0),
  primary key (offer_id, min_quantity)
);

-- Região é escopo comercial da oferta, NÃO uma autorização de acesso a dados privados.
create table public.offer_regions (
  offer_id uuid not null references public.offers(id) on delete cascade,
  region_code text not null check (region_code ~ '^[A-Z]{2}(-[A-Z0-9]{2,8})?$'),
  primary key (offer_id, region_code)
);
create index offer_regions_region_idx on public.offer_regions (region_code, offer_id);

-- Posição de estoque separada por SKU e fornecedor; escrita apenas via serviço autorizado.
create table public.inventory_positions (
  supplier_product_id uuid primary key,
  supplier_org_id uuid not null,
  available_quantity numeric(16,3) not null default 0 check (available_quantity >= 0),
  reserved_quantity numeric(16,3) not null default 0 check (reserved_quantity >= 0),
  updated_at timestamptz not null default now(),
  foreign key (supplier_product_id, supplier_org_id)
    references public.supplier_products(id, supplier_org_id) on delete restrict
);
create index inventory_positions_supplier_idx on public.inventory_positions (supplier_org_id);

-- Exposição NÃO autorizada até implementação de Auth, homologação e RLS por papel/capacidade.
alter table public.products enable row level security;
alter table public.supplier_products enable row level security;
alter table public.offers enable row level security;
alter table public.offer_price_tiers enable row level security;
alter table public.offer_regions enable row level security;
alter table public.inventory_positions enable row level security;

alter table public.products force row level security;
alter table public.supplier_products force row level security;
alter table public.offers force row level security;
alter table public.offer_price_tiers force row level security;
alter table public.offer_regions force row level security;
alter table public.inventory_positions force row level security;

revoke all on public.products, public.supplier_products, public.offers,
  public.offer_price_tiers, public.offer_regions, public.inventory_positions
  from anon, authenticated;

comment on table public.products is 'Produtos mestres somente de fontes homologadas; jamais catálogo VTEX externo.';
comment on table public.offers is 'Ofertas de organização autorizada; aprovação e estoque são necessários antes de venda.';
comment on table public.inventory_positions is 'Disponibilidade segregada por organização fornecedora, sem checkout ativo.';
