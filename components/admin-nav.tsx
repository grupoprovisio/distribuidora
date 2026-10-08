import Link from "next/link";
import { Boxes, ClipboardList, PackageSearch, Percent, Settings2, UsersRound } from "lucide-react";

const ITEMS = [
  ["/admin", "Visão geral", ClipboardList],
  ["/buscar", "Produtos", PackageSearch],
  ["/conta", "Clientes", UsersRound],
  ["/promocoes", "Promoções", Percent],
  ["/lista", "Pedidos", Boxes],
  ["/conta/configuracoes", "Configurações", Settings2],
] as const;

export function AdminNav() {
  return <nav aria-label="Navegação administrativa" className="no-scrollbar mb-6 flex gap-2 overflow-x-auto pb-1 lg:grid lg:grid-cols-6">{ITEMS.map(([href, label, Icon]) => <Link key={href} href={href} className="inline-flex min-w-max items-center justify-center gap-2 rounded-2xl bg-paper px-4 py-3 text-xs font-extrabold text-muted shadow-card ring-1 ring-line/70 transition-colors hover:bg-lime-soft hover:text-forest"><Icon size={16} aria-hidden /> {label}</Link>)}</nav>;
}
