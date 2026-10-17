-- Fase 3/4: autorizacao READ-ONLY por organizacao no Supabase.
-- Pre-requisitos: 0001 + 0002. Revisar/testar em banco separado ANTES de aplicar.
-- Nao inclui politicas de escrita, login publico ou acesso de compradores a precos.
begin;

-- Excecao controlada: SECURITY DEFINER apenas para resolver membership sem
-- recursao RLS. Esquema NAO exposto no PostgREST, search_path vazio,
-- e a identidade vem exclusivamente de auth.uid() (nao de argumento cliente).
create function marketplace_private.has_active_capability(
  requested_organization uuid, requested_capability text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select true
    from public.organization_members m
    join public.profiles p on p.id = m.user_id
    join public.organizations o on o.id = m.organization_id
    join public.organization_capabilities c on c.organization_id = o.id
    where m.user_id = (select auth.uid())
      and m.organization_id = requested_organization
      and m.status = 'active'
      and p.status = 'active'
      and o.status = 'approved'
      and c.capability = requested_capability
      and c.status = 'approved'
      and (
        (requested_capability = 'BUYER'
          and m.role in ('ORG_ADMIN','BUYER','REQUESTER','APPROVER','FINANCE','READER','PLATFORM_ADMIN'))
        or (requested_capability = 'SUPPLIER'
          and m.role in ('ORG_ADMIN','SUPPLIER_ADMIN','SELLER','PLATFORM_ADMIN'))
        or (requested_capability = 'PLATFORM_OPERATOR' and m.role = 'PLATFORM_ADMIN')
      )
    limit 1
  ), false);
$$;

-- Membership proprio nao inclui org pendente, exceto leitura do perfil do usuario.
create function marketplace_private.has_active_membership(requested_organization uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select true
    from public.organization_members m
    join public.profiles p on p.id = m.user_id
    join public.organizations o on o.id = m.organization_id
    where m.user_id = (select auth.uid())
      and m.organization_id = requested_organization
      and m.status = 'active'
      and p.status = 'active'
      and o.status = 'approved'
    limit 1
  ), false);
$$;

revoke all on function marketplace_private.has_active_capability(uuid,text) from public, anon, authenticated;
revoke all on function marketplace_private.has_active_membership(uuid) from public, anon, authenticated;
grant usage on schema marketplace_private to authenticated;
grant execute on function marketplace_private.has_active_capability(uuid,text) to authenticated;
grant execute on function marketplace_private.has_active_membership(uuid) to authenticated;

-- As grants explicitas tambem funcionam com as novas regras de Data API.
-- Sao somente SELECT; RLS define exatamente quais linhas retornam.
grant select on public.profiles, public.organizations,
  public.organization_capabilities, public.organization_members,
  public.products, public.supplier_products, public.offers,
  public.offer_price_tiers, public.offer_regions, public.inventory_positions
  to authenticated;

create policy profiles_read_self on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy organizations_read_own on public.organizations
  for select to authenticated
  using (marketplace_private.has_active_membership(id));

create policy organization_capabilities_read_own on public.organization_capabilities
  for select to authenticated
  using (marketplace_private.has_active_membership(organization_id));

create policy organization_members_read_self on public.organization_members
  for select to authenticated
  using (
    user_id = (select auth.uid())
    and marketplace_private.has_active_membership(organization_id)
  );

-- A leitura de catalogo nesta fase e SOMENTE do FORNECEDOR AUTORIZADO.
-- Compradores nao veem ofertas ate implantacao da elegibilidade por regiao,
-- homologacao e politica de publicacao. Nao criar policy "USING (true)".
create policy products_read_supplier_own on public.products
  for select to authenticated
  using (
    exists (
      select 1
      from public.supplier_products sp
      where sp.product_id = products.id
        and marketplace_private.has_active_capability(sp.supplier_org_id, 'SUPPLIER')
    )
  );

create policy supplier_products_read_own on public.supplier_products
  for select to authenticated
  using (marketplace_private.has_active_capability(supplier_org_id, 'SUPPLIER'));

create policy offers_read_own on public.offers
  for select to authenticated
  using (marketplace_private.has_active_capability(supplier_org_id, 'SUPPLIER'));

create policy offer_price_tiers_read_own on public.offer_price_tiers
  for select to authenticated
  using (
    exists (
      select 1 from public.offers o
      where o.id = offer_price_tiers.offer_id
        and marketplace_private.has_active_capability(o.supplier_org_id, 'SUPPLIER')
    )
  );

create policy offer_regions_read_own on public.offer_regions
  for select to authenticated
  using (
    exists (
      select 1 from public.offers o
      where o.id = offer_regions.offer_id
        and marketplace_private.has_active_capability(o.supplier_org_id, 'SUPPLIER')
    )
  );

create policy inventory_positions_read_own on public.inventory_positions
  for select to authenticated
  using (marketplace_private.has_active_capability(supplier_org_id, 'SUPPLIER'));

-- Nenhum GRANT para anon. Nenhuma policy INSERT/UPDATE/DELETE para usuarios.
commit;
