-- E2E de banco transacional isolado. Executar APOS 0016 e suite de regioes.
-- Nunca executar no Supabase remoto. Nenhuma cobrança ou reserva.
reset role;
update public.profiles set status='active'
 where id='00000000-0000-4000-8000-000000000001';
insert into auth.sessions (id,user_id,aal,not_after)
values ('70000000-0000-4000-8000-000000000012',
'00000000-0000-4000-8000-000000000002','aal1',now()+interval '1 day')
on conflict (id) do update set not_after=excluded.not_after;

-- Usuario anon nao recebe sequer SELECT ou EXECUTE das RPCs.
set role anon;
select test.expect_permission_denied('select * from public.quote_requests');
select test.expect_permission_denied('select * from public.quote_proposals');
select test.expect_permission_denied('select * from public.purchase_orders');
select test.expect_permission_denied(
 'select public.marketplace_create_quote(''10000000-0000-4000-8000-000000000003''::uuid,
  ''40000000-0000-4000-8000-000000000001''::uuid,1,''BR-SP'','''',
  ''50000000-0000-4000-8000-000000000001''::uuid)');
reset role;

-- Comprador autenticado pode criar solicitacao para oferta homologada da sua UF.
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
select set_config('request.jwt.claims','{"aal":"aal1","session_id":"70000000-0000-4000-8000-000000000013"}',false);
select test.assert_count((select count(*) from public.quote_requests),0,'sem RFQ inicialmente');
select public.marketplace_create_quote(
 '10000000-0000-4000-8000-000000000003',
 '40000000-0000-4000-8000-000000000001',5,'BR-SP','abastecimento regular',
 '50000000-0000-4000-8000-000000000001') as quote_id;
-- Replay idempotente devolve o mesmo registro e nao duplica.
select public.marketplace_create_quote(
 '10000000-0000-4000-8000-000000000003',
 '40000000-0000-4000-8000-000000000001',5,'BR-SP','abastecimento regular',
 '50000000-0000-4000-8000-000000000001') as replay_id;
select test.assert_count((select count(*) from public.quote_requests),1,'RFQ gravada uma vez');
select test.expect_permission_denied('insert into public.quote_requests(
 buyer_org_id,supplier_org_id,offer_id,created_by,request_key,quantity,region_code)
 values (''10000000-0000-4000-8000-000000000003'',
 ''10000000-0000-4000-8000-000000000001'',
 ''40000000-0000-4000-8000-000000000001'',
 ''00000000-0000-4000-8000-000000000003'',
 ''50000000-0000-4000-8000-000000000002'',1,''BR-SP'')');
do $test$
begin
  begin
    perform public.marketplace_create_quote(
      '10000000-0000-4000-8000-000000000003',
      '40000000-0000-4000-8000-000000000001',100000,'BR-RJ','nao autorizada',
      '50000000-0000-4000-8000-000000000003');
    raise exception 'invalid delivery region accepted';
  exception when sqlstate '42501' or sqlstate '22023' then null;
  end;
  begin
    perform public.marketplace_create_quote(
      '10000000-0000-4000-8000-000000000003',
      '40000000-0000-4000-8000-000000000001',6,'BR-SP','payload altered',
      '50000000-0000-4000-8000-000000000001');
    raise exception 'idempotency collision accepted';
  exception when sqlstate '42501' or sqlstate '22023' then null;
  end;
end $test$;
reset role;

-- Fornecedor B ve zero RFQs de A e nao pode responder.
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
select set_config('request.jwt.claims','{"aal":"aal1","session_id":"70000000-0000-4000-8000-000000000012"}',false);
select test.assert_count((select count(*) from public.quote_requests),0,'supplier B cannot see supplier A quote');
do $test$
begin
 begin
  perform public.marketplace_propose_quote(
    (select id from public.quote_requests where supplier_org_id='10000000-0000-4000-8000-000000000001'),
    1200,now()+interval '3 days');
  raise exception 'cross-supplier proposal accepted';
 exception when sqlstate '42501' or sqlstate '22023' then null;
 end;
end $test$;
reset role;

-- Fornecedor A, com sessao viva, pode precificar apenas propria RFQ.
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
select set_config('request.jwt.claims','{"aal":"aal1","session_id":"70000000-0000-4000-8000-000000000011"}',false);
select test.assert_count((select count(*) from public.quote_requests),1,'supplier A sees own quote');
select public.marketplace_propose_quote(
 (select id from public.quote_requests limit 1),1200,now()+interval '3 days') as proposal_id;
select test.assert_count((select count(*) from public.quote_proposals),1,'supplier A proposal stored');
select test.expect_permission_denied('update public.quote_proposals set unit_price_minor=1');
reset role;

-- Comprador visualiza a proposta, confirma uma solicitacao PENDENTE (sem pagamento).
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
select set_config('request.jwt.claims','{"aal":"aal1","session_id":"70000000-0000-4000-8000-000000000013"}',false);
select test.assert_count((select count(*) from public.quote_proposals),1,'buyer sees supplier proposal');
select public.marketplace_submit_checkout(
 '10000000-0000-4000-8000-000000000003',
 (select id from public.quote_requests limit 1),
 (select id from public.quote_proposals limit 1),
 '60000000-0000-4000-8000-000000000001') as pending_order_id;
select public.marketplace_submit_checkout(
 '10000000-0000-4000-8000-000000000003',
 (select id from public.quote_requests limit 1),
 (select id from public.quote_proposals limit 1),
 '60000000-0000-4000-8000-000000000001') as replay_order_id;
select test.assert_count((select count(*) from public.purchase_orders),1,'no duplicate checkout');
select test.assert_count((select count(*) from public.purchase_orders where status='awaiting_supplier_confirmation'),1,'only pending supplier confirmation');
select test.assert_count((select count(*) from public.purchase_orders where total_price_minor=6000),1,'server-calculated total');
select test.assert_count((select count(*) from public.quote_requests where status='converted'),1,'RFQ marked converted');
select test.expect_permission_denied('update public.purchase_orders set status=''cancelled''');
reset role;

-- Estoque nao e reservado nem diminuido pela solicitacao de checkout.
select test.assert_count((select count(*) from public.inventory_positions
where supplier_product_id='30000000-0000-4000-8000-000000000001'
 and available_quantity=100 and reserved_quantity=0),1,'checkout does not reserve stock');

-- Revogacao do comprador corta leitura de pedidos e reutilizacao de chave idempotente.
update public.organization_members set status='revoked'
where organization_id='10000000-0000-4000-8000-000000000003'
 and user_id='00000000-0000-4000-8000-000000000003';
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
select set_config('request.jwt.claims','{"aal":"aal1","session_id":"70000000-0000-4000-8000-000000000013"}',false);
select test.assert_count((select count(*) from public.purchase_orders),0,'revoked buyer cannot read order');
do $test$
begin
 begin
  perform public.marketplace_submit_checkout(
   '10000000-0000-4000-8000-000000000003',
   (select quote_request_id from public.purchase_orders limit 1),
   (select proposal_id from public.purchase_orders limit 1),
   '60000000-0000-4000-8000-000000000001');
  raise exception 'revoked buyer checkout retry accepted';
 exception when sqlstate '42501' or sqlstate '22023' then null;
 end;
end $test$;
reset role;
select 'PASS: RFQ, proposals and checkout pending isolate tenants and stay uncharged' as result;
