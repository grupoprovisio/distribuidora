# Grupo Provisio — operação de pedidos e reservas (20/10/2026)

## Escopo em implementação
Perfil público e portal: **Sou comprador** + **Sou fornecedor**. Não existem fluxos comerciais de Sou vendedor.
Base: PR #25 `feat/provisio-rfq-checkout-preview-20261019`; mudança atual: PR #27 `feat/provisio-fulfillment-reservas-20261019`.

### Jornada de pedido codificada (não homologada no ambiente remoto)
1. Comprador autorizado em região previamente aprovada solicita cotação de uma oferta real.
2. Fornecedor autorizado responde com proposta e validade.
3. Comprador aceita e cria solicitação de pedido (`awaiting_supplier_confirmation`), sem debitar estoque.
4. Fornecedor responsável confirma: a RPC `marketplace_transition_order` verifica oferta, estoque, vínculo comprador e fornecedor, bloqueia linha de estoque e **reserva a quantidade** no mesmo comando SQL.
5. Fornecedor também pode recusar antes da confirmação, ou cancelar depois da confirmação: reserva é liberada atomically. Comprador pode cancelar enquanto a solicitação está pendente.
6. Toda transição registra evento em `marketplace_private.order_transition_audit`, sem acesso direto por usuários do site.

A confirmação significa aceite comercial e separação de quantidade em reserva: **não significa pagamento, nota fiscal, expedição, entrega concluída ou faturamento**.

## Proteções
- Acesso de usuários autenticados verificado em servidor e Postgres; nenhum papel comercial adicional.
- Isolamento por empresas, papel, capacidade, vínculo, sessão ativa e UF autorizada.
- RPC pública `security invoker`, função de negócio privada e `SECURITY DEFINER` com caminho de busca restrito.
- Especificamente na confirmação, PostgreSQL tranca posição de estoque (`FOR UPDATE`) e exige saldo disponível. `reserved_quantity <= available_quantity`.
- Repetições da mesma transição não geram nova reserva nem devolução duplicada.
- Quando uma operação falha, a transação é revertida sem parcialidade.
- Sem `service_role` no navegador, sem grants de escrita direta em tabelas e sem dados de fornecedores externos VTEX.
- A flag `MARKETPLACE_TRANSACTIONS_ENABLED` permanece **desligada por padrão**.

## Testes
No CI, o PostgreSQL 17 descartável aplica migrações 0001–0017 e executa `marketplace-transactional.sql` e `marketplace-fulfillment.sql`. Os testes cobrem isolamento, permissões, idempotência, confirmação, cancelamento, liberação, rejeição e falta de estoque entre checkout e aceite. O workflow verifica também TypeScript, ESLint, build Next.js e endpoint transacional bloqueado quando a flag está desligada.

## Estado de publicação e limitações
- Nenhuma migração 0016 ou 0017 aplicada ao Supabase `xprvdquocenfqvnokmmi` (última migration remota 0015 na consulta de 20/10/2026).
- Sem contas piloto/organizações autenticadas, MFA real e configuração Preview; não executar SQL com identidades empresariais inventadas.
- Vercel responde HTTP 403 ao escopo `grupoprovisio` com ambas as conexões. CLI Vercel não disponível neste ambiente; sem inspeção de Preview.
- Não executar merge nem deploy enquanto a validação humana e segurança estiverem pendentes.
- Sem gateway de pagamentos, emissão fiscal, carrinho multiproduto, logística e confirmação de entrega. Essas frentes dependem de requisitos comerciais, jurídicos e serviços externos.

## Progresso versionado
**84/100 pontos estimados** de implementação em código (antes: 80). Esta avaliação não constitui 84% de funcionamento em produção nem comprova testes E2E autenticados. Os pontos restantes permanecem visíveis em `/admin/marketplace/progresso`.

## Gates mínimos antes do GO
1. Reestabelecer acesso da conexão Vercel à equipe `grupoprovisio` e conferir deployment Preview do commit exato.
2. Providenciar base de homologação segregada, política fiscal/comercial e contas comprador/fornecedor reais com MFA para administração.
3. Aplicar migrações 0016 e 0017 **somente na homologação**, rodar advisors e verificar políticas, grants, triggers, auditoria e rollback.
4. Executar E2E: comprador solicita, fornecedor propõe, comprador envia pedido, fornecedor aceita, reserva registrada, cancelamento libera; testar empresas diferentes, sessão revogada, falta de saldo e requisições duplicadas.
5. Validar UI mobile, e-mails e fluxos comerciais, documentar resultado humano e habilitar flag somente no Preview.
6. Liberar transações financeiras ou produção apenas após gateway, antifraude, conciliação, emissão fiscal e observabilidade revisados, mediante autorização separada.
