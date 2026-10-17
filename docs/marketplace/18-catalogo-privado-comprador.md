# Catálogo privado do comprador — 17/10/2026

Escopo: somente /app/comprador/catalogo e lib/marketplace/buyer-catalog.ts. Não alterar Início, Sou comprador ou Sou fornecedor. O front-end tem leitura real via cookies Supabase SSR e PostgreSQL RLS, sem uso de service_role ou serviços VTEX.

Condições extras na camada de apresentação: empresa compradora aprovada, organização fornecedora aprovada, capacidade SUPPLIER aprovada, produto mestre ativo, SKU homologado, oferta aprovada/vigente, origem autorizada, região vinculada e disponibilidade maior ou igual ao pedido mínimo. A página é somente leitura. O preço só pode ser exibido após todos os testes. Máximo 24 itens por consulta e paginação por offset. Valores monetários no banco são centavos inteiros.

**Limitação conhecida:** as políticas RLS de 0003 são do fornecedor, não autorizam acesso de comprador aos catálogos de terceiros. A implementação é propositalmente fechada; retorna catálogo vazio até política de leitura específica revisada e testada ser aplicada. Não adicionar USING (true) nem permissões de anon para "fazer funcionar". A etapa de leitura do comprador deve ser homologada antes de qualquer liberação comercial. Nenhuma alteração de schema ou registros de produção neste PR.

O Supabase ainda não tem organizações, membros nem ofertas (consulta de 17/10/2026). O primeiro administrador depende da razão social jurídica validada, de MFA e da homologação de Vercel Auth. Não inventar empresas ou dados reais.
