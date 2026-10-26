-- Provisio: integration proof that the 0026 QA boundary is enforced at the
-- PostgreSQL function/RLS level, never only by the Next.js feature flags.
-- Disposable PostgreSQL fixture ONLY. Never run on hosted Supabase.
begin;
reset role;
do $check$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='organizations'
      and column_name='qa_only'
  ) then
    raise exception 'migration 0026 not applied in CI';
  end if;
end $check$;

-- The BUYER fixture is initially commercial. Flag the already-authorized
-- supplier A as QA; it must immediately become invisible to this buyer.
update public.organizations set qa_only=true
 where id='10000000-0000-4000-8000-000000000001'
   and kind='SUPPLIER';
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
select set_config('request.jwt.claims','{"aal":"aal1","session_id":"70000000-0000-4000-8000-000000000013"}',false);
select test.assert_count((
  select count(*) from public.offers
  where id='40000000-0000-4000-8000-000000000001'
),0,'commercial buyer must not read QA supplier offer');
select test.expect_transition_denied(
 'select public.marketplace_create_quote(
  ''10000000-0000-4000-8000-000000000003'',
  ''40000000-0000-4000-8000-000000000001'',
  1,''BR-SP'',''cross QA rejected'',
  ''90000000-0000-4000-8000-000000000071'')');
reset role;

-- Change only the disposable buyer fixture into QA; restore equality.
update public.organizations set qa_only=true
 where id='10000000-0000-4000-8000-000000000003'
   and kind='BUYER';
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
select set_config('request.jwt.claims','{"aal":"aal1","session_id":"70000000-0000-4000-8000-000000000013"}',false);
select test.assert_count((
  select count(*) from public.offers
  where id='40000000-0000-4000-8000-000000000001'
),1,'QA buyer reads its approved QA supplier offer');
select public.marketplace_create_quote(
 '10000000-0000-4000-8000-000000000003',
 '40000000-0000-4000-8000-000000000001',1,
 'BR-SP','QA-to-QA accepted','90000000-0000-4000-8000-000000000072');
reset role;
select test.assert_count((
  select count(*) from public.quote_requests
  where request_key='90000000-0000-4000-8000-000000000072'
),1,'only matching QA realm may quote');

-- A user can belong to QA BUYER and a commercial BUYER simultaneously.
-- The original one-argument buyer_can_see_offer() checks any approved buyer
-- membership; the new persisted-boundary trigger must reject a cross-realm
-- quote created on behalf of the commercial buyer.
reset role;
insert into public.organizations(id,legal_name,trade_name,kind,is_platform_owned,status)
values('10000000-0000-4000-8000-000000000009',
 'LOCAL OTHER BUYER','LOCAL OTHER BUYER','BUYER',false,'approved');
insert into public.organization_capabilities(organization_id,capability,status)
values('10000000-0000-4000-8000-000000000009','BUYER','approved');
insert into public.organization_members(organization_id,user_id,role,status)
values('10000000-0000-4000-8000-000000000009',
 '00000000-0000-4000-8000-000000000003','BUYER','active');
insert into public.buyer_delivery_regions(buyer_org_id,region_code)
values('10000000-0000-4000-8000-000000000009','BR-SP');

set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
select set_config('request.jwt.claims','{"aal":"aal1","session_id":"70000000-0000-4000-8000-000000000013"}',false);
do $cross$
declare denied boolean := false;
begin
 begin
   perform public.marketplace_create_quote(
     '10000000-0000-4000-8000-000000000009',
     '40000000-0000-4000-8000-000000000001',
     1,'BR-SP','cross-realm must fail',
     '90000000-0000-4000-8000-000000000073');
 exception when sqlstate '22023' then denied:=true;
 end;
 if not denied then raise exception 'dual buyer membership crossed QA/commercial realm'; end if;
end $cross$;
reset role;
select test.assert_count((
 select count(*) from public.quote_requests
 where request_key='90000000-0000-4000-8000-000000000073'
),0,'commercial org cannot create QA quote even with dual membership');
do $purchase$
declare denied boolean := false;
begin
 begin
   insert into public.purchase_orders(
     buyer_org_id,supplier_org_id,quote_request_id,proposal_id,offer_id,
     created_by,checkout_key,quantity,region_code,unit_price_minor,total_price_minor)
   values(
     '10000000-0000-4000-8000-000000000009',
     '10000000-0000-4000-8000-000000000001',
     '90000000-0000-4000-8000-000000000072',
     gen_random_uuid(),'40000000-0000-4000-8000-000000000001',
     '00000000-0000-4000-8000-000000000003',
     gen_random_uuid(),1,'BR-SP',1250,1250);
 exception when sqlstate '22023' then denied:=true;
 end;
 if not denied then raise exception 'persisted order realm trigger not enforced'; end if;
end $purchase$;
rollback;
select 'PASS: migrations 0026-0027 blocks commercial-to-QA visibility/quotes and allows QA-to-QA' as result;
