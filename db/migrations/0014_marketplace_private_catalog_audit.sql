-- Audit trail for all catalog mutations, not exposed through the public Data API.
-- SECURITY DEFINER is confined to a private trigger; it never changes permissions of
-- the requested business operation. Minimal fields avoid copying full PII.
begin;
create table marketplace_private.catalog_audit (
  id bigint generated always as identity primary key,
  changed_at timestamptz not null default now(),
  actor_user_id uuid,
  source_table text not null,
  action text not null check (action in ('INSERT','UPDATE','DELETE')),
  resource_id uuid not null,
  before_state jsonb,
  after_state jsonb
);
create index catalog_audit_changed_at_idx on marketplace_private.catalog_audit(changed_at desc);
create index catalog_audit_resource_idx on marketplace_private.catalog_audit(source_table,resource_id,changed_at desc);
alter table marketplace_private.catalog_audit enable row level security;
alter table marketplace_private.catalog_audit force row level security;
revoke all on marketplace_private.catalog_audit from public,anon,authenticated;

create function marketplace_private.record_catalog_audit()
returns trigger language plpgsql security definer set search_path=''
as $audit$
declare previous jsonb;
declare current_row jsonb;
declare reference uuid;
begin
  previous:=case when tg_op='INSERT' then null else to_jsonb(old) end;
  current_row:=case when tg_op='DELETE' then null else to_jsonb(new) end;
  reference:=coalesce(
    nullif(current_row->>'id','')::uuid,
    nullif(previous->>'id','')::uuid,
    nullif(current_row->>'offer_id','')::uuid,
    nullif(previous->>'offer_id','')::uuid,
    nullif(current_row->>'supplier_product_id','')::uuid,
    nullif(previous->>'supplier_product_id','')::uuid
  );
  insert into marketplace_private.catalog_audit(actor_user_id,source_table,action,resource_id,before_state,after_state)
  values (
    (select auth.uid()),tg_table_name,tg_op,reference,
    case when previous is null then null else jsonb_build_object(
      'status',previous->'status','base_price_minor',previous->'base_price_minor',
      'min_quantity',previous->'min_quantity','region_code',previous->'region_code',
      'available_quantity',previous->'available_quantity',
      'reserved_quantity',previous->'reserved_quantity',
      'supplier_sku',previous->'supplier_sku',
      'supplier_org_id',previous->'supplier_org_id'
    ) end,
    case when current_row is null then null else jsonb_build_object(
      'status',current_row->'status','base_price_minor',current_row->'base_price_minor',
      'min_quantity',current_row->'min_quantity','region_code',current_row->'region_code',
      'available_quantity',current_row->'available_quantity',
      'reserved_quantity',current_row->'reserved_quantity',
      'supplier_sku',current_row->'supplier_sku',
      'supplier_org_id',current_row->'supplier_org_id'
    ) end
  );
  return null;
end;
$audit$;

create trigger audit_products
after insert or update or delete on public.products
for each row execute function marketplace_private.record_catalog_audit();
create trigger audit_supplier_products
after insert or update or delete on public.supplier_products
for each row execute function marketplace_private.record_catalog_audit();
create trigger audit_offers
after insert or update or delete on public.offers
for each row execute function marketplace_private.record_catalog_audit();
create trigger audit_offer_regions
after insert or update or delete on public.offer_regions
for each row execute function marketplace_private.record_catalog_audit();
create trigger audit_inventory_positions
after insert or update or delete on public.inventory_positions
for each row execute function marketplace_private.record_catalog_audit();
revoke all on function marketplace_private.record_catalog_audit() from public,anon,authenticated;
commit;
