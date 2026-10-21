# Relatório de progresso — Marketplace B2B Grupo Provisio

**Atualizado em:** 21/10/2026  
**Branch deste relatório:** `docs/provisio-progresso-dois-perfis-20261020`  
**Branch de implementação validada:** [`feat/provisio-validacao-local-20261021`](https://github.com/grupoprovisio/distribuidora/tree/feat/provisio-validacao-local-20261021)  
**Natureza:** estimativas de prontidão com evidências de código e testes locais, **não declaração de homologação comercial**.

> Importante: este arquivo é um painel documental de acompanhamento. As funcionalidades descritas na branch de implementação **não foram incorporadas automaticamente** à branch deste relatório nem à `main`. Consultar os commits indicados.

## Escopo definitivo

- Exclusivamente **Sou comprador** (`/compradores`, `/app/comprador/*`), **Sou fornecedor** (`/fornecedores`, `/app/fornecedor/*`) e **Administração**.
- **Sou vendedor**, representantes, carteiras comerciais e comissões de vendedores **fora do escopo**; a antiga Fase 5 fica **N/A**.
- Modelo híbrido preservado: distribuidora própria e fornecedores parceiros autorizados.
- As páginas públicas `/`, `/compradores` e `/fornecedores`, com layout, design, textos, imagens e cards, **não devem ser alteradas**.
- Dados comerciais VTEX/Atacadão não podem alimentar ofertas vendáveis.
- Sem merge na `main`, migração em banco de produção, deploy em produção ou pagamento real sem autorização específica.

## Situação das frentes (0–100%)

| Frente | Antes, 20/10 | Atual, 21/10 | Implementado / evidência | Pendente para 100% |
| --- | ---: | ---: | --- | --- |
| **Fase 0 — Auditoria** | 80% | **90%** | Inventário, matriz de migração, inspeção do Supabase, execução local de testes e build | Revisão integral do HEAD/infraestrutura, relatório de dependências e validação CI |
| **Fase 1 — Site público** | 90% | **95%** | 10/10 testes de preservação do escopo público passaram; hashes de páginas/fotos e build aprovados | Testes visuais em dispositivos, teclado, acessibilidade e links |
| **Fase 2 — Identidade e segurança** | 65% | **65%** | Autenticação Supabase, verificações de sessão, MFA admin e RLS estrutural | Testes negativos A/B entre empresas, convites e fluxos E2E; proteção contra senhas vazadas |
| **Fase 3 — Catálogo B2B** | 60% | **60%** | Listagens autenticadas, catálogo por região, cadastro administrativo e pré-validação CSV | Homologação efetiva com produtos/ofertas reais, importação persistida e integração completa |
| **Fase 4 — Compras e pedidos** | 35% | **70%** | Rascunhos de cotações, prévia de checkout multi-fornecedor, validação de preço/estoque/região, idempotência simulada, migração SQL de pedidos **não aplicada** | Transação atômica/RPC, reserva de estoque, RLS auditado, persistência, UI real, testes concorrentes e E2E |
| **Fase 5 — Vendedores** | N/A | **N/A** | Escopo cancelado por decisão de 17/10 | Nenhum desenvolvimento previsto |
| **Fase 6 — Financeiro e logística** | 20% | **20%** | Contratos e telas parciais; nenhuma movimentação financeira ativada | Meios de pagamento, repasses, conciliação, entregas e documentação fiscal |
| **Fase 7 — Homologação final** | 10% | **20%** | Testes automatizados e build executados com sucesso no MacBook | Testes E2E reais, carga, concorrência, RLS multiempresa, acessibilidade, recuperação e autorização de release |
| **Administração** | 65% | **65%** | Painéis e fluxos iniciais de catálogo/homologação com consultas reais | Aprovação e auditoria ponta a ponta, relatórios e testes de permissões |

**Leitura dos percentuais:** estimativas gerenciais, não métricas automáticas de cobertura nem certificados de operação. **70% da Fase 4 não significa checkout funcional em produção.**

## Evidências técnicas verificadas

### Testes locais no MacBook — 21/10/2026

Ambiente separado (git worktree) em `/Users/ivanescobar/provisio-validacao-20261021`, preservando as alterações não commitadas de outra branch local.

- `npm ci`: concluiu; exibiu alerta de incompatibilidade de engine de `@zxing/library` com Node 22.
- `npm run lint`: **0 erros**, **5 warnings** registrados na primeira validação.
- `npm run typecheck`: passou após correção de `LayoutProps` em `app/layout.tsx`.
- `npm run test:frontend-scope`: **10/10 testes passaram**, inclusive integridade dos arquivos visuais.
- `npm run test:marketplace`: passou, incluindo verificações existentes de domínio, acesso, CSV, simulação de pedidos, operações, financeiro e hardening.
- `npm run test:supabase-foundation`: **7/7 testes passaram**.
- `node --test scripts/marketplace-order-draft.test.mjs`: **2/2 passaram**.
- `node --test scripts/marketplace-phase4.test.mjs`: **2/2 passaram**.
- `node --test scripts/marketplace-checkout-engine.test.mjs`: **4/4 passaram**.
- `npm run build`: **passou**, incluindo geração das páginas estáticas.
- `npm audit --omit=dev --audit-level=high`: informou **0 vulnerabilidades** para dependências de produção nessa consulta; auditoria completa do `npm ci` alertou **5 vulnerabilidades altas** no conjunto instalado. Requer investigação.

Estes resultados **não substituem** testes reais de leitura/gravação no Supabase sob diferentes identidades, testes com navegador ou CI remoto.

### Supabase — projeto `xprvdquocenfqvnokmmi`

Na inspeção: projeto ativo; 11 tabelas `public` de fundação/catálogo com RLS habilitado e políticas; registros estimados: **0 produtos**, **0 SKUs**, **0 ofertas**, **0 posições de estoque**. Nenhum pedido real foi inserido. O advisor apontou proteção contra senhas vazadas desabilitada e RLS sem policies na tabela privada `marketplace_private.catalog_audit`, cuja intenção de acesso exige revisão. Não houve alteração no banco.

### Entregas da Fase 4 na branch de implementação

| Arquivo | Estado |
| --- | --- |
| `lib/marketplace/order-draft.mjs` | Rascunho imutável de pedidos por fornecedor com valores em centavos |
| `lib/marketplace/quote-draft.mjs` | Validação local de solicitações de cotação |
| `lib/marketplace/checkout-engine.mjs` | **Motor de simulação**, revalidação de ofertas, preço, estoque, região e chave idempotente |
| `db/migrations/0016_marketplace_order_foundation.sql` | **Migração versionada não aplicada**: carrinhos, cotações, pedidos, subpedidos, itens e eventos; escrita negada por padrão |
| `docs/marketplace/0017_order_read_policies_REVIEW_ONLY.sql` | **Rascunho para revisão, não migração executável** de políticas de leitura, sujeito a auditoria |
| `scripts/marketplace-phase4.test.mjs`, `scripts/marketplace-checkout-engine.test.mjs` | Testes unitários aprovados |

**Atenção:** o mecanismo de checkout usa um `Map` de memória para simulação; isso não garante idempotência transacional entre servidores, não reserva estoque e não emite pedidos comerciais.

## Commits de implementação relevantes

- [`3e3d0c1`](https://github.com/grupoprovisio/distribuidora/commit/3e3d0c1) — corrigir erro de TypeScript no layout.
- [`9e61011`](https://github.com/grupoprovisio/distribuidora/commit/9e61011) — esquema inicial de pedidos e cotações.
- [`b7a6741`](https://github.com/grupoprovisio/distribuidora/commit/b7a6741) — rascunho de políticas para revisão.
- [`5bc9b06`](https://github.com/grupoprovisio/distribuidora/commit/5bc9b06) — validador/simulador de checkout multi-fornecedor e testes.

## Critérios que permanecem obrigatórios para 100%

1. **Fase 4:** corrigir e auditar a estratégia RLS, testar com compradores A/B e fornecedores A/B, incluir transação atômica com idempotência persistida, reserva/liberação de estoque e snapshots no PostgreSQL; habilitar apenas em homologação.
2. Integrar componentes de cotação, carrinho, checkout e histórico reais nos portais privados, tratando estados de erro, cancelamento, entrega parcial e divergência.
3. Executar testes E2E com autenticação real, concorrência de confirmações, acesso cruzado negado, reexecução segura e rollback.
4. Completar decisões de pagamento/logística/fiscal antes de liberação comercial.
5. Rodar validação visual, responsividade e acessibilidade sem tocar nos arquivos públicos protegidos.
6. Registrar evidências de CI, backup e restauração; solicitar autorização separada para merge/deploy.

**Status de publicação:** nenhum merge na `main`, nenhuma migração aplicada ao Supabase e nenhum deploy de produção nesta sequência de implementação. Os percentuais serão atualizados apenas com evidências novas.
