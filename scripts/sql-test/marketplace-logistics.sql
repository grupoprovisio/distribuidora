-- Teste SQL isolado, executado DEPOIS de marketplace-fulfillment.sql com fixtures descartaveis.
-- Nunca executar no Supabase hospedado: IDs/sessoes abaixo sao de bootstrap local.
reset role;
-- O teste anterior deixa o estoque do SKU A em 100 e os vinculos ativos.
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
select set_config('request.jwt.claims','{"aal":"aal1","session_id":"70000000-0000-4000-8000-000000000013"}',false);
select public.marketplace_create_quote(
 '10000000-0000-4000-8000-000000000003','40000000-0000-4000-8000-000000000001',4,
 'BR-SP','Homologacao de entrega','90000000-0000-4000-8000-000000000007');
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
select set_config('request.jwt.claims','{"aal":"aal1","session_id":"70000000-0000-4000-8000-000000000011"}',false);
select public.marketplace_propose_quote(
 (select id from public.quote_requests where request_key='90000000-0000-4000-8000-000000000007'),
 2490,now()+interval '7 days');
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
select set_config('request.jwt.claims','{"aal":"aal1","session_id":"70000000-0000-4000-8000-000000000013"}',false);
select public.marketplace_submit_checkout(
 '10000000-0000-4000-8000-000000000003',
 (select id from public.quote_requests where request_key='90000000-0000-4000-8000-000000000007'),
 (select id from public.quote_proposals where quote_request_id=(
  select id from public.quote_requests where request_key='90000000-0000-4000-8000-000000000007')),
 '90000000-0000-4000-8000-000000000008');
select test.expect_transition_denied(
 'select public.marketplace_advance_fulfillment((select id from public.purchase_orders where checkout_key=''90000000-0000-4000-8000-000000000008''),''start_separation'',500,null,null)');
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
select set_config('request.jwt.claims','{"aal":"aal1","session_id":"70000000-0000-4000-8000-000000000011"}',false);
select public.marketplace_transition_order(
 (select id from public.purchase_orders where checkout_key='90000000-0000-4000-8000-000000000008'),
 'supplier_confirm');
select test.expect_transition_denied(
 'select public.marketplace_advance_fulfillment((select id from public.purchase_orders where checkout_key=''90000000-0000-4000-8000-000000000008''),''dispatch'',null,null,null)');
select public.marketplace_advance_fulfillment(
 (select id from public.purchase_orders where checkout_key='90000000-0000-4000-8000-000000000008'),
 'start_separation',500,current_date+3,null);
select public.marketplace_advance_fulfillment(
 (select id from public.purchase_orders where checkout_key='90000000-0000-4000-8000-000000000008'),
 'start_separation',500,current_date+3,null);
select public.marketplace_advance_fulfillment(
 (select id from public.purchase_orders where checkout_key='90000000-0000-4000-8000-000000000008'),
 'mark_ready',null,null,null);
select public.marketplace_advance_fulfillment(
 (select id from public.purchase_orders where checkout_key='90000000-0000-4000-8000-000000000008'),
 'dispatch',null,null,'HOMOLOGACAO-SEM-TRANSPORTADORA');
select public.marketplace_advance_fulfillment(
 (select id from public.purchase_orders where checkout_key='90000000-0000-4000-8000-000000000008'),
 'deliver',null,null,null);
select public.marketplace_advance_fulfillment(
 (select id from public.purchase_orders where checkout_key='90000000-0000-4000-8000-000000000008'),
 'deliver',null,null,null);
select test.assert_count((select count(*) from public.order_fulfillments where status='delivered' and freight_estimate_minor=500 and delivered_at is not null),1,
 'manual delivery and freight estimate recorded');
select test.expect_transition_denied(
 'select public.marketplace_transition_order((select id from public.purchase_orders where checkout_key=''90000000-0000-4000-8000-000000000008''),''supplier_cancel'')');
reset role;
select test.assert_count((select count(*) from marketplace_private.fulfillment_audit
 where to_status in ('separating','ready_to_dispatch','in_transit','delivered')),4,
 'each manual step logged once, retries idempotent');
select test.assert_count((select count(*) from public.inventory_positions where supplier_product_id='30000000-0000-4000-8000-000000000001' and reserved_quantity=0 and available_quantity=96),1,
 'dispatch debits inventory and reservation exactly once');

-- Buyer and unrelated supplier isolation via RLS.
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
select set_config('request.jwt.claims','{"aal":"aal1","session_id":"70000000-0000-4000-8000-000000000013"}',false);
select test.assert_count((select count(*) from public.order_fulfillments),1,'buyer sees own shipping state');
select test.expect_transition_denied(
 'select public.marketplace_advance_fulfillment((select id from public.purchase_orders where checkout_key=''90000000-0000-4000-8000-000000000008''),''deliver'',null,null,null)');
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
select set_config('request.jwt.claims','{"aal":"aal1","session_id":"70000000-0000-4000-8000-000000000012"}',false);
select test.assert_count((select count(*) from public.order_fulfillments),0,'supplier B never sees supplier A fulfillment');
reset role;
set role anon;
select test.expect_permission_denied('select * from public.order_fulfillments');
select test.expect_permission_denied('select public.marketplace_advance_fulfillment(gen_random_uuid(),''dispatch'',null,null,null)');
reset role;
select 'PASS: manual fulfillment transitions, buyer visibility, cross-supplier denial and idempotency' as result;
