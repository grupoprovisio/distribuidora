/**
 * Avaliação MANUAL e versionada da implementação do frontend.
 * Cada ponto representa uma entrega visível no código, não um teste end-to-end.
 * A soma dos pesos deve ser 100; atualizar as evidências após revisão humana.
 * Não usar este indicador para autorizar produção, pagamentos ou operações reais.
 */
export type FrontendMilestone = {
  id: string;
  title: string;
  weight: number;
  completed: number;
  delivered: string;
  remaining: string;
  href: string;
};

export const FRONTEND_PROGRESS_REVIEWED_AT = "20/10/2026";

export const FRONTEND_MILESTONES: readonly FrontendMilestone[] = [
  {
    id: "institucional",
    title: "Página inicial e jornadas públicas",
    weight: 10,
    completed: 10,
    delivered: "Início institucional e páginas Sou comprador / Sou fornecedor implementadas, com identidade visual protegida por testes de integridade.",
    remaining: "Revisão visual manual em tamanhos de tela e dispositivos reais.",
    href: "/",
  },
  {
    id: "escopo",
    title: "Navegação e dois perfis",
    weight: 10,
    completed: 10,
    delivered: "Menu, rodapé, sitemap e portais sem Sou vendedor; testes estáticos impedem a volta de rotas excluídas.",
    remaining: "Inspecionar links e navegação por teclado após a publicação de Preview.",
    href: "/como-funciona",
  },
  {
    id: "identidade",
    title: "Interface de login, recuperação e MFA",
    weight: 10,
    completed: 8,
    delivered: "Telas e guardas SSR de autenticação, recuperação de senha e segundo fator implementados.",
    remaining: "Validar e-mail, MFA e revogação de sessão com usuários reais em ambiente Preview.",
    href: "/entrar",
  },
  {
    id: "comprador",
    title: "Painel do comprador",
    weight: 10,
    completed: 8,
    delivered: "Portal, empresas autorizadas e navegação para catálogo, cotações e pedidos existentes.",
    remaining: "Homologar jornada completa em dispositivo móvel com conta de comprador aprovada.",
    href: "/app/comprador",
  },
  {
    id: "fornecedor",
    title: "Painel do fornecedor",
    weight: 12,
    completed: 11,
    delivered: "Catálogo e CSV, homologação, cotações, propostas e ações autorizadas para confirmar/recusar pedidos e reservar estoque.",
    remaining: "Homologar fornecedor piloto com sessão real e manter edição comercial sob revisão autorizada.",
    href: "/app/fornecedor",
  },
  {
    id: "catalogo",
    title: "Catálogo do comprador e regiões",
    weight: 14,
    completed: 11,
    delivered: "Consulta privada por região, paginação e filtros de ofertas aprovadas com RLS.",
    remaining: "Validar visualmente catálogo com produtos homologados e permissões cross-tenant.",
    href: "/app/comprador/catalogo",
  },
  {
    id: "administracao",
    title: "Administração e cadastro comercial",
    weight: 12,
    completed: 10,
    delivered: "Telas administrativas para empresas, produtos, SKUs, ofertas e fila de homologação.",
    remaining: "Homologar as ações com administrador real e MFA em Preview.",
    href: "/admin/marketplace/cadastro",
  },
  {
    id: "cotacoes",
    title: "Cotações e propostas comerciais",
    weight: 8,
    completed: 7,
    delivered: "Fluxo versionado de RFQ real e proposta com RLS, idempotência, interfaces comprador/fornecedor e testes SQL descartáveis.",
    remaining: "Aplicar migração em homologação, validar Preview autenticado e evoluir comparativo/múltiplas propostas.",
    href: "/app/comprador/cotacoes",
  },
  {
    id: "pedidos",
    title: "Pedidos, checkout e acompanhamento",
    weight: 8,
    completed: 6,
    delivered: "Checkout cria solicitação pendente, confirmação reserva estoque com transação atômica; recusas, cancelamentos e liberações são idempotentes.",
    remaining: "Frete, expedição, conciliação, carrinho múltiplo, gateway de pagamento e testes de Preview autenticado.",
    href: "/app/comprador/pedidos",
  },
  {
    id: "validacao",
    title: "Qualidade visual e testes E2E",
    weight: 6,
    completed: 3,
    delivered: "Migrações 0001-0017, isolamento, cotação, checkout, reserva e cancelamento testados em Postgres 17 descartável; CI com lint, TS e build.",
    remaining: "Homologar login/MFA, funcionalidades ativas e responsividade em Preview Vercel (atualmente bloqueado por 403).",
    href: "/admin/marketplace/prontidao",
  },
] as const;

export const FRONTEND_TOTAL_POINTS = FRONTEND_MILESTONES.reduce((sum, item) => sum + item.weight, 0);
export const FRONTEND_EARNED_POINTS = FRONTEND_MILESTONES.reduce((sum, item) => sum + item.completed, 0);
export const FRONTEND_PERCENT = FRONTEND_TOTAL_POINTS
  ? Math.round((FRONTEND_EARNED_POINTS / FRONTEND_TOTAL_POINTS) * 100)
  : 0;
