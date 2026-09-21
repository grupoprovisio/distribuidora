import { brl, splitPrice } from "@/lib/format";

/** Preço com centavos sobrescritos. O tamanho vem do `className` (text-*). */
export function Price({ value, className = "" }: { value: number; className?: string }) {
  const { int, cents } = splitPrice(value);
  return (
    <span aria-label={brl(value)} className={`inline-flex items-start font-extrabold tabular-nums leading-none ${className}`}>
      <span aria-hidden className="mr-0.5 mt-[0.2em] text-[0.55em] font-bold">
        R$
      </span>
      <span aria-hidden>{int}</span>
      <span aria-hidden className="mt-[0.1em] text-[0.55em] font-bold">
        ,{cents}
      </span>
    </span>
  );
}
