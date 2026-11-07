alter table public.marketplace_payment_orders
  add column if not exists inventory_applied boolean not null default false;

create or replace function public.marketplace_mark_basket_paid(
  p_basket uuid, p_session text, p_token text, p_amount bigint default 0
) returns boolean language plpgsql volatile security definer set search_path=''
as $$
declare
  v_buyer uuid;
  v_order public.marketplace_payment_orders%rowtype;
  v_quote record;
  v_stock public.inventory_positions%rowtype;
begin
  if p_basket is null or p_session is null or p_token is null or p_amount is null or p_amount < 0
     or not exists (select 1 from marketplace_private.stripe_payment_config
       where id=true and webhook_token_hash=encode(extensions.digest(p_token,'sha256'),'hex')) then
    raise exception 'payment_webhook_unauthorized' using errcode='42501';
  end if;
  select * into v_order from public.marketplace_payment_orders where basket_id=p_basket for update;
  if found and v_order.inventory_applied then return true; end if;
  select buyer_org_id into v_buyer from public.quote_baskets where id=p_basket for update;
  if v_buyer is null then return false; end if;
  update public.quote_baskets set payment_status='paid' where id=p_basket;
  for v_quote in
    select q.offer_id,q.quantity,o.supplier_product_id,o.supplier_org_id
    from public.quote_requests q join public.offers o on o.id=q.offer_id
    where q.basket_id=p_basket
  loop
    select * into v_stock from public.inventory_positions
      where supplier_product_id=v_quote.supplier_product_id
        and supplier_org_id=v_quote.supplier_org_id for update;
    if not found or v_stock.available_quantity-v_stock.reserved_quantity<v_quote.quantity then
      raise exception 'paid_stock_unavailable' using errcode='22023';
    end if;
    update public.inventory_positions set available_quantity=available_quantity-v_quote.quantity,updated_at=now()
      where supplier_product_id=v_quote.supplier_product_id and supplier_org_id=v_quote.supplier_org_id;
  end loop;
  insert into public.marketplace_payment_orders
    (basket_id,buyer_org_id,stripe_session_id,status,fulfillment_status,amount_total_minor,inventory_applied)
  values (p_basket,v_buyer,p_session,'paid','paid',p_amount,true)
  on conflict (basket_id) do update set
    stripe_session_id=excluded.stripe_session_id,status='paid',fulfillment_status='paid',
    amount_total_minor=excluded.amount_total_minor,inventory_applied=true;
  return true;
end;
$$;
revoke all on function public.marketplace_mark_basket_paid(uuid,text,text,bigint) from public,authenticated;
grant execute on function public.marketplace_mark_basket_paid(uuid,text,text,bigint) to anon;
