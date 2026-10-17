import type { ReactNode } from "react";
import { requireMarketplacePortal } from "@/lib/marketplace/session";
export const dynamic = "force-dynamic";
export default async function BuyerLayout({children}:{children:ReactNode}) {
  await requireMarketplacePortal("comprador");
  return children;
}
