"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NAV_LEFT, NAV_RIGHT, type NavItem } from "@/lib/nav";

const items = [...NAV_LEFT, ...NAV_RIGHT];

function isActive(path: string, item: NavItem) {
  return path === item.href || (item.href !== "/" && path.startsWith(item.href + "/"));
}

export function FloatingNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    const panel = dialogRef.current;
    panel?.querySelector<HTMLElement>("a, button")?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setOpen(false); return; }
      if (event.key !== "Tab" || !panel) return;
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'));
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("keydown", keydown);
      triggerRef.current?.focus();
    };
  }, [open]);

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
        <nav aria-label="Navegação principal" className="pointer-events-auto w-full max-w-lg rounded-full border border-line bg-paper/95 p-1.5 shadow-float backdrop-blur-xl">
          <ul className="grid grid-cols-5">
            {items.map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item);
              return (
                <li key={item.href}>
                  <Link href={item.href} aria-current={active ? "page" : undefined}
                    className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-full px-1 text-[10px] font-bold transition-colors focus-visible:ring-2 focus-visible:ring-forest/50 sm:min-h-16 sm:text-xs ${active ? "bg-forest text-white" : "text-forest hover:bg-lime-soft"}`}>
                    <Icon size={20} aria-hidden />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
            <li>
              <button type="button" ref={triggerRef} onClick={() => setOpen(true)} aria-label="Abrir menu" aria-expanded={open}
                className="flex min-h-14 w-full flex-col items-center justify-center gap-1 rounded-full text-[10px] font-bold text-forest hover:bg-lime-soft focus-visible:ring-2 focus-visible:ring-forest/50 sm:min-h-16 sm:text-xs">
                <Menu size={20} aria-hidden /><span>Menu</span>
              </button>
            </li>
          </ul>
        </nav>
      </div>
      {open && (
        <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Menu da Provisio">
          <button type="button" aria-label="Fechar menu" onClick={() => setOpen(false)} className="absolute inset-0 bg-forest-deep/45 backdrop-blur-sm" />
          <aside ref={dialogRef} className="absolute inset-y-0 right-0 flex w-[min(88vw,22rem)] flex-col bg-paper p-6 shadow-float">
            <div className="flex items-center justify-between border-b border-line pb-5">
              <h2 className="text-xl font-black text-forest-deep">Grupo Provisio</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Fechar menu"
                className="grid size-10 place-items-center rounded-full bg-canvas text-forest focus-visible:ring-2 focus-visible:ring-forest">
                <X size={20} aria-hidden />
              </button>
            </div>
            <nav aria-label="Páginas da plataforma" className="mt-6 grid gap-2">
              {[
                ["/", "Início"], ["/produtos", "Catálogo autorizado"],
                ["/compradores", "Sou comprador"], ["/fornecedores", "Sou fornecedor"],
                ["/como-funciona", "Como funciona"], ["/contato", "Contato"],
                ["/admin/marketplace", "ADM"],
              ].map(([href, label]) => (
                <Link key={href} href={href} onClick={() => setOpen(false)}
                  className="rounded-2xl px-4 py-3 text-sm font-bold text-ink transition-colors hover:bg-lime-soft focus-visible:ring-2 focus-visible:ring-forest">
                  {label}
                </Link>
              ))}
            </nav>
            <p className="mt-auto border-t border-line pt-5 text-xs leading-relaxed text-muted">
              Plataforma comercial em desenvolvimento. Nenhuma transação real está habilitada.
            </p>
          </aside>
        </div>
      )}
    </>
  );
}
