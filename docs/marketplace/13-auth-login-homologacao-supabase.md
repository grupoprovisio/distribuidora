# Homologação da autenticação Provisio (16/10/2026)

## Supabase de destino
- Projeto **Projecto Distribuidora**: `xprvdquocenfqvnokmmi`, região `us-west-2`.
- Confirmado neste ciclo: nenhum usuário preexistente, esquema `public` vazio inicialmente.
- Migrações aplicadas ao banco principal ainda sem operação comercial:
  - `revoke_public_rls_event_trigger_execution`: revogou função privilegiada acessível a `anon`/`authenticated`.
  - `0001_marketplace_foundation`
  - `0002_marketplace_catalog`
  - `0003_marketplace_rls_readonly`
  - `0004_marketplace_supplier_integrity`
- Verificação pós-migração: dez tabelas, todas com RLS; nenhuma linha comercial; linter de segurança Supabase sem avisos.
- Observações de desempenho: três FKs sem índices completos e índices ainda não utilizados em base vazia; revisão pré-volume.
- Migrações SQL continuam na branch `feat/provisio-supabase-fundacao-20261015` / PR #4, **não integradas à `main` do GitHub**.
- Mudanças no banco são reais, mas **a autenticação ainda não foi ligada ao site publicado**.

## Login e segurança implementados em branch
- SDK oficial `@supabase/supabase-js` + `@supabase/ssr`, versões exatas com lockfile.
- `/entrar`: email/senha ou código via email para conta preexistente; `shouldCreateUser:false` impede signup anônimo.
- `/auth/callback`: troca PKCE por sessão cookie; destino fixo dentro do site.
- `proxy.ts`: refresca sessão e aplica `Cache-Control: private, no-store`. Não confia em `getSession()`.
- `/app/*` e `/admin/*`: verificação de usuário com `getUser()` e autorização via tabelas RLS de perfil/membership/organização/capacidade. Links manipulados não garantem acesso.
- `/acesso-pendente` e `/acesso-restrito`: estados sem liberação de dados.
- Publicações desligadas: `MARKETPLACE_AUTH_ENABLED=false` por padrão. Nenhum segredo entra no código ou no browser.

## Ativação em Preview ou Staging, depois de revisão
1. Configurar no ambiente Preview o `NEXT_PUBLIC_SUPABASE_URL` **exatamente** `https://xprvdquocenfqvnokmmi.supabase.co`.
2. Configurar `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` usando somente a chave pública do **mesmo** projeto.
3. Definir `MARKETPLACE_AUTH_ENABLED=true` **somente no ambiente Preview/Staging** e aguardar novo build; nenhuma flag de checkout, billing ou dados de demonstração pode ser ativada para vendas.
4. No [Supabase Auth](https://supabase.com/dashboard/project/xprvdquocenfqvnokmmi/auth/users), convidar uma conta de teste via interface administrativa, **sem inserir linhas em `auth.users` por SQL**.
5. Confirmar Site URL/Redirect URLs do projeto [Auth URL Configuration](https://supabase.com/dashboard/project/xprvdquocenfqvnokmmi/auth/url-configuration). Incluir apenas host HTTPS de Preview confiável e a rota `/auth/callback`; em produção somente após deploy aprovado.
6. Para autenticação por código numérico, configurar template de email OTP do Supabase para entregar `{{ .Token }}`; para convite/PKCE, manter link de confirmação esperado.
7. Ao aceitar convite, o trigger cria `profiles.status='pending'` e nenhum acesso a painel é concedido.
8. A ativação de um perfil ou permissão empresarial exige administrador confiável (com auditoria); **não** mudar `status` nem criar `PLATFORM_ADMIN` com metadados públicos.
9. Preparar associação e aprovação de organização/capacidades exclusivamente pelo backend administrativo com MFA, logs e revisão; só então autenticação deve chegar a um painel real.
10. Provar em Preview: email/senha correto e incorreto, OTP expirado, token forjado, logout, cookies e refresh, dois usuários de empresas diferentes, perfil pendente, bloqueio e revogação imediata.
11. Executar testes completos em Supabase de homologação isolado antes de habilitar produção; nunca rodar testes destrutivos contra o projeto principal.

## Gate de lançamento
**NO-GO para ativar login em produção** até convite e configuração Auth serem homologados, controles de rate limit/CAPTCHA e políticas de e-mail revisados, e o fluxo ser testado manualmente em Preview.
A simples presença de tabelas/migrações no Supabase não ativa formulários comerciais nem vendas.
