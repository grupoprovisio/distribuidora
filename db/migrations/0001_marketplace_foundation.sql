-- Provisio B2B: identidade e multiempresa no Supabase Auth.
-- NAO APLICAR sem comparar schema remoto; versao ainda em desenvolvimento.
-- Acesso negado por padrao. Usuarios nao podem atribuir perfis, papeis ou aprovacoes.
begin;

create schema if not exists marketplace_private;
revoke all on schema marketplace_private from public, anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Novo usuario' check (length(btrim(display_name)) between 1 and 160),
  phone text,
  status text not null default 'pending' check (status in ('active', 'blocked', 'pending')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null check (length(btrim(legal_name)) between 2 and 200),
  trade_name text,
  tax_id text unique check (tax_id is null or tax_id ~ '^[0-9]{11}([0-9]{3})?$'),
  kind text not null check (kind in ('BUYER', 'SUPPLIER', 'PLATFORM_OPERATOR')),
  is_platform_owned boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'approved', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not is_platform_owned or kind = 'PLATFORM_OPERATOR')
);

create table public.organization_capabilities (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  capability text not null check (capability in ('BUYER', 'SUPPLIER', 'PLATFORM_OPERATOR')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'revoked')),
  primary key (organization_id, capability)
);

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in (
    'ORG_ADMIN', 'BUYER', 'REQUESTER', 'APPROVER', 'FINANCE', 'READER',
    'SUPPLIER_ADMIN', 'SELLER', 'PLATFORM_ADMIN'
  )),
  status text not null default 'invited' check (status in ('active', 'invited', 'revoked')),
  invited_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);
create index organization_members_user_status_idx on public.organization_members (user_id, status, organization_id);
create index organization_members_org_status_idx on public.organization_members (organization_id, status);
create index organizations_status_idx on public.organizations (status, kind);

-- O trigger apenas cria um perfil PENDENTE para uma identidade ja confirmada pelo Supabase Auth.
-- Metadados editaveis pelo usuario sao usados somente como rotulo, NUNCA como autorizacao.
create function marketplace_private.on_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, status)
  values (
    new.id,
    coalesce(nullif(left(btrim(new.raw_user_meta_data ->> 'full_name'), 160), ''), 'Novo usuario'),
    'pending'
  );
  return new;
end;
$$;

revoke all on function marketplace_private.on_auth_user_created() from public, anon, authenticated;

create trigger provisio_auth_user_created
after insert on auth.users
for each row execute function marketplace_private.on_auth_user_created();

-- RLS ativo e forcado em todas as tabelas expostas. Nenhuma policy e criada aqui.
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_capabilities enable row level security;
alter table public.organization_members enable row level security;
alter table public.profiles force row level security;
alter table public.organizations force row level security;
alter table public.organization_capabilities force row level security;
alter table public.organization_members force row level security;

-- PostgREST nao recebe privilegios implicitos. Permissoes read-only sao definidas em 0003.
revoke all on public.profiles, public.organizations,
  public.organization_capabilities, public.organization_members from anon, authenticated;

commit;
