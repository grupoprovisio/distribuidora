"use client";

import { useEffect, useState } from "react";
import { GridMessage, GridSkeleton } from "@/components/product-grid";
import { PromoCard } from "@/components/promo-card";
import type { CatalogProduct } from "@/lib/catalog-types";
import { usePrefs } from "@/lib/prefs-store";
import { PRODUCT_GRID } from "@/lib/ui";

/** Poucas promoções de maior desconto da filial (usado na Início). Vem de /api/promos, não de uma lista fixa. */
export function PromoStrip({ count = 6 }: { count?: number }) {
  const { filial, prefs } = usePrefs();
  const [done, setDone] = useState<{ seller: string; products?: CatalogProduct[] } | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/promos?seller=${filial.seller}&view=list&sort=pct&first=${count}`, { signal: ctrl.signal })
      .then((r) => r.json() as Promise<{ ok: boolean; products?: CatalogProduct[] }>)
      .then((d) => setDone({ seller: filial.seller, products: d.ok ? d.products : undefined }))
      .catch((e: unknown) => {
        if ((e as Error).name !== "AbortError") setDone({ seller: filial.seller });
      });
    return () => ctrl.abort();
  }, [filial.seller, count]);

  const current = done && done.seller === filial.seller ? done : null;
  if (!current) return <GridSkeleton count={count} />;
  if (!current.products || current.products.length === 0) return <GridMessage kind="error" />;
  return (
    <div className={PRODUCT_GRID}>
      {current.products.map((p) => (
        <PromoCard key={p.id} product={p} qty={prefs.qty} />
      ))}
    </div>
  );
}
