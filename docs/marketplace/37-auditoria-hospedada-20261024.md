# Provisio — Relatório de validação em rodada única (24/10/2026)

**Escopo:** somente **Sou fornecedor**, **Sou comprador** e **ADM interno**. Nenhuma área de vendedor. 
**Fonte:** `main` commit `a1172ab`, Supabase hospedado `xprvdquocenfqvnokmmi`, domínio `https://grupoprovisio.com`.
**Critério:** não atribuir 100% sem login HTTP de contas independentes, MFA administrativo no navegador, imagens no Storage e fluxo comercial homologado por API.

## Matriz de evidências

| Sistema | Teste / evidência | Resultado | Natureza |
| --- | --- | --- | --- |
| Frontend | Escopo público com exatamente 2 personas, layout preservado | 12/12 aprovado | Testes locais |
| Frontend/Backend | Lint, TypeScript, Next.js build | Aprovados | Execução local sobre main |
| E2E completo | Browser Chromium + PostgreSQL + Supabase Auth + Storage | **21/21 aprovados** | Supabase **local descartável** |
| Hospedado | RLS habilitada em todas as tabelas `public` | **19/19** | Inspeção PostgreSQL hospedada |
| Fornecedores A/B | E-mail confirmado, perfil e vínculo exclusivo `SUPPLIER_ADMIN` `active` | Confirmado no banco | Não substitui login HTTP |
| Tenant isolation | A visualiza somente solicitação QA A; B somente QA B | Passou | Role `authenticated` com claims referenciando sessões já existentes, **não** JWT HTTP assinado |
| Escrito cruzado | B tenta editar cadastro QA A | **0 linhas afetadas** | SQL RLS, transação revertida |
| Sem privilégio ADM | Fornecedor tenta promover solicitação | **42501** | Teste negativo RLS/RPC |
| Sem privilégio BUYER | Fornecedor tenta cotar como comprador | **42501** | Teste negativo RPC |
| ADM MFA | Critério verificado em SQL: AAL1 false, AAL2 true | Passou no banco | **Não** prova MFA no navegador |
| Catálogo | Promoção de submissão, produto ativo, SKU e oferta aprovados | Passou | **SQL reversível** |
| Fornecedor | Atualizar estoque 50 unidades | Passou | **SQL reversível** |
| Comprador | Cotação e proposta comercial | Passou | Usou conta existente com vínculo BUYER e PLATFORM_ADMIN, **não conta independente**; SQL reversível |
| Pedido | Solicitação e confirmação pelo fornecedor | Passou | **SQL reversível** |
| Estoque | Antes do aceite: disponível 50/reservado 0; após aceite: disponível 50/reservado 3 | Passou | **SQL reversível** |
| Logística | Separação → pronto → expedição → entrega | Passou | **SQL reversível** |
| Estoque pós-expedição | Disponível 47/reservado 0 | Passou | **SQL reversível** |
| Auditoria de pedido | 1 transição registrada | Passou | Dentro da transação revertida |
| Auditoria logística | 4 eventos registrados | Passou | Dentro da transação revertida |
| Storage hospedado | Bucket `provisio-produtos` privado | Passou | Configuração de segurança |
| Fotos WebP hospedadas | Upload de imagem por sessão real | **Pendente** | 0 imagens |
| UI pública | `/`, `/compradores`, `/fornecedores`, `/entrar` → HTTP 200 | Passou | Smoke HTTP em produção |
| UI restrita | `/app/comprador`, `/app/fornecedor`, `/admin/marketplace/progresso` sem login → 307 para `/entrar` | Passou | Smoke HTTP |
| API transacional publicada | `/api/marketplace/transactions` → 503 | **Não liberada globalmente** | Produção preservada |

### Integridade ao encerrar

Foi executado `ROLLBACK` nas simulações que envolveram aprovação, oferta, estoque, cotação, pedido, separação, expedição e entrega. Uma verificação posterior confirmou:

- **2** solicitações de produtos QA identificadas e ainda `pending`;
- **0** produtos promovidos pelos testes de rollback, **0** cotações e **0** pedidos comerciais persistidos;
- **0** imagens no bucket privado;
- nenhum estoque ou assinatura comercial real alterado.

Distinguir claramente **três níveis** de prova: (1) E2E de navegador no **Supabase local**; (2) política/RPC no **PostgreSQL hospedado com claims construídas**; (3) E2E HTTP de sessão real no **site hospedado**. O nível (3) ainda **não foi concluído**.

## Bloqueios restantes para atingir 100%

1. **BUYER independente:** organização `PROVISIO QA COMPRADOR INDEPENDENTE - NAO COMERCIAL` já aprovada para BR-SP, mas ainda sem conta Auth própria. O endereço de testes escolhido pelo titular não consta no Supabase Auth. A criação automatizada pelo ambiente autorizado foi bloqueada por controles da ferramenta; não inserir diretamente em `auth.users`.
2. **Teste HTTP hospedado:** usar tokens assinados e sessões reais separadas de ADM AAL2, Fornecedores A/B e Comprador. Não reutilizar `PLATFORM_ADMIN` para alegar isolamento de comprador.
3. **ADM MFA real:** realizar aprovação no navegador e conferir auditoria, não usar claims construídas em SQL para afirmar que houve autenticação multifator.
4. **Storage:** upload WebP e acesso privado de imagem, validação positiva do comprador e negativa de fornecedor rival no ambiente hospedado.
5. **Transações:** manter `MARKETPLACE_TRANSACTIONS_ENABLED` desligada globalmente até homologação HTTP de RFQ → proposta → pedido → reserva → entrega, com dados descartáveis.
6. **Segurança:** aviso Supabase de `auth_leaked_password_protection` desativado; revisão de políticas permissivas sobrepostas no advisor de performance. Tabelas privadas de auditoria com RLS sem política parecem intencionalmente bloqueadas; não relaxar.
7. **Fiscal/cobrança:** não fazem parte da homologação de pedido preparatório; nunca declarar processamento de pagamento/emissão fiscal se não implementados.

## Pontuação

O painel marca implementação, testes e produção **separadamente**, com pesos 45/30/25 e 11 áreas. O progresso de **testes** evoluiu em Fornecedor, Cotações, Pedidos e Logística pela evidência nova dos RPCs reversíveis no banco hospedado. A pontuação de **produção** desses fluxos permanece inalterada, pois não foi comprovada transação HTTP com comprador independente.

**Não há aprovação para liberar pedidos comerciais amplamente.** O registro dos testes e das pendências substitui uma declaração artificial de 100%.
