import type { Metadata } from "next";
import { MarketplaceRoleLanding } from "@/components/marketplace-role-landing";
export const metadata: Metadata = { title: "Para fornecedores · Distribuidora", description: "Publique ofertas B2B depois da homologação da sua empresa." };
export default function FornecedoresPage() { return <MarketplaceRoleLanding role="fornecedor" />; }
