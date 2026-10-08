"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
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
  const [menuOpen, setMenuOpen] = useState(false);
  const activeIndex = SLOTS.findIndex((slot) => slot !== "scan" && isActive(pathname, slot));

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setMenuOpen(false); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

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
                  <button
                    type="button"
                    onClick={() => setMenuOpen(true)}
                    aria-label="Abrir menu lateral"
                    aria-expanded={menuOpen}
                    className="flex h-14 flex-col items-center justify-center gap-0.5 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-forest/40 sm:h-16"
                  >
                    <motion.span className="flex flex-col items-center gap-0.5 text-muted transition-colors duration-200" whileTap={{ scale: 0.88 }} transition={SPRING}>
                      <Menu size={20} strokeWidth={2} aria-hidden />
                      <span className="text-[10.5px] font-bold leading-none sm:text-[11px]">Menu</span>
                    </motion.span>
                  </button>
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

      {menuOpen ? (
        <div className="pointer-events-auto fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Menu principal">
          <button type="button" aria-label="Fechar menu" onClick={() => setMenuOpen(false)} className="absolute inset-0 bg-forest-deep/45 backdrop-blur-sm" />
          <aside className="animate-sheet-in absolute inset-y-0 right-0 flex w-[min(88vw,22rem)] flex-col bg-paper p-6 shadow-float" aria-label="Navegação adicional">
            <div className="flex items-center justify-between border-b border-line pb-5"><div><p className="text-xs font-black uppercase tracking-[0.14em] text-terra">Distribuidora</p><h2 className="mt-1 text-xl font-black text-forest-deep">Mais caminhos</h2></div><button type="button" onClick={() => setMenuOpen(false)} aria-label="Fechar menu" className="grid size-10 place-items-center rounded-full bg-canvas text-forest hover:bg-lime-soft focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lime/50"><X size={20} aria-hidden /></button></div>
            <nav className="mt-6" aria-label="Páginas da plataforma"><p className="text-xs font-black uppercase tracking-[0.14em] text-muted">Perfis</p><div className="mt-3 grid gap-2">{[["/compradores", "Sou comprador"], ["/vendedores", "Sou vendedor"], ["/fornecedores", "Sou fornecedor"]].map(([href, label]) => <Link key={href} href={href} onClick={() => setMenuOpen(false)} className="rounded-2xl bg-forest px-4 py-3 text-sm font-extrabold text-white transition-colors hover:bg-forest-deep focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lime/50">{label}</Link>)}</div><p className="mt-7 text-xs font-black uppercase tracking-[0.14em] text-muted">Acesso rápido</p><div className="mt-3 grid gap-1">{[[SCAN_HREF, "Escanear código"], ["/lista", "Meu pedido"], ["/categorias", "Categorias"], ["/conta", "Minha conta"], ["/contato", "Fale com a equipe"]].map(([href, label]) => <Link key={href} href={href} onClick={() => setMenuOpen(false)} className="rounded-2xl px-4 py-3 text-sm font-bold text-ink transition-colors hover:bg-lime-soft focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lime/50">{label}</Link>)}</div></nav>
            <p className="mt-auto border-t border-line pt-5 text-xs font-medium leading-relaxed text-muted">O menu reúne os perfis comerciais e os atalhos do site em um só lugar.</p>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
