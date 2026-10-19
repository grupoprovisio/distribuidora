"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, FileSpreadsheet, FileText, LayoutDashboard, MapPinned, PackageSearch, ShieldCheck } from "lucide-react";

type Portal = "comprador" | "fornecedor";

const menu = {
  comprador: [
    { href: "/app/comprador", label: "Visão geral", icon: LayoutDashboard },
    { href: "/app/comprador/catalogo", label: "Catálogo", icon: PackageSearch },
    { href: "/app/comprador/cotacoes", label: "Cotações", icon: FileText },
    { href: "/app/comprador/pedidos", label: "Pedidos", icon: ClipboardList },
  ],
  fornecedor: [
    { href: "/app/fornecedor", label: "Visão geral", icon: LayoutDashboard },
    { href: "/app/fornecedor/catalogo", label: "Catálogo", icon: PackageSearch },
    { href: "/app/fornecedor/importar", label: "Preparar CSV", icon: FileSpreadsheet },
    { href: "/app/fornecedor/operacao", label: "Operação", icon: MapPinned },
    { href: "/app/fornecedor/homologacao", label: "Homologação", icon: ShieldCheck },
  ],
} as const;

/** Navegação exclusivamente dos portais autenticados, sem o terceiro perfil legado. */
export function MarketplacePortalNav({ portal }: { portal: Portal }) {
  const pathname = usePathname();
  return (
    <nav aria-label={portal === "comprador" ? "Seções do comprador" : "Seções do fornecedor"}
      className="border-b border-line bg-paper/95">
      <div className="mx-auto max-w-7xl overflow-x-auto px-3 py-2 sm:px-6">
        <ul className="flex min-w-max items-center gap-1 sm:gap-2">
          {menu[portal].map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/app/" + portal && pathname.startsWith(href + "/"));
            return (
              <li key={href}>
                <Link href={href} aria-current={active ? "page" : undefined}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest sm:text-sm ${active ? "bg-forest text-white" : "text-forest hover:bg-lime-soft"}`}>
                  <Icon size={17} aria-hidden="true" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
