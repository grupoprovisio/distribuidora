# Fases 6–8 — Operação, vendedor e sandbox financeiro

## Entregue

### Fase 6

- Máquina de estados de subpedido: aceite, recusa, separação, expedição, entrega parcial, entrega e cancelamento.
- Transições inválidas são rejeitadas.
- O ator precisa ser a organização fornecedora do subpedido; fornecedor concorrente não pode operar o pedido.
- Eventos carregam ator, data e observação para futura trilha de auditoria.

### Fase 7

- Ledger de comissão append-only com lançamentos de acréscimo, estorno e pagamento.
- Estorno gera lançamento compensatório referenciando o lançamento original.
- Não há edição destrutiva nem promessa de ganhos.

### Fase 8

- Interface `PaymentProviderSandbox` e implementação `NoopPaymentProviderSandbox`.
- Deduplicação de eventos por `(provider,eventId)`.
- Nenhuma cobrança, webhook externo, repasse ou credencial live foi configurado.

## Testes

- `npm run test:marketplace`: passou.
- `npm run typecheck`: passou.
- `npm run lint`: passou.
- Testes anteriores das Fases 1–5 continuam executados pelo mesmo comando.

## Bloqueios

A máquina de estados e o ledger ainda são contratos locais; falta persistência transacional, autorização real, audit log append-only, assinatura criptográfica de webhook, regras contratuais de comissão e validação fiscal/jurídica.

## Próximo passo

Fase 9: homologação local/pré-produção, matriz de regressão, segurança tenant, documentação de release e relatório GO/NO-GO. Não publicar sem aprovação explícita.
