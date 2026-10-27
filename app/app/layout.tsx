import type { ReactNode } from "react";
import { requireMarketplaceLogin } from "@/lib/marketplace/session";
import { LogoutButton } from "@/components/marketplace-logout-button";
export const dynamic = "force-dynamic";
export default async function MarketplaceLayout({ children }: { children: ReactNode }) {
  const access = await requireMarketplaceLogin();
  return (
    <div>
      <div className="flex items-center justify-between gap-2 border-b border-line bg-paper px-3 py-2 text-xs font-semibold text-forest sm:px-5 sm:py-3">
        <span className="min-w-0 truncate" title={access.email}>{access.email}</span>
        <LogoutButton />
      </div>
      {children}
    </div>
  );
}
