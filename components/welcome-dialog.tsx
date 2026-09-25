"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { ArrowRight, ShoppingCart, X } from "lucide-react";

// Popup de boas-vindas do Início, em "vidro líquido". Aparece uma vez por sessão (aba/janela): ao fechar, não volta até abrir o app de novo.

const KEY = "abp:welcome:v1";
const listeners = new Set<() => void>();

/** true = já foi dispensado nesta sessão. No servidor (e sem storage) conta como dispensado: nunca pisca na hidratação. */
function dismissed() {
  try {
    return window.sessionStorage.getItem(KEY) === "1";
  } catch {
    return true;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function dismiss() {
  try {
    window.sessionStorage.setItem(KEY, "1");
  } catch {
    // sem storage: o popup não abre (dismissed() já devolve true), então não há o que gravar
  }
  listeners.forEach((l) => l());
}

export function WelcomeDialog() {
  const closed = useSyncExternalStore(subscribe, dismissed, () => true);
  const cta = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (closed) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && dismiss();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    const focus = window.setTimeout(() => cta.current?.focus({ preventScroll: true }), 350);
    return () => {
      window.clearTimeout(focus);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [closed]);

  if (closed) return null;

  return (
    <div className="welcome-backdrop fixed inset-0 z-[70] grid place-items-center overflow-hidden p-5" onClick={dismiss}>
      {/* Manchas de cor atrás do vidro: é o que ele "refrata" e borra. */}
      <span aria-hidden className="welcome-blob welcome-blob-a" />
      <span aria-hidden className="welcome-blob welcome-blob-b" />
      <span aria-hidden className="welcome-blob welcome-blob-c" />

      <div role="dialog" aria-modal="true" aria-labelledby="welcome-title" onClick={(e) => e.stopPropagation()} className="glass-liquid welcome-card relative w-full max-w-sm rounded-[2.5rem] p-7 text-center sm:p-8">
        <button type="button" onClick={dismiss} aria-label="Fechar" className="glass-chip absolute right-4 top-4 grid size-9 place-items-center rounded-full text-forest-deep transition-transform active:scale-90">
          <X size={16} strokeWidth={2.6} aria-hidden />
        </button>

        <span className="glass-chip welcome-float mx-auto grid size-16 place-items-center rounded-full text-forest">
          <ShoppingCart size={28} strokeWidth={2.2} aria-hidden />
        </span>

        <h2 id="welcome-title" className="mt-5 text-3xl font-extrabold leading-tight tracking-tight text-forest-deep">
          Olá, seja bem vindo!
        </h2>
        <p className="mt-2 text-sm font-semibold leading-relaxed text-forest-deep/75">Compare preços, promoções e degraus de atacado entre as filiais da Distribuidora e monte a sua lista com o melhor preço.</p>

        <button
          ref={cta}
          type="button"
          onClick={dismiss}
          className="mt-6 inline-flex h-13 w-full items-center justify-center gap-2 rounded-full bg-forest px-6 text-sm font-extrabold text-white shadow-float outline-none transition-transform focus-visible:ring-4 focus-visible:ring-lime/70 active:scale-[0.97]"
        >
          Começar <ArrowRight size={16} aria-hidden />
        </button>

      </div>
    </div>
  );
}
