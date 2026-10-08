"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ListChecks, ShoppingBasket, Sparkles } from "lucide-react";

const TABS = [
  { href: "/lista", label: "Pedido", icon: ShoppingBasket },
  { href: "/lista/montar", label: "Montar", icon: ListChecks },
  { href: "/lista/sugestoes", label: "Sugestões", icon: Sparkles },
] as const;

/** Três jeitos de montar um pedido: revisar, começar do zero e receber sugestões prontas. */
export function ListTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Seções do pedido" className="mb-4 grid grid-cols-3 gap-1 rounded-full bg-paper p-1 shadow-card ring-1 ring-line/70">
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            replace
            aria-current={active ? "page" : undefined}
            className={`flex h-10 items-center justify-center gap-1.5 rounded-full text-xs font-extrabold transition-colors sm:text-sm ${active ? "bg-forest text-white" : "text-muted hover:bg-lime-soft"}`}
          >
            <Icon size={15} aria-hidden /> {label}
          </Link>
        );
      })}
    </nav>
  );
}
