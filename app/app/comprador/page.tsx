import type { Metadata } from "next";
import { MarketplacePortal } from "@/components/marketplace-portal";
export const metadata: Metadata = { title: "Área do comprador · Distribuidora" };
export default function BuyerPortalPage() { return <MarketplacePortal portal="comprador" />; }
