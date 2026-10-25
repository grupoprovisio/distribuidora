# Provisio — Homologação transacional estritamente QA no navegador (25/10/2026)

## Objetivo

Testar o recurso **MARKETPLACE_QA_TRANSACTIONS_ENABLED** com o interruptor comercial
**MARKETPLACE_TRANSACTIONS_ENABLED=false**, sem qualquer dado de cliente real.

Os testes usam somente a instância **local, descartável** Supabase, com usuários
Auth distintos e navegador Chromium/Chrome. O comando `npm run test:e2e`
agora executa ambas as baterias (21 testes gerais + 3 QA), sem precisar
modificar o workflow GitHub existente, que já executa esse comando.

## Comandos de validação

```sh
npm run test:e2e:start
npm run test:e2e
npm run test:e2e:report
npm run test:e2e:stop
```

A configuração `PROVISIO_E2E_QA_SCOPE=true` seleciona apenas a bateria QA,
mantém a flag global em `false`, e liga as três empresas QA criadas pelo
bootstrap local. Fora desse modo, a bateria E2E original continua intacta.

## Casos de aceite

1. Comprador QA A e fornecedores QA A/B podem consultar o console e a API.
   Comprador de outra organização, ADM e identidade com perfis mistos recebem
   503 ao tentar transações QA; anônimo também é negado.
2. Oferta fora das organizações QA não pode ser cotada. Fornecedor B não pode
   responder proposta de A nem confirmar pedido de A. O comprador fora da
   organização QA não pode criar cotação.
3. Comprador QA A envia cotação idempotente, fornecedor A responde,
   comprador faz checkout, fornecedor confirma, reserva exatamente 3 unidades,
   separa, despacha e registra entrega. A confirmação repetida permanece
   idempotente (201 com **uma única reserva**, sem duplicação). Estoque passa
   de 50 disponíveis/0 reservados para 50/3 e depois 47/0. Auditoria logística
   registra quatro eventos. Fornecedor B vê zero pedidos do A.

## Limites explícitos

- A bateria valida browser real **contra Supabase local**, não contra usuários
  hospedados. Usuários QA BUYER e Fornecedor B no Supabase hospedado não têm
  senhas de fixture atuais disponíveis, e suas senhas não foram alteradas.
- A prova positiva de ADM MFA/WebP em Storage hospedado ainda depende de uma
  sessão ADM AAL2 legítima e de uma imagem criada com essa sessão.
- A garantia de RLS e as simulações SQL reversíveis hospedadas são provas
  distintas de E2E HTTP, e não serão rotuladas como login hospedado.
- Nunca liberar `MARKETPLACE_TRANSACTIONS_ENABLED=true` para permitir o
  avanço da QA. As três variáveis QA operam somente nas organizações aprovadas.
- Não emitir pagamentos, notas fiscais ou encomendas reais nos testes QA.

## Evidência desta rodada

Na primeira execução, dois testes passaram. O terceiro revelou que a RPC de
confirmação é **idempotente** (retorna 201 também na repetição). Corrigiu-se o
assert incorreto do novo teste e acrescentou-se prova de que a reserva permanece
em exatamente 3 unidades. Nova execução: **3/3 aprovados**.

A documentação e o CI evidenciam os critérios, mas **não declaram 100% no
ambiente comercial** sem a confirmação completa dos fluxos hospedados.
