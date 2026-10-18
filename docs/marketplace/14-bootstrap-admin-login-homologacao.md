> **ATUALIZAÇÃO — 18/10/2026:** o bootstrap foi realizado e conferido no projeto Supabase da Provisio. Existe uma organização operadora de **homologação sem CNPJ** (`tax_id=NULL`) e uma organização compradora interna de testes, ambas associadas à conta confirmada `contato@grupoprovisio.com`. A operadora possui `PLATFORM_ADMIN`, a compradora interna possui `ORG_ADMIN` e autorização regional `BR-SP`. **Não execute novamente a SQL de criação inicial abaixo:** ela é apenas referência histórica. A conta ainda não tem MFA verificado, o catálogo ainda não contém produtos e o acesso Vercel ao time `grupoprovisio` ainda retorna 403. Login de produção não foi homologado e pagamentos continuam desativados.\n\n# Provisio | Ativação segura do primeiro administrador e login

**Estado em 16/10/2026:** projeto Supabase `xprvdquocenfqvnokmmi` ativo, 0 usuários, 0 organizações, migrations 0001-0008 aplicadas, regras RLS ativadas. Não existe conta com `PLATFORM_ADMIN`. Código em PR #4, ainda não integrado à main. **Não há login habilitado em produção.**

## Etapa humana obrigatória — criar a identidade
1. O **Owner** abre https://supabase.com/dashboard/project/xprvdquocenfqvnokmmi/auth/users.
2. Em **Add user → Send invitation** (rótulo pode variar), convida a conta administrativa escolhida. Preferência: conta profissional controlada pelo Grupo Provisio. Nunca gerar ou compartilhar senha aqui.
3. O convidado aceita/valida o email em dispositivo seguro. A trigger `provisio_auth_user_created` cria `public.profiles.status='pending'`.
4. Verificar a identidade por UUID e e-mail diretamente em `auth.users` e a confirmação em `email_confirmed_at`. **Não confiar** em username informado por terceiros, `raw_user_meta_data` ou apenas no nome mostrado no print.

## Bootstrap único pela equipe operadora, após convite verificado
Aplicar o trecho abaixo somente no SQL Editor do projeto **Provisio correto**, por operador confiável, após conferir razão social, identidade e projeto. Substituir os dois placeholders; o script aborta se a identidade não existir/estiver sem confirmação. Não executar no Gestify/Kratelis.

```sql
begin;
do $bootstrap$
declare
  account_email text := 'EMAIL_ADMIN_VERIFICADO_AQUI';
  organization_legal_name text := 'RAZAO_SOCIAL_VALIDADA_AQUI';
  account_id uuid;
  platform_id uuid;
begin
  if account_email='EMAIL_ADMIN_VERIFICADO_AQUI'
     or organization_legal_name='RAZAO_SOCIAL_VALIDADA_AQUI'
     or length(btrim(organization_legal_name))<2 then
    raise exception 'Configure o email confirmado e a razao social real antes de executar';
  end if;

  select id into account_id
  from auth.users
  where lower(email)=lower(account_email)
    and email_confirmed_at is not null;
  if account_id is null then
    raise exception 'Usuario inexistente ou email ainda nao confirmado no Supabase Auth';
  end if;

  select id into platform_id from public.organizations where is_platform_owned
  for update;

  if platform_id is null then
    insert into public.organizations
      (legal_name,kind,is_platform_owned,status)
    values (organization_legal_name,'PLATFORM_OPERATOR',true,'approved')
    returning id into platform_id;
  end if;

  insert into public.organization_capabilities(organization_id,capability,status)
  values (platform_id,'PLATFORM_OPERATOR','approved')
  on conflict (organization_id,capability)
  do update set status='approved';

  update public.profiles set status='active' where id=account_id;
  if not found then raise exception 'Perfil nao foi criado pelo trigger de Auth'; end if;

  insert into public.organization_members(organization_id,user_id,role,status)
  values (platform_id,account_id,'PLATFORM_ADMIN','active')
  on conflict (organization_id,user_id)
  do update set role='PLATFORM_ADMIN',status='active';
end;
$bootstrap$;
commit;
```

**Por que via SQL confiável?** O RLS impede autoproclamar `PLATFORM_ADMIN`, criar outra organização dona da plataforma ou conceder capacidade `PLATFORM_OPERATOR` através do navegador ou API pública. A migração 0008 reserva o bootstrap aos operadores de banco. Alterações de autorização ficam registradas em `marketplace_private.access_audit`.

## Preview Vercel
O conector ChatGPT → Vercel retorna `403 Forbidden` no scope `grupoprovisio`. A conta owner precisa reconectar ou autorizar o time correto, caso queira que o ChatGPT configure o Preview.

Após reconectar:
- Configurar `NEXT_PUBLIC_SUPABASE_URL=https://xprvdquocenfqvnokmmi.supabase.co`.
- Configurar a chave **pública** `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` do mesmo projeto. Nunca usar chave secreta.
- Configurar `MARKETPLACE_AUTH_ENABLED=true` apenas em **Preview**, e `MARKETPLACE_SUPABASE_API_ENABLED=false`, checkout/pagamentos OFF.
- No Auth URL Configuration do Supabase, adicionar somente URLs confiáveis: `https://<preview-autorizado>/auth/callback` e `https://<preview-autorizado>/auth/confirm`, além da URL pública depois de liberar produção.
- Confirmar o template de confirmação/magic link: o padrão usa link de confirmação; o endpoint PKCE `/auth/callback` espera `code`. Para templates personalizados com token hash, usar `/auth/confirm?token_hash={{ .TokenHash }}&type=...` com tipo de fluxo suportado. Não misturar modelo PKCE com link de fragmento legada.
- Configurar SMTP próprio para tráfego real, limites e proteção anti-abuso; revisar senha mínima e exigências de MFA.
- Reinstalar/redeployer Preview com env; acessar `/entrar`, entrar com senha ou magic link; ir para `/seguranca/mfa`, configurar TOTP e verificar AAL2; acessar `/admin/acessos`.
- Testes manuais: senha errada, email inexistente, link expirado, reset de senha, alteração e logout, MFA incorreto, sessão revogada, perfis pendente/bloqueado, comprador de empresa A vs B, colaborador desvinculado, admin AAL1 vs AAL2, revalidação de cookies e páginas móveis.
- Verificar log e indicadores: nenhum token/senha no GitHub, nenhum usuário autoaprovado, e pedidos/payments não habilitados.

## Limitações honestas
Enquanto ninguém tiver sido convidado, confirmado e homologado, o login não pode ser testado como usuário real. As APIs do plugin Supabase da sessão não incluem **convite administrativo de usuários** nem ajustes do painel Auth (URLs, SMTP e provedores). Requerem atuação do Owner ou acesso humano autorizado. A branch ainda contém caminhos legados VTEX fora do novo núcleo, que não devem ser confundidos com o login B2B Supabase.

Sem esses passos não declarar 100% homologado nem publicar login em produção.
