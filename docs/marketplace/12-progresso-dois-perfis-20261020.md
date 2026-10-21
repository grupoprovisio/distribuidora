# Progresso de implementação — Marketplace B2B Provisio (dois perfis)

Data: 20/10/2026. Natureza: **levantamento preliminar de código, não relatório de testes executados**.

## Escopo vigente
- Somente **Sou comprador** (`/compradores`, `/app/comprador/*`) e **Sou fornecedor** (`/fornecedores`, `/app/fornecedor/*`), além do **admin**.
- Sem cadastro, landing, painel, CRM, carteira de representantes ou comissões de "Sou vendedor".
- Manter `/`, `/compradores`, `/fornecedores` e seus textos, fotos, cards, layout e identidade visual **intocados**.
- Manter o marketplace híbrido: distribuidora própria e fornecedores terceiros homologados.
- Não reutilizar dados VTEX/Atacadão como ofertas comercializáveis.
- Sem merge/deploy, migrations ou alteração do banco de produção sem autorização.

## Progresso visual estimativo (0–100%)
Percentuais **indicativos**, calculados por inspeção pontual de arquivos existentes no GitHub, não por contagem de testes ou checklist de aceite validado. Não devem ser lidos como conclusão certificada.

| Frente | Estimativa | Evidência atual | O que falta validar/concluir |
| --- | ---: | --- | --- |
| Fase 0 — Inventário e planejamento | 80% | `docs/marketplace/00-auditoria.md`, contrato de migração e decisão de dois perfis | Renovar inventário para versão atual, executar suíte e verificar ambiente |
| Fase 1 — Site público e escopo (sem modificá-lo) | 90% | Landings existentes, proteção por hashes no teste `test:frontend-scope` | Execução real do teste, responsive e acessibilidade |
| Fase 2 — Identidade e organizações | 65% | Portais consultam organizações autorizadas; layouts aplicam `requireMarketplacePortal`; admin requer MFA | Testes negativos RLS, convite, onboarding e aprovação E2E |
| Fase 3 — Catálogo de fornecedores | 60% | `lib/marketplace/buyer-catalog.ts` filtra ofertas homologadas por região, disponibilidade e origem permitida | Importação CSV, publicação e revisão de ofertas, imagens, preços e testes reais |
| Fase 4 — Compras, cotações e pedidos | 35% | Links, portais e módulos preparados; interface informa que transações não estão habilitadas | Fluxo completo de cotação, checkout, snapshots, idempotência e subpedidos |
| Fase 5 — Gestão comercial sem vendedores | N/A | Fase de representantes revogada por escopo | Substituir, quando aplicável, por operações comerciais comprador–fornecedor |
| Fase 6 — Financeiro, logística e integrações | 20% | Módulos e contratos previstos | Pagamento homologado, conciliação, repasses, logística e documentos |
| Fase 7 — Homologação final | 10% | Scripts automatizados declarados no `package.json` | Evidenciar execução de lint, typecheck, build, testes RLS e E2E |
| Administração central | 65% | Dashboard real consulta organizações e fila de homologações no Supabase | Testes de MFA/RLS, fluxos de aprovação, auditoria e indicadores completos |

**Aviso:** estimativas independentes, sem média global certificada. Progresso do frontend não equivale à prontidão comercial.

## Evidências inspecionadas em `main`
- `package.json`: Next.js 16.4.2, React 19.2.8, Supabase SSR/JS e scripts `test:marketplace`, `test:hardening`, `test:supabase-foundation`, `test:frontend-scope`.
- `docs/marketplace/11-escopo-dois-perfis-20261017.md`: revoga todo perfil público de vendedor.
- `scripts/marketplace-frontend-scope-check.mjs`: testes de ausência de vendedor, fontes comerciais autorizadas, portais e hashes de páginas públicas.
- `components/marketplace-portal.tsx`: portais comprador e fornecedor com cartões de módulos; aviso explícito de operação indisponível.
- `lib/marketplace/buyer-catalog.ts`: consulta autenticada regional e ofertas aprovadas.
- `app/admin/marketplace/page.tsx`: indicadores de organizações reais, sem números fictícios.

## Próxima sequência de execução (somente branch isolada)
1. Rodar `npm ci`, `npm run lint`, `npm run typecheck`, `npm run test:frontend-scope`, `npm run test:marketplace`, `npm run build`; registrar resultados.
2. Validar manualmente as rotas internas em 375px, 768px e 1440px, com teclado e leitor de tela; **não alterar páginas públicas**.
3. Expandir estados vazios, carregamento, erros e filtros de módulos privados de comprador/fornecedor, sem indicar operações fictícias como concluídas.
4. Homologar com contas diferentes o isolamento multiempresa e os dados Supabase antes de habilitar botões transacionais.
5. Criar relatório de evidências, atualizar percentuais com critérios objetivos e solicitar autorização específica antes de qualquer merge ou deploy.

Nenhum percentual acima afirma testes executados, alterações aplicadas ao banco, merge ou publicação.
