# Stripe Checkout

As páginas /checkout, /checkout/sucesso e /checkout/cancelado e o endpoint /api/checkout estão preparados para o Stripe Checkout hospedado.

Configure somente no ambiente da Vercel:

- STRIPE_SECRET_KEY: chave secreta rotacionada, nunca commitada.
- STRIPE_PRICE_ID: Price ID do produto homologado.
- STRIPE_INTEGRATION_IDENTIFIER: identificador opcional.
- STRIPE_CHECKOUT_ENABLED=true: habilita o endpoint.
- MARKETPLACE_TRANSACTIONS_ENABLED=true: segunda trava exigida pelo marketplace.

A Stripe Checkout hospedada mostra os meios de pagamento habilitados na conta. Antes de habilitar produção, configure um webhook para confirmar o pagamento e persistir o pedido de forma idempotente. A página de sucesso não substitui webhook.
