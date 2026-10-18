-- Runs on an isolated database after marketplace-admin-commercial-write.sql.
select test.assert_count(
  (select case when count(*) >= 3 then 1::bigint else 0::bigint end
   from marketplace_private.catalog_audit where source_table='products'),1,
   'catalog product insert and approval transitions audited');
select test.assert_count(
  (select case when count(*) >= 2 then 1::bigint else 0::bigint end
   from marketplace_private.catalog_audit where source_table='supplier_products'),1,
   'supplier SKU registration and approval audited');
select test.assert_count(
  (select case when count(*) >= 2 then 1::bigint else 0::bigint end
   from marketplace_private.catalog_audit where source_table='offers'),1,
   'offer registration and approval audited');
select test.assert_count(
  (select case when count(*) >= 1 then 1::bigint else 0::bigint end
   from marketplace_private.catalog_audit where source_table='offer_regions'),1,
   'offer region insert audited');
select test.assert_count(
  (select case when count(*) > 0 then 1::bigint else 0::bigint end
   from marketplace_private.catalog_audit
   where source_table='offers' and action='UPDATE'
     and before_state->>'status'='pending' and after_state->>'status'='approved'),1,
   'offer approval transition stored');
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000006',false);
select set_config('request.jwt.claims','{"aal":"aal2","session_id":"70000000-0000-4000-8000-000000000001"}',false);
select test.expect_permission_denied('select * from marketplace_private.catalog_audit');
reset role;
set role anon;
select test.expect_permission_denied('select * from marketplace_private.catalog_audit');
reset role;
select 'PASS: private catalog change audit cannot be read via Data API' as result;
