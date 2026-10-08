import type { Metadata } from "next";
import { MarketplacePortal } from "@/components/marketplace-portal";
export const metadata: Metadata = { title: "Área do vendedor · Distribuidora" };
export default function SellerPortalPage() { return <MarketplacePortal portal="vendedor" />; }
