-- Protecoes de continuidade: administradores nao podem retirar o proprio
-- acesso nem suspender a unica organizacao operadora via API autenticada.
-- Acoes de emergencia continuam possiveis pelo operador confiavel do banco.
begin;

create function marketplace_private.guard_self_profile_lockout()
returns trigger language plpgsql security invoker set search_path = ''
as $function$
begin
  if current_user = 'authenticated'
     and new.id = (select auth.uid())
     and new.status is distinct from old.status then
    raise exception 'self profile status changes require a separate administrator'
      using errcode = '23514';
  end if;
  return new;
end;
$function$;

create function marketplace_private.guard_self_admin_membership_lockout()
returns trigger language plpgsql security invoker set search_path = ''
as $function$
begin
  if current_user = 'authenticated'
     and new.user_id = (select auth.uid())
     and old.role = 'PLATFORM_ADMIN'
     and (new.status is distinct from old.status or new.role is distinct from old.role) then
    raise exception 'self PLATFORM_ADMIN membership changes require a separate administrator'
      using errcode = '23514';
  end if;
  return new;
end;
$function$;

create function marketplace_private.guard_platform_organization_status()
returns trigger language plpgsql security invoker set search_path = ''
as $function$
begin
  if current_user = 'authenticated'
     and old.is_platform_owned
     and new.status is distinct from old.status then
    raise exception 'platform organization status requires trusted database operation'
      using errcode = '23514';
  end if;
  return new;
end;
$function$;

create trigger profiles_no_self_lockout
before update of status on public.profiles
for each row execute function marketplace_private.guard_self_profile_lockout();

create trigger organization_members_no_self_admin_lockout
before update of status,role on public.organization_members
for each row execute function marketplace_private.guard_self_admin_membership_lockout();

create trigger organizations_no_client_platform_suspension
before update of status on public.organizations
for each row execute function marketplace_private.guard_platform_organization_status();

revoke all on function marketplace_private.guard_self_profile_lockout()
  from public,anon,authenticated;
revoke all on function marketplace_private.guard_self_admin_membership_lockout()
  from public,anon,authenticated;
revoke all on function marketplace_private.guard_platform_organization_status()
  from public,anon,authenticated;
commit;
