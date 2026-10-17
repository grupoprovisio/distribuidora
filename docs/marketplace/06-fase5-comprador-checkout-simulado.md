# Fase 5 — Comprador, carrinho e checkout simulado

## Entregue

- Contratos locais de linhas de carrinho, snapshots de itens, pedidos e subpedidos por fornecedor.
- Preço progressivo calculado a partir da oferta autorizada vigente.
- Agrupamento automático por `supplierOrgId` em `supplier_orders`.
- Snapshot imutável de produto, SKU, oferta, quantidade e preço no pedido simulado.
- Idempotência por `buyerOrgId` + `idempotencyKey`, retornando o mesmo pedido em retries.
- Rota `POST /api/marketplace/checkout/simulate`, sem cobrança e sem persistência externa.

## Testes

- `npm run test:marketplace`: passou.
- `npm run typecheck`: passou.
- `npm run lint`: passou.
- `npm run build`: ainda condicionado ao acesso a `fonts.googleapis.com` para baixar Manrope.

## Limitações

O checkout é apenas simulação em memória. Ainda não há autenticação de comprador, endereço, aprovação por limite, estoque transacional, frete, pagamento, emissão fiscal ou persistência server-side.

## Próxima fase

Fase 6: portal fornecedor e lifecycle de pedidos/logística em ambiente local, mantendo isolamento entre fornecedores.
