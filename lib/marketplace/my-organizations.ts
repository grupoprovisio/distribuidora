import "server-only";
import { createClient } from "@/lib/supabase/server";
import { requireMarketplacePortal } from "@/lib/marketplace/session";

export type MarketplaceOrganization = {
  id: string;
  name: string;
  role: string;
  status: string;
};
export type MarketplaceOrganizationSummary = {
  organizations: MarketplaceOrganization[];
  error: boolean;
};

/** Resolve only buyer/supplier organizations already authorized by the checked session.
 * Pages that already checked their portal may reuse the access result instead of
 * repeating authentication, profile, membership and capability lookups.
 */
export async function myMarketplaceOrganizations(
  portal: "comprador" | "fornecedor",
  verifiedAccess?: Awaited<ReturnType<typeof requireMarketplacePortal>>
): Promise<MarketplaceOrganizationSummary> {
  const access = verifiedAccess ?? await requireMarketplacePortal(portal);
  const authorizedIds = access.organizationIds[portal];
  if (!authorizedIds.length) return { organizations: [], error: false };
  const client = await createClient();
  const [members, orgs] = await Promise.all([
    client.from("organization_members").select("organization_id,role,status")
      .eq("user_id",access.userId).eq("status","active")
      .in("organization_id",authorizedIds).limit(100),
    client.from("organizations").select("id,trade_name,legal_name,status")
      .in("id",authorizedIds).eq("status","approved").limit(100),
  ]);
  if (members.error || orgs.error) return { organizations: [], error: true };
  const memberRoles = new Map((members.data ?? []).map(member=>[member.organization_id,member.role]));
  const organizations: MarketplaceOrganization[] = (orgs.data ?? [])
    .filter(org=>memberRoles.has(org.id))
    .map(org=>({ id:org.id, name:org.trade_name || org.legal_name, role:memberRoles.get(org.id) || "", status:org.status }));
  return { organizations, error: false };
}
