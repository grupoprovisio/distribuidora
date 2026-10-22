# Provisio — homologação RFQ e pedidos sem pagamento (19/10/2026)

## Status verificável
Branch: `feat/provisio-rfq-checkout-preview-20261019` / PR #25.
Base dependente: `feat/provisio-frontend-progresso-duas-jornadas-20261019` / PR #24.
Migração SQL versionada: `0016_marketplace_quotes_orders_checkout.sql`. **Não aplicada à base remota.**

### Fluxo implementado no código
1. Comprador aprovado e com região autorizada acessa `/app/comprador/catalogo`, escolhe oferta homologada.
2. Em `/app/comprador/cotacoes?oferta=<uuid>&regiao=BR-SP`, envia cotação real mediante `MARKETPLACE_TRANSACTIONS_ENABLED=true`.
3. Fornecedor titular da oferta consulta `/app/fornecedor/cotacoes` e registra proposta com preço inteiro em centavos e validade.
4. Comprador aceita a proposta válida: checkout cria **solicitação de pedido** com status `awaiting_supplier_confirmation`, idempotente, atômica e sujeita a estoque disponível.
5. Ambos consultam suas próprias solicitações em `/app/comprador/pedidos` e `/app/fornecedor/pedidos`.

Não há carrinho multiproduto, reserva de estoque, confirmação de expedição, integração com adquirente, boletos, Pix, cartão, split de pagamento ou emissão fiscal. É errado afirmar que a venda foi concluída.

### Segurança e migração
- RLS forçada, sem `anon`, sem inserts diretos do navegador, sem chave service role.
- RPC `security invoker` exposta chama lógica transacional privada que exige sessão real, perfis/empresas/capacidades aprovados e papel autorizado.
- Região empresarial é verificada no banco, não no texto digitado.
- Pedido, proposta e cotação com verificação cruzada de IDs e organização. Propostas expiram.
- Idempotência bloqueia repetição e conflito; produto de fornecedor externo VTEX não é elegível.
- Todas as operações transacionais **falham fechadas** se a flag não estiver habilitada.
- **Não habilitar flag antes de aplicar e validar migration em Preview isolado.**

## Validação CI (PostgreSQL 17 descartável)
O job `database-rls` aplica migrações 0001–0016 e executa `scripts/sql-test/marketplace-transactional.sql` ao fim das suítes anteriores:
- cliente autorizado solicita RFQ duas vezes com uma chave e recebe somente um registro;
- fornecedor de outra empresa não pode listar ou responder RFQ;
- fornecedor legítimo propõe preço;
- comprador cria apenas uma solicitação, com total em centavos;
- nenhum pagamento ou reserva ocorre;
- revogação de vínculo impede leitura e repetição do checkout;
- usuário anônimo não lê registros nem chama RPC.
O job `validate` executa TypeScript, lint, build, domínios e autorização sem credenciais reais.

## Gate de Preview autenticado (PENDENTE)
O acesso ao projeto `grupoprovisio/distribuidora` pela Vercel continua retornando HTTP 403 no escopo `grupoprovisio` com ambas as conexões. Não substituir pelo escopo pessoal. Para liberar homologação:
1. Conceder à conexão Vercel acesso ao **time grupoprovisio** e ao projeto **distribuidora**, verificando no dashboard da equipe.
2. Identificar deployment Preview correspondente ao SHA do PR #25 e confirmar as variáveis `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `MARKETPLACE_AUTH_ENABLED` e `MARKETPLACE_TRANSACTIONS_ENABLED`. Nenhuma variável secreta no navegador.
3. Preparar banco de homologação isolado (ramificação Supabase paga SOMENTE com aprovação de custo, ou base de teste descartável) com migrações 0001–0016, usuários e organizações piloto aprovados sem usar documentos fiscais fictícios como se fossem reais.
4. Fazer login autenticado no Preview com comprador A, fornecedor A, fornecedor B e operador de plataforma com MFA AAL2, incluindo confirmação de templates e callback de e-mail.
5. Validar RFQ, resposta, checkout de solicitação e listagem. Confirmar 401/403 sem login, sem permissão, fornecedor B tentando RFQ de A, região sem autorização, oferta suspensa/expirada, tentativa de repetição, sessão revogada e CPF/CNPJ não inventados.
6. Capturar evidências sem segredos nem dados pessoais, revisar segurança, aplicar política de ativação gradual e só então discutir o merge e eventual publicação.

## Próximo backend (ainda NÃO implementado)
Confirmação ou rejeição de pedido pelo fornecedor; reserva e baixa transacional de estoque; carrinho com múltiplos fornecedores; frete/logística e janelas; gateway de pagamento e webhooks assinados; idempotência do provedor; tratamento de estornos/chargebacks; impostos/emissão fiscal; reconciliação financeira. Cada mudança precisa de RLS, limites monetários e testes independentes.
