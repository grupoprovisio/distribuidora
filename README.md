# Grupo Provisio — Distribuidora e Marketplace B2B

Plataforma B2B híbrida em desenvolvimento: **distribuidora própria + fornecedores parceiros**, com **apenas dois perfis**: **Sou comprador** e **Sou fornecedor**.

> **Atenção:** o código é uma evolução de um comparador independente de preços. O comparador VTEX/Atacadão foi aposentado nesta branch. Dados e preços externos **não** podem ser consultados, comparados ou convertidos automaticamente em ofertas do marketplace. Rotas antigas são redirecionadas e endpoints legados retornam HTTP 410.

## Código e ambientes

- Repositório: [grupoprovisio/distribuidora](https://github.com/grupoprovisio/distribuidora)
- Projeto Vercel: [grupoprovisio/distribuidora](https://vercel.com/grupoprovisio/distribuidora)
- Site do projeto: [distribuidora-nine-phi.vercel.app](https://distribuidora-nine-phi.vercel.app/)
- Banco Supabase do projeto: referência `xprvdquocenfqvnokmmi`
- Stack: Next.js 16, React 19, TypeScript, Tailwind CSS 4 e Supabase SSR/Auth/Postgres.

O sistema **ainda não está pronto para compras reais**. CSV no portal do fornecedor permanece uma pré-validação local, sem publicação ou alteração do banco. O catálogo do comprador usa apenas leituras protegidas por RLS e continua sem ofertas até a homologação comercial. Cadastro público transacional, checkout, repasses e pedidos dependem de homologação. Dados reais não devem ser inventados para demonstração.

## Organização do produto

| Ambiente | Rotas | Estado |
| --- | --- | --- |
| Institucional | `/`, `/compradores`, `/fornecedores`, `/como-funciona` | Páginas e jornadas front-end |
| Catálogo público | `/produtos`, `/produtos/[slug]` | Sem publicação até backend aprovado |
| Comprador | `/app/comprador`, `/app/comprador/catalogo`, `/app/comprador/cotacoes`, `/app/comprador/pedidos` | Perfil protegido; compras em preparação |
| Fornecedor | `/app/fornecedor`, `/app/fornecedor/catalogo`, `/app/fornecedor/importar`, `/app/fornecedor/operacao`, `/app/fornecedor/homologacao` | Perfil protegido, catálogo próprio, operações e validação de CSV local |
| Administração | `/admin`, `/admin/marketplace`, `/admin/marketplace/homologacoes`, `/admin/acessos` | Gestão restrita, fila real de homologações e MFA |
| Login | `/entrar`, `/auth/callback`, `/recuperar-acesso`, `/seguranca/mfa` | Supabase, conforme flag e aprovação |

**Não desenvolver a função Sou vendedor**, representantes, carteiras ou comissões comerciais; esse escopo foi cancelado. Identificadores técnicos de fornecedor (`supplier`/`seller`) usados na operação do marketplace são conceitos distintos do perfil comercial aposentado.

## Segurança comercial e de dados

1. Produtos comercializáveis vêm apenas de cadastro próprio ou fornecedores formalmente autorizados.
2. Um produto mestre pode ter múltiplas ofertas, cada uma vinculada a sua organização fornecedora.
3. A distribuição interna da Provisio pode atuar como fornecedor autorizado, com rastreabilidade de origem.
4. A autorização ocorre no servidor e nas políticas de RLS; não confiar em `organization_id` fornecido pelo navegador.
5. A área de fornecedor consulta apenas linhas disponibilizadas pela RLS do usuário autenticado.
6. Nunca usar `service_role`, `sb_secret_` ou credenciais de produção no navegador.
7. Não publicar ofertas, processar pagamentos nem criar pedidos sem fluxo homologado.
8. A listagem privada de fornecedores também descarta fontes externas e preços de ofertas não aprovadas.

## Desenvolvimento local

Requisitos: Node.js e npm compatíveis com a versão atual de Next.js.

```bash
npm ci
npm run dev
npm run lint
npx next typegen
npm run typecheck
npm run test:marketplace
npm run test:supabase-foundation
npm run test:frontend-scope
npm run build
```

As variáveis públicas necessárias são `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; o Supabase de destino é validado em `lib/supabase/config.ts`. `MARKETPLACE_AUTH_ENABLED` controla o acesso autenticado. Consulte o contrato de infraestrutura antes de habilitar recursos em qualquer ambiente.

**Nenhum teste local, flag ou branch autoriza merge/deploy sem aprovação explícita.**

### Evolução auditável e próximas entregas (22/10/2026)

A página privada **Administração → Progresso do projeto** (`/admin/marketplace/progresso`) apresenta as 11 frentes de trabalho com percentuais de 0–100 para implementação, testes e validação em produção, além das prioridades e contagens reais consultadas no Supabase. São estimativas documentadas, não atestados automáticos de qualidade ou comercialização.

As telas de cotações, propostas e pedidos com reserva de estoque foram reconciliadas em uma branch isolada, **ainda não publicadas**. As próximas migrações são `0022` e `0023` (não reutilizar `0016/0017` porque essas versões já correspondem ao catálogo aplicado). `MARKETPLACE_TRANSACTIONS_ENABLED` permanece `false` por padrão. Ver `docs/marketplace/34-progresso-dois-perfis-integracao-20261022.md` e as suites PostgreSQL de transações e isolamento.

**P0:** domínio e credenciais/perfis independentes. **P1:** primeiro produto homologado com imagem e visibilidade do comprador; cotações e propostas em Preview. **P2:** pedidos e reservas, frete e expedição. **P3:** pagamentos e documentos fiscais, somente após regras comerciais e fiscais aprovadas.

## Documentação que deve orientar o Codex

1. `docs/marketplace/11-escopo-dois-perfis-20261017.md` — **decisão vigente**.
2. `PLANO_CODEX_DISTRIBUIDORA_MARKETPLACE_HIBRIDO.md` — planejamento por etapas, sujeito ao escopo vigente.
3. `DESIGN.md` e `UX-CONTRACT.md` — identidade e comportamento das interfaces.
4. `docs/marketplace/12-frontend-duas-jornadas-20261017.md` — implementação, limites e próximos testes.
5. `db/migrations/` e `scripts/sql-test/` — esquema e validações RLS.

O comparador antigo e seu README histórico continuam recuperáveis pelo histórico Git, mas **não são funcionalidades ativas do produto**.
