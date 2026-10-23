# Provisio — Homologação hospedada, 23/10/2026

> **Não declarar 100%** com base apenas em execução de SQL privilegiado, estado de migrações ou E2E local.
> Escopo comercial exclusivo: **Sou fornecedor** e **Sou comprador**, com **ADM** interno.

## Evidências do Supabase hospedado

Projeto: `xprvdquocenfqvnokmmi`. Auditoria somente leitura.

- Auth: 2 usuários confirmados, ambos já acessaram.
- Organizações: 2; operador de testes aprovado com capacidade PLATFORM_OPERATOR e SUPPLIER; comprador de testes aprovado com capacidade BUYER.
- Vinculações: 2 PLATFORM_ADMIN na operadora; 1 BUYER e 1 ORG_ADMIN na organização compradora.
- Catálogo: 1 produto, 1 SKU/associação fornecedor, 1 oferta, **0 imagens**.
- Transações: **0 cotações, 0 propostas, 0 pedidos**.
- Migrações 0016 a 0025 aplicadas; existência da migração não equivale a homologação operacional.
- Segurança: alerta Supabase de proteção contra senhas vazadas desligada. As tabelas privadas catalog_audit e fulfillment_audit têm RLS ativo sem políticas; conferir se o bloqueio total é intencional (não criar políticas amplas).
- PRs #39 e #40 integrados; recuperação de senha real confirmada pelo titular. Histórico automatizado: 21/21 E2E locais.

## Bloqueio real

As contas atuais compartilham privilégios administrativos, e não há identidade autenticada exclusiva de fornecedor não administrador. Testar isolamento entre essas contas **não prova isolamento**. Não reutilizar uma conta de PLATFORM_ADMIN como fornecedor adversarial; não modificar senhas, MFA ou permissões dos titulares.

## Identidades descartáveis para homologação

Preparar **quatro** contas Auth distintas, usando caixas sob controle de testes e nenhum privilégio herdado:

1. A: plataforma/ADM, exclusivamente PLATFORM_ADMIN, com TOTP AAL2.
2. B: fornecedor A, membro `SUPPLIER` de empresa A, sem PLATFORM_ADMIN.
3. C: fornecedor B, membro `SUPPLIER` de empresa B, sem PLATFORM_ADMIN.
4. D: comprador C, membro `BUYER` de organização compradora, sem PLATFORM_ADMIN.

Configurar empresas e conteúdos sintéticos explicitamente marcados NAO COMERCIAL. Criação pela aplicação ou procedimentos administrativos auditáveis, nunca via inserção direta em `auth.users`. Não enviar credenciais por commit/PR.

## Critérios de aceite (evidenciar no navegador e no banco)

| Caso | Ação | Esperado |
|---|---|---|
| AUTH-01 | Logins simultâneos A/B/C/D em perfis independentes | Cookies/sessões isolados; papéis corretos |
| AUTH-02 | ADM sem AAL2 | Negado; ação aprovada com TOTP válido |
| TENANT-01 | Fornecedor B tenta ler/editar SKU e estoque de A | 0 registros visíveis; mutação negada |
| TENANT-02 | Comprador tenta alterar preço/estoque e aprovar produto | Negado por RLS e API |
| SUP-01 | B cadastra produto e submissão | Rascunho pendente somente de B |
| SUP-02 | B altera preço, estoque e imagem WebP privada | Alterações persistem; Storage privado; outros fornecedores sem acesso |
| ADM-01 | A aprova catálogo e mudanças pendentes sob MFA | Antes invisível ao comprador; depois visível se oferta/região/estoque elegíveis |
| BUY-01 | D navega filtros e detalhes de uma oferta aprovada | Apenas preço/estoque/região autorizados; ofertas pendentes invisíveis |
| RFQ-01 | D cria cotação, B responde com proposta | Estados corretos, sem divulgação indevida a C |
| ADM-02 | A audita decisões e rejeições | Logs imutáveis suficientes, sem senhas, códigos MFA ou tokens |
| CLEAN-01 | Apagar apenas registros sintéticos próprios | Sem afetar organizações/pedidos existentes; evidências preservadas |

## Critérios de lançamento

- Não ativar flag transacional de produção antes de AUTH-01..ADM-02 aprovados no Supabase **hospedado**.
- Registrar evidence ID, commit, domínio/ambiente, usuário de teste anonimizado, horário, execução SQL RLS negativa e positiva.
- Rodar suites locais e CI (lint, tsc, build, SQL RLS e E2E).
- Marcar avanço do painel apenas após evidências; porcentagens `code/tests/production` independentes.
- Em produção, evitar compras reais, e-mails para terceiros, manipulação de estoque comercial e alteração de fatores MFA dos usuários existentes.

## Próximas decisões

Sem quatro contas separadas (incluindo dois fornecedores) ou ambiente de homologação isolado, a prova de isolamento e o ciclo completo seguem bloqueados. Esta matriz permite executar tudo quando o acesso seguro estiver pronto.

## Execução adicional hospedada — 23/10/2026

Esta seção registra evidências reais sem divulgar endereços de e-mail, senhas, códigos ou URLs de ativação.

- **Auth oficial:** foi criada uma identidade sintética e não privilegiada para Fornecedor A pelo `signUp` do Supabase. O e-mail de confirmação chegou à caixa autorizada. A verificação via link do titular ainda não foi concluída; o usuário Auth permanece **não confirmado** e com perfil **pending**. Não tratar como sessão homologada.
- **Contagens atuais:** 3 usuários Auth ao todo (2 preexistentes e 1 sintético pendente), 2 organizações; nenhuma imagem, cotação, proposta ou pedido comercial no banco hospedado.
- **RLS:** as 19 tabelas comerciais de `public` apresentam `relrowsecurity=true`. Um `SELECT` como role `anon` em `products` foi negado (SQLSTATE 42501); como role `authenticated` **sem JWT**, 0 produtos ficaram visíveis. Isso valida negações básicas, **não** o isolamento entre identidades e organizações reais.
- **Storage:** bucket `provisio-produtos` com `public=false`, atualmente sem arquivos; upload com usuário real permanece pendente.
- **Auditoria:** 17 registros históricos de acesso, 8 de catálogo e 0 transições de pedidos, verificados somente por contagem; não são evidência de novas ações testadas.
- **Rotas do site em produção:** páginas `/app/fornecedor`, `/app/comprador` e `/admin/marketplace` redirecionam sessões anônimas para `/entrar` (307). A API `/api/marketplace/transactions` retorna 503 com a flag transacional desativada. Uma Preview protegida consultada com a identidade Vercel do projeto também retornou 503: **não habilitar transações em produção para forçar os testes**.
- **Regressões existentes:** suíte local com 21/21 E2E aprovados, além de lint, TypeScript e build. Os testes locais não substituem execução comercial hospedada.
- **Controle de risco:** não foram editadas senhas, MFA ou permissões de usuários existentes, não foram criadas organizações comerciais nem pedidos, e não houve deploy ou mudança de flags.

**Próximo bloqueio operacional:** o titular deve ativar a identidade sintética pelo e-mail legítimo. É necessário ainda provisionar Fornecedor B e Comprador com caixas controladas, configurar cada associação exclusiva e realizar MFA administrativo pelo titular ou por ambiente QA isolado. Só então executar os casos hospedados de escrita, leitura positiva/negativa e auditoria.

## Execução hospedada complementar — 23/10/2026 (fornecedor B e comprador)

**Ambiente:** Supabase `xprvdquocenfqvnokmmi`, com alterações limitadas a registros rotulados `PROVISIO QA ... - NAO COMERCIAL`; contas anteriores inalteradas.

1. Fornecedor **A**: Auth e e-mail confirmados, perfil ativo, organização própria `SUPPLIER` aprovada e vínculo `SUPPLIER_ADMIN` ativo. Não recebe papel `PLATFORM_ADMIN`.
2. Fornecedor **B**: criado pelo fluxo oficial `supabase.auth.signUp`; email enviado e confirmado na caixa Gmail controlada **como entregue**, mas **a identidade ainda não foi confirmada pelo titular**. Organização `SUPPLIER` independente criada, capacidade `SUPPLIER` aprovada, vínculo `SUPPLIER_ADMIN` mantido em `invited`, perfil `pending`. O vínculo não concede acesso antes da ativação.
3. Comprador **QA**: organização `BUYER` própria criada e aprovada, capacidade `BUYER` aprovada e região `BR-SP` cadastrada. **Não há usuário comprador independente vinculado**. A tentativa de cadastro oficial da identidade `buyer` recebeu HTTP 429 `over_email_send_rate_limit`. Não aumentar a cota, forjar confirmação nem inserir diretamente em `auth.users`.
4. RLS hospedado: todas as políticas comerciais continuam ativas. Uma transação SQL `READ ONLY` com `SET LOCAL ROLE authenticated` e alegação simulada de usuário enxergou **zero** linhas, inclusive da própria organização do Fornecedor A. O motivo foi verificado no código do banco: `marketplace_private.has_active_membership` requer `has_live_auth_session()`, que confere um `auth.sessions.id` vigente correspondente ao `session_id` do JWT. **Não criar/forjar sessão para contornar essa proteção**. O teste realizado comprova negação a uma identidade sem sessão válida, não isolamento de dois logins reais.
5. Cotações, propostas, pedidos, reservas e imagens ainda carecem de execução hospedada como clientes Auth reais. Não foram criadas transações ou ofertas fictícias aprovadas nesta etapa; flag de transações global permanece **desabilitada**, sem deploy de transações.
6. A tentativa de preparar um guard de Preview transacional restrito a QA ficou sem integração validada; código experimental foi removido da branch, mantendo as rotas inalteradas.

**Aceite ainda bloqueado:** confirmação do Fornecedor B, provisionamento da identidade Comprador quando a cota do SMTP Auth permitir, vínculo `BUYER` exclusivo ativo, sessões simultâneas reais, casos TENANT-01/02 com JWT assinado e E2E Auth → fornecedor → aprovação ADM MFA → comprador → cotação → proposta → pedido. O painel geral permanece estimativo; não somar registros de QA à produção homologada.
