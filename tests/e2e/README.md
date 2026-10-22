# Homologacao B2B dos cinco modulos

Esta suite usa Chromium, Next.js, Supabase Auth/TOTP, PostgreSQL 17, PostgREST e Storage reais em containers locais. As chamadas comerciais nao sao simuladas nem substituidas por mocks. Nenhuma credencial do projeto hospedado e utilizada.

## Executar

Requisitos: Node.js 24, Docker disponivel e portas 3210/54321/54322 livres. No macOS o projeto usa o Chrome instalado; no Linux, instalar o Chromium do Playwright.

```sh
npm ci
npx playwright install --with-deps chromium
npm run test:e2e:start
npm run test:e2e
npm run test:e2e:report
npm run test:e2e:stop
```

O projeto local fixo `provisio-local-e2e` e **descartavel**: cada execucao reseta exclusivamente seu banco e aplica as migracoes do repositorio. Nao o use para guardar trabalho. O runner nao aceita URLs remotas; a excecao do aplicativo exige simultaneamente `NODE_ENV=development`, a flag explicita de E2E, a API exata `http://127.0.0.1:54321` e o navegador em `127.0.0.1`. Builds de producao rejeitam essa excecao.

## Identidades e seguranca

O bootstrap local cria oito identidades Auth independentes: administrador, fornecedores A/B, compradores A/B, leitor, usuario com dois perfis e usuario pendente. A senha documentada em `local-env.mjs` e uma fixture publica local, nunca uma credencial de producao. O administrador configura e confirma TOTP pela interface. As acoes comerciais usam a sessao real do respectivo usuario; a chave administrativa local e usada somente para criar fixtures Auth.

O banco e consultado diretamente para verificar os efeitos e preparar estados negativos, nunca para substituir cadastro de produto, aprovacao comercial, estoque, cotacao, proposta, pedido, reserva ou entrega da jornada positiva.

## Evidencias

`test-results/e2e-safe-summary.json` contem somente nomes, estados e duracoes dos cenarios. Capturas explicitas sao feitas exclusivamente depois da autenticacao/MFA, nas telas de produto e pedidos. Traces, videos, armazenamento de sessao e capturas automaticas de erro ficam desativados. Nao publicar logs brutos de autenticacao, QR Codes, tokens ou chaves locais.

## Limite do resultado

Uma aprovacao completa comprova os cenarios da suite no ambiente isolado, nao uma liberacao de transacoes em producao. A suite nao altera variaveis da Vercel, nao ativa cobranca, nao emite nota fiscal, nao chama transportadoras e nao comprova entrega fisica. A logistica testada e o acompanhamento manual implementado no produto.
