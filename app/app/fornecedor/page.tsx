import type { Metadata } from "next";
import { MarketplacePortal } from "@/components/marketplace-portal";
import { myMarketplaceOrganizations } from "@/lib/marketplace/my-organizations";
import { getMarketplaceAccess } from "@/lib/marketplace/session";
import { transactionAccessMode } from "@/lib/marketplace/qa-transaction-gate";
export const metadata: Metadata = { title: "Área do fornecedor · Provisio", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function SupplierPortalPage() {
  const summary = await myMarketplaceOrganizations("fornecedor");
  const mode = transactionAccessMode(await getMarketplaceAccess());
  return <MarketplacePortal portal="fornecedor" summary={summary} transactionMode={mode} />;
}
