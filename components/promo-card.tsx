"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingBasket, Zap } from "lucide-react";
import { HeartButton } from "@/components/heart-button";
import { Price } from "@/components/price";
import { QtyControl } from "@/components/qty-control";
import type { CatalogProduct } from "@/lib/catalog-types";
import { isNear, nextTier, priceAt, tiersOf } from "@/lib/deals";
import { brl, pct, tierDiscountPct } from "@/lib/format";
import { useList } from "@/lib/list-store";

/**
 * Card de promoção: preço unitário riscado, preço do degrau em destaque, quanto se economiza e, na quantidade que a
 * pessoa pretende levar, quantas unidades faltam para chegar ao degrau. Um toque já leva a quantidade do degrau.
 */
export function PromoCard({ product, qty, priority = false }: { product: CatalogProduct; qty: number; priority?: boolean }) {
  const { getQty, setQty } = useList();
  const tier = product.tier ?? tiersOf(product).at(-1);
  const meta = { name: product.name, brand: product.brand, image: product.image, dept: product.dept };
  const inList = getQty(product.id);

  const offPct = tier ? tierDiscountPct(product.unit, tier.price) : 0;
  const saving = tier ? (product.unit - tier.price) * tier.qty : 0;
  const now = priceAt(product, qty);
  const reached = now < product.unit;
  const gap = nextTier(product, qty);

  return (
    <article className="relative flex flex-col rounded-3xl bg-paper p-3 shadow-card ring-1 ring-line/70">
      <Link href={`/produto/${product.id}`} aria-label={product.name} className="absolute inset-0 z-0 rounded-3xl" />

      <div className="relative aspect-square">
        {product.image ? (
          <Image
            src={product.image}
            alt=""
            fill
            unoptimized
            priority={priority}
            sizes="(min-width:1280px) 16vw, (min-width:1024px) 20vw, (min-width:768px) 25vw, (min-width:480px) 33vw, 50vw"
            className="object-contain p-1"
          />
        ) : null}
        <HeartButton product={{ id: product.id, ...meta }} className="absolute right-0 top-0 z-10" />
        {offPct > 0 ? (
          <span className="absolute left-0 top-0 rounded-full bg-[#e0446a] px-2 py-0.5 text-[11px] font-extrabold text-white">−{pct(offPct)}</span>
        ) : null}
      </div>

      <p className="mt-2 truncate text-[11px] font-bold uppercase tracking-wide text-muted">{product.brand}</p>
      <h3 className="line-clamp-2 min-h-[2.5rem] text-[13px] font-bold leading-snug sm:text-sm">{product.name}</h3>

      {tier ? (
        <div className="mt-2">
          <div className="flex items-baseline gap-2">
            <Price value={tier.price} className="text-xl text-forest" />
            <s className="text-xs font-bold text-muted decoration-[#a02a4a]/70 decoration-2">{brl(product.unit)}</s>
          </div>
          <p className="mt-0.5 text-[11px] font-semibold text-muted">
            a partir de <span className="font-extrabold text-ink">{tier.qty} un</span> · economize {brl(saving)}
          </p>
        </div>
      ) : (
        <Price value={product.unit} className="mt-2 text-xl" />
      )}

      {/* Situação na quantidade que a pessoa pretende levar */}
      {tier ? (
        reached ? (
          <p className="mt-2 rounded-full bg-lime-soft px-2.5 py-1 text-center text-[11px] font-extrabold text-forest">Com {qty} un você já paga {brl(now)}/un</p>
        ) : gap && isNear(gap, qty) ? (
          <p className="mt-2 inline-flex items-center justify-center gap-1 rounded-full bg-sand px-2.5 py-1 text-center text-[11px] font-extrabold text-[#5c3a06]">
            <Zap size={12} aria-hidden /> Falta {gap.need} un para {brl(gap.price)}/un
          </p>
        ) : null
      ) : null}

      <div className="relative z-10 mt-3">
        {inList > 0 ? (
          <div className="flex items-center justify-between gap-2 rounded-full bg-lime-soft p-1 pl-3">
            <span className="truncate text-xs font-extrabold text-forest">Na lista · {inList} un</span>
            <QtyControl productId={product.id} name={product.name} meta={meta} />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setQty(product.id, tier?.qty ?? 1, meta)}
            className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-full bg-lime px-3 text-xs font-extrabold text-forest-deep transition-transform active:scale-95"
          >
            <ShoppingBasket size={15} aria-hidden /> Levar {tier?.qty ?? 1} un
          </button>
        )}
      </div>
    </article>
  );
}
