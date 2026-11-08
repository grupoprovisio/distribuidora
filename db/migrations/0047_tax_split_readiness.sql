alter table public.marketplace_payment_orders add column if not exists tax_split_status text not null default 'pending' check(tax_split_status in ('pending','calculated','separated','collected','rejected'));
alter table public.marketplace_payment_orders add column if not exists fiscal_document_id uuid;

create table if not exists public.marketplace_fiscal_documents(
  id uuid primary key default gen_random_uuid(),
  payment_order_id uuid not null unique references public.marketplace_payment_orders(id) on delete restrict,
  issuer_cnpj text,
  regime text,
  environment text not null default 'homologation' check(environment in ('homologation','production')),
  status text not null default 'draft' check(status in ('draft','submitted','authorized','rejected','cancelled')),
  access_key text,
  xml_storage_path text,
  danfe_storage_path text,
  provider text,
  provider_document_id text,
  rejection_code text,
  rejection_message text,
  issued_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.marketplace_payment_orders add constraint marketplace_payment_orders_fiscal_document_fk foreign key(fiscal_document_id) references public.marketplace_fiscal_documents(id) on delete set null;

create table if not exists public.marketplace_tax_split_ledger(
  id uuid primary key default gen_random_uuid(),
  payment_order_id uuid not null references public.marketplace_payment_orders(id) on delete restrict,
  fiscal_document_id uuid references public.marketplace_fiscal_documents(id) on delete restrict,
  tax_type text not null check(tax_type in ('IBS','CBS')),
  destination text not null check(destination in ('CG_IBS','RFB')),
  base_minor bigint not null check(base_minor>=0),
  rate_bps integer not null check(rate_bps between 0 and 10000),
  amount_minor bigint not null check(amount_minor>=0),
  status text not null default 'pending' check(status in ('pending','calculated','separated','collected','rejected')),
  provider_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(payment_order_id,tax_type)
);

create table if not exists public.marketplace_supplier_payouts(
  id uuid primary key default gen_random_uuid(),
  payment_order_id uuid not null references public.marketplace_payment_orders(id) on delete restrict,
  supplier_org_id uuid not null references public.organizations(id) on delete restrict,
  gross_minor bigint not null check(gross_minor>=0),
  commission_minor bigint not null check(commission_minor>=0),
  net_minor bigint not null check(net_minor>=0),
  status text not null default 'pending_connect' check(status in ('pending_connect','pending','transferred','failed','reversed')),
  stripe_connected_account_id text,
  stripe_transfer_id text,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(payment_order_id,supplier_org_id)
);

alter table public.marketplace_fiscal_documents enable row level security;
alter table public.marketplace_tax_split_ledger enable row level security;
alter table public.marketplace_supplier_payouts enable row level security;
revoke all on public.marketplace_fiscal_documents,public.marketplace_tax_split_ledger,public.marketplace_supplier_payouts from public,anon,authenticated;
grant select on public.marketplace_fiscal_documents,public.marketplace_tax_split_ledger,public.marketplace_supplier_payouts to authenticated;

create or replace function public.marketplace_prepare_tax_split(p_order uuid,p_ibs_bps integer default null,p_cbs_bps integer default null) returns boolean language plpgsql security definer set search_path='' as $$
declare v_order public.marketplace_payment_orders%rowtype; v_doc uuid; v_base bigint; v_ibs integer; v_cbs integer;
begin
  select * into v_order from public.marketplace_payment_orders where id=p_order for update;
  if not found or v_order.status<>'paid' then return false; end if;
  v_base:=coalesce(v_order.amount_total_minor,0); v_ibs:=coalesce(p_ibs_bps,0); v_cbs:=coalesce(p_cbs_bps,0);
  insert into public.marketplace_fiscal_documents(payment_order_id,status,environment) values(p_order,'draft','homologation') on conflict(payment_order_id) do nothing returning id into v_doc;
  if v_doc is null then select id into v_doc from public.marketplace_fiscal_documents where payment_order_id=p_order; end if;
  insert into public.marketplace_tax_split_ledger(payment_order_id,fiscal_document_id,tax_type,destination,base_minor,rate_bps,amount_minor,status) values
    (p_order,v_doc,'IBS','CG_IBS',v_base,v_ibs,floor(v_base*v_ibs/10000),'calculated'),
    (p_order,v_doc,'CBS','RFB',v_base,v_cbs,floor(v_base*v_cbs/10000),'calculated')
  on conflict(payment_order_id,tax_type) do update set base_minor=excluded.base_minor,rate_bps=excluded.rate_bps,amount_minor=excluded.amount_minor,status='calculated',updated_at=now();
  update public.marketplace_payment_orders set tax_split_status='calculated',fiscal_document_id=v_doc where id=p_order and tax_split_status='pending';
  return true;
end; $$;
revoke all on function public.marketplace_prepare_tax_split(uuid,integer,integer) from public,anon,authenticated;
grant execute on function public.marketplace_prepare_tax_split(uuid,integer,integer) to authenticated;
