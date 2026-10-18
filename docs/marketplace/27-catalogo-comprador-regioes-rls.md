# Provisio B2B — Catálogo real para compradores com regiões aprovadas

## Caminho para o primeiro teste
1. O Owner confirma a razão social real e o usuário administrativo verificado no Supabase Auth. O bootstrap de `PLATFORM_ADMIN` continua separado e nunca pode ser feito por cadastro público.
2. O administrador entra em `/admin/acessos` com MFA AAL2, cria e homologa empresa compradora e fornecedora (e respectivas capacidades e vínculos).
3. Em `/admin/marketplace/cadastro`, cadastra produto mestre, ativa-o, vincula SKU ao fornecedor, homologa SKU, registra estoque, cria oferta pendente com preço e UF e só então a aprova.
4. Em `/admin/acessos`, autoriza explicitamente a UF da empresa compradora; a revogação possui confirmação e bloqueia novas consultas.
5. Usuário vinculado à empresa compradora acessa `/app/comprador/catalogo` com sessão Supabase válida e consulta a UF homologada. Visualiza apenas ofertas aprovadas, vigentes e com estoque suficiente.

## Garantias
A migração 0015 cria `buyer_delivery_regions` com RLS e helper privado `marketplace_private.buyer_can_see_offer` (não exposto à Data API). A autorização verifica usuário/perfil/organização/capacidade/sessão Auth, UF de entrega, organização do fornecedor, SKU, produto, oferta, vigência e estoque. Sem acesso `anon`, sem importação comercial de VTEX/Atacadão, sem comparação de preços externos.

`lib/marketplace/buyer-catalog.ts` consulta entitlements visíveis pela RLS antes de chamar o catálogo. O valor digitado pelo usuário é apenas um filtro; alterar a UF na URL não cria permissão.

## Limitações atuais
Este fluxo libera **consulta**, não carrinho persistido, cotação, pedido, pagamento, emissão fiscal ou reserva de estoque. Não afirmar venda concluída. A configuração da Vercel para `MARKETPLACE_AUTH_ENABLED=true`, a identidade jurídica da Provisio, o bootstrap de plataforma e a homologação humana do MFA ainda dependem de ação do Owner. A Vercel MCP atualmente responde 403 para o escopo da equipe.

## Aceite
A suíte SQL em PostgreSQL descartável verifica negação de acesso prévio, UF autorizada, isolamento entre fornecedor e comprador, revogação de fornecedor/membership, negação de INSERT ao comprador, anônimo e sessão inválida. Testes TS, lint, build e CI obrigatórios antes do merge. Sem alterações nas páginas públicas.
