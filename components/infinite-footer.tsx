"use client";

import type { RefObject } from "react";
import { Loader2, RefreshCw } from "lucide-react";

/** Rodapé da rolagem infinita: o elemento observado, o indicador de carregamento e o aviso de fim/erro. */
export function InfiniteFooter({
  sentinel,
  busy,
  error,
  hasMore,
  retry,
  shown,
  total,
}: {
  sentinel: RefObject<HTMLDivElement | null>;
  busy: boolean;
  error: boolean;
  hasMore: boolean;
  retry: () => void;
  shown: number;
  total: number | null;
}) {
  return (
    <div className="mt-6 flex min-h-16 flex-col items-center justify-center gap-2 pb-2">
      <div ref={sentinel} aria-hidden className="h-px w-full" />
      {error ? (
        <button type="button" onClick={retry} className="inline-flex h-11 items-center gap-2 rounded-full bg-forest px-5 text-sm font-extrabold text-white active:scale-95">
          <RefreshCw size={15} aria-hidden /> Não consegui carregar mais. Tentar de novo
        </button>
      ) : busy ? (
        <p role="status" className="inline-flex items-center gap-2 text-xs font-bold text-muted">
          <Loader2 size={15} className="animate-spin text-forest" aria-hidden /> Carregando mais produtos…
        </p>
      ) : !hasMore && shown > 0 ? (
        <p className="text-xs font-semibold text-muted">Você viu todos os {(total !== null && total < shown ? total : shown).toLocaleString("pt-BR")} produtos.</p>
      ) : null}
    </div>
  );
}
