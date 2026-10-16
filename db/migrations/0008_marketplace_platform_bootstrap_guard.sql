-- Reserva bootstrap da organizacao plataforma e do papel PLATFORM_ADMIN ao operador
-- privilegiado do banco; nem um JWT AAL2 permite auto-delegacao de superadmin.
begin;

create unique index if not exists organizations_one_platform_owner_idx
  on public.organizations (is_platform_owned)
  where is_platform_owned = true;

create function marketplace_private.guard_platform_owner_creation()
returns trigger language plpgsql security invoker set search_path=''
as $code$
begin
  if current_user in ('anon','authenticated','service_role')
    and (new.kind = 'PLATFORM_OPERATOR' or new.is_platform_owned) then
    raise exception 'platform-owned organization bootstrap requires trusted database operation'
      using errcode='23514';
  end if;
  return new;
end;
$code$;

create trigger organizations_platform_owner_bootstrap_only
before insert on public.organizations
for each row execute function marketplace_private.guard_platform_owner_creation();

create function marketplace_private.guard_platform_privilege_delegation()
returns trigger language plpgsql security invoker set search_path=''
as $code$
begin
  if current_user in ('anon','authenticated','service_role') then
    if tg_table_name = 'organization_members' then
      if new.role = 'PLATFORM_ADMIN' then
        raise exception 'PLATFORM_ADMIN bootstrap is not allowed through Data API'
          using errcode='23514';
      end if;
    elsif tg_table_name = 'organization_capabilities' then
      if new.capability = 'PLATFORM_OPERATOR' then
        raise exception 'platform capability requires privileged database operation'
          using errcode='23514';
      end if;
    end if;
  end if;
  return new;
end;
$code$;

create trigger member_no_platform_admin_delegation
before insert or update of role on public.organization_members
for each row execute function marketplace_private.guard_platform_privilege_delegation();

create trigger capability_no_platform_delegation
before insert or update on public.organization_capabilities
for each row execute function marketplace_private.guard_platform_privilege_delegation();

revoke all on function marketplace_private.guard_platform_owner_creation() from public,anon,authenticated;
revoke all on function marketplace_private.guard_platform_privilege_delegation() from public,anon,authenticated;
commit;
