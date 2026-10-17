import {
  gatewayErrorResponse,
  getMarketplaceSupabaseConfig,
  marketplaceGatewayFailure,
  noStoreResponse,
  selectMarketplaceRows,
  verifyMarketplaceSession,
} from "@/lib/marketplace/supabase-gateway";

type Profile = { id: string; display_name: string; status: string };
type Membership = { organization_id: string; role: string; status: string };

/**
 * Le somente perfil e memberships pertencentes ao JWT validado.
 * RLS continua sendo a barreira final no PostgREST.
 */
export async function GET(request: Request) {
  const guard = marketplaceGatewayFailure(request);
  if (guard) return gatewayErrorResponse(guard);
  const config = getMarketplaceSupabaseConfig()!;
  const session = await verifyMarketplaceSession(request, config);
  if ("kind" in session) return gatewayErrorResponse(session);
  const [profiles, memberships] = await Promise.all([
    selectMarketplaceRows<Profile>(config, session, "profiles", {
      select: "id,display_name,status", id: `eq.${session.user.id}`, limit: "1",
    }),
    selectMarketplaceRows<Membership>(config, session, "organization_members", {
      select: "organization_id,role,status",
      user_id: `eq.${session.user.id}`, limit: "50",
    }),
  ]);
  if (!Array.isArray(profiles)) return gatewayErrorResponse(profiles);
  if (!Array.isArray(memberships)) return gatewayErrorResponse(memberships);
  return noStoreResponse({
    ok: true,
    user: session.user,
    profile: profiles[0] ?? null,
    memberships,
  });
}
