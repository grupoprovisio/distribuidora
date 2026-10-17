import type { ReactNode } from "react";
import { requireMarketplacePortal } from "@/lib/marketplace/session";
import { LogoutButton } from "@/components/marketplace-logout-button";
export const dynamic = "force-dynamic";
export default async function AdminLayout({children}:{children:ReactNode}) {
  await requireMarketplacePortal("admin");
  return <div>
    <div className="flex items-center justify-between gap-3 border-b border-line bg-paper px-5 py-3">
      <span className="text-xs font-extrabold uppercase tracking-wider text-forest">Administração Provisio · Sessão protegida</span>
      <LogoutButton />
    </div>
    {children}
  </div>;
}
