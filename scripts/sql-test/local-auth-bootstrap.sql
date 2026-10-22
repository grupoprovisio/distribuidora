-- Fixture local independente; nao executar no Supabase hospedado.
create role anon nologin;
create role authenticated nologin;
create schema auth;
create table auth.users (
 id uuid primary key,
 raw_user_meta_data jsonb not null default '{}'::jsonb
);
create table auth.sessions (
 id uuid primary key,
 user_id uuid not null references auth.users(id),
 aal text,
 not_after timestamptz
);
create function auth.uid() returns uuid language sql stable as
$$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create function auth.jwt() returns jsonb language sql stable as
$$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
grant usage on schema auth to authenticated,anon;
grant execute on function auth.uid() to authenticated,anon;
grant execute on function auth.jwt() to authenticated,anon;
