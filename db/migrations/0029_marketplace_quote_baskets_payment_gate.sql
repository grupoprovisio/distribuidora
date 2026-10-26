-- Provisio 0029: a single buyer basket/request groups multiple existing per-offer quotes.
-- QA ONLY until production payments and commercial rollout are explicitly enabled.
-- No payment processing, no fake paid status, no invoice issuance.
begin;

create table public.quote_baskets (
  id uuid primary key default gen_random_uuid(),
  buyer_org_id uuid not null references public.organizations(id) on delete restrict,
  created_by uuid not null references public.profiles(id) on delete restrict,
  request_key uuid not null,
  region_code text not null check (region_code ~ '^BR-[A-Z]{2}$'),
  fulfillment_method text not null check (fulfillment_method in ('delivery','pickup')),
  item_fingerprint text not null check (length(item_fingerprint)=32),
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid','paid','refunded')),
  created_at timestamptz not null default now(),
  unique (buyer_org_id,request_key)
);
create index quote_baskets_buyer_date_idx on public.quote_baskets(buyer_org_id,created_at desc);
alter table public.quote_baskets enable row level security;
alter table public.quote_baskets force row level security;
revoke all on public.quote_baskets from public,anon,authenticated;
grant select on public.quote_baskets to authenticated;
create policy basket_read_buyer on public.quote_baskets for select to authenticated
  using (marketplace_private.has_active_capability(buyer_org_id,'BUYER'));
create policy basket_read_qa_admin on public.quote_baskets for select to authenticated
  using ((select marketplace_private.is_verified_platform_admin()) and exists (
    select 1 from public.organizations o where o.id=buyer_org_id and o.qa_only=true
  ));

alter table public.quote_requests
  add column basket_id uuid references public.quote_baskets(id) on delete restrict;
create index quote_requests_basket_idx on public.quote_requests(basket_id)
  where basket_id is not null;

-- Atomic basket creation: one RPC creates every per-offer quote or none.
-- The existing create_quote() checks live Auth session, membership, region,
-- product approval, and the 0027 QA/commercial realm trigger.
create function marketplace_private.create_quote_basket(
  p_buyer uuid, p_region text, p_method text, p_lines jsonb, p_key uuid
) returns uuid language plpgsql volatile security definer set search_path=''
as $basket$
declare
  v_basket public.quote_baskets%rowtype;
  v_id uuid;
  v_line jsonb;
  v_offer uuid;
  v_qty integer;
  v_quote uuid;
  v_seen uuid[] := '{}'::uuid[];
  v_hash text;
  v_count integer;
begin
  if (select auth.uid()) is null or not marketplace_private.has_live_auth_session() then
    raise exception 'live_session_required' using errcode='42501';
  end if;
  if p_buyer is null or p_key is null or p_region is null
    or p_region !~ '^BR-[A-Z]{2}$'
    or p_method not in ('delivery','pickup')
    or p_lines is null or jsonb_typeof(p_lines)<>'array'
    or jsonb_array_length(p_lines) not between 1 and 30 then
    raise exception 'invalid_basket' using errcode='22023';
  end if;
  if not marketplace_private.has_active_capability(p_buyer,'BUYER')
    or not exists (
      select 1 from public.organization_members m where m.organization_id=p_buyer
       and m.user_id=(select auth.uid()) and m.status='active'
       and m.role in ('ORG_ADMIN','BUYER','REQUESTER','APPROVER')
    )
    or not exists (
      select 1 from public.organizations o where o.id=p_buyer
       and o.qa_only=true and o.kind='BUYER' and o.status='approved'
    ) then
    raise exception 'qa_buyer_not_authorized' using errcode='42501';
  end if;

  -- Validate all lines and prohibit duplicates/extra client controlled fields.
  for v_line in select value from jsonb_array_elements(p_lines) loop
    if jsonb_typeof(v_line)<>'object'
       or (v_line - 'offerId' - 'quantity') <> '{}'::jsonb
       or jsonb_typeof(v_line->'offerId')<>'string'
       or (v_line->>'offerId') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       or jsonb_typeof(v_line->'quantity')<>'number'
       or (v_line->>'quantity') !~ '^[0-9]{1,6}$'
    then raise exception 'invalid_basket_line' using errcode='22023'; end if;
    v_offer := (v_line->>'offerId')::uuid;
    v_qty := (v_line->>'quantity')::integer;
    if v_qty not between 1 and 100000 or v_offer=any(v_seen) then
      raise exception 'invalid_basket_quantity_or_duplicate' using errcode='22023';
    end if;
    v_seen := array_append(v_seen,v_offer);
  end loop;

  v_hash := md5(p_lines::text || ':' || p_region || ':' || p_method);
  select * into v_basket from public.quote_baskets
    where buyer_org_id=p_buyer and request_key=p_key for update;
  if found then
    if v_basket.created_by is distinct from (select auth.uid())
      or v_basket.item_fingerprint<>v_hash or v_basket.region_code<>p_region
      or v_basket.fulfillment_method<>p_method then
      raise exception 'basket_idempotency_conflict' using errcode='22023';
    end if;
    return v_basket.id;
  end if;

  insert into public.quote_baskets
    (buyer_org_id,created_by,request_key,region_code,fulfillment_method,item_fingerprint)
  values (p_buyer,(select auth.uid()),p_key,p_region,p_method,v_hash)
  returning id into v_id;

  for v_line in select value from jsonb_array_elements(p_lines) loop
    v_offer := (v_line->>'offerId')::uuid;
    v_qty := (v_line->>'quantity')::integer;
    -- Enforce QA supplier for EVERY line; never mix a commercial seller.
    if not exists (
      select 1 from public.offers f join public.organizations s on s.id=f.supplier_org_id
      where f.id=v_offer and s.qa_only=true and s.kind='SUPPLIER'
    ) then raise exception 'basket_supplier_outside_qa' using errcode='22023'; end if;
    v_quote := marketplace_private.create_quote(p_buyer,v_offer,v_qty,p_region,
      'Solicitação pela cesta Provisio',gen_random_uuid());
    update public.quote_requests set basket_id=v_id where id=v_quote
      and buyer_org_id=p_buyer and created_by=(select auth.uid());
    if not found then raise exception 'basket_quote_attach_failed' using errcode='22023'; end if;
  end loop;

  select count(*) into v_count from public.quote_requests where basket_id=v_id;
  if v_count<>jsonb_array_length(p_lines) then
    raise exception 'basket_incomplete' using errcode='22023';
  end if;
  return v_id;
end;
$basket$;

create function public.marketplace_submit_quote_basket(
  buyer_org_id uuid, region_code text, fulfillment_method text,
  lines jsonb, request_key uuid
) returns uuid language sql volatile security invoker set search_path=''
as $$ select marketplace_private.create_quote_basket(
 buyer_org_id,region_code,fulfillment_method,lines,request_key
) $$;
revoke all on function marketplace_private.create_quote_basket(uuid,text,text,jsonb,uuid),
  public.marketplace_submit_quote_basket(uuid,text,text,jsonb,uuid) from public,anon,authenticated;
grant execute on function marketplace_private.create_quote_basket(uuid,text,text,jsonb,uuid),
  public.marketplace_submit_quote_basket(uuid,text,text,jsonb,uuid) to authenticated;

-- No supplier may reserve, separate, invoice, ship or deliver a new basket
-- order before a trusted payment confirmation. There is deliberately no
-- client-accessible RPC that can change payment_status to paid.
create function marketplace_private.guard_basket_fulfillment_payment()
returns trigger language plpgsql security definer set search_path=''
as $gate$
declare v_payment text;
begin
  if tg_table_name='purchase_orders' then
    if new.status<>'confirmed' or old.status='confirmed' then return new; end if;
    select b.payment_status into v_payment
      from public.quote_requests q join public.quote_baskets b on b.id=q.basket_id
      where q.id=new.quote_request_id;
  else
    if new.status='cancelled' then return new; end if;
    select b.payment_status into v_payment
      from public.purchase_orders p join public.quote_requests q on q.id=p.quote_request_id
      join public.quote_baskets b on b.id=q.basket_id
      where p.id=new.order_id;
  end if;
  -- Legacy ungrouped orders are unchanged; only new grouped orders are gated.
  if v_payment is not null and v_payment<>'paid' then
    raise exception 'verified_payment_required' using errcode='22023';
  end if;
  return new;
end;
$gate$;

create trigger basket_confirm_requires_payment
  before update of status on public.purchase_orders
  for each row when (new.status='confirmed' and old.status is distinct from new.status)
  execute function marketplace_private.guard_basket_fulfillment_payment();
create trigger basket_fulfillment_requires_payment
  before insert or update of status on public.order_fulfillments
  for each row execute function marketplace_private.guard_basket_fulfillment_payment();
revoke all on function marketplace_private.guard_basket_fulfillment_payment()
  from public,anon,authenticated;

comment on table public.quote_baskets is
  'Agrupador de solicitacoes de cotacao QA por comprador. Nao representa compra paga ou faturada.';
comment on column public.quote_baskets.payment_status is
  'Somente um processamento de pagamento verificado e confiavel podera atualizar para paid; nenhum frontend faz isso.';
commit;
