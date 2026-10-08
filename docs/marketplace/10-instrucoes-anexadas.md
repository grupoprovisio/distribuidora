# Execução das instruções anexadas — Fase inicial

## Branch

Criada a partir de `main`: `feat/marketplace-foundation`. O checkpoint anterior foi trazido por cherry-pick; a `main` não foi alterada.

## Auditoria legada

Foram catalogados usos de `lib/atacadao.ts`, `lib/vtex-auth.ts`, `/api/catalog`, `/api/auth`, `/api/promos`, `/api/lookup`, `/api/list` e dependências indiretas em busca, promoções, scanner, recibos, conta, taxonomia e índice de catálogo. As rotas legadas continuam temporariamente presentes para evitar quebra abrupta, mas não são usadas pelo novo domínio marketplace.

## Contrato anexado

`lib/marketplace/types.ts` foi integrado como contrato comercial inicial. `operator_inventory` e `approved_supplier` são as únicas origens comerciais do contrato; `isSaleableOffer` exige seller aprovado, oferta ativa, preço/quantidade/estoque válidos e vigência. `assertCommercialOrigin` rejeita qualquer origem externa.

## Migração SQL

`db/migrations/0001_marketplace_foundation.sql` permanece draft local com RLS habilitado e sem políticas permissivas. Não foi aplicada a qualquer banco. A estrutura existente foi mantida compatível com os contratos locais de organizações, capacidades e membros; políticas e backend autorizado são pré-requisitos antes de conexão com cliente.

## Admin

`/admin` e `/admin/marketplace` agora fazem bloqueio server-side para `/admin/login`; não expõem mais as métricas demonstrativas como área aberta. O login atual continua sendo uma tela informativa, pois não existe identidade administrativa própria aprovada.

## Testes

- `npm run test:marketplace`: passou.
- `npm run typecheck`: passou.
- `npm run lint`: passou.
- `npm run build`: passou com Webpack, 67 rotas geradas.
- `git diff --check`: passou.

## Pendências que não podem ser inventadas

Identidade própria, banco, RLS testado, MFA, audit log persistente, E2E real, concorrência de estoque, contratos fiscais/financeiros/logísticos e autorização de produção continuam bloqueados até decisão e infraestrutura apropriadas.
