import { BadgePercent, House, ShoppingBasket, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Rotas que mantêm esta aba ativa (além de `href`). "/" só casa exato. */
  also?: string[];
  /** "list": itens na lista. "account": compras salvas esperando a nota fiscal (sininho que balança). */
  badge?: "list" | "account";
};

// Ordem visual: dois à esquerda, o botão de scan no centro (fora desta lista), dois à direita.
export const NAV_LEFT: NavItem[] = [
  { href: "/", label: "Início", icon: House, also: ["/buscar", "/categorias"] },
  { href: "/promocoes", label: "Promoções", icon: BadgePercent, also: ["/ofertas"] },
];

export const NAV_RIGHT: NavItem[] = [
  { href: "/lista", label: "Lista", icon: ShoppingBasket, badge: "list" },
  // Favoritos fica dentro da Conta.
  { href: "/conta", label: "Conta", icon: UserRound, also: ["/favoritos"], badge: "account" },
];

export const SCAN_HREF = "/scan";
