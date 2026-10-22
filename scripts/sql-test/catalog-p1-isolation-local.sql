-- Testes de RLS sobre PostgreSQL isolado. IDs ficticios fixos.
\set ON_ERROR_STOP on
insert into auth.users(id) values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
 ('cccccccc-cccc-4ccc-8ccc-cccccccccccc'),
 ('dddddddd-dddd-4ddd-8ddd-dddddddddddd');
insert into auth.sessions(id,user_id,aal) values
 ('aaaa1111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','aal1'),
 ('bbbb1111-1111-4111-8111-111111111111','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','aal1'),
 ('cccc1111-1111-4111-8111-111111111111','cccccccc-cccc-4ccc-8ccc-cccccccccccc','aal2'),
 ('dddd1111-1111-4111-8111-111111111111','dddddddd-dddd-4ddd-8ddd-dddddddddddd','aal1');
update public.profiles set status='active';
insert into public.organizations(id,legal_name,kind,status,is_platform_owned) values
 ('11110000-0000-4000-8000-000000000001','Fornecedor A','SUPPLIER','approved',false),
 ('11110000-0000-4000-8000-000000000002','Fornecedor B','SUPPLIER','approved',false),
 ('11110000-0000-4000-8000-000000000003','Provisio','PLATFORM_OPERATOR','approved',true);
insert into public.organization_capabilities(organization_id,capability,status) values
 ('11110000-0000-4000-8000-000000000001','SUPPLIER','approved'),
 ('11110000-0000-4000-8000-000000000002','SUPPLIER','approved'),
 ('11110000-0000-4000-8000-000000000003','PLATFORM_OPERATOR','approved');
insert into public.organization_members(organization_id,user_id,role,status) values
 ('11110000-0000-4000-8000-000000000001','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','SUPPLIER_ADMIN','active'),
 ('11110000-0000-4000-8000-000000000002','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','SUPPLIER_ADMIN','active'),
 ('11110000-0000-4000-8000-000000000001','dddddddd-dddd-4ddd-8ddd-dddddddddddd','READER','active'),
 ('11110000-0000-4000-8000-000000000003','cccccccc-cccc-4ccc-8ccc-cccccccccccc','PLATFORM_ADMIN','active');
insert into public.products(id,slug,name,base_unit,status) values
 ('11111111-1111-4111-8111-111111111111','arroz-a','Arroz A','kg','active'),
 ('11111111-1111-4111-8111-111111111112','arroz-b','Arroz B','kg','active');
insert into public.supplier_products(id,supplier_org_id,product_id,supplier_sku,pack_quantity,pack_unit,status) values
 ('22222222-2222-4222-8222-222222222221','11110000-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111111','A-001',1,'kg','approved'),
 ('22222222-2222-4222-8222-222222222222','11110000-0000-4000-8000-000000000002','11111111-1111-4111-8111-111111111112','B-001',1,'kg','approved');
insert into public.inventory_positions(supplier_product_id,supplier_org_id,available_quantity,reserved_quantity) values
 ('22222222-2222-4222-8222-222222222221','11110000-0000-4000-8000-000000000001',10,0),
 ('22222222-2222-4222-8222-222222222222','11110000-0000-4000-8000-000000000002',20,0);

set role authenticated;
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',false);
select set_config('request.jwt.claims','{"aal":"aal1","session_id":"aaaa1111-1111-4111-8111-111111111111"}',false);
do $$
declare rows_count int;
begin
 if not marketplace_private.has_active_capability('11110000-0000-4000-8000-000000000001','SUPPLIER') then raise exception 'supplier A not authenticated'; end if;
 insert into public.supplier_product_submissions
  (supplier_org_id,author_id,supplier_sku,product_name,region_code,base_unit,pack_quantity,pack_unit,base_price_minor,available_quantity,status)
 values ('11110000-0000-4000-8000-000000000001','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','A-002','Feijao A','BR-SP','kg',1,'kg',900,3,'pending');
 begin
  insert into public.supplier_product_submissions
   (supplier_org_id,author_id,supplier_sku,product_name,region_code,base_unit,pack_quantity,pack_unit,base_price_minor,status)
  values ('11110000-0000-4000-8000-000000000002','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','B-ATTACK','Invasao B','BR-SP','kg',1,'kg',10,'pending');
  raise exception 'FAIL cross-org insert allowed';
 exception when insufficient_privilege then null; end;
 update public.inventory_positions set available_quantity=7
  where supplier_product_id='22222222-2222-4222-8222-222222222221';
 get diagnostics rows_count=row_count;
 if rows_count<>1 then raise exception 'FAIL own stock update: %',rows_count; end if;
 update public.inventory_positions set available_quantity=999
  where supplier_product_id='22222222-2222-4222-8222-222222222222';
 get diagnostics rows_count=row_count;
 if rows_count<>0 then raise exception 'FAIL foreign stock updated'; end if;
 insert into public.offers(supplier_product_id,supplier_org_id,source_type,base_price_minor,min_quantity,status,valid_from)
 values ('22222222-2222-4222-8222-222222222221','11110000-0000-4000-8000-000000000001','MANUAL_AUTHORIZED',1200,1,'pending',now());
 begin
  insert into public.offers(supplier_product_id,supplier_org_id,source_type,base_price_minor,min_quantity,status,valid_from)
  values ('22222222-2222-4222-8222-222222222222','11110000-0000-4000-8000-000000000002','MANUAL_AUTHORIZED',1200,1,'pending',now());
  raise exception 'FAIL cross-org offer allowed';
 exception when others then
  if SQLERRM like 'FAIL %' then raise; end if;
  if SQLERRM not like '%eligible supplier organization%' and SQLSTATE <> '42501' then raise; end if;
 end;
 raise notice 'PASS supplier A writes only own stock/pending offer/submission';
end $$;
-- Fornecedor B nao enxerga submissao criada pelo fornecedor A.
select set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',false);
select set_config('request.jwt.claims','{"aal":"aal1","session_id":"bbbb1111-1111-4111-8111-111111111111"}',false);
do $$
begin
 if exists(select 1 from public.supplier_product_submissions where supplier_org_id='11110000-0000-4000-8000-000000000001') then
  raise exception 'FAIL supplier B can read supplier A submissions';
 end if;
 if exists(select 1 from public.inventory_positions where supplier_org_id='11110000-0000-4000-8000-000000000001') then
  raise exception 'FAIL supplier B can read supplier A stock';
 end if;
 raise notice 'PASS supplier B cannot read supplier A private data';
end $$;
-- Papel READER nao pode criar/alterar estoque/ofertas/submissoes.
select set_config('request.jwt.claim.sub','dddddddd-dddd-4ddd-8ddd-dddddddddddd',false);
select set_config('request.jwt.claims','{"aal":"aal1","session_id":"dddd1111-1111-4111-8111-111111111111"}',false);
do $$
declare rows_count int;
begin
 begin
  insert into public.supplier_product_submissions(supplier_org_id,author_id,supplier_sku,product_name,region_code,base_unit,pack_quantity,pack_unit,base_price_minor,status)
  values('11110000-0000-4000-8000-000000000001','dddddddd-dddd-4ddd-8ddd-dddddddddddd','X','Produto falso','BR-SP','kg',1,'kg',10,'pending');
  raise exception 'FAIL READER could insert';
 exception when insufficient_privilege then null; end;
 update public.inventory_positions set available_quantity=999 where supplier_product_id='22222222-2222-4222-8222-222222222221';
 get diagnostics rows_count=row_count;
 if rows_count<>0 then raise exception 'FAIL READER could update stock'; end if;
 raise notice 'PASS READER denied writes';
end $$;
-- Sessao administrativa com MFA grava metadados privados. Fornecedor nao.
select set_config('request.jwt.claim.sub','cccccccc-cccc-4ccc-8ccc-cccccccccccc',false);
select set_config('request.jwt.claims','{"aal":"aal2","session_id":"cccc1111-1111-4111-8111-111111111111"}',false);
do $$
begin
 if not marketplace_private.is_verified_platform_admin() then raise exception 'FAIL admin missing AAL2'; end if;
 insert into public.product_categories(name,slug) values('Mercearia','mercearia');
 insert into public.product_images(product_id,storage_path,mime_type,size_bytes)
 values('11111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111111/44444444-4444-4444-8444-444444444444.webp','image/webp',100);
 insert into storage.objects(bucket_id,name)
 values('provisio-produtos','11111111-1111-4111-8111-111111111111/44444444-4444-4444-8444-444444444444.webp');
 raise notice 'PASS admin MFA category and image writes';
end $$;
select set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',false);
select set_config('request.jwt.claims','{"aal":"aal1","session_id":"bbbb1111-1111-4111-8111-111111111111"}',false);
do $$
begin
 if exists (select 1 from public.product_images where product_id='11111111-1111-4111-8111-111111111111') then
  raise exception 'FAIL Supplier B can read Supplier A image metadata';
 end if;
 if exists (select 1 from storage.objects where bucket_id='provisio-produtos'
   and name like '11111111-1111-4111-8111-111111111111/%') then
  raise exception 'FAIL Supplier B can read Supplier A object';
 end if;
 raise notice 'PASS Supplier B cannot read Supplier A product image or Storage object';
end $$;
reset role;
select 'PASS all local RLS tests completed' as result;
