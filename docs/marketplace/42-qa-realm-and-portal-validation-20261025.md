# Provisio — QA sem modo Work e integridade do ambiente comercial

## Motivo
A homologacao B2B deve evoluir sem exigir que o usuario mantenha quatro
perfis do navegador abertos. No codigo, os testes Playwright usam contextos
independentes e credenciais descartaveis do Supabase LOCAL. No site hospedado,
a prova de HTTP persistido so pode ser declarada quando se usa login real,
sem simular JWT nem contar rollback SQL como requisicao HTTP autenticada.

## Correcoes desta entrega
1. O painel privado do comprador e do fornecedor mostra se o modo QA esta
   habilitado para a identidade atual. Se a conta comercial nao esta habilitada,
   o painel mantem a indicacao de homologacao pendente.
2. Os testes do navegador cobrem a indicacao QA e a ausencia dela para uma
   compradora comercial.
3. A migracao 0027 cria gatilhos antes de inserir ou alterar cotações e pedidos.
   O comprador e o fornecedor de cada transacao precisam ter o mesmo valor
   de organizations.qa_only e o fornecedor precisa ser o proprietario da oferta.
   Pedidos precisam referenciar cotacao do mesmo comprador, fornecedor e oferta.
4. O novo teste adversarial cobre contas vinculadas simultaneamente a uma
   organizacao compradora QA e a outra comercial, inclusive via RPC direta.
   Esse caso nao pode contornar RLS nem reutilizar o perfil QA para gravar
   operacao com organizacao comercial.

## Evidencias tecnicas
- Antes da migracao 0027, uma simulacao SQL no banco hospedado, sob BEGIN/
  ROLLBACK, aceitou uma cotacao com BUYER comercial e oferta QA ao adicionar
  temporariamente um segundo vinculo a identidade de testes. A cotacao nunca
  persistiu; a transacao completa foi revertida.
- O teste automatizado exige rejeicao 22023 para o caso misto e bloqueio
  no INSERT de pedidos com realm inconsistente.
- A migracao NAO modifica registros existentes, perfis, sites publicos,
  segredos ou permissoes comerciais. Preflight interrompe caso encontre
  negociacao historica entre realms incompatíveis.
- MARKETPLACE_TRANSACTIONS_ENABLED deve permanecer false e
  MARKETPLACE_QA_TRANSACTIONS_ENABLED so habilita as tres empresas QA listadas.

## Limites declarados
CI local com sessao assinada e navegador real nao substitui login HTTP do
comprador QA hospedado. Nenhuma evidencia SQL, reversivel ou persistida, deve
ser rotulada como teste HTTP hospedado ou como liberacao comercial.
