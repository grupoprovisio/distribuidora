# Provisio — Progresso do front-end (19/10/2026)

## Escopo definitivo
- Jornadas públicas e painéis: **Sou comprador** e **Sou fornecedor**.
- Nenhuma interface, automação ou gestão comercial de **Sou vendedor**. Os nomes técnicos ligados à organização que fornece a oferta não criam um terceiro perfil.
- Homepage, landing de compradores e landing de fornecedores, fotos, cards, textos e paleta mantidos sem alteração nesta branch.

## Progresso ponderado de implementação
O painel em `/admin/marketplace/progresso` está atrás do layout administrativo (autorização de operador de plataforma + MFA). Sua fonte versionada é `lib/marketplace/frontend-progress.ts`.

**80% de implementação editorialmente estimada na branch PR #25; 20% restante.** Este número é uma avaliação manual dos arquivos e funcionalidades visíveis, e **não** o percentual de funcionalidades comprovadamente aprovadas por E2E, clientes piloto, ou sistemas em produção.

| Frente | Pontos entregues | Peso máximo | Falta principal |
| --- | ---: | ---: | --- |
| Home e páginas públicas | 10 | 10 | revisão visual em aparelhos |
| Navegação e dois perfis | 10 | 10 | teste de teclado/links em Preview |
| Login, recuperação e MFA | 8 | 10 | E2E autenticado real |
| Portal do comprador | 8 | 10 | homologação em conta piloto |
| Portal do fornecedor | 10 | 12 | permissões e escrita comercial aprovada |
| Catálogo do comprador | 11 | 14 | ofertas homologadas e testes cross-tenant reais |
| Administração/cadastro | 10 | 12 | testes humanos MFA e validações reais |
| Cotação | 7 | 8 | RFQ/propostas versionadas; faltam testes E2E Preview e negociação ampliada |
| Pedidos/checkout | 4 | 8 | checkout registra solicitação pendente; faltam confirmação, pagamento, reserva e entregas |
| Testes visuais e E2E | 2 | 6 | SQL com RLS, lint e typecheck concluídos; falta E2E autenticado |
| **Total** | **80** | **100** | **20 pontos restantes** |

## Avanços desta branch
1. Painel de progresso de 0% a 100%, com pesos, pontuação, evidência implementada, pendências, links de navegação e indicação clara de que o ambiente comercial não está liberado.
2. Área privada de cotação do comprador: formulário local com produto, quantidade, embalagem/unidade, UF, data desejada e observações; gera rascunho para copiar ou abrir no cliente de e-mail. Não grava pedido ou solicitação no banco, nem envia e-mail automaticamente.
3. Contato institucional usa o endereço oficial `contato@grupoprovisio.com` e deixa de mostrar telefone falso, e-mail genérico e mensagem enganosa de sucesso. Formulário prepara e-mail e exige envio manual.
4. Testes estáticos adicionados à suíte `test:frontend-scope` para pesos da pontuação, proteção administrativa, ausência de backend falso no rascunho e contato sem canal fictício.

## Bloqueios externos para conclusão
- `MARKETPLACE_AUTH_ENABLED`, redirecionamentos, templates/SMTP e sessões de MFA devem ser homologados no ambiente Preview.
- Perfil administrador e vínculos comprador/fornecedor devem existir no Supabase e ser validados em sessão real.
- Produtos, regiões e ofertas aprovadas precisam ser cadastrados para demonstrar consulta comercial; não inventar catálogo com preços de terceiros.
- RFQs, pedidos, pagamento, estoque reservado, fulfillment e integração transacional permanecem fora da fase puramente visual.
- Antes de 100%, passar CI, build, typecheck, lint e inspeção responsiva/mobile em Preview, sem elevar permissões de acesso.

## Segurança e política de publicação
Não foram realizadas migrações, bootstrap, mudanças de RLS, writes Supabase, alteração de dados reais, merge ou deploy. Estas mudanças são uma proposta de revisão em branch isolada.

## Evolução PR #25
A pontuação mudou de 73 para 80 após registrar a migração 0016 e implementar cotação, proposta, solicitação de pedido e testes SQL em banco descartável. Isso é uma estimativa de **código versionado**, não serviço ativo no Supabase remoto. O build/testes automatizados foram aprovados no CI; o Preview autenticado continua bloqueado por HTTP 403 na equipe Vercel. Pagamentos reais e reservas permanecem desligados.
