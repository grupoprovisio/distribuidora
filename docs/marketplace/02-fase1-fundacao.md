# Fase 1 — Fundação de domínio e desativação planejada

## Implementado

- `lib/marketplace/catalog.ts`: contratos de organização, produto mestre, SKU de fornecedor, oferta, tiers e repositório autorizado em memória.
- `isOfferSellable`: exige organização aprovada, produto ativo, oferta aprovada, vigência válida, preço/quantidade válidos e fonte autorizada.
- Fontes externas (`ATACADAO_EXTERNAL`, `VTEX_SCRAPE`, `UNVERIFIED_EXTERNAL`) são tipos explícitos, mas não pertencem ao conjunto vendável.
- Fixture local fictícia de distribuidora própria (`PLATFORM_STOCK`), sem preço ou dado obtido de rede.
- `app/api/marketplace/catalog`: contrato interno isolado; devolve lista vazia quando `MARKETPLACE_CATALOG_ENABLED` não é `true`.
- Flags `MARKETPLACE_CATALOG_ENABLED`, `MARKETPLACE_CHECKOUT_SIMULATION` e `MARKETPLACE_PUBLIC_SIGNUP`, todas desligadas por padrão.
- `scripts/marketplace-domain-check.mjs`: teste negativo mínimo de fontes externas e default seguro da flag.

## Testes

- `npm run test:marketplace`: passou.
- `npm run typecheck`: passou.
- `npm run lint`: passou.
- `npm run build`: bloqueado pela indisponibilidade de `fonts.googleapis.com` ao baixar Manrope via `next/font`; não é falha do domínio marketplace.
- `git diff --check`: passou.
- Verificação de fonte na nova superfície: nenhum `fetch`, `atacadao` ou `vtex` em `app/api/marketplace`, `lib/marketplace` ou no teste.

## Limitações conscientes

O repositório em memória é somente fundação local/teste. Não há banco, autenticação própria, isolamento de tenant, cobrança, estoque transacional ou checkout. Nenhuma flag foi ativada e nenhum endpoint legado foi removido nesta etapa para preservar rollback.

## Próxima fase

Implementar as landings `/compradores`, `/vendedores` e `/fornecedores`, com formulários não comerciais e conteúdo sem métricas inventadas. Antes de ativar cadastro, será necessário backend seguro e tratamento de consentimento/LGPD.
