-- Acesso de gestao somente para administradores de plataforma com MFA e sessao viva.
-- NAO instala convites de Auth e NAO atribui PLATFORM_ADMIN automaticamente.
begin;

create function marketplace_private.is_verified_platform_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select coalesce((
    select true
      from public.profiles p
      join public.organization_members m on m.user_id = p.id
      join public.organizations o on o.id = m.organization_id
      join public.organization_capabilities c on c.organization_id = o.id
      join auth.sessions s on s.user_id = p.id
     where p.id = (select auth.uid())
       and p.status = 'active'
       and m.status = 'active'
       and m.role = 'PLATFORM_ADMIN'
       and o.is_platform_owned
       and o.kind = 'PLATFORM_OPERATOR'
       and o.status = 'approved'
       and c.capability = 'PLATFORM_OPERATOR'
       and c.status = 'approved'
       and (select auth.jwt() ->> 'aal') = 'aal2'
       and (select auth.jwt() ->> 'session_id') = s.id::text
       and s.aal::text = 'aal2'
       and (s.not_after is null or s.not_after > now())
     limit 1
  ), false);
$$;

revoke all on function marketplace_private.is_verified_platform_admin() from public,anon,authenticated;
grant execute on function marketplace_private.is_verified_platform_admin() to authenticated;

-- O proprio administrador verifica suas responsabilidades no banco; URL e cookies
-- nao bastam para executar uma escrita administrativa.
create policy admin_profiles_read on public.profiles
for select to authenticated using (marketplace_private.is_verified_platform_admin());
create policy admin_profiles_status on public.profiles
for update to authenticated
using (marketplace_private.is_verified_platform_admin())
with check (marketplace_private.is_verified_platform_admin());

create policy admin_org_read on public.organizations
for select to authenticated using (marketplace_private.is_verified_platform_admin());
create policy admin_org_insert on public.organizations
for insert to authenticated
with check (marketplace_private.is_verified_platform_admin());
create policy admin_org_update on public.organizations
for update to authenticated
using (marketplace_private.is_verified_platform_admin())
with check (marketplace_private.is_verified_platform_admin());

create policy admin_capability_read on public.organization_capabilities
for select to authenticated using (marketplace_private.is_verified_platform_admin());
create policy admin_capability_insert on public.organization_capabilities
for insert to authenticated with check (marketplace_private.is_verified_platform_admin());
create policy admin_capability_update on public.organization_capabilities
for update to authenticated
using (marketplace_private.is_verified_platform_admin())
with check (marketplace_private.is_verified_platform_admin());

create policy admin_members_read on public.organization_members
for select to authenticated using (marketplace_private.is_verified_platform_admin());
create policy admin_members_insert on public.organization_members
for insert to authenticated with check (marketplace_private.is_verified_platform_admin());
create policy admin_members_update on public.organization_members
for update to authenticated
using (marketplace_private.is_verified_platform_admin())
with check (marketplace_private.is_verified_platform_admin());

-- Privilégios de coluna: nenhum usuario pode modificar type/owner/id e ninguem
-- pode escrever tabelas comerciais enquanto o backend de aprovacao nao existe.
grant update(status) on public.profiles to authenticated;
grant insert(legal_name,trade_name,tax_id,kind,status,is_platform_owned)
  on public.organizations to authenticated;
grant update(legal_name,trade_name,tax_id,status) on public.organizations to authenticated;
grant insert(organization_id,capability,status)
  on public.organization_capabilities to authenticated;
grant update(status) on public.organization_capabilities to authenticated;
grant insert(organization_id,user_id,role,status,invited_by)
  on public.organization_members to authenticated;
grant update(role,status) on public.organization_members to authenticated;
commit;
