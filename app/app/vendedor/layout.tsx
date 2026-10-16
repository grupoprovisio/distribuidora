import type { ReactNode } from "react";
import { requireMarketplacePortal } from "@/lib/marketplace/session";
export const dynamic = "force-dynamic";
export default async function SellerLayout({children}:{children:ReactNode}) {
  await requireMarketplacePortal("vendedor");
  return children;
}
