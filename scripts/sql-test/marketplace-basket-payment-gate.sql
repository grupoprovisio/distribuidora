-- Disposable CI only. Verify atomic buyer basket quote, idempotency,
-- dual-realm protection and prepayment blocking without persisting records.
begin;
reset role;
update public.profiles set status='active'
where id in ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000003');
update public.organization_members set status='active'
where user_id='00000000-0000-4000-8000-000000000003'
and organization_id='10000000-0000-4000-8000-000000000003';
update public.organization_members set status='active'
where user_id='00000000-0000-4000-8000-000000000001'
and organization_id='10000000-0000-4000-8000-000000000001';
update public.organization_capabilities set status='approved'
where organization_id='10000000-0000-4000-8000-000000000001'
and capability='SUPPLIER';
update public.organizations set status='approved'
where id in ('10000000-0000-4000-8000-000000000001',
             '10000000-0000-4000-8000-000000000003');
update public.organizations set qa_only=true
where id in ('10000000-0000-4000-8000-000000000001',
             '10000000-0000-4000-8000-000000000003');
insert into public.offer_price_tiers(offer_id,min_quantity,unit_price_minor)
 values('40000000-0000-4000-8000-000000000001',5,900)
 on conflict(offer_id,min_quantity) do update set unit_price_minor=excluded.unit_price_minor;

insert into auth.sessions(id,user_id,aal,not_after) values
 ('70000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000001','aal1',now()+interval '1 day'),
 ('70000000-0000-4000-8000-000000000013','00000000-0000-4000-8000-000000000003','aal1',now()+interval '1 day')
on conflict(id) do update set not_after=excluded.not_after;

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',true);
select set_config('request.jwt.claims','{"aal":"aal1","session_id":"70000000-0000-4000-8000-000000000013"}',true);
select test.assert_count((select count(*) from public.offer_price_tiers
 where offer_id='40000000-0000-4000-8000-000000000001' and min_quantity=5),1,
 'authorized QA buyer can read progressive price tiers via RLS');
select public.marketplace_submit_quote_basket(
 '10000000-0000-4000-8000-000000000003','BR-SP','pickup',
 '[{"offerId":"40000000-0000-4000-8000-000000000001","quantity":2}]'::jsonb,
 '90000000-0000-4000-8000-000000000090');
select public.marketplace_submit_quote_basket(
 '10000000-0000-4000-8000-000000000003','BR-SP','pickup',
 '[{"offerId":"40000000-0000-4000-8000-000000000001","quantity":2}]'::jsonb,
 '90000000-0000-4000-8000-000000000090');
select test.assert_count((select count(*) from public.quote_baskets
 where request_key='90000000-0000-4000-8000-000000000090'),1,
 'basket idempotency should create exactly one grouping');
select test.assert_count((select count(*) from public.quote_requests
 where basket_id in (select id from public.quote_baskets
 where request_key='90000000-0000-4000-8000-000000000090')),1,
 'basket should attach exactly one quote');
-- Capture the quote id while acting as buyer. Suppliers intentionally cannot
-- SELECT the buyer's basket row, but can read their own quote by its id.
select set_config('test.basket_quote_id',(
 select id::text from public.quote_requests where basket_id in (
 select id from public.quote_baskets where request_key='90000000-0000-4000-8000-000000000090')
 limit 1),true);
do $conflict$
declare blocked boolean:=false;
begin
 begin
  perform public.marketplace_submit_quote_basket(
   '10000000-0000-4000-8000-000000000003','BR-SP','pickup',
   '[{"offerId":"40000000-0000-4000-8000-000000000001","quantity":3}]'::jsonb,
   '90000000-0000-4000-8000-000000000090');
 exception when sqlstate '22023' then blocked:=true;end;
 if not blocked then raise exception 'idempotency payload change accepted';end if;
end $conflict$;
do $atomic$
declare blocked boolean:=false;
begin
 begin
  perform public.marketplace_submit_quote_basket(
   '10000000-0000-4000-8000-000000000003','BR-SP','delivery',
   '[{"offerId":"40000000-0000-4000-8000-000000000001","quantity":1},{"offerId":"40000000-0000-4000-8000-000000000099","quantity":1}]'::jsonb,
   '90000000-0000-4000-8000-000000000091');
 exception when sqlstate '22023' then blocked:=true;end;
 if not blocked then raise exception 'mixed invalid basket succeeded';end if;
end $atomic$;
select test.assert_count((select count(*) from public.quote_baskets
 where request_key='90000000-0000-4000-8000-000000000091'),0,
 'invalid line should roll back entire grouped request');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"aal":"aal1","session_id":"70000000-0000-4000-8000-000000000011"}',true);

select test.assert_count((select count(*) from public.quote_requests
 where id=current_setting('test.basket_quote_id')::uuid),1,
 'supplier A must read its own quote without viewing buyer-only basket metadata');
select public.marketplace_propose_quote(
 current_setting('test.basket_quote_id')::uuid,
 2500,now()+interval '7 days');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',true);
select set_config('request.jwt.claims','{"aal":"aal1","session_id":"70000000-0000-4000-8000-000000000013"}',true);
select public.marketplace_submit_checkout(
 '10000000-0000-4000-8000-000000000003',
 (select id from public.quote_requests where basket_id in (
   select id from public.quote_baskets where request_key='90000000-0000-4000-8000-000000000090')),
 (select id from public.quote_proposals where quote_request_id in (
   select id from public.quote_requests where basket_id in (
     select id from public.quote_baskets where request_key='90000000-0000-4000-8000-000000000090'))),
 '90000000-0000-4000-8000-000000000092');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"aal":"aal1","session_id":"70000000-0000-4000-8000-000000000011"}',true);
do $not_paid$
declare denied boolean:=false;
begin
 begin
  perform public.marketplace_transition_order(
   (select id from public.purchase_orders where checkout_key='90000000-0000-4000-8000-000000000092'),
   'supplier_confirm');
 exception when sqlstate '22023' then denied:=true;end;
 if not denied then raise exception 'supplier confirmed unpaid grouped order';end if;
end $not_paid$;
reset role;
select test.assert_count((
 select count(*) from public.purchase_orders where checkout_key='90000000-0000-4000-8000-000000000092'
 and status='awaiting_supplier_confirmation'),1,
 'unpaid grouped order must stay pending');
select test.assert_count((
 select count(*) from public.order_fulfillments where order_id in (
 select id from public.purchase_orders where checkout_key='90000000-0000-4000-8000-000000000092')),0,
 'unpaid grouped order may not be separated');
rollback;
select 'PASS: quote baskets are atomic, idempotent and payment-gated' as result;
