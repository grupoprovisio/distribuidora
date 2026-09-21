import Image from "next/image";
import Link from "next/link";
import { HeartButton } from "@/components/heart-button";
import { Price } from "@/components/price";
import { QtyControl } from "@/components/qty-control";
import type { CatalogProduct } from "@/lib/catalog-types";
import { brl, pct, tierDiscountPct } from "@/lib/format";

/** Card de produto do catálogo real (link "esticado" para o detalhe; coração e stepper ficam por cima). */
export function ProductCard({
  product,
  priority = false,
  unavailable = false,
  tierKnown = true,
}: {
  product: CatalogProduct;
  priority?: boolean;
  unavailable?: boolean;
  /** false quando só se sabe o preço unitário (favoritos): não afirma "sem degrau". */
  tierKnown?: boolean;
}) {
  const { tier } = product;
  const meta = { name: product.name, brand: product.brand, image: product.image, dept: product.dept };
  return (
    <article className="relative flex flex-col rounded-3xl bg-paper p-3 shadow-card ring-1 ring-line/70 transition-shadow hover:shadow-float/30">
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
            className={`object-contain p-1 ${unavailable ? "opacity-50 grayscale" : ""}`}
          />
        ) : null}
        <HeartButton product={{ id: product.id, ...meta }} className="absolute right-0 top-0 z-10" />
        {tier ? (
          <span className="absolute bottom-0 left-0 rounded-full bg-lime-soft px-2 py-0.5 text-[10px] font-extrabold text-forest">
            −{pct(tierDiscountPct(product.unit, tier.price))}
          </span>
        ) : null}
      </div>

      <p className="mt-2 truncate text-[11px] font-bold uppercase tracking-wide text-muted">{product.brand}</p>
      <h3 className="line-clamp-2 min-h-[2.5rem] text-[13px] font-bold leading-snug sm:text-sm">{product.name}</h3>

      <div className="mt-2 flex items-end justify-between gap-2">
        <div className="min-w-0">
          {unavailable ? (
            <p className="text-sm font-extrabold text-muted">Indisponível</p>
          ) : (
            <>
              <Price value={product.unit} className="text-lg sm:text-xl" />
              {tier ? (
                <p className="mt-1 text-[11px] font-semibold leading-tight text-forest">
                  {tier.qty}+ un · {brl(tier.price)}
                </p>
              ) : tierKnown ? (
                <p className="mt-1 text-[11px] font-medium text-muted">sem degrau</p>
              ) : null}
            </>
          )}
        </div>
        {unavailable ? null : (
          <div className="relative z-10 shrink-0">
            <QtyControl productId={product.id} name={product.name} meta={meta} />
          </div>
        )}
      </div>
    </article>
  );
}
