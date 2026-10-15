# Supabase Provisio — ciclo de fundação técnica (15/10/2026)

## Resultado e estado real
- Destino exclusivo: `xprvdquocenfqvnokmmi.supabase.co`.
- O conector Supabase da sessão **não tem permissão** para esse projeto (`get_project` / `list_tables` recusados). Nenhuma operação SQL remota, branch paga, alteração de Auth, deploy ou credencial foi executada.
- Branch: `feat/provisio-supabase-fundacao-20261015`, PR #4 **draft**. Base: `feat/marketplace-b2b-hardening-20261014`, que ainda não está na `main`.
- Code path novo desabilitado por padrão: `MARKETPLACE_SUPABASE_API_ENABLED=false`.

## Entregas nesta branch
1. `db/migrations/0001_marketplace_foundation.sql`: perfis com FK real para `auth.users`, organização e capacidades, roles restritos, criação automática de **perfil pendente** no Auth (metadados jamais habilitam permissões), RLS FORCED.
2. `db/migrations/0002_marketplace_catalog.sql`: produto mestre, SKU vinculado ao fornecedor, oferta com FK composta, preços em centavos, níveis por quantidade, regiões e estoque separado. Fontes externas VTEX/Atacadão não entram em source_type autorizado.
3. `db/migrations/0003_marketplace_rls_readonly.sql`: leitura somente do próprio usuário / organização / fornecedor homologado; nada pode ser escrito pelo navegador. Funções de verificação em schema `marketplace_private`, JWT via `auth.uid()`. Schema privado não deve ser adicionado à lista de schemas expostos do Data API.
4. `lib/marketplace/supabase-gateway.ts`: gateway server-side sem dependências adicionais; rejeita URL diferente da Provisio, aceita apenas chave `sb_publishable_`, valida JWT no Supabase Auth antes de enviar consulta RLS ao PostgREST.
5. `GET /api/marketplace/supabase/me`: retorna o perfil próprio e os vínculos visíveis ao usuário.
6. `GET /api/marketplace/supabase/supplier-offers?organization_id=<uuid>`: consulta operacional de ofertas do fornecedor (máximo 50), sujeita a RLS. O parâmetro nunca substitui a identidade validada.
7. Testes de gateway e validação estática de migrações via `npm run test:supabase-foundation`; workflow CI em GitHub Actions com Node 24, `next typegen`, `typecheck`, `lint` e suíte de marketplace.

## Modelo de segurança
- `anon`: sem `GRANT SELECT` nas tabelas. `authenticated`: somente `SELECT` e RLS tenant-scoped; **nenhuma policy INSERT/UPDATE/DELETE**.
- `profiles.status=pending` até aprovação de administrador. Usuário pendente, bloqueado, revogado ou sem membership ativo não obtém leitura de fornecedor.
- `organization_members.role` + capacidade aprovada + org aprovada + profile ativo + membro ativo devem ser válidos simultaneamente.
- A função `marketplace_private.has_active_capability` usa `SECURITY DEFINER` exclusivamente para evitar recursão RLS na verificação de vínculos; tem `search_path=''`, não recebe ID do usuário chamador e EXECUTE não é público.
- Somente fornecedores autenticados veem seus produtos/ofertas nesta primeira política. Compradores não veem preços até termos dados de região, elegibilidade, contratos comerciais e testes E2E.
- `service_role`/`sb_secret_` nunca são usados no gateway nem expostos ao browser.
- Não há login próprio do marketplace pronto na interface, nem habilitação de checkout/pagamentos/repasses/fiscal. As rotas antigas dependentes da VTEX **continuam fora do novo núcleo comercial** e devem ser desativadas antes do lançamento completo.

## Aplicação — NÃO executar antes da inspeção real
1. Reconectar a conta Supabase que é membro do projeto `xprvdquocenfqvnokmmi`. Conferir `get_project`, tabelas, migrations e advisors.
2. Determinar se o Supabase está vazio ou possui tabelas existentes; `0001` usa `CREATE TABLE` para não mascarar diferenças e exige reconciliação.
3. Preparar backup/branch staging isolada. Verificar custo **antes** de criar branch remota; usar Supabase CLI para gerar migrações oficiais em `supabase/migrations`, ou método de migração auditado com trilha.
4. Testar em staging: criar dois usuários Auth de teste A e B; criar organizações A/B aprovadas, perfis ativos, capacidades SUPPLIER aprovadas e memberships ativos. Nunca usar `raw_user_meta_data` para aprovar.
5. Executar `0001 -> 0002 -> 0003` em uma base de teste limpa, verificar advisor de segurança e grants/PostgREST. Validar `auth.uid()` e isolamento real, incluindo tentativa de alterar `organization_id` e de consultar oferta de B com JWT de A.
6. Criar usuário C pendente, D revogado e comprador sem capacidade SUPPLIER. Confirmar que retornam **zero linhas** de ofertas, tanto via Data API quanto pela rota Next.
7. Ativar exclusivamente em ambiente homologado usando `env.supabase.example` como referência: `NEXT_PUBLIC_SUPABASE_URL` correto, chave pública daquele projeto e `MARKETPLACE_SUPABASE_API_ENABLED=true`. Um JWT real, obtido da autenticação da Provisio, vai no header `Authorization: Bearer <token>`. Não colocar JWT no GitHub, em chat, em commit ou em documentação.
8. Homologar login/refresh e logout do próprio marketplace usando SDK oficial/SSR em alteração futura com versões fixas e lockfile; remover dependência da sessão VTEX.
9. Integrar portais de fornecedor/admin somente após rotas autenticadas e CRUD autorizados, auditoria e approval workflow. Abrir vendas só depois do checkout, stock reservation e finance sandbox verificados.
10. Para produção: aprovar migrações, replicar alterações com backup/rollback e conferência da equipe, sem habilitar flags da operação antiga.

## Critérios GO / NO-GO
- **NO-GO remoto** enquanto o conector não puder ler o projeto, o SQL não rodar em staging, os testes negativos de acesso ao banco não passarem ou os advisories apontarem problemas graves.
- A suíte Node/GitHub Actions é uma prova de código, **não** substitui testes reais de RLS no PostgreSQL.
- Antes de merge: corrigir alertas no `npm audit`; CI detectou inicialmente 8 vulnerabilidades transitivas (7 high, 1 critical), sujeitas a nova avaliação depois da atualização de dependências.
- Se `auth.users` possuir cadastros anteriores à instalação do trigger, fazer backfill **controlado e revisado** de perfis pendentes; não aprovar automaticamente contas antigas.
- `Node 24` foi escolhido na CI por requisito da dependência `@zxing/library@0.23.0`. `npx next typegen` deve preceder `tsc --noEmit`.
- `0001/0002/0003` são artefatos em `db/migrations`, **ainda não** migrações registradas no histórico oficial do Supabase remoto. Não copiar/aplicar manualmente na produção sem planejamento.

## Registro de verificação
Os endpoints podem ser testados sem credenciais usando fetch simulado na suíte. A execução em banco real continua bloqueada. Quando estiver liberado, registrar data, ambiente, SHA da migration, contagem de tabelas, resultado de RLS e query de `pg_policies` como evidência.
