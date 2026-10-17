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

/** Always scoped to the authenticated user, an approved organization and its active capability. */
export async function myMarketplaceOrganizations(portal: "comprador" | "fornecedor"): Promise<MarketplaceOrganizationSummary> {
  const access = await requireMarketplacePortal(portal);
  const client = await createClient();
  const [members, orgs, capabilities] = await Promise.all([
    client.from("organization_members").select("organization_id,role,status").eq("user_id",access.userId).eq("status","active").limit(100),
    client.from("organizations").select("id,trade_name,legal_name,status").eq("status","approved").limit(100),
    client.from("organization_capabilities").select("organization_id,capability,status").eq("capability",portal === "comprador" ? "BUYER" : "SUPPLIER").eq("status","approved").limit(100),
  ]);
  if (members.error || orgs.error || capabilities.error) return { organizations: [], error: true };
  const caps = new Set((capabilities.data ?? []).map(item=>item.organization_id));
  const memberRoles = new Map((members.data ?? []).map(member=>[member.organization_id,member.role]));
  const organizations: MarketplaceOrganization[] = (orgs.data ?? [])
    .filter(org=>caps.has(org.id) && memberRoles.has(org.id))
    .map(org=>({ id:org.id, name:org.trade_name || org.legal_name, role:memberRoles.get(org.id) || "", status:org.status }));
  return { organizations, error: false };
}
