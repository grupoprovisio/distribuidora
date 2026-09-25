"use client";

import Link from "next/link";
import { Navigation } from "lucide-react";
import { usePrefs } from "@/lib/prefs-store";

/** Nome da filial em uso + quantas outras foram encontradas perto (para cartões de página). */
export function FilialCardText() {
  const { filial, filialIsDefault, prefs } = usePrefs();
  const others = Math.max(prefs.nearby.length - 1, 0);
  return (
    <>
      <p className="truncate text-sm font-extrabold">Distribuidora {filial.name}</p>
      <p className="truncate text-xs font-medium text-muted">
        {filialIsDefault ? "Filial padrão · escolha a mais próxima nas Configurações" : others > 0 ? `Filial atual · mais ${others} perto de você` : "Filial atual"}
      </p>
    </>
  );
}

/** Filial em uso no cabeçalho da Home; leva às configurações. */
export function FilialChip() {
  const { filial, filialIsDefault } = usePrefs();
  return (
    <Link href="/conta/configuracoes" className="mt-4 block text-center" aria-label={`Filial atual: ${filial.name}. Alterar nas configurações`}>
      <span className="block text-[11px] font-semibold text-white/60">{filialIsDefault ? "Filial padrão · toque para escolher a mais próxima" : "Filial atual"}</span>
      <span className="inline-flex items-center gap-1.5 text-base font-extrabold text-lime">
        {filial.name}
        {filial.uf ? `, ${filial.uf}` : ""}
        <Navigation size={14} aria-hidden />
      </span>
    </Link>
  );
}
