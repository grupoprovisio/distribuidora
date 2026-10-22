-- Provisio B2B 0024: acompanhamento interno de separacao, frete ESTIMADO e entrega.
-- Sem integracao com transportadoras, sem emissao fiscal e sem cobranca.
-- Apenas jornadas comprador/fornecedor. Escritas exclusivamente via RPC com sessao validada.
begin;

create table public.order_fulfillments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.purchase_orders(id) on delete restrict,
  buyer_org_id uuid not null references public.organizations(id) on delete restrict,
  supplier_org_id uuid not null references public.organizations(id) on delete restrict,
  status text not null default 'separating'
    check (status in ('separating','ready_to_dispatch','in_transit','delivered','cancelled')),
  freight_estimate_minor bigint check (freight_estimate_minor is null or freight_estimate_minor between 0 and 100000000),
  estimated_delivery_date date,
  tracking_reference text check (tracking_reference is null or length(tracking_reference) between 1 and 80),
  dispatched_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index order_fulfillments_supplier_status_idx on public.order_fulfillments(supplier_org_id,status,updated_at desc);
create index order_fulfillments_buyer_idx on public.order_fulfillments(buyer_org_id,updated_at desc);

alter table public.order_fulfillments enable row level security;
alter table public.order_fulfillments force row level security;
revoke all on public.order_fulfillments from public,anon,authenticated;
grant select on public.order_fulfillments to authenticated;
create policy fulfillment_read_buyer on public.order_fulfillments for select to authenticated
 using (marketplace_private.has_active_capability(buyer_org_id,'BUYER'));
create policy fulfillment_read_supplier on public.order_fulfillments for select to authenticated
 using (marketplace_private.has_active_capability(supplier_org_id,'SUPPLIER'));

create table marketplace_private.fulfillment_audit (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.purchase_orders(id) on delete restrict,
  actor_id uuid,
  from_status text,
  to_status text not null,
  reason text not null,
  changed_at timestamptz not null default now()
);
alter table marketplace_private.fulfillment_audit enable row level security;
alter table marketplace_private.fulfillment_audit force row level security;
revoke all on marketplace_private.fulfillment_audit from public,anon,authenticated;

create function marketplace_private.advance_fulfillment(
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
      and m.status='active' and m.role in ('ORG_ADMIN','SUPPLIER_ADMIN')) then
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

create function public.marketplace_advance_fulfillment(
 order_id uuid,action text,freight_estimate_minor bigint default null,
 estimated_delivery_date date default null,tracking_reference text default null
) returns uuid language sql volatile security invoker set search_path=''
as $$ select marketplace_private.advance_fulfillment(
 order_id,action,freight_estimate_minor,estimated_delivery_date,tracking_reference) $$;
revoke all on function marketplace_private.advance_fulfillment(uuid,text,bigint,date,text) from public,anon,authenticated;
revoke all on function public.marketplace_advance_fulfillment(uuid,text,bigint,date,text) from public,anon,authenticated;
grant execute on function marketplace_private.advance_fulfillment(uuid,text,bigint,date,text) to authenticated;
grant execute on function public.marketplace_advance_fulfillment(uuid,text,bigint,date,text) to authenticated;

-- Impede cancelamento posterior a expedicao; nao ha mecanismo de estorno de entrega.
create function marketplace_private.guard_dispatched_order_cancellation()
returns trigger language plpgsql security definer set search_path=''
as $fn$
begin
 if exists(select 1 from public.order_fulfillments f
    where f.order_id=old.id and f.status in ('in_transit','delivered')) then
   raise exception 'dispatched_order_cannot_be_cancelled' using errcode='22023';
 end if;
 return new;
end $fn$;
create trigger order_guard_dispatched_cancellation before update of status on public.purchase_orders
for each row when (old.status='confirmed' and new.status='cancelled')
execute function marketplace_private.guard_dispatched_order_cancellation();

-- Ao cancelar antes da expedicao, atualizar o acompanhamento junto com a reserva.
create function marketplace_private.sync_cancelled_fulfillment()
returns trigger language plpgsql security definer set search_path=''
as $fn$
declare old_state text;
begin
 select status into old_state from public.order_fulfillments where order_id=new.id for update;
 if found and old_state not in ('cancelled','delivered','in_transit') then
   update public.order_fulfillments set status='cancelled',updated_at=now() where order_id=new.id;
   insert into marketplace_private.fulfillment_audit(order_id,actor_id,from_status,to_status,reason)
   values(new.id,(select auth.uid()),old_state,'cancelled','order_cancelled');
 end if;
 return null;
end $fn$;
create trigger order_sync_cancelled_fulfillment after update of status on public.purchase_orders
for each row when (new.status='cancelled' and old.status is distinct from new.status)
execute function marketplace_private.sync_cancelled_fulfillment();
revoke all on function marketplace_private.guard_dispatched_order_cancellation(),
 marketplace_private.sync_cancelled_fulfillment() from public,anon,authenticated;
comment on table public.order_fulfillments is
 'Acompanhamento MANUAL de homologacao; frete e apenas estimativa, nenhuma transportadora ou entrega comprovada.';
commit;