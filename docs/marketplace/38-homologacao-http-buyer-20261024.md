# Homologação — Supabase Auth real e fornecedor HTTP (24/10/2026)

## Escopo, método e proteção

Projeto hospedado `xprvdquocenfqvnokmmi`, produção `https://grupoprovisio.com`, exclusivamente duas jornadas comerciais **Sou fornecedor** e **Sou comprador**, além do ADM interno. Alterações de dados limitadas a empresas denominadas `PROVISIO QA ... - NAO COMERCIAL`.

Este registro distingue: (a) **requisições HTTP assinadas por sessão Supabase real**; (b) simulação reversível dos RPCs SQL hospedados da rodada anterior; (c) E2E de navegador em ambiente local descartável. **Nenhum desses métodos substitui os outros.**

## Identidades e autorizações

| Identidade | Auth no Supabase hospedado | Vínculo comercial |
|---|---|---|
| Fornecedor QA A | E-mail confirmado; login por senha HTTP e `auth.getUser()` verificados | `SUPPLIER_ADMIN active` exclusivamente na organização QA A |
| Fornecedor QA B | E-mail confirmado; perfil e vínculo ativos | `SUPPLIER_ADMIN active` exclusivamente na organização QA B; senha de fixture não corresponde mais à senha atual, logo login HTTP B não foi revalidado |
| Comprador QA | **Conta Auth criada oficialmente** por `auth.signUp`; e-mail de confirmação entregue | Organização BUYER QA aprovada e região BR-SP configurada; perfil `pending`, vínculo `BUYER invited`, **sem PLATFORM_ADMIN** |
| ADM atual | Sessões AAL2 existentes no banco | Teste positivo de MFA e ações via navegador **ainda pendentes**; não usar claims SQL para afirmar autenticação real |

**Identidade BUYER de homologação:** `id377585+provisioqa-buyer-20261023@gmail.com`. É um usuário Supabase Auth distinto, apesar de a entrega das mensagens ocorrer na caixa Gmail controlada pelo titular. O link de confirmação foi entregue. A tentativa de abri-lo automaticamente foi recusada pelos controles de segurança: é necessária confirmação pelo titular. Não utilizar SQL para definir `email_confirmed_at` nem liberar papel `BUYER active` antes dessa confirmação.

## Requisições HTTP assinadas efetivamente realizadas

A partir de um cliente `supabase-js` com chave pública, sem `service_role`:

1. `auth.signInWithPassword` do Fornecedor QA A: **sucesso**.
2. `auth.getUser()`: identidade do usuário confirmada contra Supabase Auth, não contra conteúdo de cookie.
3. `select` na tabela `organizations`: **somente a organização QA A**.
4. `select` em `supplier_product_submissions`: recebeu a solicitação QA A; filtro pela solicitação `QA-B-20261024-FEIJAO` retornou **0 linhas**.
5. Cadastro real de `QA-A-HTTP-20261024-REAL-AUTH` pela Data API: **sucesso**, registrado com `status=pending`, autor e organização próprios.
6. Tentativa real da conta fornecedora de executar `promote_supplier_submission`: **SQLSTATE 42501** (ADM não autorizado).
7. **Limpeza após prova:** o único registro `QA-A-HTTP-20261024-REAL-AUTH` foi excluído por comando administrativo SQL restrito à organização QA A, `pending` e nome esperado, retornando exatamente 1 linha. Nenhum item de teste foi publicado.
8. Fornecedor B: tentativa com senha inicial de fixture deu `invalid_credentials`. Não implica defeito da autenticação; senha pode ter sido alterada pelo titular. Não foi feita recuperação ou redefinição de sua senha.
9. Comprador: tentativa de login com conta não confirmada retornou `email_not_confirmed` — controle de Auth esperado.

**Limitação de navegador:** a automação Playwright em Chrome headless conectado ao computador autorizado não conseguiu carregar `https://grupoprovisio.com/entrar` (`net::ERR_ABORTED` e timeout de navegação). Portanto, **nenhum teste de browser hospedado** foi declarado concluído nesta rodada. A bateria anterior de 21/21 E2E em navegador passou **somente com Supabase local descartável**.

## Segurança de senhas — restrição de plano comprovada

A integração oficial Supabase retornou `Grupo Provisio: plan=free, tier=tier_free`. O Security Advisor mantém `auth_leaked_password_protection` com nível WARN. A documentação oficial Supabase informa que o bloqueio de senhas vazadas por HaveIBeenPwned é **exclusivo dos planos Pro e superiores**: https://supabase.com/docs/guides/auth/password-security

**Não foi habilitado nem adquirido o plano Pro**, nem alteradas credenciais ou parâmetros Auth no painel. O aviso seguirá até uma mudança de plano autorizada. Basic MFA e RLS seguem disponíveis no Free.

## Itens de aceite ainda pendentes

- **Comprador:** clicar na confirmação recebida, ativar perfil e vínculo exclusivamente BUYER, testar login HTTP assinado real (não usar ADM como substituto).
- **MFA:** realizar login e aprovação de produto/preço na interface do ADM com AAL2 real; observar auditoria persistida.
- **Fornecedor B:** realizar login HTTP real com senha vigente, RLS contra A e fluxos próprios.
- **Imagens:** validar upload WebP com ADM autenticado no Storage privado, metadados, imagem em catálogo e negação de acesso cruzado.
- **Ciclo comercial:** testar comprador → cotação → fornecedor/proposta → pedido → reserva → expedição → entrega com identidades HTTP distintas na aplicação hospedada; testar negativas, idempotência e auditoria.
- **Acesso comercial:** a flag global de transações permanece desligada até E2E hospedado completo.
- **Proteção contra senhas vazadas:** depende do Pro; não somar como concluída.

**Pontuação:** o Supplier QA demonstrou uma nova etapa de produção por HTTP assinado, sem completar todos os critérios. Atualizar somente o checkpoint de produção do módulo Fornecedor de 1/4 para 2/4; demais módulos sem aumento artificial. Nenhum pedido, cotação ou imagem real de homologação foi publicado.
