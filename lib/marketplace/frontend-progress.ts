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

export const FRONTEND_PROGRESS_REVIEWED_AT = "19/10/2026";

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
    completed: 10,
    delivered: "Catálogo privado paginado, prévia de CSV, operação e homologação com leitura protegida.",
    remaining: "Testar com fornecedor piloto e habilitar edição controlada de ofertas quando aprovada.",
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
    title: "Preparação de cotações",
    weight: 8,
    completed: 4,
    delivered: "Formulário privado prepara rascunho de solicitação por e-mail, sem gravação no banco.",
    remaining: "RFQ persistida, envio para fornecedores elegíveis e comparativo de respostas ainda não implementados.",
    href: "/app/comprador/cotacoes",
  },
  {
    id: "pedidos",
    title: "Pedidos, checkout e acompanhamento",
    weight: 8,
    completed: 2,
    delivered: "Jornada de acompanhamento e estados planejados representados na interface, sem pedidos fictícios.",
    remaining: "Carrinho, checkout, pedidos reais, subpedidos e entregas exigem backend homologado.",
    href: "/app/comprador/pedidos",
  },
  {
    id: "validacao",
    title: "Qualidade visual e testes E2E",
    weight: 6,
    completed: 0,
    delivered: "Testes estáticos e workflow automatizado estão definidos no repositório.",
    remaining: "Executar CI desta branch, testar responsividade e realizar E2E autenticado em Preview.",
    href: "/admin/marketplace/prontidao",
  },
] as const;

export const FRONTEND_TOTAL_POINTS = FRONTEND_MILESTONES.reduce((sum, item) => sum + item.weight, 0);
export const FRONTEND_EARNED_POINTS = FRONTEND_MILESTONES.reduce((sum, item) => sum + item.completed, 0);
export const FRONTEND_PERCENT = FRONTEND_TOTAL_POINTS
  ? Math.round((FRONTEND_EARNED_POINTS / FRONTEND_TOTAL_POINTS) * 100)
  : 0;
