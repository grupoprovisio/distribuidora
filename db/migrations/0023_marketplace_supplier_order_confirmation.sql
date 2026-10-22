-- Provisio 0023: fornecedor confirma/rejeita solicitações; reserva e liberação atômicas.
-- SOMENTE branch/CI até homologação de Preview, sem aplicação ao projeto remoto.
-- A confirmação NÃO processa pagamentos ou emissão fiscal.
begin;

alter table public.purchase_orders drop constraint if exists purchase_orders_status_check;
alter table public.purchase_orders add constraint purchase_orders_status_check
  check (status in ('awaiting_supplier_confirmation','confirmed','rejected','cancelled'));
alter table public.purchase_orders
  add column confirmed_at timestamptz,
  add column closed_at timestamptz;
alter table public.inventory_positions add constraint inventory_reserved_not_above_available
  check (reserved_quantity <= available_quantity);

-- Auditoria interna nunca exposta via Data API.
create table marketplace_private.order_transition_audit (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.purchase_orders(id) on delete restrict,
  actor_id uuid not null,
  from_status text not null,
  to_status text not null,
  changed_at timestamptz not null default now()
);
revoke all on marketplace_private.order_transition_audit from public,anon,authenticated;

create function marketplace_private.transition_purchase_order(order_ref uuid, command text)
returns uuid language plpgsql volatile security definer set search_path=''
as $$
declare
  v_order public.purchase_orders%rowtype;
  v_offer public.offers%rowtype;
  v_stock public.inventory_positions%rowtype;
  v_target text;
  v_role_ok boolean;
  v_before text;
begin
  if not marketplace_private.has_live_auth_session() or (select auth.uid()) is null then
    raise exception 'active_session_required' using errcode='42501';
  end if;
  if order_ref is null or command is null or command not in
     ('supplier_confirm','supplier_reject','supplier_cancel','buyer_cancel') then
    raise exception 'invalid_transition' using errcode='22023';
  end if;
  select * into v_order from public.purchase_orders where id=order_ref for update;
  if not found then
    raise exception 'order_not_accessible' using errcode='42501';
  end if;

  if command='buyer_cancel' then
    v_role_ok := marketplace_private.has_active_capability(v_order.buyer_org_id,'BUYER')
      and exists (
        select 1 from public.organization_members m
        where m.organization_id=v_order.buyer_org_id
          and m.user_id=(select auth.uid()) and m.status='active'
          and m.role in ('ORG_ADMIN','BUYER','APPROVER')
      );
    v_target:='cancelled';
  else
    v_role_ok := marketplace_private.has_active_capability(v_order.supplier_org_id,'SUPPLIER')
      and exists (
        select 1 from public.organization_members m
        where m.organization_id=v_order.supplier_org_id
          and m.user_id=(select auth.uid()) and m.status='active'
          and m.role in ('ORG_ADMIN','SUPPLIER_ADMIN')
      );
    v_target:=case command
      when 'supplier_confirm' then 'confirmed'
      when 'supplier_reject' then 'rejected'
      when 'supplier_cancel' then 'cancelled'
    end;
  end if;
  if not v_role_ok then
    raise exception 'order_permission_denied' using errcode='42501';
  end if;
  -- Retry of already committed action is side-effect free. The role was rechecked.
  if v_order.status=v_target then return v_order.id; end if;

  if command='supplier_cancel' then
    if v_order.status<>'confirmed' then
      raise exception 'invalid_order_state' using errcode='22023';
    end if;
  elsif v_order.status<>'awaiting_supplier_confirmation' then
    raise exception 'invalid_order_state' using errcode='22023';
  end if;

  if command in ('supplier_confirm','supplier_cancel') then
    select * into v_offer from public.offers where id=v_order.offer_id;
    if not found or v_offer.supplier_org_id<>v_order.supplier_org_id then
      raise exception 'invalid_order_offer' using errcode='22023';
    end if;
    -- Serializes reservations and cancellations by locking a specific supplier SKU.
    select * into v_stock from public.inventory_positions
      where supplier_product_id=v_offer.supplier_product_id
        and supplier_org_id=v_order.supplier_org_id
      for update;
    if not found then raise exception 'stock_unavailable' using errcode='22023'; end if;
  end if;

  if command='supplier_confirm' then
    -- Re-validate at the instant of acceptance; checkout could be old.
    if v_offer.status<>'approved' or v_offer.valid_from>now()
      or (v_offer.valid_to is not null and v_offer.valid_to<=now())
      or not exists (
        select 1 from public.supplier_products sp
        join public.products p on p.id=sp.product_id and p.status='active'
        where sp.id=v_offer.supplier_product_id and sp.supplier_org_id=v_order.supplier_org_id
          and sp.status='approved'
      )
      or not exists (
        select 1 from public.organizations o
        join public.organization_capabilities cap
          on cap.organization_id=o.id and cap.capability='BUYER' and cap.status='approved'
        join public.profiles p on p.id=v_order.created_by and p.status='active'
        join public.organization_members m on m.organization_id=o.id
          and m.user_id=p.id and m.status='active'
          and m.role in ('ORG_ADMIN','BUYER','REQUESTER','APPROVER')
        where o.id=v_order.buyer_org_id and o.kind='BUYER' and o.status='approved'
      )
      or not exists (
        select 1 from public.buyer_delivery_regions br where br.buyer_org_id=v_order.buyer_org_id
          and br.region_code=v_order.region_code
      )
      or not exists (
        select 1 from public.offer_regions r where r.offer_id=v_offer.id
          and r.region_code in (v_order.region_code,'BR')
      )
      or v_stock.available_quantity-v_stock.reserved_quantity < v_order.quantity
    then
      raise exception 'confirmation_requirements_not_met' using errcode='22023';
    end if;
    update public.inventory_positions set
      reserved_quantity=reserved_quantity+v_order.quantity,updated_at=now()
      where supplier_product_id=v_stock.supplier_product_id;
  elsif command='supplier_cancel' then
    if v_stock.reserved_quantity<v_order.quantity then
      raise exception 'reservation_inconsistent' using errcode='22023';
    end if;
    update public.inventory_positions set
      reserved_quantity=reserved_quantity-v_order.quantity,updated_at=now()
      where supplier_product_id=v_stock.supplier_product_id;
  end if;

  v_before:=v_order.status;
  update public.purchase_orders set status=v_target,
    confirmed_at=case when command='supplier_confirm' then now() else confirmed_at end,
    closed_at=case when v_target in ('rejected','cancelled') then now() else closed_at end
  where id=order_ref;

  insert into marketplace_private.order_transition_audit(order_id,actor_id,from_status,to_status)
    values(order_ref,(select auth.uid()),v_before,v_target);
  return order_ref;
end;
$$;

create function public.marketplace_transition_order(order_id uuid, action text)
returns uuid language sql volatile security invoker set search_path=''
as $$ select marketplace_private.transition_purchase_order(order_id,action) $$;

revoke all on function marketplace_private.transition_purchase_order(uuid,text),
  public.marketplace_transition_order(uuid,text) from public,anon,authenticated;
grant execute on function marketplace_private.transition_purchase_order(uuid,text),
  public.marketplace_transition_order(uuid,text) to authenticated;

comment on table public.purchase_orders is
  'Solicitacao B2B: confirmado = estoque reservado, NAO significa pago, enviado ou faturado.';
commit;
