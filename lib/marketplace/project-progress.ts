/**
 * Revisão de escopo do Grupo Provisio (22/10/2026).
 * As notas são estimativas auditáveis baseadas em QUATRO critérios por dimensão e setor:
 * 0 = nenhum critério comprovado; 4 = os quatro critérios comprovados.
 * Peso das áreas soma 100. Código, testes e produção nunca são intercambiáveis.
 * Os dados do Supabase são consultados separadamente e não elevam automaticamente notas.
 * As etapas de cotações/pedidos existem nesta branch de integração, mas não em produção.
 */
export type Priority = "P0" | "P1" | "P2" | "P3";
export type ProgressDimension = "code" | "tests" | "production";
export type ProjectArea = {
  id: string;
  name: string;
  weight: number;
  code: number;
  tests: number;
  production: number;
  priority: Priority;
  evidence: string;
  next: string;
  href: string;
};
export const REVIEW_DATE = "22/10/2026";
export const MAX_CHECKPOINTS = 4;

export const PROJECT_AREAS: readonly ProjectArea[] = [
  {
    id: "institucional", name: "Site institucional e duas jornadas", weight: 10,
    code: 4, tests: 3, production: 2, priority: "P0",
    evidence: "Início, Sou comprador e Sou fornecedor publicados. Links e acesso sem sessão validados na Vercel.",
    next: "Retirar a suspensão clientHold do domínio no Squarespace e conferir celular, desktop e DNS.",
    href: "/",
  },
  {
    id: "autenticacao", name: "Login, recuperação e MFA", weight: 10,
    code: 4, tests: 3, production: 2, priority: "P1",
    evidence: "Supabase SSR, recuperação de senha, papéis e MFA. Sessão AAL2 administrativa verificada no banco.",
    next: "Homologar login, recuperação e troca de perfil com duas identidades independentes em navegador.",
    href: "/entrar",
  },
  {
    id: "administracao", name: "ADM e governança comercial", weight: 10,
    code: 4, tests: 3, production: 2, priority: "P1",
    evidence: "Homologação de organizações, produto mestre, categorias, propostas de preço e pedidos de cadastro sob MFA.",
    next: "Executar fluxo de homologação pelo navegador com administrador real e auditoria de ações.",
    href: "/admin/marketplace",
  },
  {
    id: "catalogo", name: "Produtos, fotos, categorias e estoque", weight: 16,
    code: 4, tests: 3, production: 1, priority: "P1",
    evidence: "Migrações 0016–0021 em Supabase Free, SQL RLS, importação CSV, conversão para WebP e Storage privado.",
    next: "Produto e oferta fictícios cadastrados e visíveis sob RLS; falta carregar uma imagem WebP no Storage e validar em navegador com ADM + MFA.",
    href: "/admin/marketplace/prontidao",
  },
  {
    id: "fornecedor", name: "Painel Sou Fornecedor", weight: 12,
    code: 3, tests: 2, production: 1, priority: "P1",
    evidence: "Catálogo por organização, solicitação de produto, estoque próprio e oferta de preço pendente.",
    next: "Validar entrada, inserção, alteração e isolamento com fornecedor A e fornecedor B reais.",
    href: "/app/fornecedor",
  },
  {
    id: "comprador", name: "Painel Sou Comprador", weight: 10,
    code: 3, tests: 2, production: 1, priority: "P1",
    evidence: "Catálogo privado filtrado por região, fornecedor, estoque, vigência, preço e capacidade BUYER.",
    next: "Oferta fictícia aprovada para BR-SP e consulta SQL RLS positiva; validar a experiência visual autenticada com a conta de comprador.",
    href: "/app/comprador",
  },
  {
    id: "cotacoes", name: "Cotações e propostas (RFQ)", weight: 10,
    code: 3, tests: 2, production: 0, priority: "P1",
    evidence: "Migração 0022 aplicada no Supabase, testes SQL/RLS aprovados no CI; interface sob flag transacional desativada.",
    next: "Executar RFQ e resposta com duas contas Auth independentes no navegador e liberar a flag apenas após homologação.",
    href: "/app/comprador/cotacoes",
  },
  {
    id: "pedidos", name: "Pedidos e reservas", weight: 10,
    code: 3, tests: 2, production: 0, priority: "P2",
    evidence: "Migração 0023 aplicada, testes CI de reserva atômica, rejeição, cancelamento, estoque insuficiente e isolamento aprovados; flag transacional OFF.",
    next: "Homologar pedido com usuários reais, conferir recebimento fornecedor/cliente e liberar transações por ambiente.",
    href: "/app/comprador/pedidos",
  },
  {
    id: "logistica", name: "Entrega e acompanhamento logístico", weight: 4,
    code: 2, tests: 1, production: 0, priority: "P2",
    evidence: "Migração 0024 e telas de separação, frete estimado, expedição, baixa de estoque e entrega manual preparadas e testadas em CI.",
    next: "Aplicar 0024 após CI, confirmar E2E autenticado e planejar cotação real de frete, transportadora e prova de entrega.",
    href: "/como-funciona",
  },
  {
    id: "financeiro", name: "Cobrança e documentos fiscais", weight: 4,
    code: 0, tests: 0, production: 0, priority: "P3",
    evidence: "Nenhum gateway de pagamento ou emissão fiscal habilitado; pedidos são exclusivamente preparatórios.",
    next: "Definir modelo fiscal/comercial, gateway, conciliação, devoluções e contratos antes de cobrar.",
    href: "/termos-marketplace",
  },
  {
    id: "qualidade", name: "Segurança, CI e publicação", weight: 4,
    code: 3, tests: 2, production: 1, priority: "P0",
    evidence: "CI e build do catálogo aprovados; produção Vercel pronta, mas domínio suspenso e E2E comercial incompleto.",
    next: "Testar a integração atual, revisar SQL/RLS e comprovar ponta a ponta no Preview antes do merge.",
    href: "/admin/marketplace/prontidao",
  },
] as const;

export const STAGE_WEIGHTS = { code: 45, tests: 30, production: 25 } as const;
export const PROGRESS_DIMENSIONS: readonly ProgressDimension[] = ["code","tests","production"] as const;
export function areaPercent(area: ProjectArea, dimension: ProgressDimension) {
  return Math.round((area[dimension] / MAX_CHECKPOINTS) * 100);
}
export function totalPercent(dimension: ProgressDimension) {
  const points = PROJECT_AREAS.reduce((sum, area) => sum + area.weight * area[dimension], 0);
  const weights = PROJECT_AREAS.reduce((sum, area) => sum + area.weight, 0);
  return Math.round(points / (weights * MAX_CHECKPOINTS) * 100);
}
export const TOTAL_PROGRESS = {
  code: totalPercent("code"),
  tests: totalPercent("tests"),
  production: totalPercent("production"),
} as const;
export const OVERALL_PROGRESS = Math.round(
  (TOTAL_PROGRESS.code * STAGE_WEIGHTS.code +
   TOTAL_PROGRESS.tests * STAGE_WEIGHTS.tests +
   TOTAL_PROGRESS.production * STAGE_WEIGHTS.production) / 100
);
