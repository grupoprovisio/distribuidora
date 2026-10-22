/** Evidências conservadoras da main em 21/10/2026.
 * null significa não aferido. Nunca converter ausência de evidência em aprovação.
 * Atualizar APENAS após auditoria no SHA exato e links de CI/E2E e deploy.
 */
export type ProgressGate = {
  id: "code" | "tests" | "production";
  title: string;
  percent: number | null;
  status: string;
  evidence: string;
  next: string;
};
export const PROGRESS_GATES: readonly ProgressGate[] = [
  {
    id: "code",
    title: "Código implementado",
    percent: null,
    status: "Aferição pendente na main",
    evidence: "Há frontend, login, catálogo, cadastros e administração na main. As entregas de cotações e reservas dos PRs #24–#27 permanecem em branches divergentes e não podem ser contabilizadas como integradas.",
    next: "Reconciliar os PRs #24–#27 com a main atual, revisar arquivos e estabelecer checklist ponderado por requisitos com evidências por commit.",
  },
  {
    id: "tests",
    title: "Testes aprovados",
    percent: null,
    status: "Sem homologação consolidada da versão atual",
    evidence: "Há execuções de CI aprovadas em branches antigas, mas isso não comprova aprovação do commit consolidado após integração.",
    next: "Rodar lint, TypeScript, build, testes SQL/RLS, isolamento multiempresa e E2E autenticado na branch de integração e novamente após merge.",
  },
  {
    id: "production",
    title: "Validado em produção",
    percent: null,
    status: "Sem evidência de homologação ponta a ponta",
    evidence: "Não há confirmação nesta revisão de que login, MFA, cadastro, publicação de ofertas e pedidos estejam operacionais na mesma versão publicada.",
    next: "Conferir SHA do deploy, domínio grupoprovisio.com, sessões de comprador/fornecedor, MFA e operações reais autorizadas, com testes em mobile e desktop.",
  },
] as const;
