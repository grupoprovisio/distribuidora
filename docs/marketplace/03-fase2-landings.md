# Fase 2 — Landing pages, UX e cadastro

## Entregue

- `/compradores`: posicionamento para negócios que compram e abastecem.
- `/vendedores`: carteira, atuação regional e comissões como conceitos, sem prometer renda.
- `/fornecedores`: homologação, catálogo autorizado e operação por subpedido.
- Componente compartilhado `MarketplaceRoleLanding` para consistência visual e acessibilidade.
- `MarketplaceLeadForm` com estados de preenchimento e sucesso demonstrativo.
- Avisos explícitos de que cadastro público, pedidos, cobrança e integrações financeiras ainda não estão ativos.
- Metadados SEO específicos por perfil.

## Testes

- `npm run typecheck`: passou.
- `npm run lint`: passou.
- `npm run test:marketplace`: passou.
- `npm run build`: permanece bloqueado pelo download de Manrope em `fonts.googleapis.com`.

## Segurança e escopo

Os formulários não fazem `fetch`, não armazenam dados e não enviam informações para terceiros. O sucesso exibido é apenas demonstração local. Não há cadastro real nem identidade pública ativada.

## Próxima fase

Projetar identidade multiempresa e persistência server-side local/teste, com schema versionado e autorização por organização antes de transformar os formulários em cadastro real.
