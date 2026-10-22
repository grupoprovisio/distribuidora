-- Executar apos catalog-p1-isolation-local.sql em PostgreSQL descartavel.
\set ON_ERROR_STOP on
set role authenticated;
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',false);
select set_config('request.jwt.claims','{"aal":"aal1","session_id":"aaaa1111-1111-4111-8111-111111111111"}',false);
select public.set_supplier_available_stock(
 '11110000-0000-4000-8000-000000000001','22222222-2222-4222-8222-222222222221',8
);
do $$
declare offer uuid;
begin
 select public.create_supplier_pending_offer(
  '11110000-0000-4000-8000-000000000001','22222222-2222-4222-8222-222222222221',
  1890,2,'BR-SP',null
 ) into offer;
 if offer is null then raise exception 'FAIL new pending offer null'; end if;
 if not exists(select 1 from public.offer_regions where offer_id=offer and region_code='BR-SP') then
  raise exception 'FAIL offer region missing';
 end if;
 begin
  perform public.set_supplier_available_stock(
   '11110000-0000-4000-8000-000000000002','22222222-2222-4222-8222-222222222222',33
  );
  raise exception 'FAIL cross-tenant RPC inventory allowed';
 exception when insufficient_privilege then null; end;
 begin
  perform public.create_supplier_pending_offer(
   '11110000-0000-4000-8000-000000000002','22222222-2222-4222-8222-222222222222',
   5,1,'BR-SP',null
  );
  raise exception 'FAIL cross-tenant RPC offer allowed';
 exception when insufficient_privilege then null; end;
 raise notice 'PASS atomic inventory and offers RPC (own supplier only)';
end $$;
select set_config('request.jwt.claim.sub','cccccccc-cccc-4ccc-8ccc-cccccccccccc',false);
select set_config('request.jwt.claims','{"aal":"aal2","session_id":"cccc1111-1111-4111-8111-111111111111"}',false);
do $$
declare source_id uuid;
declare created jsonb;
begin
 select id into source_id from public.supplier_product_submissions
  where supplier_sku='A-002' and status='pending';
 if source_id is null then raise exception 'FAIL missing supplier submission'; end if;
 select public.promote_supplier_submission(source_id,'feijao-a',null) into created;
 if (created->>'product_id') is null then raise exception 'FAIL promotion response'; end if;
 if not exists(select 1 from public.products where slug='feijao-a' and status='draft') then raise exception 'FAIL master not draft'; end if;
 if not exists(select 1 from public.supplier_products where supplier_sku='A-002' and status='pending') then raise exception 'FAIL SKU not pending'; end if;
 if not exists(select 1 from public.offers o join public.offer_regions r on r.offer_id=o.id
   where o.id=(created->>'offer_id')::uuid and o.status='pending' and r.region_code='BR-SP') then
  raise exception 'FAIL pending offer missing region';
 end if;
 if not exists(select 1 from public.supplier_product_submissions
  where id=source_id and status='approved') then raise exception 'FAIL submission not reviewed'; end if;
 raise notice 'PASS admin MFA promotion atomic with draft/SKU/offer statuses';
end $$;
reset role;
select 'PASS complete local catalog RLS and workflow test' as final;
