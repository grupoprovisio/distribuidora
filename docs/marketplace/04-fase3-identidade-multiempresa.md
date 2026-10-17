# Fase 3 — Identidade multiempresa e homologação

## Entregue

- Contratos locais para usuário, organização, capacidade, membro, papel e status.
- Matriz de papéis: comprador, solicitante, aprovador, financeiro, leitura, fornecedor, vendedor e admin de plataforma.
- `canAccessOrganization` exige usuário ativo, organização aprovada, membership ativo, vínculo de IDs, papel compatível e capacidade da organização.
- Fixture de comprador e fornecedor separados para testes negativos.
- Migração SQL versionada `db/migrations/0001_marketplace_foundation.sql`; artefato não aplicado em banco real.
- Endpoint `/api/marketplace/access` apenas diagnóstico local, sem criação de sessão ou acesso a dados comerciais.

## Testes

- `npm run test:marketplace`: passou, incluindo rejeição de fornecedor concorrente, organização diferente e membro revogado.
- `npm run typecheck`: passou.
- `npm run lint`: passou.

## Segurança multiempresa

O teste de acesso não confia apenas no ID recebido: valida vínculo, status, papel e capacidade. Ainda falta integrar essa política a uma identidade real, banco com RLS/policies equivalentes, MFA administrativa, rate limiting e audit log persistente.

## Bloqueios conscientes

Não há banco ou provedor de identidade autorizado no projeto. A migração não foi executada e nenhuma sessão real foi criada. O endpoint de diagnóstico não deve ser usado como autorização de produção.

## Próxima fase

Implementar catálogo próprio de produtos, SKUs, ofertas, tiers, regiões, estoque e importação CSV autorizada, mantendo a distribuidora como organização vendedora interna.
