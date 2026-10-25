# Provisio — matriz integrada de homologacao e seguranca (24/10/2026)

## Escopo e seguranca
- Jornadas comerciais: somente Sou Fornecedor e Sou Comprador. ADM e uma area interna; nunca recriar Sou Vendedor.
- Producao: nao ativar MARKETPLACE_TRANSACTIONS_ENABLED sem evidencias HTTP assinadas, MFA AAL2 real no ADM e validacao das politicas RLS. Nenhuma compra, cobranca ou movimentacao de estoque real para QA.
- Este documento e um roteiro verificavel, nao um atestado de homologacao. Nao guardar senhas, JWTs, codigos MFA ou chaves neste repositorio.
- Estado observado via Supabase em 24/10/2026: 19/19 tabelas publicas com RLS, 1 produto, 1 oferta aprovada, 1 registro de estoque, 0 faixas de preco, 0 cotacoes, 0 pedidos, 0 entregas e 0 imagens. Contagens nao equivalem a validacao funcional.

## Matriz de aceite e evidencias obrigatorias
| Frente | Cenario obrigatorio | Evidencia para aprovar |
| --- | --- | --- |
| P0 Fornecedor | A e B autenticam em sessoes independentes, com empresas distintas e sem poderes ADM | Requisicoes HTTP separadas; cada um le apenas SKUs/estoque/pedidos proprios; IDOR por URL/ID negado |
| P1 Comprador | BUYER com org ativa consulta catalogo de sua regiao | Apenas ofertas aprovadas, vigentes, autorizadas e elegiveis; nenhum pedido de outra organizacao |
| P1 Cotacoes | BUYER cria RFQ; fornecedor elegivel recebe e responde; comprador aceita proposta valida | Status corretos, autorizacao por organizacao, validade, audit trail, expiracao e retries sem duplicata |
| P1 Pedidos/reservas | Confirmacao da proposta cria pedido e reserva atomica | Idempotencia comprovada em duas tentativas; concorrencia controlada; cancelamento libera reserva |
| P2 Logistica | Fornecedor autorizado separa, expede e marca entrega | Sequencia de status valida; negacao de transicao fora de ordem; auditoria imutavel; nenhuma entrega de outro tenant |
| P0 ADM e imagens | Administrador real com MFA AAL2 aprova cadastro e envia WebP | Confirmacao AAL2 + operacao HTTP; objeto privado <= 5 MB; vinculo em product_images; comprador elegivel acessa, demais nao |
| P1 Precos | Oferta autorizada tem escalas crescentes de quantidade | Persistencia e leitura de offer_price_tiers; limites nao sobrepostos, preco em centavos, preco aplicado conforme quantidade |

## Consultas somente leitura para revisao
Executar com conexao administrativa **somente para inventario**, nunca como substituto de JWT de usuario final:

```sql
select count(*) total, count(*) filter(where rowsecurity) com_rls
from pg_tables where schemaname = 'public';

select 'products' area, count(*) n from public.products
union all select 'offers_approved', count(*) from public.offers where status='approved'
union all select 'price_tiers', count(*) from public.offer_price_tiers
union all select 'images', count(*) from public.product_images
union all select 'quotes', count(*) from public.quote_requests
union all select 'proposals', count(*) from public.quote_proposals
union all select 'orders', count(*) from public.purchase_orders
union all select 'fulfillments', count(*) from public.order_fulfillments;

select name, public, file_size_limit, allowed_mime_types
from storage.buckets where id='provisio-produtos';
```

## Condicoes de bloqueio (fail closed)
1. Sem quatro sessoes independentes comprovadas, nao marcar testes hospedados como concluidos.
2. Sem AAL2 real, nao aprovar oferta, alterar status administrativo nem substituir validacao por SQL privilegiado.
3. Sem WebP persistido e recuperado por autorizacao correta, nao marcar Storage como homologado.
4. Sem RFQ -> proposta -> pedido -> reserva -> entrega e retries sobre APIs reais, nao ativar transacoes.
5. Nao promover para main ou production apenas porque suites locais ou SQL com ROLLBACK passaram.
6. Manter porcentagens de implementacao/testes/producao separadas; aumentar somente com links de runs e casos assinados.

## Avisos de seguranca conhecidos
- Leaked password protection aparece desativada; consultar suporte/planos do Supabase, sem ativacao/custo implicito.
- catalog_audit e fulfillment_audit estao no schema privado, com RLS e sem policy. Verificar grants e chamadas especificas antes de concluir que e vulnerabilidade; nao abrir SELECT generico.
- Chaves secretas e service_role nunca devem ir a NEXT_PUBLIC_ nem ser usadas no browser.

## Checklist de fechamento
Registrar por cenario: ambiente, SHA, identidade *anonimizada*, requisicao/resposta sem tokens, resultado esperado/obtido, log auditavel, data e responsavel. Fechar somente apos teste negativo (cross-tenant, sem MFA, sem elegibilidade, token expirado) e positivo na mesma revisao.
