-- Todas as leituras multiempresa exigem uma sessao Auth ativa no banco,
-- alem de perfil/membership/capability aprovados. JWT de sessao encerrada deve
-- perder acesso sem aguardar sua expiracao.
begin;

create function marketplace_private.has_live_auth_session()
returns boolean language sql stable security definer set search_path = ''
as $$
  select coalesce((
    select true from auth.sessions s
      where s.user_id = (select auth.uid())
        and s.id::text = (select auth.jwt() ->> 'session_id')
        and (s.not_after is null or s.not_after > now())
      limit 1
  ),false);
$$;

revoke all on function marketplace_private.has_live_auth_session()
  from public,anon,authenticated;
grant execute on function marketplace_private.has_live_auth_session()
  to authenticated;

create or replace function marketplace_private.has_active_capability(
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
    where (select marketplace_private.has_live_auth_session())
      and m.user_id = (select auth.uid())
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

create or replace function marketplace_private.has_active_membership(requested_organization uuid)
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
    where (select marketplace_private.has_live_auth_session())
      and m.user_id = (select auth.uid())
      and m.organization_id = requested_organization
      and m.status = 'active'
      and p.status = 'active'
      and o.status = 'approved'
    limit 1
  ), false);
$$;

drop policy profiles_read_self on public.profiles;
create policy profiles_read_self on public.profiles
for select to authenticated
using (
  id = (select auth.uid())
  and (select marketplace_private.has_live_auth_session())
);

commit;
