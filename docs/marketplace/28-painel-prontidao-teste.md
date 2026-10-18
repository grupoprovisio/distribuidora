# Painel de prontidão para testes — 18/10/2026

## Rota
`/admin/marketplace/prontidao`, protegida por `/admin/layout.tsx` (usuário PLATFORM_ADMIN, organização operadora, sessão ativa e MFA AAL2).

## Indicadores reais e limites
Nove verificações RLS para: organização operadora, empresa compradora aprovada, capacidade de comprador, capacidade de fornecedor, produtos ativos, SKUs homologados, estoque com quantidade positiva, ofertas homologadas na validade e regiões autorizadas.

A contagem funciona como **checklist de pré-requisitos**; **não é uma percentagem de funcionamento de todo o marketplace**. A disponibilidade efetiva ainda depende de ofertas compatíveis com estoque, vínculo e região, e de teste humano autenticado. A rota não cria registros, não altera políticas e não permite pedidos ou pagamentos.

Quando qualquer query falha, a página oculta todos os indicadores (fail closed). Os controles de navegação levam apenas a operações administrativas já existentes. Nenhuma mudança no layout/textos/cards/imagens das páginas públicas.
