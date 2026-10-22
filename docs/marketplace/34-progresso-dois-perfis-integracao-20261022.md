# Grupo Provisio — Avanço B2B somente comprador e fornecedor (22/10/2026)

## Escopo vinculante
- **Dois perfis públicos**: Sou Comprador (`/compradores`, `/app/comprador/*`) e Sou Fornecedor (`/fornecedores`, `/app/fornecedor/*`).
- **ADM** (`/admin/*`) é área interna com sessão e segundo fator obrigatórios, **não** uma terceira jornada comercial.
- Sem Sou Vendedor, vendedores, representantes, carteiras, comissões, CRM de vendedor nem repasses a vendedores.
- Distribuição própria Provisio + fornecedores parceiros autorizados permanece híbrida. Termos técnicos `supplier_org_id` e `seller` de bibliotecas legadas não autorizam reintroduzir perfil de vendedor.
- Preservar o layout, textos e imagens da homepage e das duas páginas institucionais.

## Nova integração da branch (ainda fora da produção)
- Backend de RFQ/cotações, proposta e solicitação de pedido do PR #34 foi **reconciliado seletivamente** sobre a main após PR #35.
- Migrações renumeradas **0022_marketplace_quotes_orders_checkout.sql** e **0023_marketplace_supplier_order_confirmation.sql**. Não reutilizar 0016–0017, já ocupadas e aplicadas no Supabase do catálogo.
- Comprador: fluxo de cotação, proposta, solicitação de pedido, visualização de pedidos; link de cotação em oferta homologada **somente se a flag estiver ativa**.
- Fornecedor: cotações recebidas, propostas, confirmação/recusa/cancelamento com reserva e liberação atômica; páginas protegidas pelo layout de fornecedor.
- Painel ADM `/admin/marketplace/progresso`: 11 áreas ponderadas, percentuais independentes de implementação, testes e produção e cinco indicadores **ao vivo** do Supabase com RLS; não mostra números artificiais.
- Confirmação de pedido personalizada e acessível; substitui `window.confirm`, não muta sem aceite explícito.
- `MARKETPLACE_TRANSACTIONS_ENABLED` **permanece desligado por padrão**; não criar pedidos reais sem RLS, validação e autorização de publicação.

## Critério quantitativo — estimativa, não SLA
- Cada uma das 11 áreas possui peso percentual explícito, somando 100 pontos.
- Cada dimensão (`code`, `tests`, `production`) possui quatro checkpoints de 0/1 (referencial qualitativo de 0 a 4). O valor exibido é a fração da nota 4; o peso de cada área é usado na soma geral.
- Os checkpoints representam, respectivamente: código/UX preparado; testes locais/CI; validação real; maturidade operacional. A contagem é **revisão humana qualitativa**, não medição automática de cobertura. Pontuações arredondadas e data no arquivo `lib/marketplace/project-progress.ts`; cada área inclui evidência e próximo passo.
- O geral é ponderado **45% implementação, 30% testes, 25% produção**, de maneira a não misturar as dimensões ao apresentar apenas um número.
- Revisão desta branch em 22/10/2026: **código 76% / testes 53% / produção 26% / geral 57%**. A produção refere-se somente ao que está no deploy atual e não sobe por causa de um PR ou da branch.
- Nunca tratar percentuais isolados como homologação de checkout, faturamento ou venda.

## Evidência atual
1. A homepage, as páginas públicas, o catálogo P1 e o login estão presentes na main. Migrações 0016–0021 do catálogo já estão presentes no Supabase Free, com 2 organizações e **zero produtos/zero ofertas** registrados.
2. Migrações 0001–0023 foram validadas em PostgreSQL 17 descartável. Para preservar expectativas originais, executar suites legadas após migrations 0001–0015; em seguida aplicar 0016–0023 e executar as duas suites transacionais. SQL/RLS de cotações, pedidos, idempotência, reserva/cancelamento e isolamento passou localmente.
3. TypeScript, ESLint, testes de domínio/hardening, frontend (incluindo escopo dois perfis), Supabase foundation e build Next.js aprovados nessa branch.
4. E2E real com comprador, fornecedor, admin/MFA, Storage WebP e compra em navegador continua pendente. Um teste local descartável não autoriza habilitar transações.
5. O domínio `grupoprovisio.com` esteve com **`clientHold` na zona .com em 22/10/2026**; seu reparo depende de Squarespace Domains/registrador. A Vercel tem produção em `.vercel.app`; a liberação do domínio não é tarefa de frontend/backend.

## Prioridades práticas (P0 → P3)
| Prioridade | Entrega | Critério de aceite |
|---|---|---|
| P0 | Recuperar domínio | Registrador libera `clientHold`; DNS resolve e URL HTTPS atende a versão de produção |
| P0 | Segurança e testes com duas identidades | Login/MFA, negação entre organizações A/B, tokens expirados e testes em navegador |
| P1 | Primeiro catálogo comercial homologado | ADM cadastra um produto real, SKU, preço, estoque, imagem WebP e região; comprador elegível vê oferta aprovada |
| P1 | Cotações e propostas em Preview (0022) | Fluxo autenticado de RFQ, proposta, expiração, idempotência e negação cross-tenant |
| P1 | Painéis por perfil | Fornecedor visualiza só seus pedidos; comprador só os próprios; mensagens de erro claras |
| P2 | Pedidos e reservas (0023) | Confirmação idempotente, baixa de disponibilidade, liberação em cancelamento e auditoria |
| P2 | Entrega e acompanhamento | Frete, prazos, picking, expedição e ocorrência, sem falsas promessas |
| P3 | Financeiro e fiscal | Contratos, pagamentos, conciliação, impostos, NF-e e devoluções após autorização jurídica/comercial |

## Portas de segurança antes de merge/publicação
- CI GitHub: lint, TS, build, suites JS/RLS e PostgreSQL descartável com scripts ordenados. Executar outra vez sobre SHA do PR.
- Supabase Free produção: **não executar 0022/0023** nem criar registros reais sem E2E e autorização; não usar chave `service_role` no navegador.
- Manter `MARKETPLACE_TRANSACTIONS_ENABLED=false` em Preview e Production por padrão. Habilitar só após homologação do banco e testes de sessão/tenant.
- Nunca alterar `grupoprovisio.com`, main ou banco live sem aprovação de release específica.
