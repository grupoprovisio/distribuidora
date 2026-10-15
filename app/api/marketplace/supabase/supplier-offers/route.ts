import {
  gatewayErrorResponse,
  getMarketplaceSupabaseConfig,
  marketplaceGatewayFailure,
  noStoreResponse,
  selectMarketplaceRows,
  validMarketplaceUuid,
  verifyMarketplaceSession,
} from "@/lib/marketplace/supabase-gateway";

type SupplierOffer = {
  id: string;
  supplier_product_id: string;
  supplier_org_id: string;
  source_type: string;
  base_price_minor: number;
  min_quantity: number;
  status: string;
  valid_from: string;
  valid_to: string | null;
};

/** Lista operacional READ-ONLY do proprio fornecedor, sem liberar ofertas ao comprador. */
export async function GET(request: Request) {
  const guard = marketplaceGatewayFailure(request);
  if (guard) return gatewayErrorResponse(guard);
  const params = new URL(request.url).searchParams;
  const organizationId = params.get("organization_id") ?? "";
  if (!validMarketplaceUuid(organizationId)) {
    return noStoreResponse({ ok: false, error: "invalid_organization" }, 400);
  }
  const config = getMarketplaceSupabaseConfig()!;
  const session = await verifyMarketplaceSession(request, config);
  if ("kind" in session) return gatewayErrorResponse(session);
  const offers = await selectMarketplaceRows<SupplierOffer>(config, session, "offers", {
    select: "id,supplier_product_id,supplier_org_id,source_type,base_price_minor,min_quantity,status,valid_from,valid_to",
    supplier_org_id: `eq.${organizationId}`,
    order: "created_at.desc",
    limit: "50",
  });
  if (!Array.isArray(offers)) return gatewayErrorResponse(offers);
  // RLS de supplier_org_id valida o relacionamento real; IDs manipulados nao concedem acesso.
  return noStoreResponse({ ok: true, organizationId, offers });
}
