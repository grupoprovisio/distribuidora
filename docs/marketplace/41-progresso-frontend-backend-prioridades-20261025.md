# Provisio — Progresso frontend/backend e prioridades (25/10/2026)

## Escopo
- Apenas Sou Comprador e Sou Fornecedor como jornadas comerciais.
- ADM é área de governança interna, não um terceiro perfil de mercado.
- Não implementar Sou Vendedor nem carteiras, cadastro ou comissão por vendedor.
- Preservar layout, textos e imagens das três páginas públicas.
- A flag MARKETPLACE_TRANSACTIONS_ENABLED permanece false para clientes reais.

## Percentuais da revisão
O painel /admin/marketplace/progresso apresenta indicadores manuais de quatro checkpoints por área, ponderados por peso. Implementação 83%; testes 83%; comprovação em produção 35%; avanço geral ponderado 71% (45%/30%/25%). Não são testes automáticos de cobertura.

Dois **recortes da implementação** usam os mesmos checkpoints e pesos e não devem ser somados entre si:
- Frontend 83%: site institucional, identidade, ADM, catálogo, fornecedor, comprador, cotação, pedido, logística e financeiro. 
- Backend 81%: identidade, ADM, catálogo, fornecedor, comprador, cotação, pedido, logística, financeiro e segurança/CI.

Uma área full-stack integra ambas as visões. A avaliação não distingue linhas de código de interface ou de serviço dentro da mesma área. Por isso é uma aproximação de gestão, não uma auditoria de cobertura ou de maturidade produtiva.

## Verificação hospedada desta revisão
- Main no commit 4fdd9ed (PR #51 integrado); produção Vercel READY.
- Supabase Provisio: 26 migrations de marketplace (0001–0026), 19 tabelas public com RLS habilitado; 3 organizações QA segregadas de organizações comerciais pela coluna qa_only.
- Banco hospedado: 2 produtos, 2 SKUs, 2 ofertas, 1 registro em product_images e 1 objeto no bucket privado provisio-produtos.
- Sem cotação, proposta, pedido ou entrega persistidos no banco hospedado.
- Conselheiros Supabase: proteção nativa contra senhas vazadas desativada; duas tabelas privadas com RLS e sem policies, mas sem GRANT direto para anon/authenticated; auditoria privada order_transition_audit sem RLS nem leitura concedida diretamente a anon/authenticated — revisar antes de DDL, sem abrir esquema privado.
- Avisos de índices em foreign keys são otimizações posteriores, após análise de carga e consultas.

## Prioridades objetivas

P0: autenticar no ambiente hospedado quatro identidades independentes (ADM AAL2, Fornecedor A, Fornecedor B, Comprador), comprovar leitura/escrita autorizada e negações A/B; executar upload WebP real via fornecedor/ADM autenticado, leitura privada e aprovação ADM de produto/oferta, preço progressivo e região; repetir a auditoria de segurança no ambiente hospedado.
P1: navegar como comprador QA, cotar oferta QA, responder com fornecedor correto, checkout, confirmar/reservar sem duplicar, separar e faturar como etapa operacional (sem NF-e), expedir e confirmar entrega; verificar o isolamento com fornecedor B e comprador externo.
P2: revisar experiência mobile do fornecedor, comprador e ADM, observabilidade de logística, índices comprovadamente necessários, tratamento de erros e métricas.
P3: estabelecer produto de faturamento fiscal real, contrato, devoluções, financeiro, pagamentos, conciliação e emissão de NF-e antes de abrir a operação.

## Portões de publicação
Não confundir os testes 21+3 com checkout HTTP hospedado. Não habilitar compras reais, não criar pedidos comerciais, não anunciar emissão de NF-e e não usar key service_role no navegador. Validar lint, TypeScript, build, CI do PR, navegação autenticada e observações de segurança antes de release.
