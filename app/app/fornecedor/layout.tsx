import type { ReactNode } from "react";
import { requireMarketplacePortal } from "@/lib/marketplace/session";
export const dynamic = "force-dynamic";
export default async function SupplierLayout({children}:{children:ReactNode}) {
  await requireMarketplacePortal("fornecedor");
  return children;
}
