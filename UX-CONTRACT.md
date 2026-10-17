# UX Contract — Grupo Provisio

## Escopo
Site público com dois perfis: comprador e fornecedor. Rotas canônicas `/compradores` e `/fornecedores`; `/vendedores` não existe no novo escopo. Painéis próprios `/app/comprador` e `/app/fornecedor` permanecem sujeitos à autenticação e autorização do servidor.

## Navegação e estados
- Header, footer e navegação flutuante usam `lib/nav.ts` e links de origem próprios; as páginas públicas não devem publicar links de vendedor.
- Ações de navegação usam links sem simular operações de negócio.
- Fluxo de interesse usa rascunho de e-mail, não submissão para backend: mostrar a explicação antes do preenchimento; validar campos com erro textual; não armazenar dados pessoais no navegador.
- Mensagens de ação devem diferenciar claramente `rascunho preparado` de `mensagem enviada`.
- O portal demonstra recursos em preparação; não exibir números simulados como indicadores reais.

## Permissões e segurança
- Respeitar guards existentes; não substituí-los por validações apenas no cliente.
- Não tratar preços VTEX/Atacadão como ofertas comercializáveis.
- Não alterar tabelas, RLS, dados reais ou fluxos de pagamento nesta etapa.

## Responsividade e acessibilidade
- Idioma pt-BR; focos visíveis; botões com 44 px mínimos; acesso por teclado; preferências de movimento respeitadas.
- Details/summary nativos para dúvidas; estados de erro em `role=alert` e informação em `role=status`.
- Menu mobile deve ser navegável por teclado e fechável via Escape.

## Aceite
- Homepage, navegação, rodapé, sitemap, metadados, páginas públicas e redirecionamento de portal sem vendedor.
- Rotas desativadas não exibem páginas de vendedor.
- Compile e lint devem ser executados em ambiente com dependências instaladas antes do merge.
