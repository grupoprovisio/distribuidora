# Plano de migração — marketplace B2B híbrido

## Estratégia

Introduzir um núcleo de domínio interno em paralelo ao comparador legado. A seleção da fonte comercial será feita por `MARKETPLACE_CATALOG_ENABLED`, desligada por padrão. Enquanto desligada, as novas rotas exibem estado vazio/fixture de desenvolvimento, nunca dados VTEX/Atacadão.

## Matriz de transição

| Legado | Destino | Rollback local |
|---|---|---|
| `/api/catalog` e `/api/catalog/prices` | `MarketplaceCatalogRepository` + `AuthorizedOffersRepository` | Flag OFF mantém contrato legado apenas fora do novo fluxo; remover antes do release |
| `/api/lookup` e `/scan` | lookup por GTIN/SKU autorizado | Estado vazio quando não houver match |
| `/ofertas`, `/promocoes` | ofertas/campanhas internas homologadas | Redirecionamento para `/produtos` |
| `/produto/[id]` | `/produtos/[slug]` com produto mestre/ofertas | Resolver slug legado sem consultar origem externa |
| `/checkout` | `/app/comprador/carrinho` e subpedidos | Pedido apenas simulado até aprovação |
| VTEX ID | identidade própria multiempresa | Login legado somente enquanto fora do fluxo novo |
| `localStorage` | migração explícita para listas legadas | manter leitura somente local, sem conversão comercial |

## Flags

- `MARKETPLACE_CATALOG_ENABLED=false` por padrão.
- `MARKETPLACE_CHECKOUT_SIMULATION=false` por padrão.
- `MARKETPLACE_PUBLIC_SIGNUP=false` até existir backend seguro.

## Rollback

Cada fase deve ser revertível por commit. Nenhuma migração destrutiva de localStorage ou código legado. Não criar recursos externos, banco real, webhook, pagamento ou credencial.

## Dependências bloqueadoras

Identidade própria, PostgreSQL gerenciado, políticas de tenant, homologação, contratos fiscais/logísticos e provedor de pagamento são decisões posteriores. Nesta branch, usar somente contratos e fixtures locais.
