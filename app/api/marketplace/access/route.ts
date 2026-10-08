import { canAccessOrganization, demoIdentity } from "@/lib/marketplace/identity";

/** Endpoint de diagnóstico local; não cria sessão e não autoriza dados reais. */
export async function GET() {
  const buyerAccess = canAccessOrganization(demoIdentity.user, demoIdentity.buyer, demoIdentity.membership, "BUYER");
  const supplierAccess = canAccessOrganization(demoIdentity.user, demoIdentity.supplier, demoIdentity.membership, "SUPPLIER");
  return Response.json({ ok: true, demo: true, identityProvider: "local-fixture", organization: demoIdentity.buyer.id, capabilities: { buyer: buyerAccess, supplier: supplierAccess } });
}
