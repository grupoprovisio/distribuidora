# Build offline — ajuste de infraestrutura local

## Alteração

Removida a dependência de `next/font/google` em `app/layout.tsx` e ajustada a pilha tipográfica para fontes do sistema em `app/globals.css`. O build deixou de depender do download de Manrope em `fonts.googleapis.com`. O script `build` usa o compilador Webpack do Next porque o Turbopack apresenta panic de binding de porta neste ambiente.

## Resultado

- `npm run typecheck`: passou.
- `npm run lint`: passou.
- `npm run test:marketplace`: passou.
- `git diff --check`: passou.
- `npm run build`: o Turbopack falhou ao criar processo/abrir porta durante o processamento de CSS (`Operation not permitted`), limitação do ambiente.
- `npx next build --webpack`: passou, compilando TypeScript e gerando as 51 páginas/rotas.

Nenhuma integração externa, credencial ou ambiente de produção foi alterado.
