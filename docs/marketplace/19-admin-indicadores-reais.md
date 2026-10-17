# Gestão administrativa com indicadores reais — Provisio

## Implementação
- /admin remete ao painel consolidado /admin/marketplace, ambos sujeitos ao layout de admin que verifica autorização e segundo fator.
- O painel consulta exclusivamente os dados reais da organização via SSR Supabase e RLS. Usa count exato, sem inventar valores de pedidos, GMV, estoque, vendas, comissões ou faturamento.
- Visão consolidada: empresas cadastradas, empresas fornecedoras aprovadas, empresas compradoras aprovadas, empresas pendentes, vínculos ativos e últimas oito empresas.
- Se alguma consulta não for autorizada ou falhar, oculta os indicadores em vez de apresentar dados incompletos ou números fictícios.
- Navegação administrativa passa a apontar somente rotas válidas e controladas (administração, empresas e acessos, produtos internos, MFA).
- Nenhuma modificação na página inicial, Sou comprador, Sou fornecedor, imagens, cards, SEO dessas páginas ou no Supabase remoto.
- O bootstrap do primeiro administrador segue dependente da confirmação da razão social jurídica, MFA e ajustes de implantação na Vercel. O painel não ignora esse requisito.

## Segurança
Sem service_role, sem writes, sem migração, sem alteração de RLS nem ativação de checkout. Todos os counts são RLS-scoped e dependem do guard SSR do admin, incluindo AAL2. Dados de produção só aparecem para administradores autorizados.

## Verificação
GitHub CI: typecheck, lint, testes, build de produção e smoke tests. PR separado do catálogo do comprador, para permitir auditoria independente.
