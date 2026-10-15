-- DOCUMENTO DE DESENHO, NAO E UMA MIGRACAO PRONTA PARA EXECUCAO.
-- Nao executar em Supabase remoto / producao. Validar em banco local isolado.
-- Depende do contrato de identidade em db/migrations/0001_marketplace_foundation.sql.
-- Nenhuma policy permissiva, role ou usuario e criada.

create table if not exists public.marketplace_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{0,119}$'),
  name text not null check (length(trim(name)) between 2 and 180),
  status text not null default 'draft' check (status in ('draft','approved','suspended')),
  created_at timestamptz not null default now()
);

create table if not exists public.marketplace_products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{0,159}$'),
  category_id uuid references public.marketplace_categories(id),
  name text not null check (length(trim(name)) between 2 and 250),
  description text,
  base_unit text not null check (base_unit in ('un','kg','l')),
  status text not null default 'draft' check (status in ('draft','approved','suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.marketplace_product_identifiers (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.marketplace_products(id),
  identifier_type text not null check (identifier_type in ('GTIN','AUTHORIZED_CODE')),
  identifier_value text not null check (length(trim(identifier_value)) between 6 and 128),
  unique (identifier_type, identifier_value)
);

create table if not exists public.marketplace_supplier_products (
  id uuid primary key default gen_random_uuid(),
  supplier_org_id uuid not null references public.organizations(id),
  product_id uuid not null references public.marketplace_products(id),
  supplier_sku text not null check (length(trim(supplier_sku)) between 1 and 120),
  pack_quantity numeric(18,3) not null check (pack_quantity > 0),
  pack_unit text not null check (length(trim(pack_unit)) between 1 and 32),
  source_type text not null check (source_type in (
    'MANUAL_AUTHORIZED', 'SUPPLIER_CSV_AUTHORIZED',
    'SUPPLIER_API_AUTHORIZED', 'PLATFORM_STOCK'
  )),
  status text not null default 'pending' check (status in ('pending','approved','rejected','suspended')),
  created_at timestamptz not null default now(),
  unique (supplier_org_id, supplier_sku),
  unique (id, supplier_org_id)
);

create table if not exists public.marketplace_offers (
  id uuid primary key default gen_random_uuid(),
  supplier_product_id uuid not null,
  supplier_org_id uuid not null,
  currency text not null default 'BRL' check (currency = 'BRL'),
  base_price_minor bigint not null check (base_price_minor >= 0),
  min_quantity numeric(18,3) not null check (min_quantity > 0),
  lead_time_days integer check (lead_time_days >= 0),
  status text not null default 'pending' check (status in ('pending','approved','suspended','expired')),
  valid_from timestamptz not null,
  valid_to timestamptz,
  created_at timestamptz not null default now(),
  check (valid_to is null or valid_to >= valid_from),
  foreign key (supplier_product_id, supplier_org_id)
    references public.marketplace_supplier_products(id, supplier_org_id),
  unique (id, supplier_org_id)
);

create table if not exists public.marketplace_offer_price_tiers (
  offer_id uuid not null references public.marketplace_offers(id) on delete cascade,
  min_quantity numeric(18,3) not null check (min_quantity > 0),
  unit_price_minor bigint not null check (unit_price_minor >= 0),
  primary key (offer_id, min_quantity)
);

create table if not exists public.marketplace_offer_regions (
  offer_id uuid not null references public.marketplace_offers(id) on delete cascade,
  region_code text not null check (region_code ~ '^[A-Z]{2}(-[A-Z0-9]{2,12})?$'),
  primary key (offer_id, region_code)
);

create table if not exists public.marketplace_offer_inventory (
  offer_id uuid primary key references public.marketplace_offers(id) on delete cascade,
  available_quantity numeric(18,3) not null check (available_quantity >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.marketplace_approval_events (
  id uuid primary key default gen_random_uuid(),
  actor_profile_id uuid references public.profiles(id),
  supplier_org_id uuid not null references public.organizations(id),
  subject_type text not null check (subject_type in ('SUPPLIER','SUPPLIER_PRODUCT','OFFER')),
  subject_id uuid not null,
  action text not null check (action in ('SUBMITTED','APPROVED','REJECTED','SUSPENDED')),
  reason text,
  created_at timestamptz not null default now()
);
-- Append-only deve ser garantido por privilegios e/ou trigger auditado no futuro.

create index if not exists marketplace_supplier_products_product_idx
  on public.marketplace_supplier_products (product_id, status);
create index if not exists marketplace_supplier_products_org_idx
  on public.marketplace_supplier_products (supplier_org_id, status);
create index if not exists marketplace_offers_supplier_idx
  on public.marketplace_offers (supplier_org_id, status, valid_from);
create index if not exists marketplace_offer_regions_code_idx
  on public.marketplace_offer_regions (region_code, offer_id);
create index if not exists marketplace_approval_events_subject_idx
  on public.marketplace_approval_events (subject_type, subject_id, created_at);

-- RLS fail-closed, SEM policies de acesso ou grants para anon/authenticated.
-- O catalogo publico e as operacoes reais devem ser feitos por consultas
-- autenticadas e policies especificas testadas em staging.
alter table public.marketplace_categories enable row level security;
alter table public.marketplace_products enable row level security;
alter table public.marketplace_product_identifiers enable row level security;
alter table public.marketplace_supplier_products enable row level security;
alter table public.marketplace_offers enable row level security;
alter table public.marketplace_offer_price_tiers enable row level security;
alter table public.marketplace_offer_regions enable row level security;
alter table public.marketplace_offer_inventory enable row level security;
alter table public.marketplace_approval_events enable row level security;

alter table public.marketplace_categories force row level security;
alter table public.marketplace_products force row level security;
alter table public.marketplace_product_identifiers force row level security;
alter table public.marketplace_supplier_products force row level security;
alter table public.marketplace_offers force row level security;
alter table public.marketplace_offer_price_tiers force row level security;
alter table public.marketplace_offer_regions force row level security;
alter table public.marketplace_offer_inventory force row level security;
alter table public.marketplace_approval_events force row level security;
