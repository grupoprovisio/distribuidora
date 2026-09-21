"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, RefreshCw, SearchX } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import type { CatalogFail, CatalogResponse } from "@/lib/catalog-types";
import { usePrefs } from "@/lib/prefs-store";
import { PRODUCT_GRID } from "@/lib/ui";

/** Busca no catálogo real da filial escolhida. `params` = filtros; `null` = não buscar. */
export function useCatalog(params: Record<string, string | number | undefined> | null) {
  const { filial } = usePrefs();
  const [attempt, setAttempt] = useState(0);
  const [done, setDone] = useState<{ key: string; data?: CatalogResponse; failed?: boolean } | null>(null);

  let key: string | null = null;
  if (params) {
    const qs = new URLSearchParams({ seller: filial.seller });
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") qs.set(k, String(v));
    key = `${qs.toString()}#${attempt}`;
  }

  useEffect(() => {
    if (!key) return;
    const ctrl = new AbortController();
    fetch(`/api/catalog?${key.slice(0, key.lastIndexOf("#"))}`, { signal: ctrl.signal })
      .then((r) => r.json() as Promise<CatalogResponse | CatalogFail>)
      .then((data) => setDone(data.ok ? { key, data } : { key, failed: true }))
      .catch((e: unknown) => {
        if ((e as Error).name !== "AbortError") setDone({ key, failed: true });
      });
    return () => ctrl.abort();
  }, [key]);

  const current = done && done.key === key ? done : null;
  const status = !key ? "idle" : !current ? "loading" : current.failed ? "error" : "ready";
  return { status, data: current?.data, retry: () => setAttempt((a) => a + 1) } as const;
}

export function GridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className={PRODUCT_GRID} role="status" aria-label="Carregando produtos">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-3xl bg-paper p-3 shadow-card ring-1 ring-line/70">
          <div className="aspect-square animate-pulse rounded-2xl bg-canvas" />
          <div className="mt-3 h-3 w-1/3 animate-pulse rounded-full bg-canvas" />
          <div className="mt-2 h-4 w-11/12 animate-pulse rounded-full bg-canvas" />
          <div className="mt-2 h-4 w-2/3 animate-pulse rounded-full bg-canvas" />
          <div className="mt-4 flex items-end justify-between">
            <div className="h-6 w-16 animate-pulse rounded-full bg-canvas" />
            <div className="size-9 animate-pulse rounded-full bg-canvas" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function GridMessage({ kind, onRetry }: { kind: "error" | "empty"; onRetry?: () => void }) {
  const Icon = kind === "error" ? AlertTriangle : SearchX;
  return (
    <div className="mx-auto max-w-md rounded-[2rem] bg-paper px-6 py-10 text-center shadow-card ring-1 ring-line/70">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-sand text-[#5c3a06]">
        <Icon size={24} aria-hidden />
      </span>
      <p className="mt-3 text-base font-extrabold">{kind === "error" ? "Não consegui carregar os produtos" : "Nenhum produto encontrado"}</p>
      <p className="mt-1 text-sm font-medium text-muted">
        {kind === "error" ? "Verifique a conexão e tente de novo." : "Tente outro nome, marca, código de barras ou mude os filtros."}
      </p>
      {kind === "error" && onRetry ? (
        <button type="button" onClick={onRetry} className="mt-4 inline-flex h-11 items-center gap-2 rounded-full bg-forest px-5 text-sm font-extrabold text-white active:scale-95">
          <RefreshCw size={15} aria-hidden /> Tentar de novo
        </button>
      ) : null}
    </div>
  );
}

/** Grade de produtos de uma consulta simples (Início, Ofertas). */
export function CatalogSection({ params, count = 6 }: { params: Record<string, string | number | undefined>; count?: number }) {
  const { status, data, retry } = useCatalog(params);
  if (status === "loading" || status === "idle") return <GridSkeleton count={count} />;
  if (status === "error" || !data) return <GridMessage kind="error" onRetry={retry} />;
  if (data.products.length === 0) return <GridMessage kind="empty" />;
  return (
    <div className={PRODUCT_GRID}>
      {data.products.map((p, i) => (
        <ProductCard key={p.id} product={p} priority={i < 2} />
      ))}
    </div>
  );
}
