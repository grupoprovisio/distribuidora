-- Fase 3: contrato local/teste. Não aplicado a banco de produção.
create table if not exists profiles (
  id uuid primary key,
  auth_user_id text not null unique,
  display_name text not null,
  phone text,
  status text not null check (status in ('active', 'blocked', 'pending')),
  created_at timestamptz not null default now()
);

create table if not exists organizations (
  id uuid primary key,
  legal_name text not null,
  trade_name text,
  tax_id text unique,
  kind text not null check (kind in ('BUYER', 'SUPPLIER', 'PLATFORM_OPERATOR')),
  is_platform_owned boolean not null default false,
  status text not null check (status in ('pending', 'approved', 'suspended')),
  created_at timestamptz not null default now()
);

create table if not exists organization_capabilities (
  organization_id uuid not null references organizations(id),
  capability text not null check (capability in ('BUYER', 'SUPPLIER', 'PLATFORM_OPERATOR')),
  status text not null check (status in ('pending', 'approved', 'revoked')),
  primary key (organization_id, capability)
);

create table if not exists organization_members (
  id uuid primary key,
  organization_id uuid not null references organizations(id),
  user_id uuid not null references profiles(id),
  role text not null,
  status text not null check (status in ('active', 'invited', 'revoked')),
  invited_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index if not exists organization_members_user_idx on organization_members(user_id, status);
create index if not exists organizations_status_idx on organizations(status);
