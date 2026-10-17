-- Regras relacionais de integridade entre fornecedor, SKU e oferta.
-- Aplicar em staging APOS 0001, 0002 e 0003, nunca no banco desconhecido.
-- Sem privilegios para anon/authenticated, sem transacoes financeiras.
begin;

create function marketplace_private.validate_supplier_product()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform 1
  from public.organizations o
  join public.organization_capabilities c
    on c.organization_id = o.id and c.capability = 'SUPPLIER'
  where o.id = new.supplier_org_id
    and o.kind in ('SUPPLIER', 'PLATFORM_OPERATOR')
    and c.status in ('pending', 'approved');
  if not found then
    raise exception 'supplier organization is not eligible to own a SKU'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger supplier_products_validate_supplier
before insert or update of supplier_org_id
on public.supplier_products
for each row execute function marketplace_private.validate_supplier_product();

create function marketplace_private.validate_offer_provenance()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  platform_owned boolean;
  supplier_kind text;
begin
  select o.is_platform_owned, o.kind into platform_owned, supplier_kind
  from public.organizations o
  where o.id = new.supplier_org_id;

  if supplier_kind not in ('SUPPLIER', 'PLATFORM_OPERATOR') or supplier_kind is null then
    raise exception 'offers require an eligible supplier organization'
      using errcode = '23514';
  end if;

  if new.source_type = 'PLATFORM_STOCK' and not coalesce(platform_owned, false) then
    raise exception 'PLATFORM_STOCK requires the platform-owned distributor'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger offers_validate_origin
before insert or update of source_type, supplier_org_id
on public.offers
for each row execute function marketplace_private.validate_offer_provenance();

revoke all on function marketplace_private.validate_supplier_product() from public, anon, authenticated;
revoke all on function marketplace_private.validate_offer_provenance() from public, anon, authenticated;
commit;
