-- Provisio: plataforma com capacidade SUPPLIER aprovada opera a propria distribuicao.
-- Sem terceiro perfil publico. Evita permitir PLATFORM_ADMIN em organizacoes externas.
-- Revisa apenas elegibilidade de papéis, mantendo RLS, sessao ativa e idempotencia.
begin;

create or replace function marketplace_private.propose_quote(
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
        and (m.role in ('ORG_ADMIN','SUPPLIER_ADMIN') or
            (m.role='PLATFORM_ADMIN' and exists (
              select 1 from public.organizations platform
              where platform.id=m.organization_id and platform.kind='PLATFORM_OPERATOR'
                and platform.is_platform_owned and platform.status='approved'
            )))
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

create or replace function marketplace_private.transition_purchase_order(order_ref uuid, command text)
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
          and (m.role in ('ORG_ADMIN','SUPPLIER_ADMIN') or
            (m.role='PLATFORM_ADMIN' and exists (
              select 1 from public.organizations platform
              where platform.id=m.organization_id and platform.kind='PLATFORM_OPERATOR'
                and platform.is_platform_owned and platform.status='approved'
            )))
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

create or replace function marketplace_private.advance_fulfillment(
  p_order uuid,p_action text,p_freight bigint,p_eta date,p_tracking text
) returns uuid language plpgsql volatile security definer set search_path=''
as $fn$
declare
 v_order public.purchase_orders%rowtype;
 v_ship public.order_fulfillments%rowtype;
 v_target text;
 v_actor uuid;
begin
 v_actor := (select auth.uid());
 if v_actor is null or not marketplace_private.has_live_auth_session() then
   raise exception 'active_session_required' using errcode='42501';
 end if;
 if p_order is null or p_action is null or p_action not in ('start_separation','mark_ready','dispatch','deliver')
   or (p_freight is not null and p_freight not between 0 and 100000000)
   or (p_eta is not null and (p_eta<current_date or p_eta>current_date+365))
   or (p_tracking is not null and (length(btrim(p_tracking)) not between 1 and 80)) then
   raise exception 'invalid_fulfillment_request' using errcode='22023';
 end if;
 if (p_action <> 'start_separation' and (p_freight is not null or p_eta is not null))
    or (p_action <> 'dispatch' and p_tracking is not null) then
   raise exception 'invalid_fulfillment_metadata' using errcode='22023';
 end if;
 select * into v_order from public.purchase_orders where id=p_order for update;
 if not found or v_order.status<>'confirmed' then
   raise exception 'order_not_confirmed' using errcode='22023';
 end if;
 if not marketplace_private.has_active_capability(v_order.supplier_org_id,'SUPPLIER')
   or not exists(select 1 from public.organization_members m
      where m.organization_id=v_order.supplier_org_id and m.user_id=v_actor
      and m.status='active' and (m.role in ('ORG_ADMIN','SUPPLIER_ADMIN') or
            (m.role='PLATFORM_ADMIN' and exists (
              select 1 from public.organizations platform
              where platform.id=m.organization_id and platform.kind='PLATFORM_OPERATOR'
                and platform.is_platform_owned and platform.status='approved'
            )))) then
   raise exception 'supplier_permission_denied' using errcode='42501';
 end if;
 select * into v_ship from public.order_fulfillments where order_id=p_order for update;
 if not found then
   if p_action<>'start_separation' then raise exception 'separation_required' using errcode='22023'; end if;
   insert into public.order_fulfillments(order_id,buyer_org_id,supplier_org_id,status,
     freight_estimate_minor,estimated_delivery_date)
   values(p_order,v_order.buyer_org_id,v_order.supplier_org_id,'separating',p_freight,p_eta)
   returning * into v_ship;
   insert into marketplace_private.fulfillment_audit(order_id,actor_id,from_status,to_status,reason)
   values(p_order,v_actor,null,'separating',p_action);
   return v_ship.id;
 end if;
 v_target := case p_action when 'start_separation' then 'separating'
   when 'mark_ready' then 'ready_to_dispatch'
   when 'dispatch' then 'in_transit'
   when 'deliver' then 'delivered' end;
 if v_ship.status=v_target then return v_ship.id; end if;
 if (v_ship.status='separating' and p_action='mark_ready')
    or (v_ship.status='ready_to_dispatch' and p_action='dispatch')
    or (v_ship.status='in_transit' and p_action='deliver') then
   -- Expedir retira do estoque real a mesma quantidade que estava reservada.
   -- Apenas o despacho executa o lancamento; replays idempotentes nao debitam novamente.
   if p_action='dispatch' then
     update public.inventory_positions stock set
       available_quantity=stock.available_quantity-v_order.quantity,
       reserved_quantity=stock.reserved_quantity-v_order.quantity,
       updated_at=now()
     from public.offers offer
     where offer.id=v_order.offer_id
       and stock.supplier_product_id=offer.supplier_product_id
       and stock.supplier_org_id=v_order.supplier_org_id
       and stock.reserved_quantity>=v_order.quantity
       and stock.available_quantity>=v_order.quantity;
     if not found then
       raise exception 'reserved_stock_unavailable_for_dispatch' using errcode='22023';
     end if;
   end if;
   update public.order_fulfillments set status=v_target,updated_at=now(),
     tracking_reference=case when p_action='dispatch' then nullif(btrim(p_tracking),'') else tracking_reference end,
     dispatched_at=case when p_action='dispatch' then now() else dispatched_at end,
     delivered_at=case when p_action='deliver' then now() else delivered_at end
     where id=v_ship.id;
   insert into marketplace_private.fulfillment_audit(order_id,actor_id,from_status,to_status,reason)
   values(p_order,v_actor,v_ship.status,v_target,p_action);
   return v_ship.id;
 end if;
 raise exception 'invalid_fulfillment_transition' using errcode='22023';
end;
$fn$;
commit;
