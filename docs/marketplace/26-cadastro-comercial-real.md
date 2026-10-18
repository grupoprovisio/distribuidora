# Registro real do catálogo B2B Provisio — 18/10/2026

## Admin com MFA (AAL2)
A rota `/admin/marketplace/cadastro` herda o guard SSR do admin e consulta por Supabase RLS. Server Actions verificam novamente a autorização e nunca usam `service_role`.

Etapas: (1) cadastrar produto mestre em rascunho, (2) ativar após conferência, (3) associar SKU a fornecedor aprovado como pendente, (4) homologar SKU se produto ativo e fornecedor aprovado, (5) informar estoque em unidades, (6) registrar oferta e região como pendente, (7) aprovar oferta somente quando houver produto/SKU/fornecedor/região/estoque válidos.

Migração 0013 concede apenas escrita nas colunas necessárias aos administradores comprovados no banco. O trigger de homologação rejeita etapas fora de ordem. Fornecedor/comprador não recebem escrita direta; nenhuma política pública/anon é criada. Não há pagamentos, checkout, emissão fiscal ou carrinho neste PR.

**Restrições antes do teste humano:** o Supabase não contém organização operadora homologada nem `PLATFORM_ADMIN` confirmado. Não simular bootstrap usando identidade jurídica inventada. O primeiro administrador requer confirmação da razão social real e do usuário Auth autenticado, seguindo `docs/marketplace/14-bootstrap-admin-login-homologacao.md`. O login precisa da configuração correta de Vercel e da homologação por MFA.

Ações usam confirmação de escrita real, erros de negócio simples e evitam exibir mensagens SQL internas. A criação de oferta insere a região depois da oferta pendente; se a segunda etapa falhar, o registro continua pendente e não pode ser aprovado pelo trigger de segurança. Administração deverá corrigir essas situações na evolução transacional.

Todas as páginas públicas `/`, `/compradores` e `/fornecedores`, os cards, imagens, textos e CSS globais ficam intactos.

## Validação
CI executa Postgres descartável com migrações 0001 a 0013, testes de autorização e fluxo de rascunho até oferta aprovada, além de TypeScript, lint e build. Não fazer merge/deploy em caso de qualquer falha.
