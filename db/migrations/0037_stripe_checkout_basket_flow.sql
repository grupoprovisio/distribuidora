-- Production payment flow: a validated basket becomes a Stripe Checkout
-- session and is marked paid only by the signed webhook.
create extension if not exists pgcrypto;

create or replace function public.marketplace_create_payment_basket(
  p_buyer uuid, p_region text, p_method text, p_lines jsonb, p_key uuid
) returns uuid language plpgsql volatile security definer set search_path=''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_buyer public.organizations%rowtype;
  v_basket uuid;
  v_line jsonb;
  v_offer public.offers%rowtype;
  v_sku public.supplier_products%rowtype;
  v_supplier public.organizations%rowtype;
  v_stock public.inventory_positions%rowtype;
  v_qty integer;
  v_hash text;
begin
  if v_uid is null or not marketplace_private.has_live_auth_session()
     or p_buyer is null or p_key is null or p_region !~ '^BR-[A-Z]{2}$'
     or p_method not in ('delivery','pickup')
     or jsonb_typeof(p_lines)<>'array'
     or jsonb_array_length(p_lines) not between 1 and 100 then
    raise exception 'invalid_payment_basket' using errcode='22023';
  end if;
  select * into v_buyer from public.organizations
    where id=p_buyer and kind='BUYER' and status='approved';
  if not found or not marketplace_private.has_active_capability(p_buyer,'BUYER')
     or not exists (select 1 from public.organization_members m
       where m.organization_id=p_buyer and m.user_id=v_uid and m.status='active'
       and m.role in ('ORG_ADMIN','BUYER','APPROVER')) then
    raise exception 'buyer_not_authorized' using errcode='42501';
  end if;
  if not exists (select 1 from public.buyer_delivery_regions
    where buyer_org_id=p_buyer and region_code=p_region) then
    raise exception 'region_not_authorized' using errcode='42501';
  end if;
  v_hash:=md5(p_lines::text||':'||p_region||':'||p_method);
  select id into v_basket from public.quote_baskets
    where buyer_org_id=p_buyer and request_key=p_key and created_by=v_uid;
  if found then return v_basket; end if;
  insert into public.quote_baskets
    (buyer_org_id,created_by,request_key,region_code,fulfillment_method,item_fingerprint)
  values (p_buyer,v_uid,p_key,p_region,p_method,v_hash)
  returning id into v_basket;
  for v_line in select value from jsonb_array_elements(p_lines) loop
    v_qty:=(v_line->>'quantity')::integer;
    select * into v_offer from public.offers where id=(v_line->>'offerId')::uuid;
    select * into v_sku from public.supplier_products where id=v_offer.supplier_product_id;
    select * into v_supplier from public.organizations where id=v_offer.supplier_org_id;
    select * into v_stock from public.inventory_positions
      where supplier_product_id=v_offer.supplier_product_id
        and supplier_org_id=v_offer.supplier_org_id;
    if not found or v_offer.status<>'approved' or v_offer.valid_from>now()
      or (v_offer.valid_to is not null and v_offer.valid_to<=now())
      or v_supplier.status<>'approved' or v_sku.status<>'approved'
      or v_supplier.qa_only is distinct from v_buyer.qa_only
      or v_stock.available_quantity-v_stock.reserved_quantity<v_qty
      or v_qty<v_offer.min_quantity
      or not exists (select 1 from public.offer_regions r
        where r.offer_id=v_offer.id and r.region_code in (p_region,'BR'))
      or not exists (select 1 from public.products p
        where p.id=v_sku.product_id and p.status='active') then
      raise exception 'offer_unavailable' using errcode='22023';
    end if;
    insert into public.quote_requests
      (buyer_org_id,supplier_org_id,offer_id,created_by,request_key,quantity,region_code,notes)
    values (p_buyer,v_offer.supplier_org_id,v_offer.id,v_uid,gen_random_uuid(),
      v_qty,p_region,'Pagamento Stripe Checkout')
    ;
  end loop;
  return v_basket;
end;
$$;

revoke all on function public.marketplace_create_payment_basket(uuid,text,text,jsonb,uuid)
  from public,anon,authenticated;
grant execute on function public.marketplace_create_payment_basket(uuid,text,text,jsonb,uuid)
  to authenticated;

create table if not exists marketplace_private.stripe_payment_config (
  id boolean primary key default true check(id),
  webhook_token_hash text not null
);
insert into marketplace_private.stripe_payment_config(id,webhook_token_hash)
values (true,'b1c93caf13741a875f9a15b2afb3853410fd178636735fbff62d177d9089fa78')
on conflict (id) do update set webhook_token_hash=excluded.webhook_token_hash;
revoke all on marketplace_private.stripe_payment_config from public,anon,authenticated;

create or replace function public.marketplace_mark_basket_paid(
  p_basket uuid, p_session text, p_token text
) returns boolean language plpgsql volatile security definer set search_path=''
as $$
begin
  if p_basket is null or p_session is null or p_token is null
     or not exists (select 1 from marketplace_private.stripe_payment_config
       where id=true and webhook_token_hash=encode(digest(p_token,'sha256'),'hex')) then
    raise exception 'payment_webhook_unauthorized' using errcode='42501';
  end if;
  update public.quote_baskets
    set payment_status='paid'
    where id=p_basket and payment_status='unpaid';
  return found;
end;
$$;
revoke all on function public.marketplace_mark_basket_paid(uuid,text,text)
  from public,authenticated;
grant execute on function public.marketplace_mark_basket_paid(uuid,text,text)
  to anon;
