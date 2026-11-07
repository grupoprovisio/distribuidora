alter table public.marketplace_payment_orders
  add column if not exists amount_total_minor bigint not null default 0
  check (amount_total_minor >= 0);

create or replace function public.marketplace_mark_basket_paid(
  p_basket uuid, p_session text, p_token text, p_amount bigint default 0
) returns boolean language plpgsql volatile security definer set search_path=''
as $$
declare v_buyer uuid;
begin
  if p_basket is null or p_session is null or p_token is null or p_amount is null or p_amount < 0
     or not exists (select 1 from marketplace_private.stripe_payment_config
       where id=true and webhook_token_hash=encode(extensions.digest(p_token,'sha256'),'hex')) then
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
    (basket_id,buyer_org_id,stripe_session_id,status,fulfillment_status,amount_total_minor)
  values (p_basket,v_buyer,p_session,'paid','paid',p_amount)
  on conflict (basket_id) do update set
    stripe_session_id=excluded.stripe_session_id,status='paid',fulfillment_status='paid',amount_total_minor=excluded.amount_total_minor;
  return true;
end;
$$;
revoke all on function public.marketplace_mark_basket_paid(uuid,text,text,bigint) from public,authenticated;
grant execute on function public.marketplace_mark_basket_paid(uuid,text,text,bigint) to anon;
