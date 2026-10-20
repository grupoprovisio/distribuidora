-- Test new fulfillment on disposable PostgreSQL AFTER marketplace-transactional.sql.
reset role;
-- Transition rejections intentionally use SQLSTATE 22023 (invalid state) or 42501
-- (access denied). The generic bootstrap helper handles only 42501.
create function test.expect_transition_denied(statement text)
returns void language plpgsql security invoker set search_path=''
as $
begin
  begin
    execute statement;
  exception when insufficient_privilege or invalid_parameter_value or check_violation then
    return;
  end;
  raise exception 'transition unexpectedly succeeded';
end;
$;
grant execute on function test.expect_transition_denied(text) to authenticated;

-- The previous suite revokes buyer access deliberately; explicitly restore fixture.
update public.organization_members set status='active'
where organization_id='10000000-0000-4000-8000-000000000003'
 and user_id='00000000-0000-4000-8000-000000000003';
select test.assert_count((select count(*) from public.purchase_orders
 where status='awaiting_supplier_confirmation'),1,'pending fixture order present');
select test.assert_count((select count(*) from public.inventory_positions
 where supplier_product_id='30000000-0000-4000-8000-000000000001'
 and reserved_quantity=0),1,'no reservation before supplier confirmation');

-- Cross-supplier action is rejected and cannot leak order data.
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
select set_config('request.jwt.claims','{"aal":"aal1","session_id":"70000000-0000-4000-8000-000000000012"}',false);
select test.expect_transition_denied(
 'select public.marketplace_transition_order(
   (select id from public.purchase_orders where supplier_org_id=''10000000-0000-4000-8000-000000000001'' limit 1),
   ''supplier_confirm'')');
reset role;

-- Buyer cannot impersonate supplier and cannot directly modify order/stock.
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
select set_config('request.jwt.claims','{"aal":"aal1","session_id":"70000000-0000-4000-8000-000000000013"}',false);
select test.expect_transition_denied('select public.marketplace_transition_order(
  (select id from public.purchase_orders limit 1),''supplier_confirm'')');
select test.expect_permission_denied('update public.purchase_orders set status=''confirmed''');
select test.expect_permission_denied('update public.inventory_positions set reserved_quantity=50');
reset role;

-- Supplier A atomically confirms one order and reserves exactly 2 units.
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
select set_config('request.jwt.claims','{"aal":"aal1","session_id":"70000000-0000-4000-8000-000000000011"}',false);
select public.marketplace_transition_order(
 (select id from public.purchase_orders where checkout_key='90000000-0000-4000-8000-000000000002'),
 'supplier_confirm');
select public.marketplace_transition_order(
 (select id from public.purchase_orders where checkout_key='90000000-0000-4000-8000-000000000002'),
 'supplier_confirm');
select test.assert_count((select count(*) from public.purchase_orders where status='confirmed'),1,
  'supplier confirmation persisted exactly once');
select test.assert_count((select count(*) from public.inventory_positions
 where supplier_product_id='30000000-0000-4000-8000-000000000001'
 and reserved_quantity=2),1,'exact two units reserved without duplicate effects');
reset role;
select test.assert_count((select count(*) from marketplace_private.order_transition_audit
 where from_status='awaiting_supplier_confirmation' and to_status='confirmed'),1,
 'one audit event for idempotent supplier confirmation');

-- The buyer cannot cancel confirmed orders and the supplier may cancel/release once.
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
select set_config('request.jwt.claims','{"aal":"aal1","session_id":"70000000-0000-4000-8000-000000000013"}',false);
select test.expect_transition_denied('select public.marketplace_transition_order(
 (select id from public.purchase_orders where status=''confirmed'' limit 1),
 ''buyer_cancel'')');
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
select set_config('request.jwt.claims','{"aal":"aal1","session_id":"70000000-0000-4000-8000-000000000011"}',false);
select public.marketplace_transition_order(
 (select id from public.purchase_orders where checkout_key='90000000-0000-4000-8000-000000000002'),
 'supplier_cancel');
select public.marketplace_transition_order(
 (select id from public.purchase_orders where checkout_key='90000000-0000-4000-8000-000000000002'),
 'supplier_cancel');
reset role;
select test.assert_count((select count(*) from public.inventory_positions
 where supplier_product_id='30000000-0000-4000-8000-000000000001'
 and reserved_quantity=0),1,'cancellation released reserved stock only once');
select test.assert_count((select count(*) from marketplace_private.order_transition_audit
 where to_status='cancelled'),1,'cancel audit only once');

-- Create a separate order, reject before reservation; no side effects on stock.
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
select set_config('request.jwt.claims','{"aal":"aal1","session_id":"70000000-0000-4000-8000-000000000013"}',false);
select public.marketplace_create_quote(
 '10000000-0000-4000-8000-000000000003','40000000-0000-4000-8000-000000000001',3,
 'BR-SP','Rejeicao de teste','90000000-0000-4000-8000-000000000003');
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
select set_config('request.jwt.claims','{"aal":"aal1","session_id":"70000000-0000-4000-8000-000000000011"}',false);
select public.marketplace_propose_quote(
 (select id from public.quote_requests where request_key='90000000-0000-4000-8000-000000000003'),
 2750,now()+interval '7 days');
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
select set_config('request.jwt.claims','{"aal":"aal1","session_id":"70000000-0000-4000-8000-000000000013"}',false);
select public.marketplace_submit_checkout(
 '10000000-0000-4000-8000-000000000003',
 (select id from public.quote_requests where request_key='90000000-0000-4000-8000-000000000003'),
 (select id from public.quote_proposals where quote_request_id=(
   select id from public.quote_requests where request_key='90000000-0000-4000-8000-000000000003')),
 '90000000-0000-4000-8000-000000000004');
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
select set_config('request.jwt.claims','{"aal":"aal1","session_id":"70000000-0000-4000-8000-000000000011"}',false);
select public.marketplace_transition_order(
 (select id from public.purchase_orders where checkout_key='90000000-0000-4000-8000-000000000004'),
 'supplier_reject');
reset role;
select test.assert_count((select count(*) from public.purchase_orders where status='rejected'),1,
 'supplier rejection recorded');
select test.assert_count((select count(*) from public.inventory_positions
 where supplier_product_id='30000000-0000-4000-8000-000000000001'
 and reserved_quantity=0),1,'rejection has no inventory side effects');

-- All direct changes and audit visibility denied to anon.
set role anon;
select test.expect_permission_denied(
 'select public.marketplace_transition_order(gen_random_uuid(),''supplier_confirm'')');
select test.expect_permission_denied('select * from marketplace_private.order_transition_audit');
reset role;
select 'PASS: safe supplier confirmation, cancellation and stock reservation' as result;
