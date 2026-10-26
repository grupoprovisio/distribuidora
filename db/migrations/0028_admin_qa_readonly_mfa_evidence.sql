-- Expose only QA transaction evidence to a verified PLATFORM_ADMIN with MFA AAL2.
-- Commercial transactions remain invisible. Uses existing hardened verifier and RLS.
begin;
do $preflight$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='organizations' and column_name='qa_only'
  ) then raise exception 'QA realm migration 0026 missing'; end if;
end $preflight$;

create policy quote_read_admin_qa on public.quote_requests
for select to authenticated
using ((select marketplace_private.is_verified_platform_admin()) and exists (
  select 1 from public.organizations buyer
    join public.organizations supplier on supplier.id=quote_requests.supplier_org_id
  where buyer.id=quote_requests.buyer_org_id and buyer.qa_only=true and supplier.qa_only=true
));

create policy proposal_read_admin_qa on public.quote_proposals
for select to authenticated
using ((select marketplace_private.is_verified_platform_admin()) and exists (
  select 1 from public.quote_requests q
    join public.organizations buyer on buyer.id=q.buyer_org_id
    join public.organizations supplier on supplier.id=q.supplier_org_id
  where q.id=quote_proposals.quote_request_id
    and q.supplier_org_id=quote_proposals.supplier_org_id
    and buyer.qa_only=true and supplier.qa_only=true
));

create policy order_read_admin_qa on public.purchase_orders
for select to authenticated
using ((select marketplace_private.is_verified_platform_admin()) and exists (
  select 1 from public.organizations buyer
    join public.organizations supplier on supplier.id=purchase_orders.supplier_org_id
  where buyer.id=purchase_orders.buyer_org_id and buyer.qa_only=true and supplier.qa_only=true
));

create policy fulfillment_read_admin_qa on public.order_fulfillments
for select to authenticated
using ((select marketplace_private.is_verified_platform_admin()) and exists (
  select 1 from public.organizations buyer
    join public.organizations supplier on supplier.id=order_fulfillments.supplier_org_id
  where buyer.id=order_fulfillments.buyer_org_id and buyer.qa_only=true and supplier.qa_only=true
));

comment on policy quote_read_admin_qa on public.quote_requests is
  'Read-only QA evidence for PLATFORM_ADMIN with current MFA AAL2; never commercial transactions.';
comment on policy proposal_read_admin_qa on public.quote_proposals is
  'Read-only QA evidence for PLATFORM_ADMIN with current MFA AAL2; never commercial transactions.';
comment on policy order_read_admin_qa on public.purchase_orders is
  'Read-only QA evidence for PLATFORM_ADMIN with current MFA AAL2; never commercial transactions.';
comment on policy fulfillment_read_admin_qa on public.order_fulfillments is
  'Read-only QA evidence for PLATFORM_ADMIN with current MFA AAL2; never commercial transactions.';
commit;
