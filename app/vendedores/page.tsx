import type { Metadata } from "next";
import { MarketplaceRoleLanding } from "@/components/marketplace-role-landing";
export const metadata: Metadata = { title: "Para vendedores · Distribuidora", description: "Desenvolva negócios B2B com carteira, contexto e regras claras." };
export default function VendedoresPage() { return <MarketplaceRoleLanding role="vendedor" />; }
