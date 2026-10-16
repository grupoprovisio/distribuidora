# Encerramento técnico da base Supabase / Auth Provisio — 16/10/2026

## Escopo executado
Projeto remoto exclusivo `xprvdquocenfqvnokmmi` (**Projecto Distribuidora**, PostgreSQL 17, us-west-2).

- Supabase recebeu 9 migrações: correção de permissão `rls_auto_enable`, `0001` até `0009`.
- 10/10 tabelas `public` com RLS habilitado e `FORCE ROW LEVEL SECURITY`.
- 21 policies `public` (leitura por identidade/empresa e escrita administrativa somente por MFA/sessão válida).
- As tabelas comerciais continuam sem permissões gerais de `INSERT/UPDATE/DELETE` para usuários finais.
- Protegidos: Auth ligado a `profiles`, organizações, membros, capacidades, catálogo e ofertas, preço por faixa, região, posição de estoque.
- `marketplace_private.access_audit` registra alterações administrativas com identificação de origem e estados controlados, com `REVOKE`, FORCE RLS e política deny explícita.
- `marketplace_private.is_verified_platform_admin()` requer conta ativa, vínculo `PLATFORM_ADMIN` válido, empresa dona da plataforma, capacidade aprovada, JWT AAL2, registro de sessão em `auth.sessions` e prazo válido.
- `PLATFORM_ADMIN`, a empresa `PLATFORM_OPERATOR` e a capacidade exclusiva não podem ser forjados via Data API. O bootstrap é feito por operador confiável do banco.
- Ao revisar esta versão, Supabase Security Advisor retornou **zero alertas**. Nenhum usuário real/organização foi criado.

## Código do login em branch isolada
PR #4 / `feat/provisio-supabase-fundacao-20261015`, **draft**, ainda baseado em `feat/marketplace-b2b-hardening-20261014`, que não está integrado à `main`.

- Cliente oficial `@supabase/ssr@0.12.7` e `@supabase/supabase-js@2.118.0` fixados em lockfile, URL restrita ao projeto Provisio.
- `/entrar`: senha e magic link apenas para conta existente (`shouldCreateUser:false`); nenhum signup público pela tela.
- `/recuperar-acesso`, `/redefinir-senha` e callbacks PKCE/token_hash sem open redirect.
- Proxy/cookies para Next.js 16 e validação Auth no servidor com `getUser/getClaims`; nenhuma autorização por user_metadata.
- `/app/comprador`, `/app/fornecedor`, `/app/vendedor`, `/admin/*` protegidos no servidor.
- `/seguranca/mfa` permite cadastrar/verificar TOTP; sessão AAL1 não consegue abrir administração.
- `/admin/acessos` permite homologar status de perfis, organizações, membros e capacidades (revalidação server-side e RLS, sem service_role no browser).
- Conta pendente/restrita tem acesso à opção de logout.
- Flags `MARKETPLACE_AUTH_ENABLED=false` e `MARKETPLACE_SUPABASE_API_ENABLED=false` mantêm login e APIs desativados em produção até homologação.

## Segurança de dependências
- Next.js e eslint-config-next fixados em `16.4.2`; vulnerabilidade crítica anterior corrigida.
- Pipeline exige `npm audit --omit=dev --audit-level=high` sem vulnerabilidades altas/críticas de produção.
- 5 alertas altos conhecidos permanecem em ferramentas de desenvolvimento ESLint; um `npm audit fix --force` faria downgrade incompatível, portanto não aplicado.

## Evidência de testes
GitHub Actions instala dependências, typegen, typecheck, lint, suites marketplace, testes mockados Supabase, `npm run build` e smoke HTTP sem login; cria Postgres 17 isolado, executa migrations `0001`-`0009` e testa fronteiras entre empresas, bloqueios de papéis, escrituras com AAL1/AAL2, sessão expirada, impossibilidade de criar superadmin e auditoria privada.
**Isso NÃO comprova** Auth real por e-mail, recuperação, SMTP, MFA em celular nem cookies da Vercel.

## Ações indispensáveis para homologar e publicar
1. O proprietário da Provisio convida o primeiro usuário **na interface Supabase Auth**. O conector atual não oferece ação de convite; não inserir usuário na tabela `auth.users` por SQL.
2. Após e-mail confirmado, executar bootstrap verificado com razão social e conta reais, seguindo `docs/marketplace/14-bootstrap-admin-login-homologacao.md`. Atribuir `PLATFORM_ADMIN` só por SQL confiável; nunca via cadastro público.
3. Reconectar / autorizar Vercel scope `grupoprovisio`; as duas conexões testadas retornaram HTTP 403. Sem acesso a env de Preview não é possível ativar login com segurança nem confirmar deploy.
4. Revisar Auth Site URL/Redirect URLs, templates (PKCE versus token_hash), rate limiting, SMTP, senha e controles de abuso.
5. Homologar Preview com conta real, MFA TOTP, reset de senha, cookies, logout, revogação de sessão, perfis bloqueados, isolamento comprador A vs B, admin AAL1 e AAL2.
6. Revisar/sincronizar PRs base marketplace e hardening antes de merge. Não publicar login/checkout até critérios acima passarem.

## Estado GO/NO-GO
**GO para fundação segura de banco**: migrações reais aplicadas, linter sem alertas, testes PostgreSQL passam.
**NO-GO para afirmar "login 100% funcionando" ou ativar produção**: ainda há 0 contas reais e autorização Vercel ausente. Os módulos legados VTEX permanecem independentes e exigem migração/retirada planejada. Sem essas validações, não realizar merge nem deploy.
