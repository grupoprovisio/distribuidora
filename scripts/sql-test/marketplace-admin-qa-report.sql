-- Disposable CI database only, never run against the hosted project.
-- Validate that PLATFORM_ADMIN can inspect only QA transactions with live MFA AAL2.
begin;
reset role;
update public.profiles set status='active' where id='00000000-0000-4000-8000-000000000006';
update auth.sessions set aal='aal2',not_after=now()+interval '1 day'
where id='70000000-0000-4000-8000-000000000001';
update public.organizations set qa_only=true
where id in ('10000000-0000-4000-8000-000000000001',
             '10000000-0000-4000-8000-000000000003');
do $fixtures$
begin
  if not exists(select 1 from public.quote_requests q
    where q.buyer_org_id='10000000-0000-4000-8000-000000000003'
      and q.supplier_org_id='10000000-0000-4000-8000-000000000001') then
    raise exception 'Expected existing disposable buyer-supplier quote';
  end if;
  if not exists(select 1 from public.purchase_orders p
    where p.buyer_org_id='10000000-0000-4000-8000-000000000003'
      and p.supplier_org_id='10000000-0000-4000-8000-000000000001') then
    raise exception 'Expected existing disposable order';
  end if;
  if not exists(select 1 from public.order_fulfillments f
    where f.buyer_org_id='10000000-0000-4000-8000-000000000003') then
    raise exception 'Expected existing disposable fulfillment';
  end if;
end $fixtures$;

set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000006',true);
select set_config('request.jwt.claims','{"aal":"aal1","session_id":"70000000-0000-4000-8000-000000000001"}',true);
select test.assert_count((select count(*) from public.quote_requests where buyer_org_id='10000000-0000-4000-8000-000000000003'),0,'ADM AAL1 QA quote denial');
select test.assert_count((select count(*) from public.quote_proposals where supplier_org_id='10000000-0000-4000-8000-000000000001'),0,'ADM AAL1 QA proposal denial');
select test.assert_count((select count(*) from public.purchase_orders where buyer_org_id='10000000-0000-4000-8000-000000000003'),0,'ADM AAL1 QA order denial');
select test.assert_count((select count(*) from public.order_fulfillments where buyer_org_id='10000000-0000-4000-8000-000000000003'),0,'ADM AAL1 QA fulfillment denial');

select set_config('request.jwt.claims','{"aal":"aal2","session_id":"70000000-0000-4000-8000-000000000001"}',true);
do $mfa$
begin
 if (select count(*) from public.quote_requests
     where buyer_org_id='10000000-0000-4000-8000-000000000003')<1
    then raise exception 'ADM AAL2 cannot read QA quote'; end if;
 if (select count(*) from public.quote_proposals)<1
    then raise exception 'ADM AAL2 cannot read QA proposal'; end if;
 if (select count(*) from public.purchase_orders
     where buyer_org_id='10000000-0000-4000-8000-000000000003')<1
    then raise exception 'ADM AAL2 cannot read QA order'; end if;
 if (select count(*) from public.order_fulfillments
     where buyer_org_id='10000000-0000-4000-8000-000000000003')<1
    then raise exception 'ADM AAL2 cannot read QA fulfillment'; end if;
end $mfa$;

-- AAL2 claim with unknown session cannot read QA records.
select set_config('request.jwt.claims','{"aal":"aal2","session_id":"70000000-0000-4000-8000-000000000099"}',true);
select test.assert_count((select count(*) from public.quote_requests where buyer_org_id='10000000-0000-4000-8000-000000000003'),0,'forged MFA session denied QA quotes');
select test.assert_count((select count(*) from public.purchase_orders where buyer_org_id='10000000-0000-4000-8000-000000000003'),0,'forged MFA session denied QA orders');
reset role;
set role anon;
select test.expect_permission_denied('select * from public.quote_requests');
select test.expect_permission_denied('select * from public.purchase_orders');
reset role;
rollback;
select 'PASS: QA-only admin read policies require verified AAL2 and never unlock anon/AAL1' as result;
