import { TrendingDown, TrendingUp } from "lucide-react";
import { brl, pct } from "@/lib/format";

/**
 * Diferença de preço já formatada: "R$ 3,01 mais barato (−14,4%)". `abs` negativo = mais barato.
 * `pctValue` deve vir em módulo; o sinal é aplicado aqui.
 */
export function Delta({ abs, pctValue, compact = false }: { abs?: number; pctValue?: number; compact?: boolean }) {
  if (abs === undefined || pctValue === undefined) return null;
  if (Math.abs(abs) < 0.005) return <span className="text-xs font-bold text-muted">mesmo preço</span>;
  const cheaper = abs < 0;
  const Icon = cheaper ? TrendingDown : TrendingUp;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-extrabold ${
        cheaper ? "bg-lime-soft text-forest" : "bg-blush text-[#a02a4a]"
      }`}
    >
      <Icon size={12} aria-hidden />
      {brl(Math.abs(abs))}
      {compact ? "" : cheaper ? " mais barato" : " mais caro"} ({pct(pctValue).replace(/^(?=\d)/, cheaper ? "−" : "+")})
    </span>
  );
}
