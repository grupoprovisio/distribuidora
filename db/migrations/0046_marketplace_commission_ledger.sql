create table if not exists public.marketplace_commission_rules(
  supplier_org_id uuid primary key references public.organizations(id) on delete restrict,
  rate_bps integer not null default 1500 check(rate_bps between 1000 and 2000),
  active boolean not null default true,
  updated_at timestamptz not null default now()
);
create table if not exists public.marketplace_commission_ledger(
  id uuid primary key default gen_random_uuid(),
  payment_order_id uuid not null references public.marketplace_payment_orders(id) on delete restrict,
  supplier_org_id uuid not null references public.organizations(id) on delete restrict,
  gross_minor bigint not null check(gross_minor>=0),
  commission_rate_bps integer not null check(commission_rate_bps between 1000 and 2000),
  commission_minor bigint not null check(commission_minor>=0),
  supplier_due_minor bigint not null check(supplier_due_minor>=0),
  status text not null default 'due' check(status in ('due','paid','reversed')),
  created_at timestamptz not null default now(),
  unique(payment_order_id,supplier_org_id)
);
alter table public.marketplace_commission_rules enable row level security;
alter table public.marketplace_commission_ledger enable row level security;
revoke all on public.marketplace_commission_rules,public.marketplace_commission_ledger from public,anon,authenticated;
grant select on public.marketplace_commission_rules,public.marketplace_commission_ledger to authenticated;
create policy commission_rules_admin_read on public.marketplace_commission_rules for select to authenticated using (marketplace_private.has_active_capability(supplier_org_id,'SUPPLIER') or marketplace_private.has_active_capability(supplier_org_id,'PLATFORM_OPERATOR'));
create policy commission_ledger_admin_read on public.marketplace_commission_ledger for select to authenticated using (marketplace_private.has_active_capability(supplier_org_id,'SUPPLIER') or marketplace_private.has_active_capability(supplier_org_id,'PLATFORM_OPERATOR'));

create or replace function public.marketplace_build_commission_ledger() returns trigger language plpgsql security definer set search_path='' as $$
declare r record; rate integer; gross bigint; fee bigint;
begin
  for r in select q.supplier_org_id,sum((o.base_price_minor::bigint*q.quantity)::bigint) gross_minor
    from public.quote_requests q join public.offers o on o.id=q.offer_id
    where q.basket_id=(select basket_id from public.marketplace_payment_orders where id=new.id)
    group by q.supplier_org_id loop
    select coalesce(cr.rate_bps,1500) into rate from public.marketplace_commission_rules cr where cr.supplier_org_id=r.supplier_org_id and cr.active;
    rate:=coalesce(rate,1500); gross:=coalesce(r.gross_minor,0); fee:=floor(gross*rate/10000);
    insert into public.marketplace_commission_ledger(payment_order_id,supplier_org_id,gross_minor,commission_rate_bps,commission_minor,supplier_due_minor)
      values(new.id,r.supplier_org_id,gross,rate,fee,gross-fee) on conflict(payment_order_id,supplier_org_id) do nothing;
  end loop; return new;
end; $$;
drop trigger if exists marketplace_payment_order_commission on public.marketplace_payment_orders;
create trigger marketplace_payment_order_commission after insert on public.marketplace_payment_orders for each row execute function public.marketplace_build_commission_ledger();
