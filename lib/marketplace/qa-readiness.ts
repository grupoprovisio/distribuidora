/**
 * Marcos de identidade para HOMOLOGAÇÃO, não permissões de produção.
 * Derivados apenas de vínculos persistidos no banco, nunca de JWT user_metadata.
 * Este contador NÃO prova login individual, MFA de outra conta ou isolamento RLS.
 */
export type QaOrganization = {
  id: string;
  kind: string;
  status: string;
  trade_name: string | null;
};
export type QaMember = {
  organization_id: string;
  user_id: string;
  role: string;
  status: string;
};
export type QaCapability = {
  organization_id: string;
  capability: string;
  status: string;
};
export type QaProfile = { id: string; status: string };

export type QaMilestone = {
  id: "admin" | "supplierA" | "supplierB" | "buyer";
  title: string;
  complete: boolean;
  explanation: string;
};
export type QaIdentitySnapshot = {
  completed: number;
  total: number;
  supplierOrganizations: number;
  buyerIdentities: number;
  milestones: QaMilestone[];
};

type QaInput = {
  organizations: readonly QaOrganization[];
  members: readonly QaMember[];
  capabilities: readonly QaCapability[];
  profiles: readonly QaProfile[];
  adminAal2: boolean;
};

const TEST_ONLY = /\bqa\b|teste|n[aã]o[ -]comercial/i;

export function summarizeQaIdentityReadiness(input: QaInput): QaIdentitySnapshot {
  const activeProfiles = new Set(input.profiles.filter(profile =>
    profile.status === "active").map(profile => profile.id));
  const activeMembers = input.members.filter(member =>
    member.status === "active" && activeProfiles.has(member.user_id));
  // Exclusividade é obrigatória: não contar operador com acesso simultâneo às duas jornadas.
  const platformAdmins = new Set(activeMembers.filter(member =>
    member.role === "PLATFORM_ADMIN").map(member => member.user_id));
  const orgs = new Map(input.organizations.map(org => [org.id, org]));
  const approvedCaps = new Set(input.capabilities.filter(cap =>
    cap.status === "approved").map(cap => cap.organization_id + ":" + cap.capability));
  const isEligibleOrg = (organizationId: string, kind: "BUYER" | "SUPPLIER") => {
    const org = orgs.get(organizationId);
    return org?.kind === kind && org.status === "approved"
      && TEST_ONLY.test(org.trade_name ?? "")
      && approvedCaps.has(organizationId + ":" + kind);
  };

  const supplierUsers = new Set(activeMembers.filter(member =>
    isEligibleOrg(member.organization_id,"SUPPLIER")
    && ["SUPPLIER_ADMIN","ORG_ADMIN"].includes(member.role)).map(member => member.user_id));
  const buyerUsers = new Set(activeMembers.filter(member =>
    isEligibleOrg(member.organization_id,"BUYER")
    && ["BUYER","ORG_ADMIN"].includes(member.role)).map(member => member.user_id));

  // Qualquer outro vínculo comercial ativo descaracteriza um testador exclusivo,
  // mesmo se o vínculo adicional pertence a organização que não é de QA.
  const anySupplierUsers = new Set(activeMembers.filter(member =>
    orgs.get(member.organization_id)?.kind === "SUPPLIER"
    && ["SUPPLIER_ADMIN","ORG_ADMIN"].includes(member.role)).map(member=>member.user_id));
  const anyBuyerUsers = new Set(activeMembers.filter(member =>
    orgs.get(member.organization_id)?.kind === "BUYER"
    && ["BUYER","ORG_ADMIN"].includes(member.role)).map(member=>member.user_id));
  const exclusiveSupplierUsers = new Set([...supplierUsers].filter(id =>
    !platformAdmins.has(id) && !anyBuyerUsers.has(id)));
  const exclusiveBuyerUsers = new Set([...buyerUsers].filter(id =>
    !platformAdmins.has(id) && !anySupplierUsers.has(id)));

  // Cada empresa deve ter sua propria identidade de homologacao.
  // Um usuario com vinculos em A e B nao prova duas sessoes independentes.
  const eligibleSupplierMembers = activeMembers.filter(member =>
    exclusiveSupplierUsers.has(member.user_id)
    && isEligibleOrg(member.organization_id,"SUPPLIER")
    && ["SUPPLIER_ADMIN","ORG_ADMIN"].includes(member.role));
  const usedSupplierUsers = new Set<string>();
  const independentSupplierOrgs = new Set<string>();
  for (const member of eligibleSupplierMembers) {
    if (usedSupplierUsers.has(member.user_id) || independentSupplierOrgs.has(member.organization_id)) continue;
    usedSupplierUsers.add(member.user_id);
    independentSupplierOrgs.add(member.organization_id);
  }
  const supplierOrganizations = independentSupplierOrgs.size;

  const supplierA = supplierOrganizations >= 1;
  const supplierB = supplierOrganizations >= 2;
  const buyer = exclusiveBuyerUsers.size >= 1;
  const milestones: QaMilestone[] = [
    { id:"admin", title:"ADM com MFA", complete:input.adminAal2,
      explanation:"Sessão administrativa atual autenticada com AAL2" },
    { id:"supplierA", title:"Fornecedor independente A", complete:supplierA,
      explanation:"Empresa de testes aprovada, usuário próprio ativo e sem acesso de ADM" },
    { id:"supplierB", title:"Fornecedor independente B", complete:supplierB,
      explanation:"Segunda empresa de testes distinta, com outra identidade sem ADM" },
    { id:"buyer", title:"Comprador independente", complete:buyer,
      explanation:"Identidade ativa exclusiva de comprador, sem vínculo fornecedor ou ADM" },
  ];
  return {
    completed:milestones.filter(item=>item.complete).length,
    total:milestones.length,
    supplierOrganizations,
    buyerIdentities:exclusiveBuyerUsers.size,
    milestones,
  };
}
