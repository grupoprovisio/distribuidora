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
rollback;
select 'PASS: migration 0026 blocks commercial-to-QA visibility/quotes and allows QA-to-QA' as result;
