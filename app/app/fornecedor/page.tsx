import type { Metadata } from "next";
import { MarketplacePortal } from "@/components/marketplace-portal";
import { myMarketplaceOrganizations } from "@/lib/marketplace/my-organizations";
export const metadata: Metadata = { title: "Área do fornecedor · Provisio", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function SupplierPortalPage() {
  const summary = await myMarketplaceOrganizations("fornecedor");
  return <MarketplacePortal portal="fornecedor" summary={summary} />;
}
