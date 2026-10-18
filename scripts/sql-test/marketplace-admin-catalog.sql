-- Executar APOS scripts/sql-test/marketplace-rls.sql em Postgres descartavel.
-- Usuario administrador criado pelo teste anterior teve sessao expirada.
reset role;
update auth.sessions set not_after=now()+interval '1 day'
where id='70000000-0000-4000-8000-000000000001';
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000006',false);
select set_config('request.jwt.claims','{"aal":"aal1","session_id":"70000000-0000-4000-8000-000000000001"}',false);
select test.assert_count((select count(*) from public.products),0,'admin AAL1 cannot review products');
select test.assert_count((select count(*) from public.offers),0,'admin AAL1 cannot review offers');
select test.assert_count((select count(*) from public.inventory_positions),0,'admin AAL1 cannot review inventory');
select set_config('request.jwt.claims','{"aal":"aal2","session_id":"70000000-0000-4000-8000-000000000001"}',false);
select test.assert_count((select count(*) from public.products),2,'admin AAL2 can review product masters');
select test.assert_count((select count(*) from public.supplier_products),2,'admin AAL2 can review supplier SKUs');
select test.assert_count((select count(*) from public.offers),2,'admin AAL2 can review supplier offers');
select test.assert_count((select count(*) from public.offer_regions),2,'admin AAL2 can review regions');
select test.assert_count((select count(*) from public.offer_price_tiers),2,'admin AAL2 can review price tiers');
select test.assert_count((select count(*) from public.inventory_positions),2,'admin AAL2 can review inventory');
-- Migração 0013 permite somente cadastro de rascunho pelo admin verificado.
insert into public.products(slug,name,base_unit,status)
values ('produto-rascunho-aal2','Rascunho cadastrado','un','draft');
select test.assert_count((select count(*) from public.products where slug='produto-rascunho-aal2'),1,
  'AAL2 admin may create a draft; other roles are checked in the write suite');
select set_config('request.jwt.claims','{"aal":"aal2","session_id":"70000000-0000-4000-8000-000000000002"}',false);
select test.assert_count((select count(*) from public.products),0,'forged admin session remains blocked');
reset role;
update auth.sessions set not_after=now()-interval '1 second'
where id='70000000-0000-4000-8000-000000000001';
set role authenticated;
select set_config('request.jwt.claims','{"aal":"aal2","session_id":"70000000-0000-4000-8000-000000000001"}',false);
select test.assert_count((select count(*) from public.offers),0,'expired admin session loses catalog');
reset role;
-- O comprador com conta aprovada nao deve ver precos de fornecedor por RLS.
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
select set_config('request.jwt.claims','{"aal":"aal1","session_id":"70000000-0000-4000-8000-000000000013"}',false);
select test.assert_count((select count(*) from public.offers),0,'buyer cannot read supplier offers');
select test.assert_count((select count(*) from public.products),0,'buyer cannot read supplier products');
select test.assert_count((select count(*) from public.offer_price_tiers),0,'buyer cannot read supplier price tiers');
reset role;
set role anon;
select test.expect_permission_denied('select * from public.offers');
reset role;
select 'PASS: admin catalog visibility limited to MFA and active session' as result;
