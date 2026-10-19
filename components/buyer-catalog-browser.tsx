"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FilterX, PackageSearch, Search, ShieldCheck } from "lucide-react";
import type { PrivateOffer } from "@/lib/marketplace/buyer-catalog";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function BuyerCatalogBrowser({ items, region }: { items: PrivateOffer[]; region: string }) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("name");
  const shown = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    const matched = items.filter(item => !term ||
      [item.productName, item.supplier, item.sku].some(value => value.toLocaleLowerCase("pt-BR").includes(term)));
    return [...matched].sort((a,b) =>
      sort === "lowest" ? a.priceMinor - b.priceMinor
        : sort === "highest" ? b.priceMinor - a.priceMinor
        : a.productName.localeCompare(b.productName,"pt-BR"));
  }, [items, search, sort]);

  return <>
    <div className="border-b border-line p-5 sm:p-7">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <label htmlFor="buyer-catalog-search" className="grid gap-1.5 text-xs font-extrabold text-forest">
          Buscar nesta página
          <span className="relative flex items-center">
            <Search size={18} className="pointer-events-none absolute left-3 text-muted" aria-hidden/>
            <input id="buyer-catalog-search" type="search" value={search} onChange={event=>setSearch(event.target.value)}
              placeholder="Produto, SKU ou fornecedor"
              className="min-h-12 min-w-0 w-full rounded-xl border border-line bg-canvas pl-10 pr-12 text-base text-ink outline-none focus-visible:ring-2 focus-visible:ring-forest"/>
            {search ? <button type="button" aria-label="Limpar busca" onClick={() => {
              setSearch(""); document.getElementById("buyer-catalog-search")?.focus();
            }} className="absolute right-3 grid size-9 place-items-center rounded-full text-sm font-black text-forest hover:bg-lime-soft focus-visible:ring-2 focus-visible:ring-forest">×</button> : null}
          </span>
        </label>
        <label htmlFor="buyer-catalog-sort" className="grid gap-1.5 text-xs font-extrabold text-forest">
          Ordenar resultados
          <select id="buyer-catalog-sort" value={sort} onChange={event=>setSort(event.target.value)}
            className="min-h-12 rounded-xl border border-line bg-canvas px-3 text-base text-ink focus-visible:ring-2 focus-visible:ring-forest">
            <option value="name">Nome A–Z</option>
            <option value="lowest">Menor preço</option>
            <option value="highest">Maior preço</option>
          </select>
        </label>
      </div>
      <p className="mt-3 text-xs font-semibold text-muted" role="status" aria-live="polite">
        {shown.length} {shown.length===1?"oferta disponível":"ofertas disponíveis"} nesta página para {region}
      </p>
    </div>
    {shown.length ? <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
      {shown.map(item => <article key={item.id} className="rounded-2xl border border-line bg-canvas p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-terra">{item.supplier}</p>
        <h2 className="mt-3 text-lg font-black text-forest-deep">{item.productName}</h2>
        <p className="mt-2 text-xs text-muted">SKU: {item.sku} · Embalagem: {item.pack}</p>
        <p className="mt-5 text-2xl font-black tabular-nums text-forest-deep">{currency.format(item.priceMinor/100)}</p>
        <p className="mt-2 text-sm text-muted">Quantidade mínima: {item.minQuantity} · Região: {region}</p>
        <Link href={"/app/comprador/cotacoes?oferta="+encodeURIComponent(item.id)+"&regiao="+encodeURIComponent(region)} className="mt-4 inline-flex min-h-11 items-center rounded-full bg-forest px-5 text-sm font-extrabold text-white hover:bg-forest-deep">Solicitar cotação</Link>
        <p className="mt-4 flex items-center gap-2 text-xs font-semibold text-forest">
          <ShieldCheck size={16} aria-hidden/> Oferta aprovada
        </p>
      </article>)}
    </div> : <div className="px-6 py-12 text-center">
      {search ? <FilterX size={29} className="mx-auto text-forest" aria-hidden/> : <PackageSearch size={29} className="mx-auto text-forest" aria-hidden/>}
      <h2 className="mt-4 text-xl font-black text-forest-deep">{search?"Nenhuma oferta corresponde à busca":"Nenhuma oferta publicada"}</h2>
      <p className="mx-auto mt-3 max-w-xl text-sm text-muted">
        {search?"Experimente outro nome de produto, SKU ou fornecedor.":"As ofertas aparecerão depois da aprovação da organização, do estoque e da região."}
      </p>
      {search && <button type="button" onClick={()=>setSearch("")} className="mt-5 min-h-11 rounded-full bg-forest px-5 text-sm font-extrabold text-white hover:bg-forest-deep">
        Limpar filtros
      </button>}
    </div>}
  </>;
}
