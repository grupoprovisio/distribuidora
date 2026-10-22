-- Execute ONLY against disposable PostgreSQL after all previous suites.
-- Restore approved fixture users/sessions modified by earlier revocation tests.
reset role;
update public.profiles set status='active' where id='00000000-0000-4000-8000-000000000001';
insert into auth.sessions(id,user_id,aal,not_after)
values
 ('70000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000001','aal1',now()+interval '1 day'),
 ('70000000-0000-4000-8000-000000000012','00000000-0000-4000-8000-000000000002','aal1',now()+interval '1 day')
on conflict(id) do update set not_after=excluded.not_after;
select test.assert_count((select count(*) from public.buyer_delivery_regions where buyer_org_id='10000000-0000-4000-8000-000000000003'),1,'buyer region fixture exists');

-- Deny all direct commercial writes regardless of valid login.
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
select set_config('request.jwt.claims','{"aal":"aal1","session_id":"70000000-0000-4000-8000-000000000013"}',false);
select test.expect_permission_denied('insert into public.quote_requests(buyer_org_id,supplier_org_id,offer_id,created_by,request_key,quantity,region_code) values (''10000000-0000-4000-8000-000000000003'',''10000000-0000-4000-8000-000000000001'',''40000000-0000-4000-8000-000000000001'',''00000000-0000-4000-8000-000000000003'',gen_random_uuid(),1,''BR-SP'')');
select test.expect_permission_denied('insert into public.purchase_orders(buyer_org_id,supplier_org_id,quote_request_id,proposal_id,offer_id,created_by,checkout_key,quantity,region_code,unit_price_minor,total_price_minor) values (gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),1,''BR-SP'',100,100)');

-- Valid buyer quote. Identical idempotency key => exactly one quote.
select public.marketplace_create_quote('10000000-0000-4000-8000-000000000003','40000000-0000-4000-8000-000000000001',2,'BR-SP','Teste autorizado','90000000-0000-4000-8000-000000000001');
select public.marketplace_create_quote('10000000-0000-4000-8000-000000000003','40000000-0000-4000-8000-000000000001',2,'BR-SP','Teste autorizado','90000000-0000-4000-8000-000000000001');
select test.assert_count((select count(*) from public.quote_requests),1,'quote persisted idempotently');
select test.assert_count((select count(*) from public.quote_proposals),0,'buyer cannot fabricate proposals');
reset role;

-- Other supplier cannot read this quote or submit a proposal.
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
select set_config('request.jwt.claims','{"aal":"aal1","session_id":"70000000-0000-4000-8000-000000000012"}',false);
select test.assert_count((select count(*) from public.quote_requests),0,'supplier B cannot read A quotes');
do $$
declare rejected boolean := false;
begin
  begin
    perform public.marketplace_propose_quote((select id from public.quote_requests limit 1),2500,now()+interval '7 days');
  exception when insufficient_privilege or invalid_parameter_value then rejected:=true;
  end;
  if not rejected then raise exception 'supplier B impersonated supplier A'; end if;
end $$;
reset role;

-- Supplier A can propose its own quote.
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
select set_config('request.jwt.claims','{"aal":"aal1","session_id":"70000000-0000-4000-8000-000000000011"}',false);
select test.assert_count((select count(*) from public.quote_requests),1,'supplier A sees own RFQ');
select public.marketplace_propose_quote(
 (select id from public.quote_requests where request_key='90000000-0000-4000-8000-000000000001'),
 2500,now()+interval '7 days'
);
select test.assert_count((select count(*) from public.quote_proposals),1,'supplier A proposal persisted');
reset role;

-- Buyer accepts the supplier proposal, creating only a PENDING order request.
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
select set_config('request.jwt.claims','{"aal":"aal1","session_id":"70000000-0000-4000-8000-000000000013"}',false);
select public.marketplace_submit_checkout(
 '10000000-0000-4000-8000-000000000003',
 (select id from public.quote_requests where request_key='90000000-0000-4000-8000-000000000001'),
 (select id from public.quote_proposals limit 1),
 '90000000-0000-4000-8000-000000000002'
);
select public.marketplace_submit_checkout(
 '10000000-0000-4000-8000-000000000003',
 (select id from public.quote_requests where request_key='90000000-0000-4000-8000-000000000001'),
 (select id from public.quote_proposals limit 1),
 '90000000-0000-4000-8000-000000000002'
);
select test.assert_count((select count(*) from public.purchase_orders),1,'checkout created exactly one order');
select test.assert_count((select count(*) from public.purchase_orders where status='awaiting_supplier_confirmation' and total_price_minor=5000),1,'order pending confirmation and total uses integer cents');
select test.assert_count((select count(*) from public.quote_requests where status='converted'),1,'quote converted atomically');
select test.assert_count((select count(*) from public.inventory_positions where reserved_quantity>0),0,'checkout does not reserve stock');
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
select set_config('request.jwt.claims','{"aal":"aal1","session_id":"70000000-0000-4000-8000-000000000012"}',false);
select test.assert_count((select count(*) from public.purchase_orders),0,'supplier B cannot see A order');
reset role;

-- Revoking the buyer instantly removes reads AND idempotent checkout retries.
update public.organization_members set status='revoked'
where organization_id='10000000-0000-4000-8000-000000000003'
and user_id='00000000-0000-4000-8000-000000000003';
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
select set_config('request.jwt.claims','{"aal":"aal1","session_id":"70000000-0000-4000-8000-000000000013"}',false);
select test.assert_count((select count(*) from public.quote_requests),0,'revoked buyer cannot read quotes');
select test.assert_count((select count(*) from public.purchase_orders),0,'revoked buyer cannot read orders');
do $$
declare rejected boolean := false;
begin
  begin
    perform public.marketplace_submit_checkout(
      '10000000-0000-4000-8000-000000000003',
      (select id from public.quote_requests where request_key='90000000-0000-4000-8000-000000000001'),
      (select id from public.quote_proposals limit 1),
      '90000000-0000-4000-8000-000000000002');
  exception when insufficient_privilege or invalid_parameter_value then rejected:=true;
  end;
  if not rejected then raise exception 'revoked buyer checkout retry succeeded'; end if;
end $$;
reset role;

set role anon;
select test.expect_permission_denied('select * from public.quote_requests');
select test.expect_permission_denied('select * from public.quote_proposals');
select test.expect_permission_denied('select * from public.purchase_orders');
select test.expect_permission_denied('select public.marketplace_create_quote(gen_random_uuid(),gen_random_uuid(),1,''BR-SP'','''',gen_random_uuid())');
reset role;
select 'PASS: RFQ, supplier proposal and pending checkout with tenant isolation' as result;
