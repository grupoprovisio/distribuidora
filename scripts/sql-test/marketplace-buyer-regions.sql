-- Run at end of isolated database suite (after commercial write/audit tests).
reset role;
-- The buyer has a live session and approved buyer org but NO delivery region.
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
select set_config('request.jwt.claims','{"aal":"aal1","session_id":"70000000-0000-4000-8000-000000000013"}',false);
select test.assert_count((select count(*) from public.offers),0,'buyer without delivery region sees zero offers');
select test.expect_rejected(
 'insert into public.buyer_delivery_regions(buyer_org_id,region_code) values (''10000000-0000-4000-8000-000000000003'',''BR-SP'')');
reset role;

-- Admin grants one explicit authorized region to a verified buyer organization.
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000006',false);
select set_config('request.jwt.claims','{"aal":"aal2","session_id":"70000000-0000-4000-8000-000000000001"}',false);
insert into public.buyer_delivery_regions(buyer_org_id,region_code)
values ('10000000-0000-4000-8000-000000000003','BR-SP');
select test.expect_rejected(
 'insert into public.buyer_delivery_regions(buyer_org_id,region_code) values (''10000000-0000-4000-8000-000000000001'',''BR-RJ'')');
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
select set_config('request.jwt.claims','{"aal":"aal1","session_id":"70000000-0000-4000-8000-000000000013"}',false);
select test.assert_count((select count(*) from public.buyer_delivery_regions),1,'buyer sees own assigned SP region');
select test.assert_count((select count(*) from public.offers where status='approved'),3,'buyer can read eligible approved offers');
select test.assert_count((select count(*) from public.products),2,'buyer can see master products of eligible offers');
select test.assert_count((select count(*) from public.supplier_products),2,'buyer can see eligible SKUs');
select test.assert_count((select count(*) from public.offer_regions where region_code='BR-SP'),3,
  'buyer only sees eligible SP delivery region rows');
select test.assert_count((select count(*) from public.offer_price_tiers),2,'buyer can read own eligible price tiers');
select test.assert_count((select count(*) from public.inventory_positions),2,'buyer can read stock only for eligible offers');
select test.expect_permission_denied('delete from public.offers');
select test.expect_rejected('insert into public.products(slug,name,base_unit) values (''buyer-new'',''New'',''un'')');
reset role;

-- Disable supplier A, verify buyer no longer sees its products/offers.
update public.organization_capabilities set status='revoked'
where organization_id='10000000-0000-4000-8000-000000000001' and capability='SUPPLIER';
set role authenticated;
select test.assert_count((select count(*) from public.offers),1,'revoked supplier A offers invisible immediately');
reset role;
update public.organization_capabilities set status='approved'
where organization_id='10000000-0000-4000-8000-000000000001' and capability='SUPPLIER';

-- Buyer membership revoked = all commercial reads immediately denied.
update public.organization_members set status='revoked'
where user_id='00000000-0000-4000-8000-000000000003';
set role authenticated;
select test.assert_count((select count(*) from public.offers),0,'buyer membership revocation blocks offers');
select test.assert_count((select count(*) from public.buyer_delivery_regions),0,'revoked buyer region is invisible');
reset role;
update public.organization_members set status='active'
where user_id='00000000-0000-4000-8000-000000000003';
set role anon;
select test.expect_permission_denied('select * from public.offers');
select test.expect_permission_denied('select * from public.buyer_delivery_regions');
reset role;
select 'PASS: buyer offer visibility requires active membership, approved region, supplier and stock' as result;
