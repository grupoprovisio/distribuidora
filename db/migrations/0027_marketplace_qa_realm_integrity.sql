-- Enforce QA/commercial realm at the persisted transaction boundary.
-- A user with memberships in multiple buyer organizations must not quote
-- a QA supplier on behalf of a commercial buyer (or the reverse).
-- No new commercial capabilities, payment flows or public profile.
begin;

do $preflight$
begin
  if exists (
    select 1 from public.quote_requests q
      join public.organizations b on b.id=q.buyer_org_id
      join public.organizations s on s.id=q.supplier_org_id
    where b.qa_only is distinct from s.qa_only
  ) or exists (
    select 1 from public.purchase_orders p
      join public.organizations b on b.id=p.buyer_org_id
      join public.organizations s on s.id=p.supplier_org_id
    where b.qa_only is distinct from s.qa_only
  ) then
    raise exception 'historical_realm_mismatch_requires_review';
  end if;
end $preflight$;

create function marketplace_private.enforce_commercial_realm()
returns trigger language plpgsql security definer set search_path=''
as $guard$
declare buyer_qa boolean; supplier_qa boolean;
begin
  select b.qa_only,s.qa_only into buyer_qa,supplier_qa
    from public.organizations b
    join public.organizations s on s.id=new.supplier_org_id
    where b.id=new.buyer_org_id;
  if not found or buyer_qa is distinct from supplier_qa then
    raise exception 'qa_commercial_realm_mismatch' using errcode='22023';
  end if;
  if not exists (
    select 1 from public.offers o where o.id=new.offer_id
      and o.supplier_org_id=new.supplier_org_id
  ) then
    raise exception 'offer_supplier_mismatch' using errcode='22023';
  end if;
  if tg_table_name='purchase_orders' then
    if not exists (
      select 1 from public.quote_requests q
      where q.id=new.quote_request_id and q.buyer_org_id=new.buyer_org_id
        and q.supplier_org_id=new.supplier_org_id and q.offer_id=new.offer_id
    ) then
      raise exception 'order_quote_realm_mismatch' using errcode='22023';
    end if;
  end if;
  return new;
end;
$guard$;

revoke all on function marketplace_private.enforce_commercial_realm() from public,anon,authenticated;
create trigger quote_request_realm_guard
  before insert or update of buyer_org_id,supplier_org_id,offer_id
  on public.quote_requests for each row
  execute function marketplace_private.enforce_commercial_realm();
create trigger purchase_order_realm_guard
  before insert or update of buyer_org_id,supplier_org_id,offer_id,quote_request_id
  on public.purchase_orders for each row
  execute function marketplace_private.enforce_commercial_realm();

comment on function marketplace_private.enforce_commercial_realm() is
  'Enforces QA vs commercial isolation even when a JWT belongs to multiple buyer organizations and bypasses the Next.js API.';
commit;
