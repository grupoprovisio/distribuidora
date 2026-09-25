"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { QrCode } from "lucide-react";
import { NAV_LEFT, NAV_RIGHT, SCAN_HREF, type NavItem } from "@/lib/nav";
import { useAccountEmail, useHydrated } from "@/lib/account-store";
import { useList } from "@/lib/list-store";
import { usePurchases } from "@/lib/purchase-store";

const SPRING = { type: "spring", stiffness: 420, damping: 34, mass: 0.8 } as const;

// 6 colunas: [início, promoções, pedido, empresas, conta, scanner]
const SLOTS: (NavItem | "scan")[] = [...NAV_LEFT, ...NAV_RIGHT, "scan"];

function isActive(pathname: string, item: NavItem) {
  const paths = [item.href, ...(item.also ?? [])];
  return paths.some((p) => (p === "/" ? pathname === "/" : pathname === p || pathname.startsWith(p + "/")));
}

export function FloatingNav() {
  const pathname = usePathname();
  const { count } = useList();
  const email = useAccountEmail();
  const pending = usePurchases(email).open.length;
  // Deslogado: o sininho na Conta chama para entrar (e para salvar compras); logado: avisa das compras sem nota.
  const askLogin = useHydrated() && !email;
  const activeIndex = SLOTS.findIndex((slot) => slot !== "scan" && isActive(pathname, slot));

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
      <nav
        aria-label="Navegação principal"
        className="pointer-events-auto relative w-full max-w-md rounded-full border border-line bg-paper/90 p-1.5 shadow-float backdrop-blur-xl sm:max-w-lg"
      >
        <ul className="relative grid grid-cols-6">
          {/* Indicador único que desliza entre as abas (só % do próprio tamanho, sem medir layout). */}
          <motion.span
            aria-hidden
            className="absolute inset-y-0 left-0 w-1/6 rounded-full bg-forest"
            initial={false}
            animate={{ x: `${Math.max(activeIndex, 0) * 100}%`, opacity: activeIndex < 0 ? 0 : 1 }}
            transition={SPRING}
          />

          {SLOTS.map((slot, index) => {
            if (slot === "scan") {
              return (
                <li key="scan" className="relative">
                  <Link
                    href={SCAN_HREF}
                    aria-label="Escanear QR code ou código de barras"
                    className="flex h-14 flex-col items-center justify-center gap-0.5 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-forest/40 sm:h-16"
                  >
                    <motion.span className="flex flex-col items-center gap-0.5 text-muted transition-colors duration-200" whileTap={{ scale: 0.88 }} transition={SPRING}>
                      <QrCode size={20} strokeWidth={2} aria-hidden />
                      <span className="text-[10.5px] font-bold leading-none sm:text-[11px]">Scanner</span>
                    </motion.span>
                  </Link>
                </li>
              );
            }
            const active = index === activeIndex;
            const Icon = slot.icon;
            const badge = slot.badge === "list" && count > 0 ? count : 0;
            const alerts = slot.badge === "account" ? (askLogin ? 1 : pending) : 0;
            return (
              <li key={slot.href} className="relative">
                <Link
                  href={slot.href}
                  aria-current={active ? "page" : undefined}
                  className="flex h-14 flex-col items-center justify-center gap-0.5 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-forest/40 sm:h-16"
                >
                  <motion.span
                    className={`relative flex flex-col items-center gap-0.5 transition-colors duration-200 ${
                      active ? "text-white" : "text-muted"
                    }`}
                    whileTap={{ scale: 0.88 }}
                    animate={{ y: active ? -1 : 0 }}
                    transition={SPRING}
                  >
                    <motion.span animate={{ scale: active ? 1.1 : 1 }} transition={SPRING}>
                      <Icon size={20} strokeWidth={active ? 2.4 : 2} aria-hidden />
                    </motion.span>
                    <span className="text-[10.5px] font-bold leading-none sm:text-[11px]">{slot.label}</span>
                    {badge ? (
                      <span
                        aria-label={`${badge} itens na lista`}
                        className="absolute -right-3 -top-1.5 grid min-w-[1.1rem] place-items-center rounded-full bg-lime px-1 text-[10px] font-extrabold leading-[1.1rem] text-forest-deep"
                      >
                        {badge > 99 ? "99+" : badge}
                      </span>
                    ) : null}
                    {alerts ? (
                      <span
                        role="status"
                        aria-label={askLogin ? "Entre na sua conta da Distribuidora" : `${alerts} ${alerts === 1 ? "compra salva aguarda" : "compras salvas aguardam"} a nota fiscal`}
                        className="animate-dot absolute -right-2.5 -top-1 size-3 rounded-full bg-[#d6334f] shadow-card ring-2 ring-paper"
                      />
                    ) : null}
                  </motion.span>
                </Link>
              </li>
            );
          })}
        </ul>

      </nav>
    </div>
  );
}
