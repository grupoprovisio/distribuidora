# Fila administrativa de homologações — 17/10/2026

A rota /admin/marketplace/homologacoes foi acrescentada, sem alterar as páginas públicas da Provisio. É protegida pelo layout SSR de administração que exige perfil PLATFORM_ADMIN e autenticação multifator AAL2, e lê somente dados de quatro tabelas com RLS.

Pendências por categoria: organizações em análise, capacidades comerciais pendentes, vínculos empresariais convidados e perfis de usuário pendentes. Paginação no servidor de 20 registros, filtros por URL, contagens reais e acesso à gestão de permissões existente. Em erros de autorização ou consulta, a fila não exibe conteúdo parcial.

A página é somente leitura e não concede acesso. Revisar uma empresa não homologa produtos, não publica ofertas e não libera pedidos ou pagamentos. Esse processo continua sujeito à governança do Supabase. Não há inclusão de usuário vendedor; somente comprador e fornecedor.

**Estado de aprovação técnica:** validar GitHub Actions/TypeScript/lint, banco efêmero, build Next.js e deploy Vercel. Nenhum dado produtivo foi mutado para criar a fila.
