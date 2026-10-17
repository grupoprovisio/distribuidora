import type { ReactNode } from "react";
import { requireMarketplaceLogin } from "@/lib/marketplace/session";
import { LogoutButton } from "@/components/marketplace-logout-button";
export const dynamic = "force-dynamic";
export default async function MarketplaceLayout({ children }: { children: ReactNode }) {
  const access = await requireMarketplaceLogin();
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-paper px-5 py-3 text-xs font-semibold text-forest">
        <span>Área empresarial Provisio · {access.email}</span>
        <LogoutButton />
      </div>
      {children}
    </div>
  );
}
