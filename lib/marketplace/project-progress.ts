/**
 * Revisão de escopo do Grupo Provisio (23/10/2026).
 * As notas são estimativas auditáveis baseadas em QUATRO critérios por dimensão e setor:
 * 0 = nenhum critério comprovado; 4 = os quatro critérios comprovados.
 * Peso das áreas soma 100. Código, testes e produção nunca são intercambiáveis.
 * Os dados do Supabase são consultados separadamente e não elevam automaticamente notas.
 * Percentuais exigem evidência por dimensão; testes isolados em CI não comprovam homologação hospedada.
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
export const REVIEW_DATE = "23/10/2026";
export const MAX_CHECKPOINTS = 4;

export const PROJECT_AREAS: readonly ProjectArea[] = [
  {
    id: "institucional", name: "Site institucional e duas jornadas", weight: 10,
    code: 4, tests: 3, production: 2, priority: "P2",
    evidence: "Início, Sou comprador e Sou fornecedor publicados. Links e acesso sem sessão validados na Vercel.",
    next: "Domínio grupoprovisio.com publicado e revisão d6327bab conferida; validar regressão visual final em celular e desktop.",
    href: "/",
  },
  {
    id: "autenticacao", name: "Login, recuperação e MFA", weight: 10,
    code: 4, tests: 4, production: 3, priority: "P0",
    evidence: "PR #40 integrado, recuperação de senha real e login homologados pelo titular; 21/21 E2E locais com MFA e sem MFA aprovados.",
    next: "Conta Fornecedor A já confirmada no Auth e ativa com organização exclusiva; criar Fornecedor B e Comprador independentes, testar sessões e MFA no navegador hospedado.",
    href: "/entrar",
  },
  {
    id: "administracao", name: "ADM e governança comercial", weight: 10,
    code: 4, tests: 3, production: 2, priority: "P0",
    evidence: "Homologação de organizações, produto mestre, categorias, propostas de preço e pedidos de cadastro sob MFA.",
    next: "Executar fluxo de homologação pelo navegador com administrador real e auditoria de ações.",
    href: "/admin/marketplace",
  },
  {
    id: "catalogo", name: "Produtos, fotos, categorias e estoque", weight: 16,
    code: 4, tests: 3, production: 1, priority: "P0",
    evidence: "Migrações 0016–0021 em Supabase Free, SQL RLS, importação CSV, conversão para WebP e Storage privado.",
    next: "Produto e oferta fictícios cadastrados e visíveis sob RLS; falta carregar uma imagem WebP no Storage e validar em navegador com ADM + MFA.",
    href: "/admin/marketplace/prontidao",
  },
  {
    id: "fornecedor", name: "Painel Sou Fornecedor", weight: 12,
    code: 3, tests: 2, production: 1, priority: "P0",
    evidence: "Catálogo, estoque e preço por fornecedor; Fornecedor QA A ativo no Supabase, Fornecedor QA B criado no Auth e vinculado como convidado até confirmação de e-mail.",
    next: "Confirmar e ativar Fornecedor B; testar sessões A/B, estoque, imagem WebP, preços e negativas de acesso entre empresas no Supabase hospedado.",
    href: "/app/fornecedor",
  },
  {
    id: "comprador", name: "Painel Sou Comprador", weight: 10,
    code: 3, tests: 2, production: 1, priority: "P1",
    evidence: "Catálogo privado por região e ofertas elegíveis; empresa Comprador QA criada com capacidade BUYER e BR-SP, mas sem identidade Auth exclusiva.",
    next: "Provisionar Comprador Auth após o limite de envio do Supabase; ativar vínculo exclusivo BUYER e testar catálogo e cotação hospedados sem privilégios ADM.",
    href: "/app/comprador",
  },
  {
    id: "cotacoes", name: "Cotações e propostas (RFQ)", weight: 10,
    code: 3, tests: 2, production: 0, priority: "P1",
    evidence: "Migração 0022 aplicada no Supabase, testes SQL/RLS aprovados no CI; interface sob flag transacional desativada.",
    next: "Solicitar cotação pela conta compradora independente e responder pela fornecedora; manter flag global protegida até testes hospedados positivos e negativos.",
    href: "/app/comprador/cotacoes",
  },
  {
    id: "pedidos", name: "Pedidos e reservas", weight: 10,
    code: 3, tests: 2, production: 0, priority: "P1",
    evidence: "Migração 0023 aplicada, testes CI de reserva atômica, rejeição, cancelamento, estoque insuficiente e isolamento aprovados; flag transacional OFF.",
    next: "Homologar pedido com usuários reais, conferir recebimento fornecedor/cliente e liberar transações por ambiente.",
    href: "/app/comprador/pedidos",
  },
  {
    id: "logistica", name: "Entrega e acompanhamento logístico", weight: 4,
    code: 2, tests: 1, production: 0, priority: "P2",
    evidence: "Migração 0024 e telas de separação, frete estimado, expedição, baixa de estoque e entrega manual preparadas e testadas em CI.",
    next: "Migração 0024 já aplicada; falta E2E autenticado hospedado, cotação real de frete, transportadora e prova de entrega.",
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
    code: 3, tests: 3, production: 2, priority: "P0",
    evidence: "PRs #39 e #40 integrados; 21/21 E2E locais aprovados; domínio e revisão d6327bab publicados e verificados.",
    next: "Acompanhar no ADM as quatro identidades de QA (MFA, fornecedores A/B e comprador), executar isolamento hospedado e conferir trilhas de auditoria antes da liberação global.",
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
