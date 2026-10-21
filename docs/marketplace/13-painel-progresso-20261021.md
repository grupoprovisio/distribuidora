# Provisio B2B — acompanhamento de conclusão e critérios de 100%

**Data de auditoria parcial:** 21/10/2026  
**Fonte:** leitura da branch `main` pelo conector GitHub em 21/10/2026.  
**Referência:** Especificação técnica Marketplace B2B v1.0 (08/10/2026), substituída nas regras de perfil pelo documento `docs/marketplace/11-escopo-dois-perfis-20261017.md`.

> IMPORTANTE: estes percentuais são **estimativas conservadoras de implementação identificável**, NÃO são cobertura de testes, homologação nem prontidão comercial medida. Para declarar uma etapa em 100%, são necessárias evidências de implementação e testes, inclusive em staging. Nenhuma linha desta tabela declara que uma operação real foi validada. Reavaliar após auditoria completa da árvore e CI.

## Escopo imutável

- APENAS comprador e fornecedor: duas jornadas públicas e dois portais privados.
- Distribuidora própria pode atuar como fornecedor da plataforma, sem terceiro perfil público.
- NÃO criar vendedor/representante, `/vendedores`, `/app/vendedor`, carteiras, CRM ou comissão comercial.
- NÃO modificar bytes, layout, textos, fotografias e cards de `/`, `/compradores` ou `/fornecedores`. O teste `scripts/marketplace-frontend-scope-check.mjs` fixa hashes das páginas e mídias aprovadas.
- NÃO reativar catálogo VTEX/Atacadão nem transformar preços externos em ofertas.
- NENHUM merge, deploy, migração real, pagamento real ou modificação de produção sem autorização expressa.

## Visão geral — estimativa preliminar de engenharia

| Área do escopo revisado | Implementação identificável (0–100%) | Para chegar a 100% |
|---|---:|---|
| Fase 0 — inventário, arquitetura e proteção | 75% | Auditoria integral da árvore atual, evidência recente de CI e rollback, revisão de configuração de ambientes |
| Fase 1 — site público (visual aprovado, sem editar) | 90% | Validar SEO, responsividade e acessibilidade com evidência em navegador e CI |
| Fase 2 — identidade, organizações, permissões | 60% | Testes autenticados de convites, multiempresa, MFA, aprovação e RLS cruzada com dois tenants |
| Fase 3 — catálogo, ofertas e CSV | 50% | CRUD autorizado, importação transacional, preços progressivos, disponibilidade e E2E com fornecedor homologado |
| Fase 4 — cotações, carrinho e pedidos | 20% | Persistência e workflows de RFQ, checkout idempotente, subpedidos, snapshots, transições e devoluções |
| Fase 5 — representante/vendedor | N/A | **Removida integralmente do escopo**; não entra no denominador |
| Fase 6 — financeiro, logística e integrações | 10% | Contratos comerciais/fiscais, pagamentos marketplace, conciliação, repasses, documentos e eventos logísticos |
| Fase 7 — homologação e prontidão comercial | 10% | E2E dos dois perfis, acessibilidade, carga, recuperação, auditoria e aceite formal |

**Média indicativa não ponderada das 7 fases ativas: ~45%.** Este número é apenas orientação de gestão, não comprovação funcional. Não inferir que 45% da plataforma esteja utilizável em produção.

## Status por setor da aplicação

| Setor | Estado observado |
|---|---|
| Homepage, Sou comprador e Sou fornecedor | Conteúdo protegido contra regressões por hashes; manter intocado |
| Portal comprador | Páginas privadas protegidas e consultas de ofertas elegíveis por região; pedidos transacionais ainda não comprovados |
| Portal fornecedor | Listagem protegida, preparação de catálogo, pré-validação CSV e homologação; publicação real de ofertas não comprovada |
| Administração | Indicadores reais de organizações, acessos e homologações, sem estimativas fictícias |
| Supabase | Cliente SSR, controles de acesso e migrations/testes versionados relatados; a execução das políticas não foi revalidada nesta auditoria |
| Checkout e pagamentos | Não disponíveis para comercialização real conforme README; não usar dados fictícios como se fossem produção |
| VTEX/Atacadão | APIs legadas bloqueadas e páginas redirecionadas conforme suíte de regressão existente |

## Entregas em blocos, sem microtarefas

### Bloco A — garantir plataforma segura e operação comercial cadastral
- Executar lint, typecheck, build, testes marketplace, Supabase e escopo visual.
- Comprovar por testes negativos autorização de comprador A/B e fornecedor A/B.
- Realizar onboarding autenticado, associação à organização, homologação e MFA de admin, sem atalhos por organização arbitrária.
- Habilitar CRUD homologado e importação CSV transacional com logs e idempotência.
- Resultado: comprador e fornecedor piloto podem cadastrar dados **em staging** com isolamento e rastreabilidade.

### Bloco B — transação B2B de ponta a ponta
- Ofertas próprias e de terceiros, filtros regionais, embalagens, estoques e escalas de preço.
- Cotação -> resposta -> aceite -> carrinho -> checkout idempotente -> pedido e subpedido por fornecedor.
- Snapshots históricos e separação de estados de pagamento e logística.
- Resultado: pedidos fictícios em staging, sem cobrança real e sem dados externos.

### Bloco C — comercialização e operação
- Frete por fornecedor, separação, expedição, ocorrências, cancelamentos, devoluções e suporte.
- Contratos de pagamento/repasse, configuração fiscal revisada por profissionais responsáveis, conciliação e auditoria.
- Observabilidade, backups/restauração e testes de carga, acessibilidade e segurança.
- Resultado: critérios de prontidão documentados, aprovação explícita antes de ativação comercial.

## Checklist de verificação de 100%

100% de **frontend** exige, em desktop e celular: navegação válida, estados vazios/carregando/erro, formulários sem falso sucesso, roteamento sem vendedor, acessibilidade, nenhum visual público alterado e CI verde.

100% de **plataforma** exige adicionalmente: duas empresas compradoras e duas fornecedoras isoladas por RLS, homologação, estoque, ofertas autorizadas, cotação, carrinho, checkout idempotente, eventos logísticos, financeiro conciliado, reversões, recuperação testada e aprovação final. Sem isso, não rotular 100%.

## Evidências desta leitura

- `package.json`: Next 16.4.2, React 19.2.8, Supabase SSR, scripts para lint, typecheck, build e testes.
- `README.md`: reconhece que compras reais, pedidos, pagamentos, CSV persistente e repasses ainda não estão prontos.
- `docs/marketplace/11-escopo-dois-perfis-20261017.md`: proíbe todo fluxo de vendedor e mudanças de produção.
- `docs/marketplace/12-frontend-duas-jornadas-20261017.md`: descreve portais protegidos e operações não habilitadas.
- `scripts/marketplace-frontend-scope-check.mjs`: proíbe rotas de vendedor e verifica integridade visual via hashes.
- `lib/marketplace/buyer-catalog.ts`: catálogo do comprador usa região autorizada e linhas RLS, com paginação.
- `app/admin/marketplace/page.tsx`: painel administrativo obtém contagens reais sob sessão SSR e RLS.

**Limites desta atualização:** não foi possível clonar/reproduzir `npm ci`, testes, build, navegador ou ambiente staging localmente neste ciclo. O progresso abaixo de 100% decorre também da ausência dessas comprovações. Não foram realizados deploy, merge, escrita no banco nem pagamentos.
