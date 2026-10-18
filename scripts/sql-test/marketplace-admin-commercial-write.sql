-- Run after marketplace-admin-catalog.sql on disposable PostgreSQL.
reset role;
update auth.sessions set not_after=now()+interval '1 day'
where id='70000000-0000-4000-8000-000000000001';
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000006',false);
select set_config('request.jwt.claims','{"aal":"aal2","session_id":"70000000-0000-4000-8000-000000000001"}',false);

-- Admin may create only draft products and pending SKUs/offers.
insert into public.products(slug,name,base_unit,status)
values ('produto-cadastrado-em-teste','Produto cadastrado em teste','un','draft');
select test.expect_rejected(
 'insert into public.products(slug,name,base_unit,status) values (''auto-ativo'',''Invalido'',''un'',''active'')');
select test.expect_rejected(
 'insert into public.supplier_products(supplier_org_id,product_id,supplier_sku,pack_quantity,pack_unit,status) values (''10000000-0000-4000-8000-000000000001'',''20000000-0000-4000-8000-000000000001'',''SKU-AUTO'',1,''un'',''approved'')');
insert into public.supplier_products(supplier_org_id,product_id,supplier_sku,pack_quantity,pack_unit,status)
select '10000000-0000-4000-8000-000000000001',id,'SKU-TESTE',1,'un','pending'
from public.products where slug='produto-cadastrado-em-teste';

select test.expect_rejected(
 'update public.supplier_products set status=''approved'' where supplier_sku=''SKU-TESTE''');
update public.products set status='active' where slug='produto-cadastrado-em-teste';
update public.supplier_products set status='approved' where supplier_sku='SKU-TESTE';

select test.expect_rejected(
 'insert into public.offers(supplier_org_id,supplier_product_id,source_type,base_price_minor,min_quantity,status,valid_from) values (''10000000-0000-4000-8000-000000000001'',''30000000-0000-4000-8000-000000000001'',''MANUAL_AUTHORIZED'',1234,1,''approved'',now()-interval ''1 day'')');
insert into public.offers(supplier_org_id,supplier_product_id,source_type,base_price_minor,min_quantity,status,valid_from)
values ('10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','MANUAL_AUTHORIZED',1234,1,'pending',now()-interval '1 day');

-- Before region and stock approval must fail.
select test.expect_rejected(
 'update public.offers set status=''approved'' where base_price_minor=1234');
insert into public.offer_regions(offer_id,region_code)
select id,'BR-SP' from public.offers where base_price_minor=1234;
update public.offers set status='approved' where base_price_minor=1234;
select test.assert_count((select count(*) from public.offers where base_price_minor=1234 and status='approved'),1,'admin can approve valid offer');
select test.expect_rejected(
 'update public.offers set status=''pending'' where base_price_minor=1234');
select test.expect_rejected(
 'update public.products set status=''draft'' where slug=''produto-cadastrado-em-teste''');
select test.expect_permission_denied('delete from public.products where slug=''produto-cadastrado-em-teste''');

-- Revoke admin capability by spoofing AAL1; all commercial writes must fail.
select set_config('request.jwt.claims','{"aal":"aal1","session_id":"70000000-0000-4000-8000-000000000001"}',false);
select test.expect_rejected(
 'insert into public.products(slug,name,base_unit) values (''aal1-produto'',''Rejeitado'',''un'')');
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
select set_config('request.jwt.claims','{"aal":"aal1","session_id":"70000000-0000-4000-8000-000000000013"}',false);
select test.expect_rejected(
 'insert into public.products(slug,name,base_unit) values (''comprador-indevido'',''Rejeitado'',''un'')');
select test.expect_rejected(
 'insert into public.offers(supplier_org_id,supplier_product_id,source_type,base_price_minor,valid_from) values (''10000000-0000-4000-8000-000000000001'',''30000000-0000-4000-8000-000000000001'',''MANUAL_AUTHORIZED'',1000,now())');
reset role;
set role anon;
select test.expect_permission_denied('insert into public.products(slug,name,base_unit) values (''publico-indevido'',''Rejeitado'',''un'')');
reset role;
select 'PASS: admin commercial onboarding requires verified admin and no auto approval' as result;
