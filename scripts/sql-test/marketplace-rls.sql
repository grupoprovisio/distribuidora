-- Seeds de teste. Nunca aplicar fora do Postgres efemero do CI.
-- Migrations 0001..0004 ja devem ter sido instaladas sem erros.
insert into auth.users (id, raw_user_meta_data) values
('00000000-0000-4000-8000-000000000001', '{"full_name":"Fornecedor A"}'),
('00000000-0000-4000-8000-000000000002', '{"full_name":"Fornecedor B"}'),
('00000000-0000-4000-8000-000000000003', '{"full_name":"Comprador"}'),
('00000000-0000-4000-8000-000000000004', '{"full_name":"Revogado"}'),
('00000000-0000-4000-8000-000000000005', '{"full_name":"Pendente","role":"PLATFORM_ADMIN"}');

-- Toda leitura B2B exige um registro de sessao Auth correspondente ao JWT.
insert into auth.sessions (id,user_id,aal,not_after) values
('70000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000001','aal1',now()+interval '1 day'),
('70000000-0000-4000-8000-000000000012','00000000-0000-4000-8000-000000000002','aal1',now()+interval '1 day'),
('70000000-0000-4000-8000-000000000013','00000000-0000-4000-8000-000000000003','aal1',now()+interval '1 day'),
('70000000-0000-4000-8000-000000000014','00000000-0000-4000-8000-000000000004','aal1',now()+interval '1 day'),
('70000000-0000-4000-8000-000000000015','00000000-0000-4000-8000-000000000005','aal1',now()+interval '1 day');

select test.assert_count((select count(*) from public.profiles where status = 'pending'), 5, 'new users require explicit approval');
update public.profiles set status='active'
where id in (
 '00000000-0000-4000-8000-000000000001',
 '00000000-0000-4000-8000-000000000002',
 '00000000-0000-4000-8000-000000000003',
 '00000000-0000-4000-8000-000000000004'
);

insert into public.organizations (id, legal_name, kind, status) values
('10000000-0000-4000-8000-000000000001', 'Fornecedor A', 'SUPPLIER','approved'),
('10000000-0000-4000-8000-000000000002', 'Fornecedor B', 'SUPPLIER','approved'),
('10000000-0000-4000-8000-000000000003', 'Comprador', 'BUYER','approved');

insert into public.organization_capabilities(organization_id,capability,status) values
('10000000-0000-4000-8000-000000000001','SUPPLIER','approved'),
('10000000-0000-4000-8000-000000000002','SUPPLIER','approved'),
('10000000-0000-4000-8000-000000000003','BUYER','approved');

insert into public.organization_members(organization_id,user_id,role,status) values
('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','SUPPLIER_ADMIN','active'),
('10000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000002','SUPPLIER_ADMIN','active'),
('10000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000003','BUYER','active'),
('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000004','SELLER','revoked'),
('10000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000005','SELLER','active');

insert into public.products(id,slug,name,base_unit,status) values
('20000000-0000-4000-8000-000000000001','produto-fornecedor-a','Produto A','un','active'),
('20000000-0000-4000-8000-000000000002','produto-fornecedor-b','Produto B','un','active');

insert into public.supplier_products(id,supplier_org_id,product_id,supplier_sku,pack_quantity,pack_unit,status) values
('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','SKU-A',1,'un','approved'),
('30000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002','SKU-B',1,'un','approved');

insert into public.offers(id,supplier_product_id,supplier_org_id,source_type,base_price_minor,min_quantity,status,valid_from) values
('40000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','MANUAL_AUTHORIZED',1000,1,'approved','2026-01-01'),
('40000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','MANUAL_AUTHORIZED',2000,1,'approved','2026-01-01');

insert into public.offer_price_tiers(offer_id,min_quantity,unit_price_minor) values
('40000000-0000-4000-8000-000000000001',10,900),
('40000000-0000-4000-8000-000000000002',10,1900);
insert into public.offer_regions(offer_id,region_code) values
('40000000-0000-4000-8000-000000000001','BR-SP'),
('40000000-0000-4000-8000-000000000002','BR-SP');
insert into public.inventory_positions(supplier_product_id,supplier_org_id,available_quantity) values
('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',100),
('30000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002',200);

-- Protecao contra falsificacao de fornecedor e trocas cruzadas de SKU.
do $$
declare denied boolean;
begin
  denied := false;
  begin
    insert into public.supplier_products(supplier_org_id,product_id,supplier_sku,pack_quantity,pack_unit)
    values ('10000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000001','SKU-BUYER',1,'un');
  exception when check_violation then denied := true;
  end;
  if not denied then raise exception 'buyer was allowed to own supplier SKU'; end if;

  denied := false;
  begin
    insert into public.offers(supplier_product_id,supplier_org_id,source_type,base_price_minor,valid_from)
    values ('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','PLATFORM_STOCK',1000,'2026-01-01');
  exception when check_violation then denied := true;
  end;
  if not denied then raise exception 'third-party supplier was allowed to impersonate platform stock'; end if;

  denied := false;
  begin
    insert into public.offers(supplier_product_id,supplier_org_id,source_type,base_price_minor,valid_from)
    values ('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','MANUAL_AUTHORIZED',1000,'2026-01-01');
  exception when foreign_key_violation then denied := true;
  end;
  if not denied then raise exception 'offer was allowed to use a foreign supplier_product'; end if;
end $$;

-- Usuario fornecedor A: apenas A, inclusive ao tentar ID do concorrente.
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
select test.assert_count((select count(*) from public.profiles),1,'supplier A sees own profile');
select test.assert_count((select count(*) from public.organizations),1,'supplier A sees own organization');
select test.assert_count((select count(*) from public.organization_members),1,'supplier A sees own membership');
select test.assert_count((select count(*) from public.products),1,'supplier A sees own product');
select test.assert_count((select count(*) from public.supplier_products),1,'supplier A sees own SKU');
select test.assert_count((select count(*) from public.offers),1,'supplier A sees own offer');
select test.assert_count((select count(*) from public.offer_price_tiers),1,'supplier A sees own tier');
select test.assert_count((select count(*) from public.offer_regions),1,'supplier A sees own region');
select test.assert_count((select count(*) from public.inventory_positions),1,'supplier A sees own stock');
select test.assert_count((select count(*) from public.offers where supplier_org_id = '10000000-0000-4000-8000-000000000002'),0,'supplier A cannot read supplier B using B ID');
select test.expect_permission_denied('update public.offers set base_price_minor=1 where supplier_org_id = ''10000000-0000-4000-8000-000000000001''');
select test.expect_rejected('insert into public.organization_members(organization_id,user_id,role) values (''10000000-0000-4000-8000-000000000001'',''00000000-0000-4000-8000-000000000001'',''PLATFORM_ADMIN'')');

-- Usuario fornecedor B: apenas B.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
select test.assert_count((select count(*) from public.offers),1,'supplier B sees own offer');
select test.assert_count((select count(*) from public.offers where supplier_org_id = '10000000-0000-4000-8000-000000000001'),0,'supplier B cannot read supplier A');

-- Comprador A nao recebe acesso ao catalogo privado do fornecedor.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
select test.assert_count((select count(*) from public.organizations),1,'buyer sees own organization');
select test.assert_count((select count(*) from public.products),0,'buyer cannot read private products');
select test.assert_count((select count(*) from public.offers),0,'buyer cannot read supplier offers');
select test.assert_count((select count(*) from public.inventory_positions),0,'buyer cannot read supplier stock');

-- Revogado e pendente nao recebem dados privados.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000004',false);
select test.assert_count((select count(*) from public.offers),0,'revoked supplier sees no offers');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000005',false);
select test.assert_count((select count(*) from public.offers),0,'pending user with claimed PLATFORM_ADMIN sees no offers');
reset role;

-- Revogacao no banco tem efeito imediato mesmo que o JWT original continue valido.
update public.organization_members set status = 'revoked'
where organization_id = '10000000-0000-4000-8000-000000000001'
  and user_id = '00000000-0000-4000-8000-000000000001';
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
select test.assert_count((select count(*) from public.offers),0,'immediate membership revocation');
reset role;

update public.organization_members set status = 'active'
where organization_id = '10000000-0000-4000-8000-000000000001'
  and user_id = '00000000-0000-4000-8000-000000000001';
update public.organization_capabilities set status = 'revoked'
where organization_id = '10000000-0000-4000-8000-000000000001'
  and capability = 'SUPPLIER';
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
select test.assert_count((select count(*) from public.offers),0,'immediate capability revocation');
reset role;

update public.organization_capabilities set status = 'approved'
where organization_id = '10000000-0000-4000-8000-000000000001'
  and capability = 'SUPPLIER';
update public.profiles set status = 'blocked'
where id = '00000000-0000-4000-8000-000000000001';
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
select test.assert_count((select count(*) from public.offers),0,'immediate user block');
reset role;

-- Nenhum acesso anon a linhas protegidas nem chamadas de helpers privados.
set role anon;
select test.expect_permission_denied('select * from public.offers');
select test.expect_permission_denied('select marketplace_private.has_active_capability(''10000000-0000-4000-8000-000000000001''::uuid,''SUPPLIER'')');
reset role;

-- A ausencia de token e negativa mesmo para role authenticated.
set role authenticated;
select set_config('request.jwt.claim.sub','',false);
select test.assert_count((select count(*) from public.offers),0,'missing JWT fails closed');
reset role;
-- Atribuicoes administrativas nunca podem aparecer em organizacoes parceiras.
do $$
declare denied boolean;
begin
  denied:=false;
  begin
    insert into public.organization_capabilities(organization_id,capability,status)
    values ('10000000-0000-4000-8000-000000000001','PLATFORM_OPERATOR','approved');
  exception when check_violation then denied:=true;
  end;
  if not denied then raise exception 'supplier received platform operator capability'; end if;

  denied:=false;
  begin
    insert into public.organization_members(organization_id,user_id,role,status)
    values ('10000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000005','PLATFORM_ADMIN','active')
    on conflict(organization_id,user_id) do update set role=excluded.role,status=excluded.status;
  exception when check_violation then denied:=true;
  end;
  if not denied then raise exception 'supplier received PLATFORM_ADMIN role'; end if;

  denied:=false;
  begin
    update public.organizations set kind='PLATFORM_OPERATOR',is_platform_owned=true
    where id='10000000-0000-4000-8000-000000000001';
  exception when check_violation then denied:=true;
  end;
  if not denied then raise exception 'organization type was changed after creation'; end if;
end $$;

select test.assert_count(
  (select case when count(*) > 0 then 1::bigint else 0::bigint end from marketplace_private.access_audit
    where source_table='organization_members' and action='UPDATE'),
  1, 'privilege changes recorded in internal audit');
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
select test.expect_permission_denied('select * from marketplace_private.access_audit');
reset role;

-- Sem sessão MFA, um suposto admin nao recebe permissao.
insert into auth.users(id,raw_user_meta_data)
values ('00000000-0000-4000-8000-000000000006','{"full_name":"Administrador"}');
update public.profiles set status='active'
where id='00000000-0000-4000-8000-000000000006';
insert into public.organizations(id,legal_name,kind,is_platform_owned,status)
values ('10000000-0000-4000-8000-000000000004','Grupo Provisio','PLATFORM_OPERATOR',true,'approved');
insert into public.organization_capabilities(organization_id,capability,status)
values ('10000000-0000-4000-8000-000000000004','PLATFORM_OPERATOR','approved');
insert into public.organization_members(organization_id,user_id,role,status)
values ('10000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000006','PLATFORM_ADMIN','active');
insert into auth.sessions(id,user_id,aal,not_after)
values ('70000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000006','aal2',now()+interval '1 day');

set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000006',false);
select set_config('request.jwt.claims','{"aal":"aal1","session_id":"70000000-0000-4000-8000-000000000001"}',false);
select test.assert_count((select count(*) from public.profiles),1,'aal1 does not expose other company profiles');
select test.expect_permission_denied('insert into public.organizations(legal_name,kind) values (''Unauthorized AAL1'',''BUYER'')');

select set_config('request.jwt.claims','{"aal":"aal2","session_id":"70000000-0000-4000-8000-000000000002"}',false);
select test.expect_permission_denied('insert into public.organizations(legal_name,kind) values (''Forged session ID'',''BUYER'')');

select set_config('request.jwt.claims','{"aal":"aal2","session_id":"70000000-0000-4000-8000-000000000001"}',false);
select test.assert_count((select count(*) from public.profiles),6,'real aal2 admin can read all profiles');
insert into public.organizations(legal_name,kind,status)
values ('New supplier from admin','SUPPLIER','pending');
select test.assert_count((select count(*) from public.organizations where legal_name='New supplier from admin'),1,'admin with MFA creates pending organization');
select test.expect_permission_denied('select * from marketplace_private.access_audit');
select test.expect_rejected(
 'insert into public.organizations(legal_name,kind,is_platform_owned,status) values (''Fake platform'',''PLATFORM_OPERATOR'',true,''approved'')');
select test.expect_rejected(
 'insert into public.organization_members(organization_id,user_id,role,status) values (''10000000-0000-4000-8000-000000000004'',''00000000-0000-4000-8000-000000000003'',''PLATFORM_ADMIN'',''active'')');
select test.expect_rejected(
 'update public.organization_capabilities set status=''revoked'' where organization_id=''10000000-0000-4000-8000-000000000004'' and capability=''PLATFORM_OPERATOR''');

-- A empresa operadora e o proprio superadmin nunca podem ser
-- desativados via browser, mesmo com segundo fator confirmado.
select test.expect_rejected(
 'update public.profiles set status=''blocked'' where id=''00000000-0000-4000-8000-000000000006''');
select test.expect_rejected(
 'update public.organizations set status=''suspended'' where id=''10000000-0000-4000-8000-000000000004''');
select test.expect_rejected(
 'update public.organization_members set status=''revoked'' where organization_id=''10000000-0000-4000-8000-000000000004'' and user_id=''00000000-0000-4000-8000-000000000006''');
select test.assert_count(
  (select count(*) from public.profiles where id='00000000-0000-4000-8000-000000000006' and status='active'),1,
  'own admin profile remains active');



reset role;
update auth.sessions set not_after=now()-interval '1 second'
where id='70000000-0000-4000-8000-000000000001';
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000006',false);
select set_config('request.jwt.claims','{"aal":"aal2","session_id":"70000000-0000-4000-8000-000000000001"}',false);
select test.expect_permission_denied('insert into public.organizations(legal_name,kind) values (''Expired AAL2 session'',''BUYER'')');
reset role;

-- Um JWT antigo nao pode consultar fornecedor B apos a sessao ser removida.
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
select set_config('request.jwt.claims','{"aal":"aal1","session_id":"70000000-0000-4000-8000-000000000012"}',false);
select test.assert_count((select count(*) from public.offers),1,'valid supplier B session sees offer');
reset role;
delete from auth.sessions
where id='70000000-0000-4000-8000-000000000012';
set role authenticated;
select test.assert_count((select count(*) from public.offers),0,'revoked session loses RLS access immediately');
select test.assert_count((select count(*) from public.profiles),0,'revoked JWT cannot read own profile');
reset role;

select 'PASS: supabase marketplace isolation database suite' as result;
