# Integração segura dos PRs #24, #25, #26 e #27

Data da análise: 21/10/2026. Base: main no commit ab312211106ec6f700cb2f66d72a254d3bc3b798.

## Decisão de escopo
Somente Sou comprador e Sou fornecedor, além do painel interno ADM. Não implementar Sou vendedor. Preservar as páginas públicas atuais, autenticação, MFA, RLS e cadastro CSV da main.

## Diagnóstico de divergência
- #24 (frontend e progresso): 21 commits à frente e 3 atrás da main.
- #25 (RFQ, propostas e pedidos): 30 à frente e 3 atrás.
- #26 (interface de transações): 22 à frente e 3 atrás; ramificação paralela sobre #25.
- #27 (reservas e transições): 46 à frente e 3 atrás; não substitui a revisão independente de #26.
- Três commits adicionais da main correspondem aos PRs #30 (CSV persistido), #31 (ADM no menu) e #32 (mobile e tradução).

## Sequência de incorporação exigida
1. Começar de main atualizada em branch de integração isolada.
2. Trazer #24 seletivamente, preservando componentes e novas interfaces da main.
3. Reconciliar #25 e #26 sem duplicar handlers, RPCs ou arquivos SQL divergentes; comparar arquivos e diffs manualmente.
4. Incorporar #27 por último, validar migrations 0016/0017 em Postgres descartável antes de qualquer ambiente remoto.
5. Consolidar o painel de progresso com os três gates separados: código, CI/testes e funcionamento validado em produção. Para métricas ainda não auditadas, exibir “não aferido”, sem percentuais inventados.
6. Rodar test:frontend-scope, test:marketplace, test:supabase-foundation, typecheck, lint, build e testes SQL/RLS incluindo falhas de autorização multiempresa; validar Preview autenticado.
7. Só então propor merge na main. Sem migrações remotas, feature flags transacionais ou deploy de produção sem homologação.

## Bloqueios
- A mera existência de PRs ou CI em commits antigos não valida o commit consolidado.
- Operações transacionais permanecem atrás da flag desativada até staging homologado.
- Verificar que informações de fornecedores de uma empresa nunca vazem para outra.
- Não atribuir 100% ao funcionamento em produção sem evidências E2E, deploy SHA e dados reais.

Este documento descreve a reconciliação necessária; NÃO declara que os PRs #24–#27 já foram integrados.
