# PLANO DE EXECUÇÃO PARA CODEX — DISTRIBUIDORA + MARKETPLACE B2B HÍBRIDO

**Versão:** 1.0 — 08/10/2026  
**Repositório:** https://github.com/grupoprovisio/distribuidora.git  
**Projeto Vercel:** https://vercel.com/grupoprovisio/distribuidora  
**Site:** https://distribuidora-nine-phi.vercel.app/  
**Referência funcional (não copiar conteúdo/design):** https://cayena.com/ e páginas /compradores, /consultores, /fornecedores.  
**Objetivo:** converter gradualmente o comparador atual em uma plataforma híbrida B2B, na qual a distribuidora venda produtos próprios e fornecedores terceiros vendam suas próprias ofertas, com representantes comerciais e administração central.

> **INSTRUÇÃO DIRETA AO CODEX:** você está autorizado a fazer levantamento, planejar, editar e testar em ambiente local/branch isolada, em etapas pequenas. **NÃO faça merge na `main`, NÃO dê push na `main`, NÃO publique na Vercel, NÃO altere banco de produção, NÃO habilite pagamentos reais e NÃO execute operações financeiras até autorização posterior explícita.** Não tente concluir tudo em um único commit. Registre evidências, testes, pendências e decisões a cada fase. Se uma dependência externa estiver indisponível, implemente contratos/mocks de teste com indicação clara de que não estão operacionais e pare nesse ponto.

## 0. DECISÕES IRREVOGÁVEIS DE ESCOPO

1. Modelo de negócio: **híbrido** — catálogo/ofertas vendidas pela distribuidora própria + ofertas de fornecedores terceiros homologados; vendedores/representantes prospectam e acompanham clientes.
2. **NÃO MANTER O COMPARADOR VTEX/ATACADÃO**, nem como módulo separado. É uma substituição deliberada do modelo de comparação de preços externos. **Preços externos não podem ser exibidos para consulta/comparação, indexados no novo catálogo, importados como ofertas, usados no checkout ou convertidos automaticamente em itens vendáveis.**
3. O modelo visual, os recursos genéricos e as experiências úteis do site atual podem ser preservados/adaptados: busca, categorias, filtros, favoritos, lista de compras, scanner de código de barras, preços por quantidade, acessibilidade, responsividade, componentes reutilizáveis e elementos institucionais — **mas toda fonte de dados comercial deve migrar para produtos/ofertas próprios, autorizados e explicitamente cadastrados.**
4. Não apagar inadvertidamente histórico do usuário. Avaliar dados no navegador e realizar migração/arquivamento local quando permitido e útil; itens identificados como oriundos do comparador externo não devem ser convertidos automaticamente em ofertas ou pedidos.
5. Separar claramente **product** (produto mestre) de **offer** (oferta vendável de uma organização identificada, aprovada e habilitada). O próprio operador da distribuidora é um fornecedor organizacional especial (`is_platform_owned=true` ou equivalente), e não uma exceção sem isolamento.
6. Preservar códigos e rotas até avaliação de dependências; quando necessário, usar desativação controlada, substituição gradual e redirecionamentos. Preservar SEO e não deixar fluxos apontando para conteúdo de fornecedores externos.
7. Preços e capacidades da Cayena são apenas referências de conceito; não copiar interface, textos, marca, imagens ou dados comerciais.

## 1. BASE OBSERVADA NO REPOSITÓRIO (VERIFICAR NOVAMENTE NO CHECKOUT LOCAL)

Leituras do GitHub na branch `main` em 08/10/2026:
- `package.json`: Next.js **16.3.5**, React **19.2.8**, React DOM 19.2.8, TypeScript 5, Tailwind CSS 4, dependências `@zxing/browser`, `@zxing/library`, `lucide-react`, `motion`; scripts `dev`, `build`, `start`, `lint`.
- Estrutura real inclui `app/(tabs)`, `app/admin`, `app/api`, `app/checkout`, `app/empresas`, `app/entregas`, `app/orcamento`, `app/produto`, `app/scan` e páginas institucionais.
- `app/(tabs)` inclui `buscar`, `categorias`, `conta`, `favoritos`, `lista`, `ofertas`, `promocoes` e homepage.
- `app/api` inclui `auth`, `catalog`, `filiais`, `list`, `lookup`, `promos`, `receipt`, `suggest`, `terms`.
- `lib` inclui `atacadao.ts`, `vtex-auth.ts`, `catalog-index.ts`, `account-store.ts`, `list-store.ts`, `prefs-store.ts`, `purchase-store.ts` e outros auxiliares.
- README atual declara integração com APIs VTEX/FastStore/Atacadão, filiais e uso de armazenamento no navegador para preferências. O README e metadados estão vinculados ao modelo antigo e precisarão ser reescritos após implantação.
- Não foi comprovado que exista um banco relacional, sistema próprio de identidade, persistência servidor-side de pedidos ou integração de pagamento de marketplace.
- **Acesso à Vercel via integração retornou 403 para escopo `grupoprovisio`**; não presumir autorização operacional por ter o link do projeto. Validar autorização localmente, mas **sem deploy**.

## 2. CONTRATO DE EXECUÇÃO DO CODEX

### Primeiro ciclo: FASE 0 OBRIGATÓRIA

1. Inspecionar **TODOS** os arquivos, rotas, componentes, hooks, bibliotecas, integrações de rede, variáveis e testes existentes. Produzir `docs/marketplace/00-auditoria.md` com inventário: arquivo/rota → dependência VTEX/externa → finalidade → manter/adaptar/desativar/remover ao final.
2. Executar `git status`, registrar commit-base e branch; criar branch de trabalho `feat/marketplace-hibrido-b2b` (ou equivalente disponível), sem sobrescrever trabalho não commitado.
3. Verificar configuração GitHub/Vercel, ci/build e dados existentes; mapear exposição acidental de chaves/tokens e possíveis direitos de acesso às fontes externas.
4. Criar `docs/marketplace/01-plano-migracao.md`, com matriz de rotas antigas → novas, rollback, flags e dependências.
5. Determinar o mecanismo real de autenticação, se há backend e qual banco será adotado. Registrar decisões em `docs/marketplace/adr/` e **não inventar configurações de produção**.
6. Estabelecer testes de regressão das partes úteis do site, comprovando que não haverá consulta de preços VTEX/Atacadão no novo fluxo. Se há dados de demonstração provenientes das APIs antigas, identificá-los como não autorizados para oferta.
7. Entregar relatório do ciclo, sem dar merge ou deploy; seguir para desenvolvimento local das fases autorizadas pela instrução geral, pausando antes de qualquer ação de infraestrutura de produção ou credenciais reais.

### A cada fase

- Implementar incrementos testáveis e pequenos; preferir commits isolados, reversíveis e com mensagens explicativas.
- Executar lint, typecheck (`npx tsc --noEmit`), build e testes existentes; se testes não existirem, criar suíte mínima apropriada.
- Validar interfaces mobile e desktop, estados vazios, loading, erros, acessibilidade e permissões.
- Produzir sumário: arquivos alterados, schema, testes, riscos, pendências e passos para reproduzir localmente.
- **Não publicar nem ativar integrações externas reais**. PR em rascunho somente se explicitamente solicitado posteriormente.

## 3. EXPERIÊNCIA PÚBLICA E MAPA DE ROTAS

### Menu principal

Início | Sou comprador | Sou vendedor | Sou fornecedor | Categorias | Ofertas | Como funciona | Entrar | Carrinho. Em mobile, busca e carrinho acessíveis, navegação condensada e CTAs claros.

### Rotas propostas (confirmar conflitos com rotas atuais)

- Público: `/`, `/compradores`, `/vendedores`, `/fornecedores`, `/como-funciona`, `/sobre`, `/contato`, `/ajuda`, `/categorias`, `/produtos`, `/produtos/[slug]`, `/ofertas`, `/politica-de-privacidade`, `/termos`, `/termos-marketplace`.
- Acesso/cadastro: `/entrar`, `/verificar`, `/cadastro/comprador`, `/cadastro/vendedor`, `/cadastro/fornecedor`, `/selecionar-organizacao`, `/cadastro/em-analise`.
- Privado: `/app/comprador/*`, `/app/vendedor/*`, `/app/fornecedor/*`, `/admin/*`.
- Rotas antigas (`/empresas`, `/checkout`, `/orcamento`, `/scan`, `/lista`, `/produto`, outras): registrar estratégia explícita de adaptação/redirecionamento; nunca quebrar links silenciosamente.

### `/compradores` — landing B2B

Seções: hero com benefícios; segmentos atendidos; categorias; produtos da distribuidora e parceiros homologados; vantagens B2B; processo de cotação/compra; preços progressivos; entrega e regiões; credibilidade (sem inventar números/depoimentos); dúvidas frequentes; CTA cadastro. Formulário com razão social, fantasia, CNPJ, setor, responsável, e-mail, telefone, CEP, endereço e volume estimado; validação server-side e status de homologação.

### `/vendedores` — landing de representantes

Seções: hero; oportunidade comercial; portfólio; atuação por região; fluxo de prospecção e pedido assistido; comissões com regras transparentes; **simulador com valores expressamente ilustrativos**; campanhas; requisitos; FAQ; cadastro com identificação, contatos, região, experiência e aceite. Sem promessa de renda fixa.

### `/fornecedores` — landing de parceiros

Seções: hero; benefícios comerciais; categorias aceitas; requisitos de homologação; funcionamento da publicação de catálogo e ofertas; integração CSV/API futura; logística; financeiro/repasse sujeito a contrato; FAQ; cadastro com CNPJ, razão social, responsável, contatos, categorias, marcas, endereço, regiões atendidas, entrega e eventual sistema ERP.

### Requisitos comuns das páginas

Design próprio, acessível (WCAG 2.2 AA como meta), conteúdo claro em pt-BR, responsividade, SEO técnico com sitemap e canonical atualizados, formulário com estado de envio/erro/sucesso, tratamento LGPD e antispam. Nunca usar testemunhos ou indicadores fictícios como dados reais.

## 4. PAINEL COMPRADOR — `/app/comprador`

**Módulos:** Dashboard, Catálogo, Produtos e ofertas, Comparar ofertas **somente de fornecedores homologados internos à plataforma**, Cotações, Carrinho, Meus pedidos, Recompra, Listas/favoritos, Endereços/unidades, Equipe/aprovações, Financeiro, Suporte.

**Requisitos:**
- Organização compradora com múltiplos membros: administrador, comprador, solicitante, aprovador, financeiro e leitura.
- Catálogo com busca, GTIN, SKU, filtros, imagens, unidade, embalagem, quantidade mínima/múltiplos, regiões e disponibilidade.
- Comparar preço **normalizado** por unidade (kg/L/un), tributos/frete quando calculáveis, prazo, pedido mínimo e valor total efetivo entre **ofertas próprias ou de fornecedores terceiros autorizados**. Nunca consultar/citar VTEX/Atacadão.
- Cotação RFQ com itens, quantidades, prazo, fornecedores elegíveis, respostas, validade, aceite e trilha de auditoria.
- Carrinho contendo várias organizações vendedoras; checkout agrupa em `supplier_orders`; mostrar cobranças, entregas e termos distintos.
- Aprovação de compra por limite e permissões; idempotência em checkout; snapshot imutável de preços/itens/endereço/condições no pedido.
- Recompra e listas recorrentes baseadas exclusivamente em SKUs e ofertas autorizadas atuais; não reintroduzir itens antigos externos.
- Estados de pagamento independentes dos estados de separação/entrega; devoluções, divergências, cancelamentos parciais e suporte.

**Aceite:** comprador A nunca visualiza pedidos ou dados privados de comprador B; apenas ofertas elegíveis visíveis; checkout não duplica pedido sob retries; a tela explica subpedidos por fornecedor.

## 5. PAINEL VENDEDOR — `/app/vendedor`

**Módulos:** Dashboard, Minha carteira, Leads e funil, Agenda/visitas, Catálogo autorizado, Cotações, Pedidos assistidos, Histórico, Metas e campanhas, Comissões, Mensagens/Suporte.

**Requisitos:**
- Vendedor só vê clientes explicitamente atribuídos, com validade e regras de reassignment.
- Pedidos assistidos requerem consentimento/confirmação do comprador ou autorização contratual e trilha de auditoria; não permitir pedido unilateral sem mandato.
- Motor de comissão por contrato, fornecedor, produto/categoria/campanha, base elegível, percentual, gatilho de reconhecimento, ajustes, estornos e pagamento.
- Ledger de comissões append-only; comissão prevista != devida != paga.
- Simulador público de ganhos apenas hipotético.

**Aceite:** isolamento entre carteiras; vendedor não altera preço arbitrariamente nem vê margem sigilosa; estorno gera lançamento compensatório auditado.

## 6. PAINEL FORNECEDOR — `/app/fornecedor`

**Módulos:** Dashboard, Empresa/documentos, Usuários, Catálogo, Importar CSV, Ofertas e preços, Estoque disponível, Regiões/frete/prazos, Cotações, Pedidos, Separação/expedição, Entregas, Ocorrências, Financeiro/repasse, Relatórios, Integrações.

**Requisitos:**
- Fornecedor independente só gerencia **seus** SKUs/ofertas/estoques/pedidos/relatórios.
- Produto mestre pode ter ofertas de múltiplos fornecedores sem misturar preço/estoque/pedido.
- Homologação de fornecedor, documentos, oferta e importações antes da venda.
- SKU do fornecedor + GTIN quando aplicável; unidade base, embalagem, conversão, mínimo/múltiplo, preço e vigência, regiões, lead time, disponibilidade.
- CSV com prévia, validações, erros por linha, detecção de duplicidade e transação/idempotência; não importar CSV de extrações VTEX/Atacadão como catálogo vendável.
- Aceitar/recusar pedido justificadamente; suportar separação, entrega parcial, divergência, comprovante e devolução.

**Aceite:** fornecedor A não acessa ofertas privadas, dados de cobrança ou pedidos do fornecedor B, inclusive mudando IDs na URL e requisições manuais.

## 7. DISTRIBUIDORA PRÓPRIA — PRIMEIRA PARTE DO HÍBRIDO

- Cadastrar uma organização vendedora interna da plataforma, homologada explicitamente, sujeita à mesma modelagem de pedidos/ofertas/estoque do parceiro externo.
- Permitir identificação pública **Vendido pela Distribuidora** vs **Vendido por [Fornecedor]**.
- Custos internos, margens, estoque, políticas de preço, equipe, compras e logística própria devem ficar em domínio privado, sem exposição a compradores ou fornecedores terceiros.
- Pedido da distribuidora própria segue `supplier_orders`, permitindo rastreamento e conciliação homogêneos.
- Nunca autogerar oferta a partir de resultados do comparador existente. **Criar ofertas próprias somente por cadastro/importação autorizada da distribuidora**.

## 8. ADMINISTRAÇÃO — `/admin`

Painéis: Visão geral, Compradores, Vendedores, Fornecedores, Homologações, Organizações, Produtos mestres, Ofertas, Cotações, Pedidos/subpedidos, Pagamentos, Repasses, Comissões, Entregas, Campanhas, Taxas, Relatórios, Suporte, Usuários/papéis, Configurações, Auditoria.

**KPIs:** GMV (volume bruto transacionado), receita efetiva da plataforma (separada de GMV), pedidos, AOV/ticket médio, recompra, conversão de cotações, vendedores ativos, fornecedores ativos, SLA, atrasos, cancelamentos, disputas, volume próprio vs terceiros.

**Governança:** RBAC+ABAC; MFA para admin; dupla revisão opcional em configurações financeiras; audit log append-only; importações e exportações auditadas; bloqueio/suspensão e reativação controlados; nenhuma permissão definida apenas no frontend.

## 9. MODELO DE DADOS RELACIONAL — PROPOSTA INICIAL

**Banco sugerido:** PostgreSQL gerenciado, eventualmente Supabase após verificação de stack/conta, sem criar recursos reais sem aprovação. Usar SQL versionado/migrações reversíveis quando possível. IDs UUID; timestamps timezone-aware; valores monetários `BIGINT` em centavos e moeda, ou `NUMERIC` com precisão declarada para cálculos. Quantidades `NUMERIC` apropriado e unidade explícita.

**Identidade e multiempresa:**
- `profiles(id, auth_user_id, display_name, phone, status, created_at)`
- `organizations(id, legal_name, trade_name, tax_id, kind, is_platform_owned, status, created_at)` onde `kind` não impede empresa de exercer mais de um papel; para isso, usar tabela de capacidades.
- `organization_capabilities(organization_id, capability, status)` — `BUYER`, `SUPPLIER`, `PLATFORM_OPERATOR` etc.
- `organization_members(id, organization_id, user_id, role_id, status, invited_by, created_at)`
- `roles`, `permissions`, `role_permissions` (ou enum inicial e matrizes versionadas).
- `organization_addresses`, `organization_documents`, `organization_approvals`, `seller_profiles`, `seller_assignments`, `seller_leads`.

**Catálogo e preços:**
- `categories`, `brands`, `products(id, name, description, base_unit, category_id, brand_id, status)`
- `product_identifiers(product_id, type, value)` (GTIN, código autorizado etc.)
- `supplier_products(id, supplier_org_id, product_id, supplier_sku, pack_quantity, pack_unit, conversion_factor, status)`
- `offers(id, supplier_product_id, currency, base_price_minor, min_quantity, lead_time_days, status, valid_from, valid_to)`
- `offer_price_tiers`, `offer_regions`, `offer_inventory`, `offer_change_history`, `product_media`.
- **Proveniência obrigatória:** `source_type`/`origin` em registros de importação com apenas `MANUAL_AUTHORIZED`, `SUPPLIER_CSV_AUTHORIZED`, `SUPPLIER_API_AUTHORIZED`, `PLATFORM_STOCK`; rejeitar `ATACADAO_EXTERNAL`, `VTEX_SCRAPE`, `UNVERIFIED_EXTERNAL` para qualquer caminho comercial.

**Vendas e logística:**
- `carts`, `cart_items`, `quote_requests`, `quote_request_items`, `quote_responses`, `quote_response_items`.
- `orders(id, buyer_org_id, created_by, currency, status, grand_total_minor, idempotency_key, created_at)`
- `supplier_orders(id, order_id, supplier_org_id, status, subtotal_minor, shipping_minor, tax_minor, total_minor)`
- `order_items(id, supplier_order_id, offer_id, product_snapshot_json, quantity, unit_price_minor, total_minor, tax_snapshot_json)`
- `order_status_events`, `order_approvals`, `shipments`, `shipment_items`, `delivery_events`, `returns`, `disputes`.

**Financeiro/comercial:**
- `payments`, `payment_events`, `refunds`, `supplier_settlements`, `supplier_settlement_entries`, `marketplace_fee_rules`.
- `commission_rules`, `commission_ledger`, `commission_payouts`, `promotion_rules`, `coupon_redemptions`.
- `notifications`, `support_tickets`, `audit_logs`, `integration_events`, `idempotency_keys`, `outbox_events`.

**Índices, constraints e integridade:**
- Unique CNPJ normalizado quando juridicamente correto para a entidade, associação de membros sem duplicidade ativa, SKU por fornecedor, `(provider,event_id)` em webhooks e idempotência scoped por organização + operação.
- FK e índices por `organization_id`/`supplier_org_id`, estado e data; checks de preço/quantidade >= 0 e status válidos.
- Snapshot de preços em pedidos; ledger sem edição destrutiva; reservas de estoque transacionais com expiração.
- Dados sensíveis protegidos em repouso e em trânsito; não armazenar dados de cartão.

### Exemplo de invariantes a testar

```text
CatalogOffer.sellable = supplier.approved && offer.approved && offer.active
                        && offer.source in AUTHORIZED_SOURCES
                        && buyer.region in offer.regions
External VTEX/Atacadao data => NEVER CatalogOffer.sellable
Order.items => only authorized offers captured in immutable snapshots
One checkout idempotency key => at most one logical order
SupplierOrder.supplier_org_id => every item belongs to this supplier
Seller.canReadBuyer(buyer) => valid explicit assignment only
```

## 10. PERMISSÕES E TESTES DE ISOLAMENTO

- Autenticação real e sessões seguras. Não reutilizar autenticação VTEX ID como identidade do marketplace sem autorização/contrato e estudo técnico; criar identidade própria, migrar somente contas autorizadas.
- Todas as consultas e escritas checam usuário, organização ativa, papel, relação e capacidade. Nunca confiar no `organization_id` vindo do cliente.
- Em Supabase, ativar RLS em todas as tabelas com dados privados, deny-by-default e testes negativos; em outro PostgreSQL, aplicar filtros obrigatórios e políticas equivalentes na camada de dados, idealmente ambas as camadas.
- Testes: troca de IDs em URLs, API direct calls, escalonamento horizontal, vendedor sem carteira, fornecedor concorrente, colaborador removido, usuário não homologado, CSRF, rate limiting, uploads, webhook forjado, replay e concorrência.
- Auditoria imutável dos eventos críticos e visibilidade mínima de PII conforme LGPD.

## 11. PAGAMENTOS, FISCAL, LOGÍSTICA E REPASSES

- **Não habilitar cobranças reais nesta implementação sem contrato e aprovação específica.** Definir merchant of record, destinatário do pagamento, emitente fiscal, responsabilidade por devolução, chargebacks, frete e repasse para transações próprias e de terceiros.
- Validar com assessoria contábil/jurídica regime brasileiro, NF-e/NFS-e conforme natureza de cada operação, impostos, documentos, obrigações do marketplace e relação com representantes.
- Provedor deve suportar estrutura comercial real (split/repasse/marketplace quando aplicável). Implementar adaptador abstrato e sandbox, webhooks assinados com idempotência, ledger de conciliação e testes de estorno.
- Inicialmente logística por fornecedor e operação própria para ofertas internas; prazo, SLA, regiões, frete, rastreio, prova de entrega, parcialidades e ocorrência por subpedido.

## 12. MIGRAÇÃO DO COMPARADOR EXTERNO — MANDATÓRIO

**Regra final solicitada:** não preservar comparador VTEX/Atacadão nem separado do marketplace. O funcionamento de `lib/atacadao.ts`, `lib/vtex-auth.ts`, chamadas `app/api/catalog`, `lookup`, `filiais`, `promos`, `suggest`, fluxos de `/scan`, busca, promoções, página inicial, checkout e metadados deve ser **auditado antes de qualquer remoção**. A lista é um ponto de partida, não exaustiva.

**Estratégia:**
1. Mapear dependências completas de VTEX/FastStore/Atacadão e qualquer dado derivado. Registrar contrato das telas reutilizáveis.
2. Construir adaptadores internos `MarketplaceCatalogRepository`, `AuthorizedOffersRepository` e `InventoryRepository`, inicialmente com fixtures fictícias claramente identificadas em desenvolvimento.
3. Migrar busca, categorias, favoritos, listas, scanner e ofertas para **catálogo autorizado interno**, sem importação de respostas externas. Dados históricos de usuário podem ser exportados/arquivados, mas não devem resultar em produtos automaticamente vendáveis.
4. Desabilitar endpoints e consultas externas no código de produção futura antes do lançamento, com testes automatizados proibindo chamadas aos domínios/hosts antigos nos fluxos comerciais e proibindo fonte externa no catálogo.
5. Eliminar códigos mortos, textos, README, labels, metadados, sitemap, robots, termos e nomes de produto ligados ao comparador, após confirmar dependências e manter histórico Git para rollback.
6. Garantir que nenhuma tela pública apresente números/estoques reais oriundos da antiga API como se fossem ofertas do novo marketplace.
7. Se ainda não houver catálogo homologado, mostrar estados vazios e convite de cadastro; **não inventar preços nem fornecedores reais**.

## 13. ROADMAP EXECUTÁVEL COM CRITÉRIOS DE SAÍDA

### Fase 0 — Auditoria, ADRs e testes baseline
- [ ] Inventariar rotas, componentes, API routes, hooks, persistência local e dependências externas.
- [ ] Criar matriz manter/adaptar/remover e pontos de regressão.
- [ ] Registrar stack/banco/autenticação, fluxos e riscos; propor rollout e rollback.
- [ ] Congelar baseline dos testes/build.
**Saída:** documentos + CI baseline; nenhum código de negócio arriscado em produção.

### Fase 1 — Fundação de domínio e desativação planejada das fontes externas
- [ ] Implementar interfaces/repositórios de catálogo autorizado e feature flags OFF por padrão.
- [ ] Criar testes que rejeitam VTEX/Atacadão em oferta vendável e proíbem consulta externa no novo catálogo.
- [ ] Configurar fixtures locais sem dados reais e camadas de validação.
- [ ] Preparar substituição de componentes sem destruir UX útil.
**Saída:** novo catálogo isolado do comparador, sem venda real.

### Fase 2 — Landing pages, UX e cadastro
- [ ] `/compradores`, `/vendedores`, `/fornecedores` com CTAs claros e formulários.
- [ ] Homepage com os três perfis e mensagem híbrida.
- [ ] SEO, sitemap, termos, privacidade, acessibilidade/mobile.
- [ ] Formulários inicialmente em modo não comercial se ainda não houver backend seguro.
**Saída:** páginas acessíveis em desenvolvimento, sem ativar cadastro público real prematuramente.

### Fase 3 — Identidade multiempresa + administração de homologação
- [ ] Banco e migrações versionadas; sessões próprias; organizações, membros e papéis.
- [ ] Aprovação de empresas e ativação/revogação de usuários.
- [ ] Painel admin mínimo, logs e testes de isolamento.
**Saída:** RBAC/ABAC funcionando, organizações isoladas e nenhuma permissão só de frontend.

### Fase 4 — Catálogo próprio e de fornecedores parceiros
- [ ] Produto mestre, SKU de fornecedor, ofertas, preços por quantidade, regiões, estoque e importação CSV.
- [ ] Organização de propriedade da distribuidora como seller interno.
- [ ] Workflow de homologação de fornecedores/ofertas.
- [ ] Substituir definitivamente dependências VTEX do catálogo e da experiência de navegação, sem converter dados externos.
**Saída:** somente itens autorizados podem aparecer em busca/oferta e serem potencialmente vendáveis.

### Fase 5 — Portal comprador + cotação + carrinho/checkout sem cobrança real
- [ ] Dashboard, busca interna, cotações, listas, favoritos, recompra e equipes.
- [ ] Carrinho multi-seller; limites, múltiplos, frete, subtotal e snapshots.
- [ ] Split em subpedidos; pedido simulado em staging/local e status independentes.
**Saída:** fluxo E2E simulado com idempotência e sem pagamento real.

### Fase 6 — Portal fornecedor + pedidos/logística
- [ ] Preços/estoque, catálogo, importação, cotações e aceite de subpedidos.
- [ ] Separação, expedição, entrega, parcialidade, divergências e notificações de teste.
- [ ] Visão da operação própria da distribuidora em mesmo modelo.
**Saída:** fornecedor A não acessa fornecedor B; lifecycle demonstrável.

### Fase 7 — Portal vendedor + comissões
- [ ] Carteira, leads, visitas, cotações e pedidos assistidos com autorização.
- [ ] Contratos de comissão parametrizados e ledger com estorno.
- [ ] Dashboard de metas e extratos simulados.
**Saída:** isolamento de carteira e reconciliação de comissões em cenários de teste.

### Fase 8 — Financeiro, documentos, integrações e observabilidade
- [ ] Decidir provedores e contratos do marketplace; sandbox apenas.
- [ ] Implementar eventos assinados/idempotentes, conciliação, repasses e reversões simulados.
- [ ] Integrações fiscais/logísticas autorizadas, logs estruturados, alertas e backup.
**Saída:** critérios financeiros/documentais validados antes de credenciais live.

### Fase 9 — Homologação pré-produção
- [ ] Lint, typecheck, build, testes unitários, integração, E2E, segurança tenant, carga e mobile.
- [ ] Matriz regressão de funcionalidades reutilizadas.
- [ ] Verificação final: zero chamadas/preços VTEX/Atacadão na experiência final.
- [ ] Checklist de release, rollback, backup/restauração, monitoramento, impactos fiscais e contratuais.
**Saída:** relatório GO/NO-GO. **Parar sem merge e sem deploy até aprovação explícita.**

## 14. CRITÉRIOS DE ACEITE GLOBAIS

1. Navegação pública e portais comprador, vendedor, fornecedor e admin funcionam com identidade própria e design consistente.
2. Empresa distribuidora própria e fornecedores terceiros vendem pelo mesmo núcleo comercial, porém com permissões e responsabilidades distintas.
3. Catálogo comercial tem somente produtos e ofertas cadastrados por fonte **autorizada**, aprovados e vinculados à organização vendedora real.
4. **Nenhuma API VTEX/Atacadão consulta preços ou oferece comparação no produto final, mesmo em área separada.** Não há migração automática desses preços para marketplace.
5. Testes negativos de acesso entre empresas, fornecedores e carteiras passam.
6. Pedidos não duplicam em retries, snapshots permanecem corretos e estados financeiros/logísticos não se confundem.
7. Comissões e repasses têm razão contábil auditável, suporte a estorno e configuração explícita.
8. Administração não confunde GMV com receita; apresenta canais próprios e de terceiros separadamente.
9. Site responsivo, acessível, sem dados reais fabricados e sem mensagens de sucesso enganosas.
10. Nenhuma alteração em `main`, Vercel produção, banco produção, pagamentos live ou credenciais reais sem autorização posterior.

## 15. SAÍDA ESPERADA DE CADA EXECUÇÃO CODEX

Responda com:

```text
FASE ATUAL:
RESUMO DO QUE FOI FEITO:
ARQUIVOS CRIADOS/ALTERADOS:
DADOS/MIGRAÇÕES (somente local/teste):
TESTES EXECUTADOS E RESULTADO:
SEGURANÇA MULTIEMPRESA:
VERIFICAÇÃO DE FONTE AUTORIZADA (sem VTEX/Atacadão):
REGRESSÕES OBSERVADAS:
PENDÊNCIAS E BLOQUEIOS:
PRÓXIMA FASE:
CONFIRMAÇÃO: nenhum merge/deploy/alteração produção executado.
```

## 16. PRIMEIRO PROMPT PARA O CODEX NO VS CODE

> Leia integralmente `PLANO_CODEX_DISTRIBUIDORA_MARKETPLACE_HIBRIDO.md`. O repositório atual é `grupoprovisio/distribuidora`. Nosso destino é um **marketplace híbrido B2B**, com distribuidora própria, compradores, vendedores e fornecedores externos homologados. **Não quero manter o comparador VTEX/Atacadão nem mesmo separado; não quero usar preços externos para consulta/comparação e jamais convertê-los automaticamente em ofertas vendáveis.** Preserve/adapte os demais recursos úteis, a identidade visual e o histórico de usuários quando juridicamente e tecnicamente cabível. Comece pela FASE 0: inspecione todo o projeto, crie o inventário, dependências, ADRs e plano de migração. Trabalhe apenas em branch isolada e ambiente local; não faça merge, push na main, deploy, alteração em banco de produção ou transações reais. Ao concluir a fase, mostre relatório, testes, riscos e plano para a fase seguinte. Se faltarem credenciais ou decisões críticas, registre bloqueios e continue apenas nas partes seguras.

---

**Nota de cautela:** esta especificação é baseada nos arquivos do repositório consultados e nos requisitos do proprietário; não substitui a auditoria completa que o Codex executará localmente. O painel Vercel não estava acessível para inspeção por falta de autorização da conexão utilizada. Nenhuma alteração de repositório ou deploy foi realizada na elaboração deste plano.