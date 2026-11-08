import type { Metadata } from "next";
import { MarketplacePortal } from "@/components/marketplace-portal";
import { myMarketplaceOrganizations } from "@/lib/marketplace/my-organizations";
import { getMarketplaceAccess } from "@/lib/marketplace/session";
import { transactionAccessMode } from "@/lib/marketplace/qa-transaction-gate";
export const metadata: Metadata = { title: "Área do comprador · Provisio", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function BuyerPortalPage() {
  const access = await getMarketplaceAccess();
  const summary = access ? await myMarketplaceOrganizations("comprador", access) : { organizations: [], error: true };
  const mode = transactionAccessMode(access);
  return <MarketplacePortal portal="comprador" summary={summary} transactionMode={mode} />;
}
