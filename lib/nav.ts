import { Boxes, BriefcaseBusiness, Building2, House, PackageCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon; also?: string[]; badge?: "list" | "account" };

/** Only routes served by the authorized internal marketplace, no legacy VTEX navigation. */
export const NAV_LEFT: NavItem[] = [
  { href: "/", label: "Início", icon: House },
  { href: "/produtos", label: "Produtos", icon: Boxes },
];
export const NAV_RIGHT: NavItem[] = [
  { href: "/compradores", label: "Comprador", icon: Building2 },
  { href: "/vendedores", label: "Vendedor", icon: BriefcaseBusiness },
  { href: "/fornecedores", label: "Fornecedor", icon: PackageCheck },
];
/** Scanner legado desativado na navegação até utilizar exclusivamente SKUs homologados. */
export const SCAN_HREF = "/produtos";
