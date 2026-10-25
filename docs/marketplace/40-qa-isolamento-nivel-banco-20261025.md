# Provisio — Separação das empresas de homologação no PostgreSQL

Data: 25/10/2026. Escopo comercial: **Sou fornecedor** e **Sou comprador**, com ADM interno, sem área de vendedor.

## Problema e correção

As regras Next.js do modo de teste limitam a API de transações às empresas QA. Isso **não** impede um cliente com JWT válido de chamar PostgREST diretamente e ler ofertas aprovadas que pertençam a fornecedor de QA, caso ele tenha uma região comercial elegível. As RPCs de cotação e checkout consultam a função privada de elegibilidade do comprador e, antes desta alteração, a função comparava somente situação da oferta, do fornecedor, do estoque e da região, **sem exigir que buyer e supplier fossem ambos QA ou ambos comerciais**.

A migração `0026_qa_company_isolation.sql` adiciona `organizations.qa_only boolean not null default false` e identifica por **nome exato, tipo, situação e não-propriedade de plataforma** exatamente três organizações artificiais:

- Comprador de testes independente (BUYER)
- Fornecedor de testes A (SUPPLIER)
- Fornecedor de testes B (SUPPLIER)

Outras empresas permanecem com `qa_only=false`. Uma base local descartável sem essas organizações não recebe marcação automática; o fixture E2E marca os seus próprios IDs. Se o banco tem parte das três organizações esperadas, a migração falha e reverte tudo para evitar um isolamento parcial.

## Nova regra de elegibilidade

A função privada `marketplace_private.buyer_can_see_offer(uuid)` requer, **além de todas as aprovações já existentes**, que:

- o comprador tenha sessão real, perfil ativo, vínculo e capacidade BUYER aprovados;
- o vínculo pertença à organização BUYER que tem atribuição para a mesma região da oferta;
- `buyer.qa_only = supplier.qa_only`.

Como essa função já é utilizada nas políticas RLS de ofertas, produtos, SKUs, regiões e estoque, assim como pelas RPCs de criar cotação e fechar pedido, a barreira funciona também para clientes HTTP que tentem contornar a API Next.js.

O ADM com AAL2 continua com as permissões administrativas anteriores; fornecedores conservam acesso à própria organização. Esta migração não concede novos papéis, não altera políticas de upload Storage, não altera autenticação, estoque ou pagamento.

## Cenários obrigatórios de aceite

1. Comprador QA A, em BR-SP, vê oferta QA aprovada e não vê oferta comercial aprovada em BR-SP.
2. Comprador comercial não QA, também em BR-SP, vê oferta comercial aprovada e não vê a oferta QA em BR-SP.
3. Cada um chama `marketplace_create_quote` diretamente via Data API para a oferta do outro ambiente: ambas as tentativas são recusadas com `22023`, sem gravar cotação.
4. Comprador QA consegue executar a cotação, proposta, pedido, reserva, expedição e entrega completos com fornecedor QA correto. Fornecedor B não pode responder proposta nem confirmar pedido do A.
5. Fluxos comerciais existentes com `qa_only=false` continuam visíveis aos compradores comerciais autorizados e preservam status e volumes de estoque.
6. As 19 tabelas públicas permanecem com RLS ativo. `auth_leaked_password_protection` depende do plano Supabase Pro e é acompanhado separadamente.

## Limitações de homologação

- O teste local com dados descartáveis **não equivale** à autenticação HTTP hospedada das quatro contas reais. A senha atual do BUYER e do Fornecedor B está sob controle do titular; não se deve redefinir senhas ou contornar MFA.
- Não aprovar ofertas artificiais hospedadas nem inserir pedidos QA persistentes **antes** de aplicar/verificar a migração no banco hospedado.
- Manter `MARKETPLACE_TRANSACTIONS_ENABLED` desligado globalmente. A modalidade QA é isolada pelo backend e agora também pelo Postgres.
- Testes de entrega manual não comprovam transportadora, pagamento ou nota fiscal.

O objetivo é permitir homologação real segura **sem publicar dados de teste no catálogo dos clientes da Provisio**.
