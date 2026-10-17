# Fase 0 revisitada — Hardening do marketplace B2B (14/10/2026)

## Proveniência e escopo

- Plano de referência: `PLANO_CODEX_DISTRIBUIDORA_MARKETPLACE_HIBRIDO.md` (325 linhas, agora versionado nesta branch).
- Base desta etapa: `marketplace-b2b-hibrido`, branch que já contém `docs/marketplace/00-auditoria.md`, ADRs, protótipos e scripts de teste.
- Branch isolada: `feat/marketplace-b2b-hardening-20261014`. Não alterar `main`, banco Supabase, serviços externos nem produção.
- Supabase de destino informado: projeto `xprvdquocenfqvnokmmi` (`Projecto Distribuidora`). Consulta em 14/10/2026 confirmou zero tabelas no esquema `public`; nenhuma migração foi aplicada.

## Inventário dos riscos corrigidos nesta etapa

| Artefato | Risco encontrado | Tratamento nesta branch |
| --- | --- | --- |
| `app/api/marketplace/access/route.ts` | Fixture de identidade acessível sem sessão | Endpoint disponível somente com `NODE_ENV=development` e `MARKETPLACE_DEMO_API_ENABLED=true`; senão HTTP 404 |
| `app/api/marketplace/catalog/route.ts` | Catálogo fictício poderia ser publicado com apenas uma flag | Catálogo fictício exige ambas as flags e região; sempre vazio em produção |
| `app/api/marketplace/catalog/import/route.ts` | Prévia não autenticada exposta ao público | Bloqueada fora de desenvolvimento local; tamanho limitado; sem persistência |
| `app/api/marketplace/checkout/simulate/route.ts` | ID de comprador enviado pelo cliente poderia simular outro comprador | Apenas comprador de fixture e autorização da fixture; flag de simulação e ambiente local obrigatórios |
| `app/api/marketplace/supplier-orders/[id]/transition/route.ts` | ID do fornecedor e status inteiramente enviados pelo cliente | Bloqueio em produção, estados e IDs demonstrativos restritos; sem alteração persistida |
| `lib/marketplace/catalog.ts` | Falta de conferência de FK entre produto, fornecedor, SKU e oferta; consulta sem região | Verificação de vínculo, status, fonte autorizada, valores inteiros seguros, vigência e elegibilidade regional |
| `lib/marketplace/order-simulation.ts` | Reutilização da mesma chave com carrinho distinto, duplicatas e valores inseguros | Fingerprint idempotente, rejeição de duplicatas e totais fora de limites seguros |
| `components/marketplace-lead-form.tsx` | Mensagem poderia sugerir cadastro enviado/armazenado | Texto explícito de prévia local sem transmissão |

## Configuração somente para desenvolvimento

Todas as seguintes variáveis são opt-in e **não devem ser ativadas na Vercel**:

```text
NODE_ENV=development
MARKETPLACE_DEMO_API_ENABLED=true
MARKETPLACE_CATALOG_ENABLED=true
MARKETPLACE_CHECKOUT_SIMULATION=true
```

Nenhum endpoint demonstrativo autentica usuários reais, armazena pedidos, emite cobrança ou cria fornecedor. A autenticação própria, autorização multiempresa persistente, RLS e aprovações administrativas precisam de arquitetura real antes da operação.

## Testes a executar no checkout completo

```bash
npm ci
npm run test:marketplace
npm run typecheck
npm run lint
npm run build
git diff --check
```

`npm run test:marketplace` inclui agora a suíte dinâmica `scripts/marketplace-hardening-check.mjs`. Ela usa o TypeScript do projeto para exercitar o código de domínio e as rotas reais por transpilation em sandbox de teste, não uma cópia das regras. Deve ser executada após `npm ci` com Node compatível com Next 16.

## Regressões/impedimentos ainda relevantes

1. O comparador legado continua em rotas antigas, incluindo homepage, `/buscar`, `/promocoes`, `/api/catalog`, `/api/lookup`, scanner e VTEX ID. **Estas rotas não integram o núcleo comercial novo e precisam de corte completo antes de lançamento.**
2. `README.md`, metadados e nomes legados precisam revisão após concluir a substituição. Dados externos nunca são convertidos em ofertas.
3. Não foi feito checkout local completo nesta execução; qualquer aprovação anterior de build se refere à branch anterior. Os testes novos devem ter resultado próprio.
4. O Supabase do usuário não foi alterado; a migração `db/migrations/0001_marketplace_foundation.sql` segue apenas versionada.
5. Não há backend autenticado, persistência, RLS, E2E mobile, limites financeiros reais, contratos de marketplace, integrações fiscais/pagamentos ou homologações operacionais.
6. Vercel tinha erro 403 em consultas anteriores; não tentamos deploy nesta execução.

## Critério de progresso

- **Fase 0:** inventário e plano herdados de `docs/marketplace/00-auditoria.md` e `01-plano-migracao.md`, complementados com riscos observados nesta revisão.
- **Fases 1–2:** fundação e landings prototipadas em branch anterior; nova proteção dos demos e da proveniência.
- **Fases 3–9:** somente contratos, fixtures e simulações; não declarar pronto para operação nem release.
- **GO/NO-GO:** **NO-GO**. Nenhum merge, deploy, migração remota ou pagamento executado.
