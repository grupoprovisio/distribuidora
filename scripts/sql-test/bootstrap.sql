-- Banco de teste descartavel. NAO usar com Supabase real.
-- Emula somente os objetos essenciais do auth schema para executar as migrations.
create role anon nologin;
create role authenticated nologin;
create schema auth;
create table auth.users (
  id uuid primary key,
  raw_user_meta_data jsonb not null default '{}'::jsonb
);
create function auth.uid()
returns uuid
language sql stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

-- Instala um runner de assertions SEM SECURITY DEFINER: RLS continua efetivo.
create schema test;
grant usage on schema test to anon, authenticated;
create function test.assert_count(actual bigint, expected bigint, scenario text)
returns void
language plpgsql security invoker set search_path = ''
as $$
begin
  if actual is distinct from expected then
    raise exception 'FAILED %: got %, expected %', scenario, actual, expected;
  end if;
end;
$$;
create function test.expect_permission_denied(command text)
returns void
language plpgsql security invoker set search_path = ''
as $$
begin
  begin
    execute command;
  exception when insufficient_privilege then
    return;
  end;
  raise exception 'expected SQLSTATE 42501 but operation succeeded: %', command;
end;
$$;
grant execute on function test.assert_count(bigint,bigint,text) to anon, authenticated;
grant execute on function test.expect_permission_denied(text) to anon, authenticated;
