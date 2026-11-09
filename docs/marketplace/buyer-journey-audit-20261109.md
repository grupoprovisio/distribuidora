# Comprador — rodada isolada de segurança e fluxo (2026-11-09)

## Alterações nesta branch

- Catálogo, cesta e cadastro não selecionam silenciosamente a primeira empresa quando existem múltiplas organizações autorizadas. O ID da empresa é conferido contra a sessão e preservado nas rotas principais.
- O Checkout monta os itens a partir dos valores unitários revalidados no servidor. Deixou de multiplicar um Price ID fixo por todas as unidades, comportamento que poderia cobrar montantes incorretos.
- Checkout com entrega fica explicitamente bloqueado até haver cálculo de frete **no servidor** e inclusão desse valor no total enviado à Stripe. Retirada continua sujeita às flags comerciais e demais regras.
- Os meios de pagamento elegíveis ficam sob o gerenciamento dinâmico da Stripe, sem forçar `payment_method_types`. Pix/boleto exigem testes da conta, processamento assíncrono e confirmação de webhooks antes da liberação.
- Webhook assinado responde erro transitório quando não consegue persistir um pagamento confirmado. A Stripe poderá reenviar o evento, evitando confirmação silenciosamente perdida.

## Pendências / bloqueios da homologação completa

1. Executar `npm ci`, `npm run lint`, `npm run typecheck`, `npm run test:marketplace`, `npm run test:frontend-scope`, `npm run test:supabase-foundation`, `npm run build`, `npm audit --omit=dev --audit-level=high`, e suíte E2E na CI do PR.
2. Confirmar em ambiente de teste duas empresas do mesmo comprador e uma empresa de terceiro, inspecionando seleção, acesso cruzado e políticas RLS.
3. Homologar cálculo server-side de frete, comparação de valor final do pedido com o checkout, estoque e idempotência sob concorrência.
4. Stripe: autenticar conta de teste, inspecionar meios elegíveis BRL, simular cartão/Pix/boleto, expiração, falha, cancelamento, reenvio de eventos e eventos fora de ordem. Verificar a conciliação com o pedido e a situação financeira.
5. Unificar solicitações, propostas e pedidos nas visualizações de todas as empresas autorizadas; hoje as consultas e os componentes não compartilham a mesma seleção.
6. Implementar gestão segura de múltiplos endereços no Supabase (RLS/índice/validação), e verificação de CEP sem sobrescrever endereços existentes.
7. Documentos fiscais: provisionar armazenamento privado e URL temporária de XML/DANFE **somente após** autorização da SEFAZ, com auditoria de acesso, sem entregar arquivos de outras empresas.
8. Suporte: vincular protocolo, solicitação e pedido, com contatos e histórico interno adequadamente autorizados.

## Não executar em produção

Esta branch não realiza merge, deploy nem migração em produção. Os itens acima são requisitos para declarar a jornada comercial totalmente homologada.
