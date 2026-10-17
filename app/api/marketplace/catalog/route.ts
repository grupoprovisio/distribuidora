import { demoRepository } from "@/lib/marketplace/catalog";
import { marketplaceFlags } from "@/lib/marketplace/flags";
import { isLocalMarketplaceDemoEnabled } from "@/lib/marketplace/demo-access";

export async function GET(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  // A real authorized catalog backend does not exist yet. Never expose fixtures in production.
  if (!isLocalMarketplaceDemoEnabled() || !marketplaceFlags.catalogEnabled) {
    return Response.json({ ok: true, enabled: false, products: [] }, { headers });
  }
  const params = new URL(request.url).searchParams;
  const term = (params.get("term") ?? "").slice(0, 120);
  const region = params.get("region") ?? "";
  if (!region) return Response.json({ ok: false, reason: "region_required", products: [] }, { status: 400, headers });
  const records = await demoRepository.search(term, region);
  return Response.json({
    ok: true, enabled: true, demo: true,
    products: records.map(({ product, organization, offer, supplierProduct }) => ({
      product, supplier: { id: organization.id, name: organization.legalName, isPlatformOwned: organization.isPlatformOwned },
      offer: { id: offer.id, sku: supplierProduct.supplierSku, priceMinor: offer.basePriceMinor,
        minQuantity: offer.minQuantity, tiers: offer.tiers, regions: offer.regions },
    })),
  }, { headers });
}
