import { redirect } from "next/navigation";
import { requireMarketplaceLogin } from "@/lib/marketplace/session";
export const dynamic = "force-dynamic";
export default async function MarketplaceDashboardRedirect() {
  const access = await requireMarketplaceLogin();
  if (access.allowed.includes("admin")) redirect("/admin/marketplace");
  if (access.allowed.includes("fornecedor")) redirect("/app/fornecedor");
  if (access.allowed.includes("comprador")) redirect("/app/comprador");
  if (access.allowed.includes("vendedor")) redirect("/app/vendedor");
  redirect("/acesso-restrito");
}
