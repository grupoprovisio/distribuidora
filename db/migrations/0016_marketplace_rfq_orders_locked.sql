-- RFQ and checkout foundations: staged only. NEVER enable checkout or apply in production
-- without authenticated Preview E2E and independent security review.
-- These tables intentionally expose no direct authenticated or anonymous access.
create table if not exists public.buyer_rfqs (
 id uuid primary key default gen_random_uuid(),
 buyer_org_id uuid not null references public.organizations(id) on delete restrict,
 requested_by uuid not null references auth.users(id) on delete restrict,
 region_code text not null check (region_code ~ '^BR-[A-Z]{2}$'),
 status text not null default 'draft' check (status in ('draft','submitted','quoted','cancelled','expired')),
 notes text not null default '' check (length(notes) <= 2000),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists buyer_rfqs_org_created_idx on public.buyer_rfqs (buyer_org_id,created_at desc);
create table if not exists public.buyer_rfq_items (
 id uuid primary key default gen_random_uuid(),
 rfq_id uuid not null references public.buyer_rfqs(id) on delete cascade,
 offer_id uuid not null references public.offers(id) on delete restrict,
 quantity integer not null check (quantity between 1 and 100000),
 unique (rfq_id,offer_id)
);
create table if not exists public.buyer_orders (
 id uuid primary key default gen_random_uuid(),
 buyer_org_id uuid not null references public.organizations(id) on delete restrict,
 created_by uuid not null references auth.users(id) on delete restrict,
 region_code text not null check (region_code ~ '^BR-[A-Z]{2}$'),
 idempotency_key uuid not null,
 status text not null default 'pending' check (status in ('pending','confirmed','cancelled','fulfilled')),
 total_minor bigint not null default 0 check (total_minor >= 0),
 created_at timestamptz not null default now(),
 unique (buyer_org_id,idempotency_key)
);
create table if not exists public.buyer_order_items (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.buyer_orders(id) on delete restrict,
 supplier_org_id uuid not null references public.organizations(id) on delete restrict,
 offer_id uuid not null references public.offers(id) on delete restrict,
 quantity integer not null check (quantity between 1 and 100000),
 unit_price_minor bigint not null check (unit_price_minor >= 0),
 unique (order_id,offer_id)
);
create index if not exists buyer_orders_org_created_idx on public.buyer_orders (buyer_org_id,created_at desc);
create index if not exists buyer_order_items_supplier_idx on public.buyer_order_items (supplier_org_id,order_id);
alter table public.buyer_rfqs enable row level security;
alter table public.buyer_rfq_items enable row level security;
alter table public.buyer_orders enable row level security;
alter table public.buyer_order_items enable row level security;
alter table public.buyer_rfqs force row level security;
alter table public.buyer_rfq_items force row level security;
alter table public.buyer_orders force row level security;
alter table public.buyer_order_items force row level security;
revoke all on public.buyer_rfqs, public.buyer_rfq_items, public.buyer_orders, public.buyer_order_items from anon, authenticated;
-- No policies, no grants, no RPC, no direct writes until transactional
-- validation, stock locking, tenant authorization and payment orchestration are reviewed.
comment on table public.buyer_orders is 'Staging schema only: no active checkout or payment processing.';
