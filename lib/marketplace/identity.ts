export type MarketplaceRole = "ORG_ADMIN" | "BUYER" | "REQUESTER" | "APPROVER" | "FINANCE" | "READER" | "SUPPLIER_ADMIN" | "SELLER" | "PLATFORM_ADMIN";
export type MarketplaceCapability = "BUYER" | "SUPPLIER" | "PLATFORM_OPERATOR";
export type MembershipStatus = "active" | "invited" | "revoked";

export type MarketplaceUser = { id: string; email: string; status: "active" | "blocked" };
export type MarketplaceOrganization = { id: string; legalName: string; capabilities: MarketplaceCapability[]; status: "pending" | "approved" | "suspended"; isPlatformOwned: boolean };
export type OrganizationMembership = { userId: string; organizationId: string; role: MarketplaceRole; status: MembershipStatus };

export const ROLE_CAPABILITIES: Record<MarketplaceRole, MarketplaceCapability[]> = {
  ORG_ADMIN: ["BUYER", "SUPPLIER"],
  BUYER: ["BUYER"],
  REQUESTER: ["BUYER"],
  APPROVER: ["BUYER"],
  FINANCE: ["BUYER"],
  READER: ["BUYER"],
  SUPPLIER_ADMIN: ["SUPPLIER"],
  SELLER: ["SUPPLIER"],
  PLATFORM_ADMIN: ["PLATFORM_OPERATOR", "BUYER", "SUPPLIER"],
};

export function canAccessOrganization(user: MarketplaceUser, organization: MarketplaceOrganization, membership: OrganizationMembership | undefined, capability: MarketplaceCapability) {
  return user.status === "active" && organization.status === "approved" && membership?.status === "active" && membership.userId === user.id && membership.organizationId === organization.id && ROLE_CAPABILITIES[membership.role]?.includes(capability) === true && organization.capabilities.includes(capability);
}

export function canReadBuyer(user: MarketplaceUser, buyer: MarketplaceOrganization, membership: OrganizationMembership | undefined) {
  return canAccessOrganization(user, buyer, membership, "BUYER");
}

export const demoIdentity = {
  user: { id: "user-demo", email: "demo@local.test", status: "active" } satisfies MarketplaceUser,
  buyer: { id: "org-buyer-demo", legalName: "Comprador demonstração", capabilities: ["BUYER"], status: "approved", isPlatformOwned: false } satisfies MarketplaceOrganization,
  supplier: { id: "org-supplier-demo", legalName: "Fornecedor demonstração", capabilities: ["SUPPLIER"], status: "approved", isPlatformOwned: false } satisfies MarketplaceOrganization,
  membership: { userId: "user-demo", organizationId: "org-buyer-demo", role: "ORG_ADMIN", status: "active" } satisfies OrganizationMembership,
} as const;
