-- Production catalog contains only the approved Stripe-backed offer.
-- QA offers remain available only in isolated local/integration fixtures.
update public.offers
set status='draft'
where supplier_org_id in (
  select id from public.organizations where qa_only=true
);

update public.products
set status='archived'
where slug='teste-provisio-azeite-500ml-20261022';

update public.organizations
set qa_only=false,
    trade_name='Provisio Comprador'
where id='1ec67ecc-5395-4253-8509-48acc64316cb';
