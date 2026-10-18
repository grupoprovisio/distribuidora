# Catálogo do fornecedor — paginação real

A área privada do fornecedor passou a consultar somente 30 SKUs por página (`range` no Supabase SSR), com contagem exata RLS-scoped, links Anterior/Próxima e enriquecimento de catálogo exclusivamente para IDs da página atual.

- Queries não fazem varredura global do marketplace nem usam service_role.
- Produtos, organizações e ofertas são vinculados por IDs pertencentes aos SKUs carregados. Cada oferta é novamente associada ao mesmo `supplier_org_id`.
- A consulta de ofertas aborta sem mostrar dados parciais se ultrapassar 1.000 registros na página; o backend permanece somente leitura.
- Indicadores e filtros são declaradamente por página, evitando métricas enganosas quando houver mais de 30 SKUs.
- As páginas institucionais Início, Sou comprador e Sou fornecedor, seus cards, textos, fotografias e layout foram preservados.
- A autorização continua dependendo do layout do fornecedor e do RLS por organização. Nenhuma alteração de banco, aprovação, estoque, pagamento ou pedido.
