# Fase 4 — Catálogo próprio e ofertas de fornecedores

## Entregue

- Contratos anteriores suportam produto mestre, SKU de fornecedor, oferta, preço em centavos, tiers, regiões e vigência.
- Criado parser de CSV com prévia, colunas obrigatórias, validação de unidade, preço, quantidade, região e duplicidade.
- Apenas `SUPPLIER_CSV_AUTHORIZED`, `MANUAL_AUTHORIZED` e `PLATFORM_STOCK` são aceitos na prévia.
- Criada rota local `POST /api/marketplace/catalog/import` que valida tamanho e devolve prévia; não persiste nem publica.
- A distribuidora própria permanece representada por `PLATFORM_STOCK` no fixture do catálogo.

## Testes

- `npm run test:marketplace`: passou.
- `npm run typecheck`: passou.
- `npm run lint`: passou.
- `npm run build`: bloqueado pela indisponibilidade de `fonts.googleapis.com` para `next/font`.

## Segurança e fonte

Nenhum CSV é convertido automaticamente em oferta publicada. A rota é somente preview e ainda não possui autenticação/tenant real; portanto não está apta para uso comercial. Dados VTEX/Atacadão não têm caminho de importação.

## Próxima fase

Fase 5: portal comprador, cotação, carrinho multi-seller e checkout simulado com snapshots e idempotência, sem cobrança real.
