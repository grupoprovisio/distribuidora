# Grupo Provisio — Distribuidora + Marketplace B2B Híbrido

> **Em desenvolvimento, sem autorização para vendas reais.** Esta branch contém um núcleo comercial próprio e protótipos para os perfis comprador, vendedor, fornecedor e administração. Não existe backend comercial homologado, autenticação multiempresa persistente, pagamentos ativos ou catálogo de fornecedores reais.

## Escopo

- **Distribuidora própria e fornecedores terceiros homologados** compartilham a modelagem de produto mestre, SKU do fornecedor e oferta, com isolamento por organização.
- **VTEX/Atacadão não é fonte comercial.** Não são permitidas consultas, comparação, importação de preços ou conversão automática de históricos externos em ofertas.
- Componentes e práticas úteis do comparador anterior podem ser reutilizados após trocar a fonte dos dados.
- Preços, SKUs, fornecedores e pedidos de demonstração são exclusivamente **fictícios** e habilitáveis somente em desenvolvimento local.

O documento orientador está em [PLANO_CODEX_DISTRIBUIDORA_MARKETPLACE_HIBRIDO.md](./PLANO_CODEX_DISTRIBUIDORA_MARKETPLACE_HIBRIDO.md). Consulte [docs/marketplace](./docs/marketplace) para auditoria, plano de migração, ADRs, testes e bloqueios GO/NO-GO.

## Estrutura

| Pasta | Responsabilidade |
| --- | --- |
| `app/compradores`, `app/vendedores`, `app/fornecedores` | Páginas institucionais B2B |
| `app/produtos` | Catálogo autorizado, inicialmente em estado vazio |
| `app/app/*` e `app/admin/marketplace` | Portais ainda demonstrativos |
| `lib/marketplace` | Contratos de catálogo, permissões, simulação e importação CSV |
| `app/api/marketplace` | Endpoints demonstrativos bloqueados fora do desenvolvimento |
| `db/migrations` | SQL versionado **não aplicado** em banco remoto |
| `scripts/marketplace-*` | Testes e verificações da fundação |
| `app/legado` | Exportação voluntária de dados históricos do navegador, sem upload |

## Rodando localmente

Requisitos: Node.js 22, npm e dependências acessíveis.

```sh
npm ci
npm run dev
```

Sem flags, o catálogo retorna **estado vazio**; isso é esperado, pois não foram cadastradas ofertas reais. Os endpoints de demonstração exigem `NODE_ENV=development` e opt-in explícito:

```text
MARKETPLACE_DEMO_API_ENABLED=true
MARKETPLACE_CATALOG_ENABLED=true
MARKETPLACE_CHECKOUT_SIMULATION=true
```

**Nunca configure essas flags na Vercel**. Não há mecanismo real de cobrança ou cadastro autorizado nessas rotas. `MARKETPLACE_PUBLIC_SIGNUP` permanece desligada.

## Testes

```sh
npm run test:marketplace
npm run typecheck
npm run lint
npm run build
```

O build usa `next build --webpack`, sem download de fontes remotas. Consulte o resultado de testes por branch nos relatórios em `docs/marketplace`; execuções anteriores **não comprovam** que toda nova alteração passou na suíte completa.

## Rotas antigas e histórico

A migração substitui `/buscar`, `/categorias`, `/promocoes`, `/ofertas`, `/produto/[id]`, `/scan`, `/checkout` e outros fluxos do comparador por redirecionamentos explícitos para o catálogo autorizado ou portais de demonstração. Endpoints comerciais legados retornam HTTP `410 Gone`.

O arquivo `lib/legacy-commercial-access.ts` impede que os adaptadores comerciais antigos consultem VTEX/Atacadão. A desativação não apaga informações locais: `/legado` permite exportar dados do navegador em JSON para guarda particular. Esses dados **não são transformados em ofertas**, e a nova aplicação não os envia automaticamente para um servidor.

## Limites e liberação

- Supabase `xprvdquocenfqvnokmmi`: **não alterado** nesta execução; ainda sem tabelas de marketplace no schema `public`.
- Identidade, administração e RLS ainda requerem implementação e testes em staging, inclusive ataques entre organizações.
- Cadastro e importação real de produtos exigem fornecedores aprovados e trilha de auditoria.
- Pedido simulado **não** é pedido real; repasse, comissão, fiscal, logística e pagamento exigem contratos, integrações e testes separados.
- **Não executar merge, deploy, migração de produção ou pagamentos reais** até checklist de homologação e autorização explícita.

## Documentos mais importantes

- [Auditoria e matriz de dependências](./docs/marketplace/00-auditoria.md)
- [Plano de migração](./docs/marketplace/01-plano-migracao.md)
- [Relatório de hardening](./docs/marketplace/11-ciclo-auditoria-seguranca-20261014.md)
- [Critérios GO/NO-GO](./docs/marketplace/08-fase9-go-no-go.md)

**Estado de release:** NO-GO.
