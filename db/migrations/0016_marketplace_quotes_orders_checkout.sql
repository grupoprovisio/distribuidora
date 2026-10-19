-- Provisio B2B 0016: cotacao, proposta e solicitacao de pedido.
-- APENAS branch/CI; NAO aplicar ao Supabase remoto antes de Preview com MFA, dados piloto e revisao.
-- Nao processa pagamento, nao emite nota e nao reserva estoque.
begin;

create table public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  buyer_org_id uuid not null references public.organizations(id) on delete restrict,
  supplier_org_id uuid not null references public.organizations(id) on delete restrict,
  offer_id uuid not null references public.offers(id) on delete restrict,
  created_by uuid not null references public.profiles(id) on delete restrict,
  request_key uuid not null,
  quantity integer not null check (quantity between 1 and 100000),
  region_code text not null check (region_code ~ '^BR-[A-Z]{2}$'),
  notes text not null default '' check (length(notes) <= 1000),
  status text not null default 'submitted' check (status in ('submitted','converted','cancelled')),
  created_at timestamptz not null default now(),
  unique (buyer_org_id, request_key),
  unique (id,supplier_org_id)
);
create index quote_requests_buyer_time_idx on public.quote_requests (buyer_org_id,created_at desc);
create index quote_requests_supplier_time_idx on public.quote_requests (supplier_org_id,created_at desc);

create table public.quote_proposals (
  id uuid primary key default gen_random_uuid(),
  quote_request_id uuid not null,
  supplier_org_id uuid not null,
  proposed_by uuid not null references public.profiles(id) on delete restrict,
  unit_price_minor bigint not null check (unit_price_minor > 0 and unit_price_minor <= 1000000000),
  expires_at timestamptz not null,
  status text not null default 'proposed' check (status in ('proposed','withdrawn')),
  created_at timestamptz not null default now(),
  unique (quote_request_id,supplier_org_id),
  unique (id,quote_request_id),
  foreign key (quote_request_id,supplier_org_id)
    references public.quote_requests(id,supplier_org_id) on delete restrict
);
create index quote_proposals_expiry_idx on public.quote_proposals (expires_at);

create table public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  buyer_org_id uuid not null references public.organizations(id) on delete restrict,
  supplier_org_id uuid not null references public.organizations(id) on delete restrict,
  quote_request_id uuid not null unique references public.quote_requests(id) on delete restrict,
  proposal_id uuid not null unique,
  offer_id uuid not null references public.offers(id) on delete restrict,
  created_by uuid not null references public.profiles(id) on delete restrict,
  checkout_key uuid not null,
  quantity integer not null check (quantity between 1 and 100000),
  region_code text not null check (region_code ~ '^BR-[A-Z]{2}$'),
  unit_price_minor bigint not null check (unit_price_minor > 0),
  total_price_minor bigint not null check (total_price_minor > 0),
  status text not null default 'awaiting_supplier_confirmation'
    check (status in ('awaiting_supplier_confirmation','cancelled')),
  created_at timestamptz not null default now(),
  unique (buyer_org_id,checkout_key),
  foreign key (proposal_id,quote_request_id) references public.quote_proposals(id,quote_request_id)
);
create index purchase_orders_buyer_time_idx on public.purchase_orders (buyer_org_id,created_at desc);
create index purchase_orders_supplier_time_idx on public.purchase_orders (supplier_org_id,created_at desc);

alter table public.quote_requests enable row level security;
alter table public.quote_requests force row level security;
alter table public.quote_proposals enable row level security;
alter table public.quote_proposals force row level security;
alter table public.purchase_orders enable row level security;
alter table public.purchase_orders force row level security;

revoke all on public.quote_requests,public.quote_proposals,public.purchase_orders from public,anon,authenticated;
grant select on public.quote_requests,public.quote_proposals,public.purchase_orders to authenticated;

create policy quote_read_buyer on public.quote_requests
for select to authenticated using (marketplace_private.has_active_capability(buyer_org_id,'BUYER'));
create policy quote_read_supplier on public.quote_requests
for select to authenticated using (marketplace_private.has_active_capability(supplier_org_id,'SUPPLIER'));
create policy proposal_read_buyer on public.quote_proposals
for select to authenticated using (exists (
  select 1 from public.quote_requests q
  where q.id=quote_request_id
    and marketplace_private.has_active_capability(q.buyer_org_id,'BUYER')
));
create policy proposal_read_supplier on public.quote_proposals
for select to authenticated using (marketplace_private.has_active_capability(supplier_org_id,'SUPPLIER'));
create policy order_read_buyer on public.purchase_orders
for select to authenticated using (marketplace_private.has_active_capability(buyer_org_id,'BUYER'));
create policy order_read_supplier on public.purchase_orders
for select to authenticated using (marketplace_private.has_active_capability(supplier_org_id,'SUPPLIER'));

-- Todas as escritas passam por funcoes privadas atomicas. SECURITY DEFINER
-- permanece fora do schema exposto, com papeis, sessao viva e RLS checados
-- explicitamente. A funcao public e SECURITY INVOKER e nunca usa service_role.
create function marketplace_private.create_quote(
  buyer_id uuid, offer_ref uuid, units integer, region text, message text, idem uuid
) returns uuid language plpgsql volatile security definer set search_path=''
as $$
declare v_offer public.offers%rowtype; v_id uuid; v_existing public.quote_requests%rowtype;
begin
  if not (select marketplace_private.has_live_auth_session()) or (select auth.uid()) is null then
    raise exception 'session_required' using errcode='42501';
  end if;
  if buyer_id is null or offer_ref is null or idem is null or units is null or units not between 1 and 100000
    or region is null or region !~ '^BR-[A-Z]{2}$'
    or message is null or length(message)>1000 then
    raise exception 'invalid_quote' using errcode='22023';
  end if;
  if not marketplace_private.has_active_capability(buyer_id,'BUYER') or not exists (
    select 1 from public.organization_members m where m.organization_id=buyer_id
      and m.user_id=(select auth.uid()) and m.status='active'
      and m.role in ('ORG_ADMIN','BUYER','REQUESTER','APPROVER')
  ) or not exists (
    select 1 from public.organizations o where o.id=buyer_id and o.kind='BUYER' and o.status='approved'
  ) or not exists (
    select 1 from public.buyer_delivery_regions br where br.buyer_org_id=buyer_id and br.region_code=region
  ) then
    raise exception 'buyer_not_authorized' using errcode='42501';
  end if;
  select * into v_offer from public.offers where id=offer_ref;
  if not found or not marketplace_private.buyer_can_see_offer(offer_ref)
    or v_offer.status<>'approved' or v_offer.valid_from>now()
    or (v_offer.valid_to is not null and v_offer.valid_to<=now())
    or units < v_offer.min_quantity
    or not exists (select 1 from public.offer_regions r where r.offer_id=offer_ref and r.region_code in (region,'BR'))
  then
    raise exception 'offer_unavailable' using errcode='22023';
  end if;

  insert into public.quote_requests(buyer_org_id,supplier_org_id,offer_id,created_by,request_key,quantity,region_code,notes)
  values(buyer_id,v_offer.supplier_org_id,offer_ref,(select auth.uid()),idem,units,region,message)
  on conflict (buyer_org_id,request_key) do nothing returning id into v_id;
  if v_id is not null then return v_id; end if;
  select * into v_existing from public.quote_requests where buyer_org_id=buyer_id and request_key=idem;
  if not found or v_existing.created_by is distinct from (select auth.uid())
    or v_existing.offer_id is distinct from offer_ref or v_existing.quantity<>units
    or v_existing.region_code<>region or v_existing.notes<>message then
    raise exception 'idempotency_conflict' using errcode='22023';
  end if;
  return v_existing.id;
end;
$$;

create function marketplace_private.propose_quote(
  request_ref uuid, unit_minor bigint, valid_until timestamptz
) returns uuid language plpgsql volatile security definer set search_path=''
as $$
declare v_quote public.quote_requests%rowtype; v_id uuid; v_existing public.quote_proposals%rowtype;
begin
  if not (select marketplace_private.has_live_auth_session()) or (select auth.uid()) is null then
    raise exception 'session_required' using errcode='42501';
  end if;
  if request_ref is null or unit_minor is null or unit_minor not between 1 and 1000000000
    or valid_until is null or valid_until <= now() or valid_until>now()+interval '60 days' then
    raise exception 'invalid_proposal' using errcode='22023';
  end if;
  select * into v_quote from public.quote_requests where id=request_ref for update;
  if not found or v_quote.status<>'submitted' or
    not marketplace_private.has_active_capability(v_quote.supplier_org_id,'SUPPLIER') or not exists (
      select 1 from public.organization_members m where m.organization_id=v_quote.supplier_org_id
        and m.user_id=(select auth.uid()) and m.status='active'
        and m.role in ('ORG_ADMIN','SUPPLIER_ADMIN')
    ) then raise exception 'supplier_not_authorized' using errcode='42501';
  end if;
  insert into public.quote_proposals(quote_request_id,supplier_org_id,proposed_by,unit_price_minor,expires_at)
  values (request_ref,v_quote.supplier_org_id,(select auth.uid()),unit_minor,valid_until)
  on conflict (quote_request_id,supplier_org_id) do nothing returning id into v_id;
  if v_id is not null then return v_id; end if;
  select * into v_existing from public.quote_proposals where quote_request_id=request_ref and supplier_org_id=v_quote.supplier_org_id;
  if v_existing.proposed_by is distinct from (select auth.uid())
    or v_existing.unit_price_minor<>unit_minor or v_existing.expires_at<>valid_until
  then raise exception 'proposal_conflict' using errcode='22023';
  end if;
  return v_existing.id;
end;
$$;

create function marketplace_private.submit_checkout(
  buyer_id uuid, request_ref uuid, proposal_ref uuid, idem uuid
) returns uuid language plpgsql volatile security definer set search_path=''
as $$
declare v_quote public.quote_requests%rowtype; v_proposal public.quote_proposals%rowtype;
        v_offer public.offers%rowtype; v_order public.purchase_orders%rowtype;
        v_stock public.inventory_positions%rowtype; v_id uuid; v_total numeric;
begin
  if not (select marketplace_private.has_live_auth_session()) or (select auth.uid()) is null then
    raise exception 'session_required' using errcode='42501';
  end if;
  if buyer_id is null or request_ref is null or proposal_ref is null or idem is null then
    raise exception 'invalid_checkout' using errcode='22023';
  end if;
  select * into v_order from public.purchase_orders where buyer_org_id=buyer_id and checkout_key=idem;
  if found then
    if v_order.quote_request_id<>request_ref or v_order.proposal_id<>proposal_ref
      or v_order.created_by is distinct from (select auth.uid()) then
      raise exception 'idempotency_conflict' using errcode='22023';
    end if;
    return v_order.id;
  end if;
  if not marketplace_private.has_active_capability(buyer_id,'BUYER') or not exists (
    select 1 from public.organization_members m where m.organization_id=buyer_id
      and m.user_id=(select auth.uid()) and m.status='active' and m.role in ('ORG_ADMIN','BUYER','APPROVER')
  ) then raise exception 'buyer_not_authorized' using errcode='42501';
  end if;
  select * into v_quote from public.quote_requests where id=request_ref for update;
  if not found or v_quote.buyer_org_id<>buyer_id or v_quote.status<>'submitted' then
    raise exception 'quote_unavailable' using errcode='22023';
  end if;
  select * into v_proposal from public.quote_proposals
    where id=proposal_ref and quote_request_id=request_ref
      and supplier_org_id=v_quote.supplier_org_id;
  if not found or v_proposal.status<>'proposed' or v_proposal.expires_at<=now() then
    raise exception 'proposal_unavailable' using errcode='22023';
  end if;
  select * into v_offer from public.offers where id=v_quote.offer_id;
  if not found or not marketplace_private.buyer_can_see_offer(v_offer.id)
    or v_offer.status<>'approved' or v_offer.supplier_org_id<>v_quote.supplier_org_id
    or v_offer.valid_from>now() or (v_offer.valid_to is not null and v_offer.valid_to<=now())
    or v_quote.quantity<v_offer.min_quantity
    or not exists (select 1 from public.buyer_delivery_regions
      where buyer_org_id=buyer_id and region_code=v_quote.region_code)
    or not exists (select 1 from public.offer_regions
      where offer_id=v_offer.id and region_code in (v_quote.region_code,'BR'))
  then raise exception 'offer_unavailable' using errcode='22023';
  end if;
  -- Lock stock as a serialization point. Still NO reservation or decrement:
  -- this creates a supplier-confirmation REQUEST, not a finalized sale.
  select * into v_stock from public.inventory_positions
   where supplier_product_id=v_offer.supplier_product_id and supplier_org_id=v_quote.supplier_org_id for update;
  if not found or v_stock.available_quantity-v_stock.reserved_quantity<v_quote.quantity then
    raise exception 'insufficient_stock' using errcode='22023';
  end if;
  v_total := (v_quote.quantity::numeric * v_proposal.unit_price_minor::numeric);
  if v_total > 9223372036854775807 then raise exception 'total_overflow' using errcode='22023'; end if;

  insert into public.purchase_orders(buyer_org_id,supplier_org_id,quote_request_id,proposal_id,
    offer_id,created_by,checkout_key,quantity,region_code,unit_price_minor,total_price_minor)
  values (buyer_id,v_quote.supplier_org_id,v_quote.id,v_proposal.id,v_offer.id,
    (select auth.uid()),idem,v_quote.quantity,v_quote.region_code,v_proposal.unit_price_minor,v_total::bigint)
  returning id into v_id;
  update public.quote_requests set status='converted' where id=v_quote.id;
  return v_id;
end;
$$;

-- Funcoes publicas invoker sao as unicas RPCs expostas pelo PostgREST.
create function public.marketplace_create_quote(
  buyer_org_id uuid, offer_id uuid, quantity integer, region_code text, notes text, request_key uuid
) returns uuid language sql volatile security invoker set search_path=''
as $$ select marketplace_private.create_quote(buyer_org_id,offer_id,quantity,region_code,notes,request_key) $$;
create function public.marketplace_propose_quote(
  quote_request_id uuid, unit_price_minor bigint, expires_at timestamptz
) returns uuid language sql volatile security invoker set search_path=''
as $$ select marketplace_private.propose_quote(quote_request_id,unit_price_minor,expires_at) $$;
create function public.marketplace_submit_checkout(
  buyer_org_id uuid, quote_request_id uuid, proposal_id uuid, checkout_key uuid
) returns uuid language sql volatile security invoker set search_path=''
as $$ select marketplace_private.submit_checkout(buyer_org_id,quote_request_id,proposal_id,checkout_key) $$;

revoke all on function marketplace_private.create_quote(uuid,uuid,integer,text,text,uuid),
  marketplace_private.propose_quote(uuid,bigint,timestamptz),
  marketplace_private.submit_checkout(uuid,uuid,uuid,uuid) from public,anon,authenticated;
revoke all on function public.marketplace_create_quote(uuid,uuid,integer,text,text,uuid),
  public.marketplace_propose_quote(uuid,bigint,timestamptz),
  public.marketplace_submit_checkout(uuid,uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function marketplace_private.create_quote(uuid,uuid,integer,text,text,uuid),
  marketplace_private.propose_quote(uuid,bigint,timestamptz),
  marketplace_private.submit_checkout(uuid,uuid,uuid,uuid) to authenticated;
grant execute on function public.marketplace_create_quote(uuid,uuid,integer,text,text,uuid),
  public.marketplace_propose_quote(uuid,bigint,timestamptz),
  public.marketplace_submit_checkout(uuid,uuid,uuid,uuid) to authenticated;

comment on table public.purchase_orders is 'Solicitacao comercial pendente de confirmacao do fornecedor; NAO houve pagamento ou reserva.';
commit;
