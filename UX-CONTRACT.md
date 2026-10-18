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

## Consulta comercial do comprador por região (18/10/2026)
- Só empresa com capacidade BUYER aprovada, vínculo ativo e região previamente autorizada por administrador com MFA recebe ofertas comerciais de terceiros.
- Região é um direito empresarial armazenado no Supabase; o campo digitado no navegador jamais concede permissão.
- Uma oferta visível precisa de produto mestre ativo, SKU aprovado, fornecedor e capacidade aprovados, vigência e quantidade disponível suficientes e pelo menos uma região compatível.
- `BR` significa cobertura nacional de uma **oferta**, não acesso irrestrito a qualquer região; compradores continuam obrigados a ter UF de entrega autorizada.
- Em falta de região autorizada, a interface distingue “região não liberada” de “nenhuma oferta homologada”; erros não expõem lista parcialmente carregada.
- Permissões de região são concedidas/revogadas em Administração > Acessos e empresas mediante validação do servidor e RLS. Revogação exige confirmação explícita e é imediatamente refletida no banco.
- Busca local ou mudança de região não gera pedido, separação de estoque ou cobrança. Nenhuma página pública é alterada.
