-- 0031: a single ADM-approved SP statewide rate covers its CEPs.
-- Existing specific CEP tariffs override the statewide fallback.
-- No default amount is invented and no customer/order commercial flag changes.
begin;

create table public.provisio_shipping_state_rates (
  origin_id smallint not null default 1 references public.provisio_shipping_origin(id) on delete restrict,
  state_code text not null default 'SP' check (state_code='SP'),
  label text not null check(char_length(trim(label)) between 3 and 100),
  price_minor integer not null check(price_minor between 0 and 100000000),
  min_business_days smallint not null check(min_business_days between 1 and 90),
  max_business_days smallint not null check(max_business_days between min_business_days and 120),
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key(origin_id,state_code)
);
alter table public.provisio_shipping_state_rates enable row level security;
alter table public.provisio_shipping_state_rates force row level security;
revoke all on public.provisio_shipping_state_rates from public,anon,authenticated;
grant select,insert,update on public.provisio_shipping_state_rates to authenticated;
create policy shipping_state_rates_admin on public.provisio_shipping_state_rates
for all to authenticated
using ((select marketplace_private.is_verified_platform_admin()))
with check ((select marketplace_private.is_verified_platform_admin()));
create policy shipping_state_rates_buyer_read on public.provisio_shipping_state_rates
for select to authenticated
using (
  active
  and marketplace_private.has_live_auth_session()
  and exists (
    select 1 from public.organization_members m
    join public.organization_capabilities c on c.organization_id=m.organization_id
    where m.user_id=(select auth.uid()) and m.status='active'
      and c.capability='BUYER' and c.status='approved'
  )
);
alter table public.quote_baskets
  add column freight_source text
    check (freight_source in ('cep_range','state_default','pickup'));

-- Enforce tariff amounts at the database boundary even if an API/client
-- submits an arbitrary amount. Preserve pickup and immutable recipient data.
create or replace function marketplace_private.enforce_basket_recipient_and_freight()
returns trigger language plpgsql security definer set search_path=''
as $snapshot$
declare
  p public.buyer_contact_profiles%rowtype;
  o public.provisio_shipping_origin%rowtype;
  r public.provisio_shipping_rates%rowtype;
  s public.provisio_shipping_state_rates%rowtype;
begin
  if (select auth.uid()) is null or new.created_by is distinct from (select auth.uid())
     or not marketplace_private.has_live_auth_session()
     or not marketplace_private.has_active_capability(new.buyer_org_id,'BUYER') then
    raise exception 'buyer_not_authorized' using errcode='42501';
  end if;
  select * into p from public.buyer_contact_profiles
    where user_id=new.created_by and buyer_org_id=new.buyer_org_id;
  if not found then
    raise exception 'buyer_contact_required' using errcode='22023';
  end if;
  if new.region_code <> 'BR-'||p.state_code then
    raise exception 'delivery_region_mismatch' using errcode='22023';
  end if;
  select * into o from public.provisio_shipping_origin where id=1 and active=true;
  if not found then
    raise exception 'shipping_origin_not_configured' using errcode='22023';
  end if;
  if new.fulfillment_method='delivery' then
    -- If a state default exists, validate that the CEP is in the SP postal
    -- range. A posted UF alone is not enough to select a default tariff.
    if p.state_code='SP' and
       p.postal_code::integer not between 1000000 and 19999999 then
      raise exception 'destination_postal_state_mismatch' using errcode='22023';
    end if;
    select * into r from public.provisio_shipping_rates
     where origin_id=o.id and active and
       p.postal_code::integer between postal_start and postal_end
       and destination_state=p.state_code
     order by postal_end-postal_start,id limit 1;
    if found then
      new.freight_rate_id:=r.id;
      new.freight_minor:=r.price_minor;
      new.min_business_days:=r.min_business_days;
      new.max_business_days:=r.max_business_days;
      new.freight_source:='cep_range';
    else
      -- Applies to SP only. No statewide price exists until an ADM sets one.
      select * into s from public.provisio_shipping_state_rates
       where origin_id=o.id and active and state_code=p.state_code
         and state_code='SP';
      if not found then
        raise exception 'freight_unavailable_for_postal_code' using errcode='22023';
      end if;
      new.freight_rate_id:=null;
      new.freight_minor:=s.price_minor;
      new.min_business_days:=s.min_business_days;
      new.max_business_days:=s.max_business_days;
      new.freight_source:='state_default';
    end if;
  elsif new.fulfillment_method='pickup' then
    if not o.pickup_enabled then
      raise exception 'pickup_unavailable' using errcode='22023';
    end if;
    new.freight_minor:=0;
    new.min_business_days:=null;
    new.max_business_days:=null;
    new.freight_rate_id:=null;
    new.freight_source:='pickup';
  else
    raise exception 'invalid_delivery_method' using errcode='22023';
  end if;
  new.delivery_postal_code:=p.postal_code;
  new.recipient_snapshot:=jsonb_build_object(
    'fullName',p.full_name,'email',p.contact_email,'phone',p.phone,
    'postalCode',p.postal_code,'street',p.street,
    'number',p.street_number,'complement',p.complement,
    'neighborhood',p.neighborhood,'city',p.city,'state',p.state_code,
    'reference',p.reference);
  new.origin_snapshot:=jsonb_build_object(
    'label',o.label,'postalCode',o.postal_code,'street',o.street,
    'number',o.street_number,'complement',o.complement,
    'neighborhood',o.neighborhood,'city',o.city,'state',o.state_code,
    'pickupInstructions',o.pickup_instructions);
  return new;
end;
$snapshot$;
comment on table public.provisio_shipping_state_rates is
  'Single ADM-priced statewide SP shipping fallback, overridden by more specific CEP rate bands.';
commit;
