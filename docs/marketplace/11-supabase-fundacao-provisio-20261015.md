# Supabase — Fundação do Grupo Provisio (15/10/2026)

## Projeto e limite de acesso
- Supabase informado: `xprvdquocenfqvnokmmi` (`https://xprvdquocenfqvnokmmi.supabase.co`).
- O conector Supabase autenticado nesta sessão **não lista esse projeto** e `get_project`, `list_tables`, `list_migrations` e `list_branches` retornaram **sem permissão**.
- **Não foram executados SQL, migração, criação de projeto/branch Supabase ou alterações de configuração no banco.** Não afirmar que está vazio ou que a migração foi aplicada.
- O GitHub da Provisio continua acessível. Código do marketplace e banco ainda **não estão integrados à `main`**.

## Código existente
- `marketplace-b2b-hibrido` / PR #1: módulos e protótipos da fundação B2B.
- `feat/marketplace-b2b-hardening-20261014`: protege endpoints demonstrativos em produção, e inclui `0001_marketplace_foundation.sql` (profiles, organizations, organization_capabilities, organization_members) com RLS sem policies.
- Esta branch `feat/provisio-supabase-fundacao-20261015` deriva da hardening e adiciona `0002_marketplace_catalog.sql` com produtos mestres, SKUs por fornecedor, ofertas, tiers, regiões e estoque segmentado.
- Nenhuma migration acima foi aplicada por este trabalho. Nenhum produto externo VTEX foi importado.

## Atenção: 0001 ainda precisa de revisão antes de aplicação
- A coluna `profiles.auth_user_id text` não possui FK real para `auth.users.id`; projetar vínculo UUID/FK e migração de dados conforme cadastro real.
- O modelo atual não implementa Auth próprio do marketplace, RLS por papel, homologação administrativa auditada nem concessões ao `authenticated`.
- `FORCE ROW LEVEL SECURITY` **não protege contra papéis com BYPASSRLS**, por exemplo chaves de serviço de backend.
- Revisar colisões com tabelas existentes do Supabase antes de rodar SQL. `0001` usa `CREATE TABLE IF NOT EXISTS`: isso **não comprova compatibilidade** com tabelas pré-existentes.
- Não conceder `SELECT` indiscriminado a todos os usuários autenticados. Políticas devem cruzar conta, organização, membership ativo e capacidade validada pelo servidor.

## Próximas tarefas — somente após reconectar o projeto correto
1. No ChatGPT: conectar ao Supabase usando conta/organização que possui o projeto `xprvdquocenfqvnokmmi`; confirmar via `list_projects`.
2. Ler schemas `public`/`auth`, migrations existentes, configurações de Auth e avisos de segurança. Fazer backup/snapshot quando indicado.
3. Corrigir a fundação da identidade `0001` para Supabase Auth com auditoria de papéis e bootstrap administrativo seguro, sem privilégio implícito no cadastro.
4. Criar instância de desenvolvimento/staging autorizada e testar as migrações **primeiro fora de produção**; Supabase branches podem ter custos e exigem autorização.
5. Executar testes negativos de RLS: fornecedor A vs. B, comprador A vs. B, membership revogado, ausência de sessão e SKU trocado entre fornecedores.
6. Adicionar `@supabase/supabase-js` e `@supabase/ssr` com versões fixadas e lockfile, clientes server/browser, validação de usuário no servidor e configuração Vercel.
7. Depois de validação, aplicar em produção somente migrações revisadas e explicitamente autorizadas; ativar endpoints reais via flags seguras. Não habilitar pagamentos nesta fase.

## Configuração prevista (não cadastrada ainda)
- `NEXT_PUBLIC_SUPABASE_URL=https://xprvdquocenfqvnokmmi.supabase.co`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = chave pública **obtida do projeto certo**; não copiar de Gestify ou Kratelis.
- Chaves `sb_secret_` / `service_role` somente no servidor e apenas se estritamente necessário; não usar para consultas comuns nem expor via prefixo `NEXT_PUBLIC_`.

## Verificação pendente
Sem acesso ao banco correto e sem clone local acessível ao GitHub, não foi possível executar migrations, testes de SQL, build ou lint. Este documento é um plano/artefato para revisão, não comprovação de implantação.
