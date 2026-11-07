create table if not exists public.marketplace_payment_orders (
  id uuid primary key default gen_random_uuid(),
  basket_id uuid not null unique references public.quote_baskets(id) on delete restrict,
  buyer_org_id uuid not null references public.organizations(id) on delete restrict,
  stripe_session_id text not null unique,
  status text not null default 'paid' check(status in ('paid','refunded')),
  created_at timestamptz not null default now()
);
alter table public.marketplace_payment_orders enable row level security;
alter table public.marketplace_payment_orders force row level security;
revoke all on public.marketplace_payment_orders from public,anon,authenticated;
grant select on public.marketplace_payment_orders to authenticated;
create policy payment_order_read_buyer on public.marketplace_payment_orders
  for select to authenticated
  using (marketplace_private.has_active_capability(buyer_org_id,'BUYER'));

create or replace function public.marketplace_mark_basket_paid(
  p_basket uuid, p_session text, p_token text
) returns boolean language plpgsql volatile security definer set search_path=''
as $$
declare v_buyer uuid;
begin
  if p_basket is null or p_session is null or p_token is null
     or not exists (select 1 from marketplace_private.stripe_payment_config
       where id=true and webhook_token_hash=encode(digest(p_token,'sha256'),'hex')) then
    raise exception 'payment_webhook_unauthorized' using errcode='42501';
  end if;
  update public.quote_baskets set payment_status='paid'
    where id=p_basket and payment_status='unpaid'
    returning buyer_org_id into v_buyer;
  if v_buyer is null then
    select buyer_org_id into v_buyer from public.quote_baskets where id=p_basket;
  end if;
  if v_buyer is null then return false; end if;
  insert into public.marketplace_payment_orders
    (basket_id,buyer_org_id,stripe_session_id,status)
  values (p_basket,v_buyer,p_session,'paid')
  on conflict (basket_id) do update set
    stripe_session_id=excluded.stripe_session_id,status='paid';
  return true;
end;
$$;
revoke all on function public.marketplace_mark_basket_paid(uuid,text,text)
  from public,authenticated;
grant execute on function public.marketplace_mark_basket_paid(uuid,text,text)
  to anon;
