# Front-end comprador e fornecedor — 17/10/2026

## Escopo executado na branch isolada

Branch: `feat/b2b-comprador-fornecedor-frontend-20261017`.

- Removido perfil de vendedor das páginas públicas, menu, sitemap, redirecionamentos e portais.
- Revogada a atribuição do papel `SELLER` na interface administrativa; dados históricos e migrations não foram destruídos.
- Homepage institucional reorganizada em duas jornadas.
- Páginas públicas com benefícios, etapas, FAQ e contato honesto via rascunho de e-mail.
- Painéis privados exibem organizações autorizadas a partir de Supabase/RLS.
- Catálogo privado do fornecedor: listagem somente leitura com busca local, estado vazio, situação e preços de ofertas aprovadas **de origem autorizada**.
- Operação do fornecedor: regiões vinculadas e disponibilidade agregada, sem gravar reservas ou entregas.
- Homologação: empresas, capacidades, produtos e ofertas por fornecedor autorizado.
- Rotas antigas de catálogo VTEX/Atacadão redirecionadas; APIs legadas bloqueadas (HTTP 410), com teste de regressão.
- UI móvel: navegação com foco e retorno de foco melhorados.
- Testes de escopo executados em GitHub Actions na branch; ver conclusões na interface de CI.

## Garantias e limites

- Nenhum comando de banco foi executado para modificar linhas, tabelas ou políticas nesta frente.
- Nenhum cadastro, pedido, compra, pagamento ou alteração de estoque foi ativado.
- A RLS existente governa leituras; a interface não eleva privilégios.
- A base Supabase foi consultada em leitura: tabelas operacionais existem, mas sem organizações, produtos ou ofertas na data desta auditoria.
- As listagens usam limites e filtros de interface; antes de escala comercial, adicionar paginação e totalização segura no servidor.
- O acesso direto ao projeto na Vercel ainda não foi necessário para estas alterações.
- Não houve merge para `main` nem deploy comandado.

## Próximas entregas recomendadas

1. Validar build, typecheck, lint, escopo e RLS em GitHub Actions.
2. Criar conta/organização piloto e validar as jornadas com autenticação e MFA em ambiente de homologação, nunca usando dados de terceiros.
3. Introduzir backend de ofertas aprovadas para compradores com RLS próprio e testes cross-tenant; **não** abrir SELECT geral nas tabelas de fornecedores.
4. Reavaliar formulários públicos e implementar captura segura após definição de LGPD, consentimento e operação de atendimento.
5. Implementar CRUD interno de produtos e ofertas com permissões de escrita explícitas; não usar conteúdo do comparador aposentado.
6. Só então projetar cotação, checkout, pedidos, logística, financeiro e repasses, com homologação comercial.

## Critérios de validação

- Homepage e rodapé com apenas Comprador e Fornecedor.
- URLs antigas não exibem catálogo externo nem comunicam sucesso fictício.
- Testes contra privilégios entre fornecedores e compradores.
- No caso de catálogo vazio, mensagem correta sem preços ou SKUs fictícios.
- Fluxos públicos e privados responsivos em mobile e desktop.
