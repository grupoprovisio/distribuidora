/**
 * Revisão de escopo do Grupo Provisio (25/10/2026).
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
export const REVIEW_DATE = "25/10/2026";
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
    next: "Comprador QA já confirmado e ativo; revalidar login HTTP assinado dele e do Fornecedor B e executar aprovação ADM com MFA em navegador hospedado.",
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
    code: 3, tests: 4, production: 2, priority: "P0",
    evidence: "Fornecedor A/B com empresas independentes ativas; A passou login HTTP real, cadastro e negação 42501; E2E local com dois fornecedores e modo QA restrito passaram, incluindo bloqueio de cotação e pedido cruzados.",
    next: "Revalidar Fornecedor B com senha atual via HTTP, concluir fluxo de estoque/preço e imagens WebP via ADM MFA no ambiente hospedado.",
    href: "/app/fornecedor",
  },
  {
    id: "comprador", name: "Painel Sou Comprador", weight: 10,
    code: 3, tests: 3, production: 2, priority: "P1",
    evidence: "Comprador QA independente com e-mail confirmado, perfil e vínculo BUYER ativos, sessão Auth registrada e RLS de organização única; E2E local do comprador aprovou filtros, recusa de ofertas externas e checkout.",
    next: "Concluir cotação, pedido e reserva via navegador hospedado com JWT assinado do comprador independente; sessão atual não é acessível à automação.",
    href: "/app/comprador",
  },
  {
    id: "cotacoes", name: "Cotações e propostas (RFQ)", weight: 10,
    code: 3, tests: 4, production: 0, priority: "P1",
    evidence: "Migração 0022; 21 testes E2E padrão e 3 QA locais, incluindo propostas com sessões independentes, rejeição do fornecedor errado e idempotência; SQL hospedado revertido.",
    next: "Com flag global desativada e QA restrita, executar cotação e proposta em produção com JWTs reais, validar auditoria persistida e limpar registros descartáveis.",
    href: "/app/comprador/cotacoes",
  },
  {
    id: "pedidos", name: "Pedidos e reservas", weight: 10,
    code: 3, tests: 4, production: 0, priority: "P1",
    evidence: "Migração 0023; testes locais do modo QA provaram reserva única após confirmação repetida, bloqueio de pedido de outro fornecedor e estoque 50/0→50/3; SQL hospedado revertido.",
    next: "Validar checkout HTTP hospedado com BUYER exclusivo, fornecedor correto, idempotência, cancelamento e auditoria, sem liberar a chave global comercial.",
    href: "/app/comprador/pedidos",
  },
  {
    id: "logistica", name: "Entrega e acompanhamento logístico", weight: 4,
    code: 2, tests: 3, production: 0, priority: "P2",
    evidence: "Migração 0024, 3/3 testes de modo QA local e E2E geral: reserva, separação, expedição, baixa para 47 e entrega manual, com 4 eventos de auditoria; SQL hospedado revertido.",
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
    evidence: "PRs #39–#44 integrados; 21 testes gerais e 3 QA locais, SQL reversível e HTTP assinado de Fornecedor A. 19/19 tabelas públicas com RLS e RPCs comerciais vedadas ao anon.",
    next: "Concluir E2E HTTP hospedado de comprador, fornecedores A/B e ADM MFA, WebP no Storage e proteção de senhas vazadas (disponível no Supabase Pro).",
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
