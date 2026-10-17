import { canAccessOrganization, demoIdentity } from "@/lib/marketplace/identity";
import { demoEndpointDisabled, isLocalMarketplaceDemoEnabled } from "@/lib/marketplace/demo-access";

/** Diagnoses fixture permissions only. This endpoint is NOT an authentication mechanism. */
export async function GET() {
  if (!isLocalMarketplaceDemoEnabled()) return demoEndpointDisabled();
  const buyerAccess = canAccessOrganization(demoIdentity.user, demoIdentity.buyer, demoIdentity.membership, "BUYER");
  const supplierAccess = canAccessOrganization(demoIdentity.user, demoIdentity.supplier, demoIdentity.membership, "SUPPLIER");
  return Response.json({
    ok: true, demo: true, identityProvider: "local-fixture", organization: demoIdentity.buyer.id,
    capabilities: { buyer: buyerAccess, supplier: supplierAccess },
  }, { headers: { "Cache-Control": "no-store" } });
}
