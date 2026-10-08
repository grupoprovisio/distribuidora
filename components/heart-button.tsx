"use client";

import { Heart } from "lucide-react";
import { useList } from "@/lib/list-store";

type Fav = { id: string; name: string; brand?: string; image?: string; ean?: string };

export function HeartButton({ product, className = "" }: { product: Fav; className?: string }) {
  const { isFav, toggleFav } = useList();
  const fav = isFav(product.id);
  return (
    <button
      type="button"
      onClick={() => toggleFav(product.id, { name: product.name, brand: product.brand, image: product.image, ean: product.ean })}
      aria-pressed={fav}
      aria-label={fav ? `Remover ${product.name} dos favoritos` : `Favoritar ${product.name}`}
      className={`grid size-8 place-items-center rounded-full bg-paper/90 shadow-card transition-transform active:scale-90 ${className}`}
    >
      <Heart size={16} aria-hidden className={fav ? "fill-[#e0446a] text-[#e0446a]" : "text-muted"} />
    </button>
  );
}
