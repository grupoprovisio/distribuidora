# Fase 0 — Auditoria do marketplace B2B híbrido

Data: 2026-10-08  
Commit-base: `0e6f1948b98359dfbbeed90c505d9ef3d94a489b`  
Branch: `marketplace-b2b-hibrido`

## Escopo e evidências

O checkout contém 123 arquivos em `app`, `components` e `lib`, sem suíte de testes automatizados rastreada. O projeto é Next.js 16.3.5/React 19.2.8/TypeScript 5/Tailwind 4. Não há banco, migrações, CI ou variáveis de produção rastreadas; há apenas `vercel.json` e configuração local de `DEV_ORIGINS`/`NEXT_PUBLIC_SITE_URL`.

Baseline:

- `npm run lint`: passou.
- `npm run build`: bloqueado ao baixar `Manrope` de `fonts.googleapis.com` via `next/font`; não foi observado erro de aplicação antes da falha externa.
- `npx tsc --noEmit`: ainda deve ser executado após a fundação de domínio; não havia script `typecheck`.

## Dependências externas e comerciais

| Área | Arquivos/rotas | Dependência atual | Decisão de migração |
|---|---|---|---|
| Catálogo/busca | `lib/atacadao.ts`, `lib/catalog-index.ts`, `app/api/catalog/*`, `components/product-grid.tsx`, `search-results.tsx` | GraphQL FastStore e catálogo legado VTEX | Desativar no domínio comercial; adaptar para repositório autorizado interno |
| Preço/atacado | `lib/atacadao.ts`, `lib/deals.ts`, `/api/catalog/prices`, `/api/list/compare` | Simulação VTEX por seller e tiers | Preservar lógica genérica de tiers; trocar origem por `offer_price_tiers` local |
| Ofertas/promoções | `lib/promos.ts`, `lib/suggest.ts`, `/api/promos`, `/api/suggest` | Coleções e produtos Atacadão | Adaptar para campanhas/ofertas autorizadas; sem importar dados externos |
| Scanner/lookup | `lib/atacadao.ts`, `lib/scan*`, `/api/lookup`, `/scan` | EAN e semelhantes do catálogo externo | Preservar UX; consultar somente GTIN/SKU interno autorizado |
| Filiais/entrega | `lib/atacadao.ts`, `lib/receipt.ts`, `/api/filiais/*` | Pickup points, ViaCEP e dados da NFC-e | ViaCEP/NFC-e podem permanecer auxiliares; seller/filial VTEX sai do fluxo comercial |
| Autenticação | `lib/vtex-auth.ts`, `/api/auth/*`, `/conta` | VTEX ID e cookie de sessão VTEX | Substituir por identidade própria; não reutilizar sem autorização/contrato |
| Imagens | `next.config.ts`, homepage, `lib/atacadao.ts` | CDNs `vteximg`/`vtexassets` | Remover do catálogo final; aceitar mídia de produto autorizada |
| Persistência | `lib/list-store.ts`, `builder-store.ts`, `purchase-store.ts`, `prefs-store.ts`, `account-store.ts` | `localStorage`, `sessionStorage`, cookies | Preservar/migrar UX local; nunca converter registros externos em ofertas |

## Inventário de rotas

### Reutilizar/adaptar

`/`, `/categorias`, `/buscar`, `/favoritos`, `/lista`, `/lista/montar`, `/lista/sugestoes`, `/conta`, `/conta/compras`, `/conta/configuracoes`, `/contato`, `/empresas`, `/entregas`, `/quem-somos`, `/privacidade`, `/termos`.

### Substituir ou redirecionar controladamente

`/ofertas`, `/promocoes`, `/produto/[id]`, `/checkout`, `/scan`, `/api/catalog`, `/api/catalog/prices`, `/api/lookup`, `/api/list/compare`, `/api/promos`, `/api/suggest`, `/api/filiais/*` e `/api/auth/*` dependem direta ou indiretamente do comparador externo. Devem ganhar adaptadores internos antes de qualquer remoção.

### Novas rotas previstas

Públicas: `/compradores`, `/vendedores`, `/fornecedores`, `/como-funciona`, `/sobre`, `/ajuda`, `/produtos`, `/produtos/[slug]`, `/termos-marketplace`.

Privadas: `/app/comprador/*`, `/app/vendedor/*`, `/app/fornecedor/*`; `/admin/*` deve evoluir para RBAC/ABAC real.

## Componentes e bibliotecas

Componentes de apresentação e interação a preservar/adaptar: `product-card`, `product-grid`, `price`, `qty-control`, `heart-button`, `list-*`, `builder-view`, `checkout-view`, `scanner`, `search-*`, `promo-*`, `profile-view`, `site-footer`, `app-shell` e navegação. A lógica de origem deve sair desses componentes e ficar nos repositórios do marketplace.

Stores locais úteis: lista/favoritos/checklist, rascunho do montador, compras salvas e preferências. O cookie de e-mail não é identidade suficiente para multiempresa; deve ser tratado como legado local.

## Segurança e riscos

- Não foram encontrados arquivos `.env` rastreados, mas há chamadas externas hard-coded e comentários que documentam credenciais/cookies VTEX.
- Não há isolamento por organização, RBAC/ABAC, RLS, pedidos server-side, ledger, idempotência de checkout ou audit log.
- Os parâmetros `seller`, IDs e e-mails são controlados pelo cliente em vários fluxos antigos; não podem ser reutilizados para autorização.
- Compras/listas locais têm dados derivados do catálogo antigo; devem ser arquivadas ou marcadas como legado, nunca promovidas automaticamente a oferta.
- Vercel/GitHub não foram acessados nem alterados nesta fase.

## Critério de saída da Fase 0

Inventário, matriz, ADRs e baseline registrados. A Fase 1 pode começar somente com fixtures locais e fontes autorizadas explícitas, com feature flag desligada por padrão. Nenhuma chamada VTEX/Atacadão pode ser feita pelo novo catálogo.
