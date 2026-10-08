import { demoRepository } from "@/lib/marketplace/catalog";
import { marketplaceFlags } from "@/lib/marketplace/flags";

export async function GET(request: Request) {
  if (!marketplaceFlags.catalogEnabled) return Response.json({ ok: true, enabled: false, products: [] });
  const term = new URL(request.url).searchParams.get("term") ?? "";
  const records = await demoRepository.search(term);
  return Response.json({ ok: true, enabled: true, products: records.map(({ product, organization, offer, supplierProduct }) => ({ product, supplier: { id: organization.id, name: organization.legalName, isPlatformOwned: organization.isPlatformOwned }, offer: { id: offer.id, sku: supplierProduct.supplierSku, priceMinor: offer.basePriceMinor, minQuantity: offer.minQuantity, tiers: offer.tiers, regions: offer.regions } })) });
}
