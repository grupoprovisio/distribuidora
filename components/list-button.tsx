"use client";

import Link from "next/link";
import { ShoppingBasket } from "lucide-react";
import { useList } from "@/lib/list-store";

/** Botão redondo da lista no canto do cabeçalho, com contador. */
export function ListButton() {
  const { count } = useList();
  return (
    <Link
      href="/lista"
      aria-label={count > 0 ? `Minha lista, ${count} itens` : "Minha lista"}
      className="relative grid size-11 shrink-0 place-items-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
    >
      <ShoppingBasket size={20} aria-hidden />
      {count > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 grid min-w-[1.1rem] place-items-center rounded-full bg-lime px-1 text-[10px] font-extrabold leading-[1.1rem] text-forest-deep">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}
