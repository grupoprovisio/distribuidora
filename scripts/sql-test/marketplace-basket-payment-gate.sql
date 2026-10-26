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
-- Addresses and rates exist ONLY in the disposable PostgreSQL CI transaction.
insert into public.buyer_contact_profiles
(user_id,buyer_org_id,full_name,contact_email,phone,postal_code,street,street_number,complement,neighborhood,city,state_code,reference)
values ('00000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000003',
 'Comprador QA Local','qa-buyer@example.invalid','11999999999','01001000',
 'Rua de Teste QA','123','','Centro','Sao Paulo','SP','Portaria QA');
insert into public.provisio_shipping_origin
(id,label,postal_code,street,street_number,neighborhood,city,state_code,pickup_enabled,active)
values (1,'Unidade QA Local','01001000','Rua da Unidade QA','321','Centro','Sao Paulo','SP',true,true);
insert into public.provisio_shipping_rates
(origin_id,label,postal_start,postal_end,destination_state,price_minor,min_business_days,max_business_days)
values (1,'Tarifa QA Capital',1000000,1999999,'SP',1780,2,4);

-- Statewide rates are set by ADM, not by a fabricated application default.
-- A specific active CEP band overrides this statewide price.
insert into public.provisio_shipping_state_rates
(origin_id,state_code,label,price_minor,min_business_days,max_business_days)
values (1,'SP','Cobertura geral SP QA',3250,3,7);

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
select test.assert_count((select count(*) from public.quote_baskets
 where request_key='90000000-0000-4000-8000-000000000090'
 and recipient_snapshot->>'fullName'='Comprador QA Local'
 and origin_snapshot->>'label'='Unidade QA Local'
 and freight_minor=0),1,'pickup has immutable contact and configured origin');
-- Delivery uses the ADM-authorized tariff; no buyer can invent their own price.
select public.marketplace_submit_quote_basket(
 '10000000-0000-4000-8000-000000000003','BR-SP','delivery',
 '[{"offerId":"40000000-0000-4000-8000-000000000001","quantity":1}]'::jsonb,
 '90000000-0000-4000-8000-000000000093');
select test.assert_count((select count(*) from public.quote_baskets
 where request_key='90000000-0000-4000-8000-000000000093'
 and freight_minor=1780 and min_business_days=2 and max_business_days=4
 and recipient_snapshot->>'reference'='Portaria QA'),1,
 'delivery freight and recipient reference come only from saved server data');
select test.assert_count((select count(*) from public.quote_baskets
 where request_key='90000000-0000-4000-8000-000000000093' and freight_source='cep_range'),1,
 'specific CEP tariff must override the statewide fallback');
select test.assert_count((select count(*) from public.provisio_shipping_state_rates
 where state_code='SP' and active=true),1,
 'QA buyer can read the enabled state default but cannot write it');

-- The same SP statewide price automatically applies to an interior CEP,
-- without inserting any individual postcode in the rates table.
update public.buyer_contact_profiles set postal_code='14801000',
 city='Araraquara',updated_at=now()
where user_id='00000000-0000-4000-8000-000000000003'
 and buyer_org_id='10000000-0000-4000-8000-000000000003';
select public.marketplace_submit_quote_basket(
 '10000000-0000-4000-8000-000000000003','BR-SP','delivery',
 '[{"offerId":"40000000-0000-4000-8000-000000000001","quantity":1}]'::jsonb,
 '90000000-0000-4000-8000-000000000094');
select test.assert_count((select count(*) from public.quote_baskets
 where request_key='90000000-0000-4000-8000-000000000094'
 and freight_minor=3250 and min_business_days=3 and max_business_days=7
 and freight_source='state_default' and freight_rate_id is null),1,
 'the statewide default is the only authorized freight for uncovered SP CEPs');

-- Sending an out-of-state ZIP while claiming an SP address cannot obtain
-- the SP default rate.
update public.buyer_contact_profiles set postal_code='21000000' where
 user_id='00000000-0000-4000-8000-000000000003'
 and buyer_org_id='10000000-0000-4000-8000-000000000003';
do $bad_zip$
declare denied boolean:=false;
begin
 begin
  perform public.marketplace_submit_quote_basket(
    '10000000-0000-4000-8000-000000000003','BR-SP','delivery',
    '[{"offerId":"40000000-0000-4000-8000-000000000001","quantity":1}]'::jsonb,
    '90000000-0000-4000-8000-000000000095');
 exception when sqlstate '22023' then denied:=true;end;
 if not denied then raise exception 'out-of-state ZIP used the SP base freight';end if;
end $bad_zip$;
update public.buyer_contact_profiles set postal_code='01001000',city='Sao Paulo'
 where user_id='00000000-0000-4000-8000-000000000003'
 and buyer_org_id='10000000-0000-4000-8000-000000000003';


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
