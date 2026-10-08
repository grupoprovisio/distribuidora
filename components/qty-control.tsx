"use client";

import { Minus, Plus } from "lucide-react";
import { track } from "@/lib/analytics";
import { useList, type ItemMeta } from "@/lib/list-store";

/** "+" que vira stepper (− n +) quando o item entra na lista. `meta` guarda os dados de itens fora do catálogo de exemplo. */
export function QtyControl({ productId, name, meta }: { productId: string; name: string; meta?: ItemMeta }) {
  const { getQty, setQty } = useList();
  const qty = getQty(productId);

  if (qty === 0) {
    return (
      <button
        type="button"
        onClick={() => { setQty(productId, 1, meta); track("add_to_cart", { item_id: productId, quantity: 1 }); }}
        aria-label={`Adicionar ${name} à lista`}
        className="grid size-9 place-items-center rounded-full bg-lime text-forest-deep transition-transform active:scale-90"
      >
        <Plus size={18} strokeWidth={2.6} aria-hidden />
      </button>
    );
  }

  return (
    <div className="flex h-9 items-center rounded-full bg-lime text-forest-deep">
      <button
        type="button"
        onClick={() => { setQty(productId, qty - 1); track("remove_from_cart", { item_id: productId, quantity: 1 }); }}
        aria-label={`Remover uma unidade de ${name}`}
        className="grid size-9 place-items-center rounded-full transition-transform active:scale-90"
      >
        <Minus size={16} strokeWidth={2.6} aria-hidden />
      </button>
      <span aria-live="polite" className="min-w-5 text-center text-sm font-extrabold tabular-nums">
        {qty}
      </span>
      <button
        type="button"
        onClick={() => { setQty(productId, qty + 1); track("add_to_cart", { item_id: productId, quantity: 1 }); }}
        aria-label={`Adicionar mais uma unidade de ${name}`}
        className="grid size-9 place-items-center rounded-full transition-transform active:scale-90"
      >
        <Plus size={16} strokeWidth={2.6} aria-hidden />
      </button>
    </div>
  );
}
