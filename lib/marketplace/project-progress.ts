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
    evidence: "Migrações de catálogo 0016–0026 e proteção 0027 hospedadas; 19 tabelas públicas com RLS, 2 produtos, 2 ofertas, 1 imagem privada; 24/24 E2E locais, com upload WebP. Upload autenticado hospedado segue pendente.",
    next: "Validar o upload WebP pelo navegador autenticado, conferir Storage privado, preços progressivos e aprovar produto/oferta com ADM + MFA.",
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
    code: 3, tests: 4, production: 1, priority: "P1",
    evidence: "Migração 0022; 24/24 E2E locais aprovados; 1 cotação e 1 proposta QA persistidas no PostgreSQL hospedado, com isolamento do fornecedor B e idempotência por contexto SQL. Ainda sem comprovação HTTP hospedada.",
    next: "Validar a mesma cotação/proposta pela API HTTP hospedada com sessão assinada de comprador e fornecedor; não confundir o teste SQL persistido com autenticação HTTP.",
    href: "/app/comprador/cotacoes",
  },
  {
    id: "pedidos", name: "Pedidos e reservas", weight: 10,
    code: 3, tests: 4, production: 1, priority: "P1",
    evidence: "Migração 0023; 24/24 E2E locais. 1 pedido QA confirmado e persistido no Supabase hospedado, com reserva única, bloqueio de fornecedor errado, estoque QA 20→17 após expedição e auditoria; teste direto SQL, não HTTP.",
    next: "Comprovar checkout e reserva por HTTP hospedado nas sessões reais e repetir cancelamento/idempotência; flag comercial permanece desligada.",
    href: "/app/comprador/pedidos",
  },
  {
    id: "logistica", name: "Entrega e acompanhamento logístico", weight: 4,
    code: 3, tests: 3, production: 1, priority: "P2",
    evidence: "Migração 0024; etapas de separação, Faturamento interno, expedição e entrega manual implementadas. 24/24 E2E locais e 1 entrega QA registrada no Supabase hospedado com 4 eventos logísticos; sem transportadora/NF-e.",
    next: "Comprovar execução logística pelo navegador/HTTP hospedado; frete contratado, confirmação externa de entrega e NF-e são escopo comercial posterior.",
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
    evidence: "PR #52 integrada, migrações 0026/0027 hospedadas, 24/24 E2E locais, 19/19 tabelas públicas com RLS e isolamento QA/comercial comprovado; 1 operação QA persistida por SQL.",
    next: "Concluir HTTP hospedado com identidades independentes e WebP real; no plano Free, proteção de senhas vazadas segue como risco registrado e melhoria futura, não bloqueio de QA.",
    href: "/admin/marketplace/prontidao",
  },
] as const;

/**
 * Recortes das mesmas notas de implementação por camada técnica.
 * Uma área full-stack aparece nos dois recortes; não são medições independentes
 * de cobertura de testes ou de funcionamento hospedado.
 */
export const DELIVERY_TRACKS = {
  frontend: {
    title: "Frontend",
    summary: "Site, portais, jornadas visuais, cadastro, catálogo e operação.",
    areaIds: ["institucional", "autenticacao", "administracao", "catalogo", "fornecedor",
      "comprador", "cotacoes", "pedidos", "logistica", "financeiro"],
  },
  backend: {
    title: "Backend",
    summary: "Identidade, autorização, catálogo, transações, logística e infraestrutura.",
    areaIds: ["autenticacao", "administracao", "catalogo", "fornecedor", "comprador",
      "cotacoes", "pedidos", "logistica", "financeiro", "qualidade"],
  },
} as const;
export type DeliveryTrack = keyof typeof DELIVERY_TRACKS;

export function deliveryTrackPercent(track: DeliveryTrack) {
  const areaIds: readonly string[] = DELIVERY_TRACKS[track].areaIds;
  const relevant = PROJECT_AREAS.filter(area => areaIds.includes(area.id));
  const weights = relevant.reduce((sum, area) => sum + area.weight, 0);
  return weights === 0 ? 0 : Math.round(
    relevant.reduce((sum, area) => sum + area.weight * area.code, 0) /
      (weights * MAX_CHECKPOINTS) * 100
  );
}

export const DELIVERY_PROGRESS = {
  frontend: deliveryTrackPercent("frontend"),
  backend: deliveryTrackPercent("backend"),
} as const;

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
