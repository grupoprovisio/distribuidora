-- Provisio: protecao da autoridade multiempresa + log privado de decisoes.
-- Aditiva, sem concessao de acesso a clientes. Instalacao via migracao revisada.
begin;

-- A organizacao deve ter tipo imutavel depois do cadastro.
create function marketplace_private.prevent_organization_identity_change()
returns trigger language plpgsql security invoker set search_path = ''
as $$
begin
  if new.kind is distinct from old.kind
    or new.is_platform_owned is distinct from old.is_platform_owned then
    raise exception 'organization kind and platform ownership are immutable'
      using errcode='23514';
  end if;
  return new;
end;
$$;

create trigger organizations_immutable_type
before update of kind, is_platform_owned on public.organizations
for each row execute function marketplace_private.prevent_organization_identity_change();

-- Capacidades de plataforma so podem existir na organizacao propria.
create function marketplace_private.validate_organization_capability()
returns trigger language plpgsql security invoker set search_path = ''
as $$
declare
  org_kind text;
  owned boolean;
begin
  select kind, is_platform_owned into org_kind, owned
  from public.organizations where id = new.organization_id;
  if not found then return new; end if; -- FK reporta referencia inexistente.
  if (new.capability = 'PLATFORM_OPERATOR' and
      (org_kind <> 'PLATFORM_OPERATOR' or not owned))
    or (new.capability = 'SUPPLIER' and org_kind not in ('SUPPLIER', 'PLATFORM_OPERATOR'))
    or (new.capability = 'BUYER' and org_kind not in ('BUYER', 'PLATFORM_OPERATOR')) then
    raise exception 'capability not compatible with organization kind'
      using errcode='23514';
  end if;
  return new;
end;
$$;

create trigger organization_capabilities_validate_kind
before insert or update of organization_id, capability
on public.organization_capabilities
for each row execute function marketplace_private.validate_organization_capability();

-- Um papel privilegiado nao pode ser associado a uma empresa de outro tipo.
create function marketplace_private.validate_organization_member_role()
returns trigger language plpgsql security invoker set search_path = ''
as $$
declare
  org_kind text;
  owned boolean;
begin
  select kind,is_platform_owned into org_kind,owned
  from public.organizations where id = new.organization_id;
  if not found then return new; end if;
  if (new.role = 'PLATFORM_ADMIN' and
        (org_kind <> 'PLATFORM_OPERATOR' or not owned))
     or (new.role in ('SUPPLIER_ADMIN','SELLER')
        and org_kind not in ('SUPPLIER','PLATFORM_OPERATOR'))
     or (new.role in ('BUYER','REQUESTER','APPROVER')
        and org_kind not in ('BUYER','PLATFORM_OPERATOR')) then
    raise exception 'role not compatible with organization kind'
      using errcode='23514';
  end if;
  return new;
end;
$$;

create trigger organization_members_validate_role
before insert or update of organization_id, role
on public.organization_members
for each row execute function marketplace_private.validate_organization_member_role();

-- Trilhas de aprovacoes e revogacoes privadas, sem conceder SELECT ao browser.
create table marketplace_private.access_audit (
  id bigint generated always as identity primary key,
  changed_at timestamptz not null default now(),
  actor_user_id uuid,
  source_table text not null,
  action text not null check (action in ('INSERT','UPDATE','DELETE')),
  resource_id uuid not null,
  before_state jsonb,
  after_state jsonb
);
create index access_audit_changed_at_idx
on marketplace_private.access_audit(changed_at desc);
create index access_audit_actor_idx
on marketplace_private.access_audit(actor_user_id,changed_at desc);

alter table marketplace_private.access_audit enable row level security;
alter table marketplace_private.access_audit force row level security;
revoke all on marketplace_private.access_audit from public,anon,authenticated;
revoke usage on schema marketplace_private from anon;

create function marketplace_private.record_access_audit()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  before_row jsonb;
  after_row jsonb;
  pk uuid;
begin
  before_row := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
  after_row := case when tg_op = 'DELETE' then null else to_jsonb(new) end;
  pk := coalesce(
    nullif(after_row->>'id','')::uuid,
    nullif(before_row->>'id','')::uuid,
    nullif(after_row->>'organization_id','')::uuid,
    nullif(before_row->>'organization_id','')::uuid
  );
  insert into marketplace_private.access_audit (
    actor_user_id,source_table,action,resource_id,before_state,after_state
  ) values (
    auth.uid(),tg_table_name,tg_op,pk,
    case when before_row is null then null else
      jsonb_build_object('status',before_row->'status','role',before_row->'role',
        'capability',before_row->'capability','kind',before_row->'kind')
    end,
    case when after_row is null then null else
      jsonb_build_object('status',after_row->'status','role',after_row->'role',
        'capability',after_row->'capability','kind',after_row->'kind')
    end
  );
  return null;
end;
$$;

create trigger audit_profiles
after insert or update or delete on public.profiles
for each row execute function marketplace_private.record_access_audit();
create trigger audit_organizations
after insert or update or delete on public.organizations
for each row execute function marketplace_private.record_access_audit();
create trigger audit_organization_capabilities
after insert or update or delete on public.organization_capabilities
for each row execute function marketplace_private.record_access_audit();
create trigger audit_organization_members
after insert or update or delete on public.organization_members
for each row execute function marketplace_private.record_access_audit();

revoke all on function marketplace_private.prevent_organization_identity_change() from public,anon,authenticated;
revoke all on function marketplace_private.validate_organization_capability() from public,anon,authenticated;
revoke all on function marketplace_private.validate_organization_member_role() from public,anon,authenticated;
revoke all on function marketplace_private.record_access_audit() from public,anon,authenticated;
commit;
