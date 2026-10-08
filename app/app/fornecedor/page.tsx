import type { Metadata } from "next";
import { MarketplacePortal } from "@/components/marketplace-portal";
export const metadata: Metadata = { title: "Área do fornecedor · Distribuidora" };
export default function SupplierPortalPage() { return <MarketplacePortal portal="fornecedor" />; }
