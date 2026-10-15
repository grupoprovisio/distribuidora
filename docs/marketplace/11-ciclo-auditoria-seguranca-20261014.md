# Ciclo de auditoria e hardening B2B — 14/10/2026

## Contrato de execução e procedência

- Repositório: `grupoprovisio/distribuidora`.
- Plano lido integralmente: `PLANO_CODEX_DISTRIBUIDORA_MARKETPLACE_HIBRIDO.md`. O arquivo **não está na `main`**: foi encontrado e incorporado por herança da branch `feat/marketplace-b2b-hardening-20261014`.
- Branch de trabalho: `feat/marketplace-b2b-auditoria-seguranca-20261014`, derivada de `feat/marketplace-b2b-hardening-20261014`, sem checkout nem alteração da `main`.
- O código existente das fases 0–9 é **protótipo / simulação**, não um marketplace pronto para clientes. Seu resultado anterior documentado é **NO-GO**.
- O projeto Supabase `xprvdquocenfqvnokmmi` foi acessado somente em leitura anteriormente: zero tabelas no schema `public`. Nenhuma migração remota, chave, credencial, usuário ou pagamento foi criado aqui.

## Fase 0: inventário confirmado

Árvore Git da branch de base: aproximadamente 206 arquivos versionados, incluindo 75 em `app/`, 47 em `components/`, 40 em `lib/`, 7 em `scripts/` e uma migração SQL local. A auditoria detalhada anterior permanece em `docs/marketplace/00-auditoria.md` e o mapa de transição em `01-plano-migracao.md`.

| Área | Exemplos de arquivos | Dependência / dado | Decisão |
| --- | --- | --- | --- |
| Busca, categorias e filtros | `app/(tabs)/buscar`, `categorias`, `lib/taxonomy.ts`, `lib/catalog-index.ts` | APIs públicas VTEX | Preservar UX, substituir busca por catálogo aprovado |
| Catálogo e preços legados | `lib/atacadao.ts`, `app/api/catalog/*`, `app/api/lookup`, `app/api/list/compare` | GraphQL FastStore, produtos, quantidades e sellers externos | **Desativar rede**, migrar/retirar endpoints |
| Promoções | `lib/promos.ts`, `app/(tabs)/promocoes` | CMS e listas Atacadão | **Desativar rede**, substituir ofertas internas |
| Login legado e perfil | `lib/vtex-auth.ts`, `app/api/auth/*` | VTEX ID, perfil e pedidos terceiros | **Desativar rede**, criar identidade própria |
| Experiência reaproveitável | 47 componentes em `components/`, scanner, favoritos, listas, telas públicas | Componentes de UI e dados locais/legados | Manter aparência e controles; trocar proveniência |
| Histórico local | `lib/list-store.ts`, `purchase-store.ts`, `prefs-store.ts`, `account-store.ts` | `localStorage`/cookies | Não importar ofertas externas, proteger legado e migrar voluntariamente |
| Núcleo novo | `lib/marketplace/*`, `app/api/marketplace/*` | Fixtures autorizadas de desenvolvimento | Preservar e fortalecer até existir Supabase staging/RLS |
| Portais | `app/app/comprador`, `vendedor`, `fornecedor`, `admin/marketplace` | Telas demonstrativas | Não habilitar para dados privados reais sem autorização server-side |

## Correções realizadas nesta branch

1. `lib/legacy-commercial-access.ts`: bloqueio explícito, sem variável de reativação, para integrações comerciais externas. Guard adicionado antes das chamadas de rede em `lib/atacadao.ts`, `lib/promos.ts` e `lib/vtex-auth.ts` (incluindo leitura de perfil/pedidos).
2. `lib/marketplace/csv-import.ts`: importação não pode declarar `MANUAL_AUTHORIZED` nem `PLATFORM_STOCK`; apenas `SUPPLIER_CSV_AUTHORIZED`. Parser de linha aceita aspas escapadas e rejeita erros de colunas, regiões inválidas, valores monetários fora de limites inteiros seguros e SKUs duplicados.
3. `lib/marketplace/order-simulation.ts`: fingerprint de idempotência inclui região normalizada, e há validação adicional de subtotal seguro por fornecedor.
4. `lib/marketplace/financial-sandbox.ts`: eventos são rejeitados sem verificador explícito de assinatura. Campo de assinatura não vazio, sozinho, não autentica um webhook. Deduplicação apenas após verificação.
5. `scripts/marketplace-hardening-check.mjs`: testes adicionais para origem CSV, campos inválidos, idempotência regional, webhook não verificado e presença do bloqueio de rede.
6. `vercel.json`: `git.deploymentEnabled` desabilitado para esta branch de trabalho; mensagens de commit usam `[skip ci]`. Nenhum comando de deploy foi executado.

## Dados, privacidade, multiempresa

- Mantidos os contratos de organização, membro, fornecedor, produto mestre e oferta da branch de base.
- A migração SQL `db/migrations/0001_marketplace_foundation.sql` permanece **somente no Git**, com RLS deny-by-default e sem políticas permissivas.
- **Não existe** autenticação persistente de organização, aprovação real de fornecedor, RLS validado com usuários de teste nem pedidos reais persistidos.
- Nenhum dado VTEX/Atacadão foi copiado para o catálogo comercial novo. Fixtures são fictícias, isoladas em desenvolvimento.
- Ainda há rotas legadas visíveis, agora sem acesso à fonte externa; elas precisam receber substituição/estado vazio/redirecionamento controlado, com teste de regressão de histórico do navegador, antes de merge.

## Testes e limites de verificação

| Teste | Resultado e escopo |
| --- | --- |
| TypeScript isolado (`tsc --strict`) | **Passou** para reproduções verificadas dos módulos CSV e sandbox financeiro; tipos de importação substituídos somente no teste isolado |
| Node.js isolado, 17 cenários | **Passou**: CSV válido/aspas, fontes proibidas, números/regiões/linhas inválidos, duplicidade e rejeição/deduplicação de eventos |
| Regressões novas adicionadas ao runner do repositório | **Criadas, mas não executadas no checkout completo** |
| `npm ci` / `npm run test:marketplace` / `npm run typecheck` / `npm run lint` / `npm run build` | **Não executados nesta branch:** clone GitHub bloqueado por DNS de rede no ambiente de testes; Mac conectado ao Desktop Commander estava offline |
| GitHub diff da branch | Commits e arquivos verificados pelo GitHub; `main` não foi alterada |
| Vercel | Configurado bloqueio de deploy para branch; **a ausência de previews não pôde ser verificada no painel** por acesso Vercel anteriormente negado (403) |

Os testes isolados não são substitutos para build completo, validação de imports Next.js, testes E2E, carga, segurança de RLS ou homologação multiempresa.

## Pendências prioritárias e critérios de saída

1. **P0 — checkout completo e testes:** executar `npm ci`, `npm run test:marketplace`, `npm run typecheck`, `npm run lint`, `npm run build`, `git diff --check` em máquina/CI autorizada que consiga ler o repositório. Corrigir regressões, se encontradas.
2. **P0 — UX legada:** substituir `/buscar`, `/categorias`, `/promocoes`, `/checkout`, `/scan`, listas/favoritos e endpoints antigos pelo catálogo autorizado ou estados vazios/410 apropriados, sem apagar histórico do navegador; validar navegação/SEO.
3. **P0 — backend multiempresa de teste:** provisionar ambiente **staging separado**, revisar migrações versionadas, Auth, políticas RLS negativas, escopo por organização e administração de homologações. Não aplicar no Supabase de produção.
4. **P1 — catálogo real autorizado:** cadastro/importação por fornecedor autenticado, aprovação de fonte/organização/oferta, SKU/GTIN, preço/estoque por região, logs e auditoria.
5. **P1 — pedidos simulados persistentes em staging:** orçamento, carrinho multiforncedor, `supplier_orders`, snapshots, concorrência/idempotência em banco e permissões do comprador/vendedor/fornecedor.
6. **P1 — segurança operacional:** webhook com assinatura criptográfica baseada no corpo bruto, limite de taxa, CSRF, upload seguro, logs append-only, comissões e estornos auditados.
7. **P2 — contratos e homologação:** documentos fiscais, merchant of record, responsabilidades por entrega/pagamento/repasse, acessibilidade, testes mobile, carga, backup, monitoramento e checklist GO/NO-GO.
8. **Infra:** Vercel ainda requer reconexão/permite somente avaliação parcial. Não executar deploy.

## Resultado

**FASE ATUAL:** Fase 0 revisitada + incrementos de segurança nas fases 1, 4, 5 e 8.

**DECISÃO:** **NO-GO para merge, deploy ou venda real**.

**CONFIRMAÇÃO:** nenhuma operação de merge, push na `main`, alteração de banco remoto, deploy manual, configuração de pagamento live ou operação financeira foi executada neste ciclo. A proteção de previews automáticos foi configurada na própria branch, sem confirmação independente do painel Vercel.

## Complemento: corte do comparador e execução de CI na branch

**Inventário adicional de migração concluída no código:**

- As rotas API `/api/catalog`, `/api/catalog/prices`, `/api/lookup`, `/api/list/compare`, `/api/promos`, `/api/suggest`, `/api/terms`, `/api/filiais/nearest`, `/api/filiais/receipt-store`, `/api/auth/send`, `/api/auth/verify` e `/api/receipt` retornam `410 Gone` e não enviam dados ao Atacadão/VTEX.
- As páginas `/buscar`, `/categorias`, `/promocoes`, `/ofertas`, `/scan`, `/produto/[id]`, `/checkout`, `/orcamento`, `/lista/montar`, `/lista/sugestoes` redirecionam para catálogo autorizado ou módulo de cotações demonstrativo.
- As páginas `/conta`, `/conta/configuracoes`, `/conta/compras`, `/conta/compras/[id]`, `/lista`, `/favoritos` agora redirecionam para `/legado`: **histórico preservado no navegador**, consulta a antigos preços externos desativada.
- A antiga tela `/admin` com números comerciais fictícios sem indicação clara foi substituída por redirecionamento a `/admin/marketplace`, cujo conteúdo sinaliza o modo de demonstração. `/empresas`, `/entregas` e `/quem-somos` redirecionam a páginas institucionais novas, preservando caminhos sem promessas legadas.
- O `README.md` principal foi substituído por instruções atuais e aviso de pré-produção; `/legado` exporta dados antigos em JSON somente no browser, sem envio nem conversão.
- A documentação antiga sobre "rotas ainda a redirecionar" descreve o estado **antes** deste complemento; esta seção registra a mudança posterior.

**Execução real de CI (GitHub Actions), sem deploy**:

- Workflow isolado `.github/workflows/marketplace-isolated-validation.yml`: `npm ci`, testes do marketplace, `next typegen`, TypeScript, ESLint, build, com todas flags comerciais desativadas.
- Primeira execução [38669092405](https://github.com/grupoprovisio/distribuidora/actions/runs/38669092405): instalação e testes de marketplace passaram; TypeScript falhou por ausência de tipos gerados pelo Next e narrowing incorreto em código legado.
- Segunda execução [38669197041](https://github.com/grupoprovisio/distribuidora/actions/runs/38669197041): instalação, testes, geração de tipos e typecheck passaram; lint falhou por variável `module` no runner. Corrigido com `loadedModule`.
- A execução de CI que inclui todos os últimos redirecionamentos precisa ser executada e confirmada; uma execução anterior não cobre commits posteriores.
- Estas execuções são validações da branch, **não deploys**. A configuração da Vercel impede deployments Git automáticos nesta branch, mas o painel Vercel não foi acessado independentemente para comprovação de previews.

**Decisão inalterada: NO-GO.** Não há backend seguro de pedidos reais, autenticação tenant persistente, RLS homologado nem emissão/cobrança permitida.

## Complemento final — catálogo versionável, UX sem dados fictícios e pipeline

- `db/drafts/marketplace_catalog_staging_proposal.sql`: desenho **não executado** (não é migration aplicada), com categorias, produtos, códigos, SKUs por fornecedor, ofertas, tiers, regiões, estoque e eventos de homologação. Restrições de proveniência autorizada, FK de ofertas para SKUs da mesma organização e RLS `enable + force` sem políticas públicas. A modelagem depende de validação SQL e integração/teste negativo em **staging separado** antes de qualquer banco real.
- `next.config.ts`: removidas allowlists de CDNs VTEX para imagens.
- `package.json` e `package-lock.json`: identidade técnica agora `provisio-marketplace-b2b`, sem alterações no conjunto de dependências.
- `components/contact-form.tsx`, `app/contato/page.tsx`: removidos telefone/e-mail fictícios e pseudoenvio de dados pessoais; contato por `mailto:contato@grupoprovisio.com`, sem coleta server-side.
- `scripts/marketplace-hardening-check.mjs`: verifica rotas legadas `410`, redirecionamentos, exportação local, marca, lockfile, contato e imagem remota.
- [CI de referência (38669463243)](https://github.com/grupoprovisio/distribuidora/actions/runs/38669463243): `npm ci`, `npm run test:marketplace`, `npx next typegen`, `npm run typecheck`, `npm run lint` e `npm run build` **passaram** no commit `e06d82b`. Uma validação adicional precisa cobrir os commits finais de conteúdo, documentação e testes.

**Atenção:** o schema é somente proposta, sem gatilhos append-only, políticas de leitura pública segura, versionamento de migrations via Supabase CLI ou testes de integração PostgreSQL. Nunca aplicar no projeto `xprvdquocenfqvnokmmi` sem autorização futura expressa. Não há dados reais, fornecedores homologados reais ou checkout utilizável em produção.

**Status e decisão:** desenvolvimento isolado e revisável; **NO-GO** para clientes, merge, deploy e qualquer alteração de produção.

## Controles finais adicionados antes do freeze de branch

- `components/app-header.tsx`: botão de lista do comparador antigo oculto por padrão nos cabeçalhos; o carrinho próprio só poderá ser reativado após implementar autorização por organização.
- `app/admin/login/page.tsx`: removido formulário de senha que não possuía autenticação real. Exibe aviso e link claramente demonstrativo, sem coletar credenciais.
- Testes estáticos adicionais impedem regressão nessas duas alterações.
- Nenhuma oferta real, fornecedor externo, cliente, pedido ou pagamento foi cadastrado; nenhuma permissão de produção foi modificada.
- As funcionalidades úteis do scanner, favoritos e lista continuam presentes no histórico Git, porém seu fluxo comercial está temporariamente desativado até aceitar somente produtos homologados. **Não as declarar concluídas como marketplace.**

### Critérios verificáveis para retomar fases 3–9

A futura homologação em ambiente isolado deve comprovar: login real e MFA administrativo, organizações e políticas RLS testadas com usuários adversariais, separação de ofertas/produtos por fornecedor, aprovação e proveniência, pedidos por fornecedor com idempotência transacional, trilha de auditoria, integridade de pagamento e contratos fiscais/logísticos. Sem isso, o resultado permanece **NO-GO**, independentemente de build verde.
