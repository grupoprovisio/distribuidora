/**
 * Revisão de escopo do Grupo Provisio (24/10/2026).
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
export const REVIEW_DATE = "24/10/2026";
export const MAX_CHECKPOINTS = 4;

export const PROJECT_AREAS: readonly ProjectArea[] = [
  {
    id: "institucional", name: "Site institucional e duas jornadas", weight: 10,
    code: 4, tests: 3, production: 2, priority: "P2",
    evidence: "Início, Sou comprador e Sou fornecedor publicados. Links e acesso sem sessão validados na Vercel.",
    next: "Domínio grupoprovisio.com publicado e revisão a1172ab conferida; rever continuamente regressões em celular e desktop.",
    href: "/",
  },
  {
    id: "autenticacao", name: "Login, recuperação e MFA", weight: 10,
    code: 4, tests: 4, production: 3, priority: "P0",
    evidence: "PR #40 integrado, recuperação de senha real e login homologados pelo titular; 21/21 E2E locais com MFA e sem MFA aprovados.",
    next: "Fornecedores A/B confirmados e ativos em empresas próprias; falta comprador Auth independente e testes HTTP assinados de quatro perfis, com MFA administrativo.",
    href: "/entrar",
  },
  {
    id: "administracao", name: "ADM e governança comercial", weight: 10,
    code: 4, tests: 3, production: 2, priority: "P0",
    evidence: "Homologação de empresas e catálogo: negação 42501 para fornecedor, fluxo positivo simulado com AAL2 em SQL e ROLLBACK, sem comprovante HTTP de MFA.",
    next: "Executar fluxo de homologação pelo navegador com administrador real e auditoria de ações.",
    href: "/admin/marketplace",
  },
  {
    id: "catalogo", name: "Produtos, fotos, categorias e estoque", weight: 16,
    code: 4, tests: 3, production: 1, priority: "P0",
    evidence: "Migrações 0016–0021 hospedadas, RLS de solicitações A/B validada, produtos/SKU/ofertas aprovados apenas em transação revertida; WebP local e bucket privado sem imagens hospedadas.",
    next: "Enviar imagem WebP pelo navegador autenticado, validar Storage privado e aprovar produto/preço via sessão real ADM + MFA.",
    href: "/admin/marketplace/prontidao",
  },
  {
    id: "fornecedor", name: "Painel Sou Fornecedor", weight: 12,
    code: 3, tests: 3, production: 1, priority: "P0",
    evidence: "Fornecedor A/B com identidades e organizações independentes ativas; RLS hospedada: cada um leu 1 solicitação própria e 0 alheias, atualização cruzada bloqueada.",
    next: "Executar login HTTP real A/B no site hospedado; validar WebP, estoque e preços persistidos sem tocar em dados comerciais.",
    href: "/app/fornecedor",
  },
  {
    id: "comprador", name: "Painel Sou Comprador", weight: 10,
    code: 3, tests: 2, production: 1, priority: "P1",
    evidence: "Catálogo privado por região e ofertas elegíveis; empresa Comprador QA criada com capacidade BUYER e BR-SP, mas sem identidade Auth exclusiva.",
    next: "Provisionar conta Auth exclusiva do Comprador QA por fluxo oficial; testar catálogo e cotação via JWT assinado, sem privilégio de ADM.",
    href: "/app/comprador",
  },
  {
    id: "cotacoes", name: "Cotações e propostas (RFQ)", weight: 10,
    code: 3, tests: 3, production: 0, priority: "P1",
    evidence: "Migração 0022, 21/21 E2E locais e RPCs de cotação/proposta executados no Supabase hospedado em transação SQL revertida; API em produção desligada.",
    next: "Repetir cotação/proposta pela API HTTP com comprador independente e fornecedor, mantendo flag global protegida até homologação.",
    href: "/app/comprador/cotacoes",
  },
  {
    id: "pedidos", name: "Pedidos e reservas", weight: 10,
    code: 3, tests: 3, production: 0, priority: "P1",
    evidence: "Migração 0023, E2E locais, pedido e confirmação/reserva no banco hospedado via SQL ROLLBACK; nenhuma transação persistiu em produção.",
    next: "Validar pedido, reserva idempotente e cancelamento via HTTP com comprador exclusivo antes de liberar flag transacional por ambiente.",
    href: "/app/comprador/pedidos",
  },
  {
    id: "logistica", name: "Entrega e acompanhamento logístico", weight: 4,
    code: 2, tests: 2, production: 0, priority: "P2",
    evidence: "Migração 0024, testes E2E locais e fluxo hospedado revertido: reserva 3, baixa para 47, entrega e 4 eventos de auditoria logística.",
    next: "Repetir separação, expedição e entrega em navegador hospedado; frete contratado e prova de entrega real continuam fora do QA.",
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
    evidence: "PRs #39–#41 integrados; 21/21 E2E locais, lint, TypeScript e build aprovados; 19/19 tabelas públicas com RLS e testes SQL hospedados reversíveis.",
    next: "Concluir comprador Auth independente, E2E HTTP hospedado, upload de fotos e MFA real; corrigir proteção contra senhas vazadas no Supabase Auth antes da liberação.",
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
