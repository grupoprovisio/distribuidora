# Provisio — homologação do login e segurança usando Supabase Free

Data: 2026-10-17. Destino único: `xprvdquocenfqvnokmmi`. Este roteiro substitui qualquer indicação anterior de que seria necessário comprar Pro para concluir a implementação técnica. **A ativação é possível no Free**, com a exceção da proteção contra senhas vazadas (recurso pago e não obrigatório ao funcionamento).

## Execução concluída
- Dez tabelas públicas de marketplace, todas com RLS forçado.
- Migrações em Supabase: correção do RLS event trigger e `0001` a `0011`.
- `0010`: RLS nega sessão removida de `auth.sessions` mesmo quando o JWT ainda está válido; testes negativos em Postgres 17.
- `0011`: impedir pela Data API que administrador bloqueie próprio perfil, revogue próprio vínculo `PLATFORM_ADMIN` ou suspenda a organização central.
- Tipos TypeScript reais do schema gerados em `lib/supabase/database.types.ts`.
- Tela `/entrar`: senha ou link para conta preexistente; recuperação de senha, callback, logout e TOTP AAL2.
- `/conta` converge para `/app` quando `MARKETPLACE_AUTH_ENABLED=true`; endpoints OTP VTEX (`/api/auth/send`, `/api/auth/verify`) retornam 410 nesse modo. **Com a flag desativada, a operação legada permanece preservada.**
- Testes GitHub: consulta privada entre empresas, revogação em tempo real, roles, MFA, build Next.js e smoke HTTP.

## Sem assinatura Pro — configuração mínima recomendada no Dashboard
As ações abaixo são ajustes de Auth e Vercel ainda dependentes da conta proprietária, pois os conectores atuais não expõem endpoints de administração dessas configurações.

1. [Supabase / Authentication / Providers — E-mail](https://supabase.com/dashboard/project/xprvdquocenfqvnokmmi/auth/providers?provider=Email): exigir confirmação do endereço, comprimento mínimo de 12 caracteres e senha forte (combinação de letras e números/símbolos conforme opções disponíveis). **Disable signups / invitation only** quando possível. Não alterar a chave ou o domínio do projeto.
2. [Supabase / Authentication / URL Configuration](https://supabase.com/dashboard/project/xprvdquocenfqvnokmmi/auth/url-configuration): estabelecer Site URL HTTPS da origem do ambiente de homologação e permitir apenas hosts/redirects exatos confiáveis `/auth/callback` e `/auth/confirm`. Não liberar wildcard geral.
3. [Supabase / Authentication / Sessions](https://supabase.com/dashboard/project/xprvdquocenfqvnokmmi/auth/sessions): manter JWTs de curta duração (valor a definir conforme UX), revisar sessões existentes ao bloquear usuários e exigir TOTP para admins. Ajustes avançados de limite de sessões/inatividade podem depender do plano, mas o app já faz verificação extra no banco.
4. Revisar limite de envio de e-mails e templates de recuperação/magic link. Para uso comercial, configurar SMTP próprio quando disponível; o limite do remetente de demonstração não é adequado ao lançamento.
5. MFA TOTP pode funcionar no Free; administrador deve cadastrar em `/seguranca/mfa` e confirmar um código de aplicativo autenticador.
6. A proteção contra senhas vazadas foi adiada até a aquisição do plano Pro; manter o aviso do Advisor registrado. Não afrouxar as outras regras para ocultar o aviso.

## Primeiro administrador — falta um dado
O Supabase tem **uma conta convidada com e-mail confirmado**, `contato@grupoprovisio.com`, perfil `pending`, e nenhum vínculo empresarial. Antes de promover a conta, confirmar a **razão social jurídica correta** da organização operadora Provisio; não preencher `legal_name` com um nome fantasia sem autorização. Após confirmação, seguir o SQL revisado em `docs/marketplace/14-bootstrap-admin-login-homologacao.md`, usando o SQL Editor confiável da Provisio. Nunca usar login client-side para criar `PLATFORM_ADMIN`.

## Publicação Preview bloqueada por autorização da Vercel
O conector para a equipe `grupoprovisio` retorna 403. Confirmado em 2026-10-17: a conta Vercel `contato@grupoprovisio.com` devolve lista vazia de equipes conectadas, enquanto a conta pessoal `id377585@gmail.com` retorna somente a equipe pessoal sem a Provisio.
É necessário reconectar/autorizar a equipe **grupoprovisio** no plugin Vercel. Não usar outro time ou projetar um deploy em workspace pessoal.

Depois de autorizado:
- Adicionar chave **publishable**, e nunca secret/service_role, ao ambiente **Preview**; apontar URL exata para `https://xprvdquocenfqvnokmmi.supabase.co`.
- Definir `MARKETPLACE_AUTH_ENABLED=true`, manter checkout/financeiro desativados.
- Testar em Preview com conta confirmada e MFA: login, recuperação, logout, navegador móvel, replay de sessão, AAL1/AAL2, vínculo revogado e IDs de outro fornecedor.
- Revisar origem VTEX e políticas de exposição de rotas comerciais antigas antes de qualquer ativação no domínio público.

## Critério objetivo de conclusão
**GO técnico de banco:** migrações e verificações RLS. **Ainda NO-GO de login em produção:** sem bootstrap empresarial confirmado, Vercel 403 e sem teste real e-mail/MFA/cookies em Preview.
Não fazer merge/deploy de produção nem prometer ativação 100% antes disso.
