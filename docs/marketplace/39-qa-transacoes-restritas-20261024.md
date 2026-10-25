# Grupo Provisio — Transações exclusivamente QA (24/10/2026)

## Objetivo e escopo

Permitir testar cotação, proposta, checkout, reserva de estoque e entrega com **identidades comerciais próprias** sem habilitar transações para todas as empresas comerciais. O site mantém somente as jornadas **Sou fornecedor** e **Sou comprador**, mais ADM interno. A homepage, fotos e textos públicos não foram alterados.

**Esta entrega não significa 100% homologado e não habilita pagamentos ou emissão fiscal.**

## Chaves de ambiente, todas exclusivamente do servidor

| Chave | Efeito | Padrão |
|---|---|---|
| `MARKETPLACE_TRANSACTIONS_ENABLED` | Liberação comercial ampla preexistente | Ausente/false em produção |
| `MARKETPLACE_QA_TRANSACTIONS_ENABLED` | Permite transações somente de entidades QA autorizadas | Ausente/false |
| `MARKETPLACE_QA_BUYER_ORG_ID` | UUID exato da única empresa compradora QA | Ausente; falha fechada |
| `MARKETPLACE_QA_SUPPLIER_ORG_IDS` | Dois UUIDs de fornecedores QA, separados por vírgula | Ausente; falha fechada |

As quatro chaves **nunca** devem ter prefixo `NEXT_PUBLIC_`. A validação exige exatamente um comprador, dois fornecedores distintos, UUIDs válidos e nenhum cruzamento. Nenhum dado sensível, senha, token de Auth, service_role ou código TOTP foi gravado no repositório.

## Defesa em profundidade

- **Autorizações originais mantidas:** Supabase Auth `getUser()`, perfil ativo, vínculos `organization_members`, capacidade aprovada e RLS por empresa.
- **Separação explícita:** um operador QA só habilita ações quando possui **um único portal autorizado** e **uma única organização permitida**. Papéis mistos ou `PLATFORM_ADMIN` são recusados.
- **PostgREST + RLS como prova externa:** mesmo em modo QA, toda operação usa o cliente SSR autenticado existente, nunca uma chave service_role.
- **Cotação:** o comprador deve ser o BUYER QA e a oferta deve pertencer a um fornecedor QA, confirmada novamente pela Data API sob RLS.
- **Proposta:** a cotação deve pertencer ao BUYER QA e ao fornecedor QA que efetivamente a está respondendo.
- **Checkout:** comprador, cotação e proposta devem corresponder às mesmas empresas QA.
- **Pedido e entrega:** o pedido deve ligar comprador QA e fornecedor QA; somente o fornecedor do pedido pode confirmá-lo, separá-lo e expedi-lo; o comprador só pode cancelar sua própria solicitação.
- **Demais empresas:** a API continua retornando o estado não habilitado (HTTP 503), mesmo com a flag QA ativada. O console de transações não é exibido a usuários comerciais reais.
- **Modo ausente ou mal configurado:** falha fechada; nenhuma empresa, nem mesmo QA, pode transacionar.

Os campos de corpo/CSRF, confirmação explícita de pedido, idempotência, regras de estoque e RPCs SQL continuam sujeitos às validações originais.

## Matriz de testes a executar com o deploy

1. Flags ausentes: comprador QA e fornecedores QA veem a interface informativa original; API 503.
2. Flags QA corretas: somente comprador QA e fornecedores QA veem o console; empresas reais e administradores continuam 503.
3. Comprador QA não consegue cotar uma oferta de fornecedor comercial real, mesmo que a veja no catálogo.
4. Fornecedor B não consegue responder cotação do A, nem alterar pedido do A.
5. Buyer QA solicita cotação de oferta QA aprovada → Fornecedor A responde → BUYER faz checkout → fornecedor confirma (reserva) → separa → despacha (baixa) → entrega.
6. Estoque insuficiente, origem inválida, JWT ausente, CSRF e operações duplicadas são recusados sem efeitos colaterais.
7. Confirmar auditoria de operações executadas e não misturar dados reais com QA.
8. Reverter/desativar chave QA em caso de comportamento inesperado; nunca ativar `MARKETPLACE_TRANSACTIONS_ENABLED` para resolver uma falha QA.

## Evidências em 24/10/2026

- Quatro identidades Auth distintas cadastradas, confirmadas, ativas e com papéis aprovados no Supabase hospedado: ADM, Fornecedor A, Fornecedor B e Comprador.
- O login automatizado de Fornecedor A via browser hospedado e Data API já foi comprovado em rodada anterior. As senhas locais geradas para Fornecedor B e BUYER **não correspondem mais às senhas atuais**; não usar credenciais expiradas nem redefinir suas senhas sem necessidade.
- Simulação SQL hospedada de ADM AAL2 → Fornecedor A → **BUYER independente real** → cotação → proposta → pedido → reserva de 3 unidades → entrega. Resultado: estoque 50/0 → 50/3 → 47/0, 1 registro de auditoria do pedido e 4 logísticos. **Todos os efeitos foram revertidos por ROLLBACK**. Não equivale a E2E com JWT HTTP assinado.
- Segurança das contas comerciais: não foi removida MFA do ADM nem modificada qualquer política RLS ou Storage.
- O Supabase Free não disponibiliza o recurso nativo de proteção contra senhas vazadas por HaveIBeenPwned (planos Pro+). Não comprar/alterar plano sem autorização explícita.

## Critérios para 100% efetivo

Só considerar concluído quando houver captura de testes HTTP com JWT assinado de **cada** identidade, ações positivas e negativas com ADM MFA no navegador, imagem WebP privada real no Storage, proposta e pedido com estoque/auditoria persistidos **em dados QA**, verificação de isolamento e limpeza ao final, CI verde e deploy validado. Não confundir a contagem de identidades (4/4), os 21 testes locais ou a simulação SQL reversível com essa certificação.

Este modo QA é uma facilidade de **homologação controlada**, não uma abertura comercial, e permanece desligado na ausência da flag QA.
