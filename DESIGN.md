---
version: alpha
colors:
  canvas: "#f3f6f4"
  paper: "#ffffff"
  ink: "#15302a"
  muted: "#6c7d77"
  line: "#e2e9e5"
  forest: "#0e4b3f"
  forest-deep: "#08362d"
  lime: "#b9e36b"
  lime-soft: "#e6f5c7"
  terra: "#b4501f"
  sand: "#f6e6c6"
typography:
  body:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
  display:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
omitted:
  - section: spacing
    reason: "Tailwind utility spacing remains owned by the existing codebase."
  - section: rounded
    reason: "Current Tailwind radius utilities remain owned by the existing codebase."
---

## Overview
Grupo Provisio: cadeia de abastecimento B2B para apenas dois públicos, comprador e fornecedor. A interface deve inspirar credibilidade operacional, sem copiar a Cayena. Identidade já consolidada em verde-floresta, verde-limão, branco e acentos terrosos. Site institucional é expressivo; painéis usam clareza e previsibilidade.

## Colors
Fonte canônica: `app/globals.css` (`@theme`). Este arquivo espelha os valores compartilhados; não gere um segundo tema. Verde-escuro é identidade e ação principal; lime expressa convite; terra rotula tópicos; sand sinaliza informação pendente. Não apresentar dados fictícios como operações reais.

## Typography
Fonte de sistema já usada pelo projeto. Hierarquia: títulos de alta legibilidade, corpo em pt-BR e rótulos de navegação explícitos. Não trocar fontes globais em uma página isolada.

## Layout
Container compartilhado `WRAP`, cantos arredondados, grid responsivo, CTA mínimo de 44 px, leitura em celular e desktop. Não reintroduzir vitrines de produtos externos na homepage institucional.

## Elevation & Depth
`shadow-card` para cartões; `shadow-float` reservado a elementos de destaque. Profundidade serve para agrupar informação.

## Shapes
Botões arredondados conforme código atual; cartões grandes com bordas discretas. Preservar o padrão de foco visível.

## Components
`AppHeader`, `FloatingNav`, `SiteFooter`, `MarketplaceRoleLanding`, `MarketplaceJourney` e `MarketplaceLeadForm` são os proprietários compartilhados das áreas públicas. Evitar duplicação de cabeçalho ou rodapé dentro das páginas.

## Do's and Don'ts
- Exibir apenas `Sou comprador` e `Sou fornecedor`; vendedor não é um perfil público nem portal.
- Manter avisos honestos quando compras, publicação de ofertas ou cadastros ainda não estão ativos.
- Nunca vender nem reproduzir produtos VTEX/Atacadão sem cadastro e autorização próprios.
- `mailto` prepara mensagem no cliente; não afirmar envio realizado.
- Não alterar produção, identidade global, dados financeiros ou políticas de autenticação nesta frente visual.
