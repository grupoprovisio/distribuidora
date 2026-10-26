# Provisio — Homologação persistida no Supabase Free (25/10/2026, BRT)

## Decisão de custo e segurança
O projeto continua no Supabase Free, sem exigir upgrade para esta fase de testes.
O lint `auth_leaked_password_protection` continua sendo um risco documentado
(disponível no plano Pro), não um item concluído ou um impeditivo para QA.
Antes de abrir vendas e cadastrar clientes comerciais, reavaliar controles de
senha, prevenção de vazamentos, antifraude, cobrança, documentos fiscais,
retenção, backups e observabilidade. O alerta não deve ser ocultado.

A flag `MARKETPLACE_TRANSACTIONS_ENABLED=false` permanece desligada.
A flag `MARKETPLACE_QA_TRANSACTIONS_ENABLED=true` limita o fluxo a um único
comprador e dois fornecedores QA autorizados. Só existem os perfis comerciais
Sou Comprador e Sou Fornecedor; ADM é governança interna.

## Evidências verificadas no banco hospedado
Foi criada uma transação PostgreSQL **COMMIT** com contexto de autenticação
controlado, exclusivamente entre o Comprador QA e o Fornecedor A. A operação:
1. Criou 1 cotação e 1 proposta;
2. Criou 1 pedido de teste com chave idempotente;
3. Confirmou e reservou 3 unidades exatamente uma vez;
4. Executou Separação → Faturamento interno (sem nota fiscal) → Expedição →
   Entrega manual;
5. Confirmou 4 eventos de auditoria logística e 1 transição do pedido;
6. Provou que Fornecedor B não lê nem confirma pedido alheio.

Uma consulta em sessão **separada após COMMIT** encontrou 1 cotação, 1
proposta, 1 pedido confirmado e 1 entrega registrada. O estoque disponível
da organização QA mudou de 20 para 17, com 0 reservado. As organizações não
QA continuaram com **0 cotação comercial** e **0 pedido comercial**.

Essa prova **NÃO É** fluxo HTTP hospedado com três sessões assinadas: os claims
foram simulados no contexto SQL, embora referenciem sessões Auth válidas
existentes. Não confundir com evidência de browser ou cobrança real.

## Painel administrativo
A migração 0028 adiciona políticas de SELECT para transações **QA-only**,
exclusivas a `PLATFORM_ADMIN` com sessão ativa e MFA AAL2, usando
`marketplace_private.is_verified_platform_admin()`. Não concede
leitura de negociações comerciais, INSERT, UPDATE ou DELETE ao ADM.

O painel `/admin/marketplace/progresso` mostra contagens QA ao vivo e
um termômetro de **persistência SQL (0–100%)** separado do avanço geral e
do aceite HTTP hospedado. Se a consulta falhar, informa indisponibilidade,
não zero fictício nem porcentagem inventada.

## Reclassificação conservadora do progresso
Com persistência QA no Supabase hospedado, a dimensão "produção" de
Cotações, Pedidos e Logística avança de 0 para 1 checkpoint de 4.
Logística (código) avança de 2 para 3 checkpoints, pela implementação
completa das etapas internas, sem transportadora nem emissão fiscal.
O progresso geral estimado passa de 71% para **73%**:
implementação 84%, testes 83%, evidência em produção 41%.
A prova HTTP por identidades reais e o módulo fiscal/financeiro seguem pendentes.

## Próximos gates
- Login HTTP real e separado de Comprador QA, Fornecedor A, Fornecedor B
  e ADM MFA, sem exigir quatro janelas permanentes.
- Upload WebP privado e preços progressivos/administrados no ambiente hospedado.
- Fluxo HTTP persistido completo, incluindo negações RLS e auditoria, com
  registros QA e sem pagamento.
- Revisão de taxas/obrigações fiscais antes de qualquer venda comercial.

Fontes: migrações 0026–0028, suites SQL e E2E locais, consultas hospedadas
com evidência post-COMMIT, e auditoria Supabase. Nenhum segredo foi exportado.
