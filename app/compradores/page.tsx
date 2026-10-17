import type { Metadata } from "next";
import { MarketplaceRoleLanding } from "@/components/marketplace-role-landing";
export const metadata: Metadata = { title: "Para compradores · Distribuidora", description: "Organize compras B2B com ofertas autorizadas e fornecedores homologados." };
export default function CompradoresPage() { return <MarketplaceRoleLanding role="comprador" />; }
