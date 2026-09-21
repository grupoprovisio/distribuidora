"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { GridSkeleton } from "@/components/product-grid";
import { ProductCard } from "@/components/product-card";
import { EmptyState, primaryButton } from "@/components/section";
import { useList } from "@/lib/list-store";
import { usePrefs } from "@/lib/prefs-store";
import { PRODUCT_GRID } from "@/lib/ui";

/** Favoritos: nome e foto vêm do que foi guardado; o preço é consultado agora, na filial escolhida. */
export function FavoritesView() {
  const { fav, favMeta } = useList();
  const { filial } = usePrefs();
  const ids = fav.filter((id) => favMeta[id]);
  const [done, setDone] = useState<{ key: string; prices?: Record<string, number | null> } | null>(null);

  const key = ids.length > 0 ? `${filial.seller}|${ids.join(",")}` : null;

  useEffect(() => {
    if (!key) return;
    const [seller, list] = key.split("|");
    const ctrl = new AbortController();
    fetch(`/api/catalog/prices?seller=${seller}&ids=${list}`, { signal: ctrl.signal })
      .then((r) => r.json() as Promise<{ ok: boolean; prices?: Record<string, number | null> }>)
      .then((d) => setDone({ key, prices: d.ok ? d.prices : undefined }))
      .catch((e: unknown) => {
        if ((e as Error).name !== "AbortError") setDone({ key });
      });
    return () => ctrl.abort();
  }, [key]);

  if (ids.length === 0) {
    return (
      <EmptyState
        icon={Heart}
        title="Nenhum favorito ainda"
        text="Toque no coração de um produto para acompanhar o preço dele por aqui."
        action={
          <Link href="/buscar" className={primaryButton}>
            Explorar produtos
          </Link>
        }
      />
    );
  }

  const current = done && done.key === key ? done : null;
  if (!current) return <GridSkeleton count={Math.min(ids.length, 6)} />;

  return (
    <div className={PRODUCT_GRID}>
      {ids.map((id) => {
        const m = favMeta[id];
        const price = current.prices?.[id];
        return (
          <ProductCard
            key={id}
            product={{ id, name: m.name, brand: m.brand ?? "", image: m.image, unit: typeof price === "number" ? price : 0 }}
            // Sem preço na filial (ou consulta falhou): mostra o produto, sem preço nem botão de adicionar.
            unavailable={typeof price !== "number"}
            tierKnown={false}
          />
        );
      })}
    </div>
  );
}
