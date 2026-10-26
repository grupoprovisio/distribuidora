-- 0030: buyer contacts, ADM-configured delivery tariffs, immutable quote address/freight snapshots.
-- No guessed freight, no paid purchases, no carrier credentials.
begin;

create table public.buyer_contact_profiles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  buyer_org_id uuid not null references public.organizations(id) on delete cascade,
  full_name text not null check (char_length(trim(full_name)) between 3 and 160),
  contact_email text not null check (char_length(contact_email) between 5 and 254 and position('@' in contact_email)>1),
  phone text not null check (phone ~ '^[0-9]{10,11}$'),
  postal_code text not null check (postal_code ~ '^[0-9]{8}$'),
  street text not null check (char_length(trim(street)) between 3 and 160),
  street_number text not null check (char_length(trim(street_number)) between 1 and 30),
  complement text not null default '' check (char_length(complement)<=160),
  neighborhood text not null check (char_length(trim(neighborhood)) between 2 and 100),
  city text not null check (char_length(trim(city)) between 2 and 100),
  state_code text not null check (state_code ~ '^[A-Z]{2}$'),
  reference text not null default '' check (char_length(reference)<=240),
  updated_at timestamptz not null default now(),
  primary key (user_id,buyer_org_id)
);
create index buyer_contact_profiles_org_idx on public.buyer_contact_profiles(buyer_org_id);
alter table public.buyer_contact_profiles enable row level security;
alter table public.buyer_contact_profiles force row level security;
revoke all on public.buyer_contact_profiles from public,anon,authenticated;
grant select,insert,update on public.buyer_contact_profiles to authenticated;
create policy buyer_contact_own_read on public.buyer_contact_profiles for select to authenticated
using ((select auth.uid())=user_id and marketplace_private.has_live_auth_session()
 and marketplace_private.has_active_capability(buyer_org_id,'BUYER'));
create policy buyer_contact_own_create on public.buyer_contact_profiles for insert to authenticated
with check ((select auth.uid())=user_id and marketplace_private.has_live_auth_session()
 and marketplace_private.has_active_capability(buyer_org_id,'BUYER'));
create policy buyer_contact_own_edit on public.buyer_contact_profiles for update to authenticated
using ((select auth.uid())=user_id and marketplace_private.has_live_auth_session()
 and marketplace_private.has_active_capability(buyer_org_id,'BUYER'))
with check ((select auth.uid())=user_id and marketplace_private.has_live_auth_session()
 and marketplace_private.has_active_capability(buyer_org_id,'BUYER'));

-- Single Provisio dispatch/pickup point, configured by ADM instead of invented location.
create table public.provisio_shipping_origin (
  id smallint primary key default 1 check (id=1),
  label text not null check(char_length(trim(label)) between 3 and 100),
  postal_code text not null check(postal_code ~ '^[0-9]{8}$'),
  street text not null check(char_length(trim(street)) between 3 and 160),
  street_number text not null check(char_length(trim(street_number)) between 1 and 30),
  complement text not null default '',
  neighborhood text not null check(char_length(trim(neighborhood)) between 2 and 100),
  city text not null check(char_length(trim(city)) between 2 and 100),
  state_code text not null check(state_code ~ '^[A-Z]{2}$'),
  pickup_instructions text not null default '',
  pickup_enabled boolean not null default false,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.provisio_shipping_origin enable row level security;
alter table public.provisio_shipping_origin force row level security;
revoke all on public.provisio_shipping_origin from public,anon,authenticated;
grant select,insert,update on public.provisio_shipping_origin to authenticated;
create policy shipping_origin_admin_all on public.provisio_shipping_origin for all to authenticated
using ((select marketplace_private.is_verified_platform_admin()))
with check ((select marketplace_private.is_verified_platform_admin()));
create policy shipping_origin_buyer_read on public.provisio_shipping_origin for select to authenticated
using (active and marketplace_private.has_live_auth_session()
 and exists (select 1 from public.organization_members m
   join public.organization_capabilities c on c.organization_id=m.organization_id
   where m.user_id=(select auth.uid()) and m.status='active'
   and c.capability='BUYER' and c.status='approved'));

-- Rates are set by ADM (real contracted/internal cost), not derived from ZIP distance.
create table public.provisio_shipping_rates (
  id uuid primary key default gen_random_uuid(),
  origin_id smallint not null default 1 references public.provisio_shipping_origin(id) on delete restrict,
  label text not null check(char_length(trim(label)) between 3 and 100),
  postal_start integer not null check(postal_start between 0 and 99999999),
  postal_end integer not null check(postal_end between 0 and 99999999 and postal_end>=postal_start),
  destination_state text not null check(destination_state ~ '^[A-Z]{2}$'),
  price_minor integer not null check(price_minor between 0 and 100000000),
  min_business_days smallint not null check(min_business_days between 1 and 90),
  max_business_days smallint not null check(max_business_days between min_business_days and 120),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index provisio_shipping_rates_zip_idx on public.provisio_shipping_rates(postal_start,postal_end) where active;
alter table public.provisio_shipping_rates enable row level security;
alter table public.provisio_shipping_rates force row level security;
revoke all on public.provisio_shipping_rates from public,anon,authenticated;
grant select,insert,update,delete on public.provisio_shipping_rates to authenticated;
create policy shipping_rates_admin_all on public.provisio_shipping_rates for all to authenticated
using ((select marketplace_private.is_verified_platform_admin()))
with check ((select marketplace_private.is_verified_platform_admin()));
create policy shipping_rates_buyer_read on public.provisio_shipping_rates for select to authenticated
using (active and marketplace_private.has_live_auth_session()
 and exists (select 1 from public.organization_members m
   join public.organization_capabilities c on c.organization_id=m.organization_id
   where m.user_id=(select auth.uid()) and m.status='active'
   and c.capability='BUYER' and c.status='approved'));

create function marketplace_private.prevent_freight_range_overlap()
returns trigger language plpgsql set search_path=''
as $guard$
begin
  perform pg_catalog.pg_advisory_xact_lock(19820030);
  if new.active and exists (
    select 1 from public.provisio_shipping_rates r
    where r.active and r.origin_id=new.origin_id and r.id<>new.id
      and r.postal_start<=new.postal_end and r.postal_end>=new.postal_start
  ) then raise exception 'overlapping_freight_ranges' using errcode='23514'; end if;
  return new;
end;
$guard$;
create trigger guard_freight_range before insert or update on public.provisio_shipping_rates
for each row execute function marketplace_private.prevent_freight_range_overlap();
revoke all on function marketplace_private.prevent_freight_range_overlap() from public,anon,authenticated;

-- Delivery/customer snapshots must remain readable after profiles/tariffs change.
alter table public.quote_baskets
  add column recipient_snapshot jsonb,
  add column origin_snapshot jsonb,
  add column delivery_postal_code text,
  add column freight_rate_id uuid references public.provisio_shipping_rates(id) on delete restrict,
  add column freight_minor integer check(freight_minor>=0),
  add column min_business_days smallint,
  add column max_business_days smallint;

-- Restrict sensitive recipient snapshots to their creator and MFA administrator.
drop policy basket_read_buyer on public.quote_baskets;
create policy basket_read_buyer on public.quote_baskets for select to authenticated
using ((select auth.uid())=created_by and marketplace_private.has_live_auth_session()
 and marketplace_private.has_active_capability(buyer_org_id,'BUYER'));

create function marketplace_private.enforce_basket_recipient_and_freight()
returns trigger language plpgsql security definer set search_path=''
as $snapshot$
declare
  p public.buyer_contact_profiles%rowtype;
  o public.provisio_shipping_origin%rowtype;
  r public.provisio_shipping_rates%rowtype;
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
    select * into r from public.provisio_shipping_rates
     where origin_id=o.id and active and
       p.postal_code::integer between postal_start and postal_end
       and destination_state=p.state_code
     order by postal_end-postal_start,id limit 1;
    if not found then
      raise exception 'freight_unavailable_for_postal_code' using errcode='22023';
    end if;
    new.freight_rate_id:=r.id;
    new.freight_minor:=r.price_minor;
    new.min_business_days:=r.min_business_days;
    new.max_business_days:=r.max_business_days;
  elsif new.fulfillment_method='pickup' then
    if not o.pickup_enabled then
      raise exception 'pickup_unavailable' using errcode='22023';
    end if;
    new.freight_minor:=0;
    new.min_business_days:=null;
    new.max_business_days:=null;
    new.freight_rate_id:=null;
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
create trigger require_contact_and_authoritative_freight
  before insert on public.quote_baskets
  for each row execute function marketplace_private.enforce_basket_recipient_and_freight();
revoke all on function marketplace_private.enforce_basket_recipient_and_freight() from public,anon,authenticated;
comment on table public.provisio_shipping_rates is
  'Admin-managed exact freight tariffs by destination CEP range; no live carrier API or invented prices.';
comment on column public.quote_baskets.recipient_snapshot is
  'Immutable recipient address and contact captured when QA quotation was submitted.';
commit;