# Homologacao B2B dos cinco modulos

Esta suite usa Chromium, Next.js, Supabase Auth/TOTP, PostgreSQL 17, PostgREST e Storage reais em containers locais. As chamadas comerciais nao sao simuladas nem substituidas por mocks. Nenhuma credencial do projeto hospedado e utilizada.

## Executar

Requisitos: Node.js 24, Docker disponivel e portas 3210/54321/54322/54324 livres. No macOS o projeto usa o Chrome instalado; no Linux, instalar o Chromium do Playwright. A porta 54324 pertence ao Mailpit local usado na recuperacao de senha.

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

## Regressao de recuperacao com MFA

`password-recovery-mfa.spec.mjs` acrescenta duas identidades sinteticas independentes, criadas e removidas exclusivamente no Supabase local: uma com TOTP verificado e outra sem MFA. Nao reseta o banco nem altera as oito identidades comerciais. A chave administrativa local serve somente para criar/remover essas fixtures; os testes nao geram links administrativos nem redefinem a senha por API administrativa.

O cenario solicita a recuperacao pela interface, le o e-mail realmente emitido pelo Auth e capturado no Mailpit e abre seu link no mesmo contexto Chromium que conserva o verificador PKCE. Antes de navegar, exige a origem Auth `http://127.0.0.1:54321`, o tipo `recovery` e o retorno exato `http://127.0.0.1:3210/auth/callback?flow=recovery`. Requisicoes do navegador para outras origens sao bloqueadas.

As verificacoes incluem sessao de recuperacao AAL1, rejeicao real `insufficient_aal` ao tentar alterar a senha sem MFA, codigo incorreto sem limpar campos nem atualizar a senha, desafio correto elevando a requisicao a AAL2, senha antiga rejeitada, senha nova aceita e preservacao do fator TOTP verificado. O teste aguarda o proximo intervalo TOTP quando necessario para nao reutilizar o codigo do cadastro. Nao grava e-mails, links, cookies, senhas, QR Codes, segredos TOTP nem tokens nos artefatos.

O segundo cenario confirma que a recuperacao continua funcionando para uma conta sem MFA: sem exigir autenticador, com troca em AAL1, senha antiga rejeitada e nova aceita. A execucao completa emite exatamente dois e-mails locais, respeitando a cota padrao de dois por hora; para repetir a suite, reinicie a stack descartavel ou aguarde a cota, sem aumentar limites do ambiente hospedado.

Para executar somente essa regressao apos iniciar a stack local:

```sh
npm run test:e2e -- tests/e2e/password-recovery-mfa.spec.mjs
```

Este resultado comprova envio e captura no SMTP **local**. A entrega a caixas externas do ambiente hospedado exige sua propria homologacao; nao e inferida a partir do Mailpit.

## Evidencias

`test-results/e2e-safe-summary.json` contem somente nomes, estados e duracoes dos cenarios. Capturas explicitas sao feitas exclusivamente depois da autenticacao/MFA, nas telas de produto e pedidos. Traces, videos, armazenamento de sessao e capturas automaticas de erro ficam desativados. Nao publicar logs brutos de autenticacao, QR Codes, tokens ou chaves locais.

## Limite do resultado

Uma aprovacao completa comprova os cenarios da suite no ambiente isolado, nao uma liberacao de transacoes em producao. A suite nao altera variaveis da Vercel, nao ativa cobranca, nao emite nota fiscal, nao chama transportadoras e nao comprova entrega fisica. A logistica testada e o acompanhamento manual implementado no produto.
