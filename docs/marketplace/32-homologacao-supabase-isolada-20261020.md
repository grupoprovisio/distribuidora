# Provisio — homologação isolada das migrações 0016–0017 (20/10/2026)

## Objetivo e limite
Concluir a validação de cotações (RFQ), propostas, solicitações de pedido, confirmação do fornecedor e reserva/cancelamento atômico de estoque **sem alterar a instância principal** `xprvdquocenfqvnokmmi`.

### Constatações obtidas via MCP Supabase (somente leitura, 20/10/2026)
- Organização: `Grupo Provisio`, id `unbpkqgxzzidrkebwtay`, plano Free.
- Instância única: `xprvdquocenfqvnokmmi`, PostgreSQL 17, ativa, migrações remotas 0001–0015 (mais correção inicial de privilégios).
- `list_branches`: nenhuma branch Supabase.
- `to_regclass`: `public.quote_requests`, `public.purchase_orders`, `marketplace_private.order_transition_audit` ausentes.
- 9/9 tabelas-base relevantes presentes; 3/3 funções privadas necessárias presentes.
- RLS habilitado e forçado em `offers`, `inventory_positions` e `buyer_delivery_regions`.
- Nenhuma posição de estoque com `reserved_quantity > available_quantity` ou quantidades negativas.
- Advisor de segurança: `catalog_audit` intencionalmente sem policy (schema privado, confirmar sem Data API); aviso de proteção de senha vazada desativada (plano Free). Nenhum outro aviso retornado na consulta desta data.
- Custo da branch Supabase cotado: US$ 0,01344/h, exigindo consentimento financeiro.
- Custo de novo projeto na organização cotado: US$ 0/mês (respeitar cotas Free).
- Tentativa de criar novo projeto gratuito: **bloqueada pela camada de segurança da conexão**. Não criado; nenhuma migração aplicada ao principal.

## Validação isolada que JÁ passou
CI GitHub Actions [run 39415566132](https://github.com/grupoprovisio/distribuidora/actions/runs/39415566132), commit `8ce7b4f0`, nos jobs `validate` e `database-rls`:
1. PostgreSQL 17 descartável, criação de esquema de bootstrap próprio.
2. Aplicação serial das migrações `0001`–`0017` sem dependência de credenciais remotas.
3. Testes de RLS, isolamento multiempresa, acesso administrativo e restrições de capacidade.
4. RFQ, resposta de fornecedor, conversão em solicitação de pedido, idempotência e bloqueio de tentativa entre empresas.
5. Confirmação do fornecedor com estoque reservado, cancelamento sem reserva duplicada e recusa.
6. Falta de estoque após checkout, cancelamento pelo comprador e impossibilidade de confirmar pedido cancelado.
7. TypeScript, lint, build Next.js, verificações de autenticação, smoke de transações desativadas por padrão.

**Limitação:** banco PostgreSQL descartável do CI não substitui projeto Supabase Auth/REST reais com contas, callbacks de e-mail, cookies e deploy Preview.

## Destino da homologação remota (a criar manualmente enquanto a API estiver bloqueada)
Pelo [Dashboard do Supabase](https://supabase.com/dashboard), selecionar **Grupo Provisio** e **New project**, criar segundo projeto Free com nome claro, como `Provisio Homologacao B2B`, sem copiar usuários nem dados reais do principal. Confirmar no próprio painel se a opção permanece gratuita, antes de finalizar. Não criar uma branch paga nem fazer upgrade sem autorização específica.

Após criado, identificar o novo `project_ref` por `list_projects` e comprovar que **é diferente de `xprvdquocenfqvnokmmi`** antes de qualquer ação. Nunca enviar segredo do banco ou `service_role` em mensagens, GitHub, logs ou variáveis públicas.

## Procedimento técnico para o projeto isolado
1. Confirmar projeto isolado `ACTIVE_HEALTHY`, organização correta e Postgres 17.
2. Replicar somente esquema/migrações validadas `0001`–`0015`, depois `0016_marketplace_quotes_orders_checkout.sql` e `0017_marketplace_supplier_order_confirmation.sql`, na ordem; usar ferramenta de migração com histórico e logs.
3. Aplicar somente dentro da **nova instância**; não usar `project_id=xprvdquocenfqvnokmmi` nos comandos de escrita.
4. Confirmar existência/colunas/grants de `quote_requests`, `quote_proposals`, `purchase_orders` e `marketplace_private.order_transition_audit`; verificar ENABLE/FORCE RLS e ausência de escritas diretas via `authenticated`.
5. Rodar advisors de segurança/performance e teste SQL de superfície exposta com perfis `anon`, `authenticated` e organizações distintas; validar permissões de RPC e sessões Auth reais em Preview.
6. Criar identidades de teste sem documentos fiscais inventados como reais e sem clonar dados pessoais. Simular comprador autorizado, fornecedor A e fornecedor B.
7. Executar RFQ → proposta → checkout pendente → confirmação pelo fornecedor A → reserva exata → cancelamento → devolução única de reserva, e testes negativos (fornecedor B, sessão revogada, região não autorizada, falta de estoque e chamadas repetidas).
8. Somente depois alterar variáveis **de Preview** no projeto Vercel `prj_rKVD2mtGA89wv3G3GvIbMA00NF8F`: URL e chave **publishable do novo projeto**, nunca `service_role`; habilitar autenticacão e gateway quando os testes estiverem prontos. Manter `MARKETPLACE_TRANSACTIONS_ENABLED=false` até fim da homologação. Verificar callback e e-mail.
9. Registrar evidências com data, ambiente, commit, build, resultado dos testes e NO-GO/GO. Destruir os fixtures ao concluir.

## Gates de segurança
- Nunca aplicar 0016–0017 no banco principal para contornar a criação bloqueada.
- Nunca usar documentos fiscais fictícios para simular clientes reais ou contratos.
- Não disparar pagamentos, emitir notas, aceitar pedidos em produção ou migrar domínio durante homologação.
- Não promover merge/deploy à produção sem revisão de PR #24 → #25 → #27, RLS e testes Preview autenticados.
- A flag `MARKETPLACE_TRANSACTIONS_ENABLED` já foi criada com valor `false` somente no ambiente Vercel Preview.
