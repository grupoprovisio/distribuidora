-- Integracao descartavel: operadora Provisio distribui produtos proprios como fornecedor.
-- Requer migrations 0001-0025 e suites anteriores. NUNCA aplicar ao Supabase principal.
reset role;
insert into auth.users(id,raw_user_meta_data)
 values('00000000-0000-4000-8000-000000000009','{"full_name":"Plataforma Fornecedor Teste"}');
insert into auth.sessions(id,user_id,aal,not_after)
 values('70000000-0000-4000-8000-000000000019','00000000-0000-4000-8000-000000000009','aal1',now()+interval '1 day');
update public.profiles set status='active' where id='00000000-0000-4000-8000-000000000009';
insert into public.organizations(id,legal_name,kind,is_platform_owned,status)
 values('10000000-0000-4000-8000-000000000004','Provisio Plataforma Homologacao','PLATFORM_OPERATOR',true,'approved');
insert into public.organization_capabilities(organization_id,capability,status)
 values ('10000000-0000-4000-8000-000000000004','SUPPLIER','approved'),
        ('10000000-0000-4000-8000-000000000004','PLATFORM_OPERATOR','approved');
insert into public.organization_members(organization_id,user_id,role,status)
 values('10000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000009','PLATFORM_ADMIN','active');
insert into public.products(id,slug,name,base_unit,status)
 values('20000000-0000-4000-8000-000000000003','provisio-platform-sku-fixture','Somente fixture','un','active');
insert into public.supplier_products(id,supplier_org_id,product_id,supplier_sku,pack_quantity,pack_unit,status)
 values('30000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000004','20000000-0000-4000-8000-000000000003','PLAT-1',1,'un','approved');
insert into public.offers(id,supplier_product_id,supplier_org_id,source_type,base_price_minor,min_quantity,status,valid_from)
 values('40000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000003',
 '10000000-0000-4000-8000-000000000004','PLATFORM_STOCK',1990,1,'approved',now()-interval '1 day');
insert into public.offer_regions(offer_id,region_code)
 values('40000000-0000-4000-8000-000000000003','BR-SP');
insert into public.inventory_positions(supplier_product_id,supplier_org_id,available_quantity)
 values('30000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000004',20);

set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
select set_config('request.jwt.claims','{"aal":"aal1","session_id":"70000000-0000-4000-8000-000000000013"}',false);
select public.marketplace_create_quote('10000000-0000-4000-8000-000000000003',
 '40000000-0000-4000-8000-000000000003',3,'BR-SP','Provisio propria',
 '90000000-0000-4000-8000-000000000021');
reset role;

-- PLATFORM_ADMIN esta autorizado SOMENTE na operadora de plataforma aprovada.
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000009',false);
select set_config('request.jwt.claims','{"aal":"aal1","session_id":"70000000-0000-4000-8000-000000000019"}',false);
select test.assert_count((select count(*) from public.quote_requests where supplier_org_id='10000000-0000-4000-8000-000000000004'),1,
 'platform admin sees its own buyer quote');
select public.marketplace_propose_quote(
 (select id from public.quote_requests where request_key='90000000-0000-4000-8000-000000000021'),
 1990,now()+interval '7 days');
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
select set_config('request.jwt.claims','{"aal":"aal1","session_id":"70000000-0000-4000-8000-000000000013"}',false);
select public.marketplace_submit_checkout('10000000-0000-4000-8000-000000000003',
 (select id from public.quote_requests where request_key='90000000-0000-4000-8000-000000000021'),
 (select id from public.quote_proposals where quote_request_id=(select id from public.quote_requests where request_key='90000000-0000-4000-8000-000000000021')),
 '90000000-0000-4000-8000-000000000022');
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000009',false);
select set_config('request.jwt.claims','{"aal":"aal1","session_id":"70000000-0000-4000-8000-000000000019"}',false);
select public.marketplace_transition_order(
 (select id from public.purchase_orders where checkout_key='90000000-0000-4000-8000-000000000022'),
 'supplier_confirm');
select public.marketplace_advance_fulfillment(
 (select id from public.purchase_orders where checkout_key='90000000-0000-4000-8000-000000000022'),
 'start_separation',990,current_date+4,null);
select public.marketplace_advance_fulfillment(
 (select id from public.purchase_orders where checkout_key='90000000-0000-4000-8000-000000000022'),
 'mark_ready',null,null,null);
select public.marketplace_advance_fulfillment(
 (select id from public.purchase_orders where checkout_key='90000000-0000-4000-8000-000000000022'),
 'dispatch',null,null,'HOM-PLATAFORMA');
select public.marketplace_advance_fulfillment(
 (select id from public.purchase_orders where checkout_key='90000000-0000-4000-8000-000000000022'),
 'deliver',null,null,null);
reset role;
select test.assert_count((select count(*) from public.purchase_orders
 where supplier_org_id='10000000-0000-4000-8000-000000000004' and status='confirmed'),1,
 'platform supplier confirmed own order');
select test.assert_count((select count(*) from public.inventory_positions
 where supplier_product_id='30000000-0000-4000-8000-000000000003'
 and available_quantity=17 and reserved_quantity=0),1,
 'platform supplier shipped with atomic stock decrement');
select test.assert_count((select count(*) from public.order_fulfillments
 where supplier_org_id='10000000-0000-4000-8000-000000000004' and status='delivered'),1,
 'platform supplier completed simulated delivery');

-- Outro fornecedor jamais pode ler transacoes de operadora propria.
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
select set_config('request.jwt.claims','{"aal":"aal1","session_id":"70000000-0000-4000-8000-000000000011"}',false);
select test.assert_count((select count(*) from public.purchase_orders where supplier_org_id='10000000-0000-4000-8000-000000000004'),0,
 'supplier A denied platform orders');
select test.assert_count((select count(*) from public.order_fulfillments where supplier_org_id='10000000-0000-4000-8000-000000000004'),0,
 'supplier A denied platform logistics');
reset role;
select 'PASS: platform-owned supplier can quote confirm ship deliver without third public persona' as result;
