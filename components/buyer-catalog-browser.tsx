"use client";
import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { FilterX, Minus, PackageSearch, Plus, Search, ShoppingBasket } from "lucide-react";
import type { PrivateOffer } from "@/lib/marketplace/buyer-catalog";
import { useBuyerBasket } from "@/lib/marketplace/buyer-basket-store";

const currency=new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"});
const brl=(minor:number)=>currency.format(minor/100);
function priceAt(item:PrivateOffer,quantity:number){
  return item.priceTiers.filter(t=>t.minQuantity<=quantity)
    .reduce((price,t)=>t.unitPriceMinor,item.priceMinor);
}
function BasketStepper({item,quantity,onUpdate}:{
  item:PrivateOffer;quantity:number;onUpdate:(qty:number)=>void;
}){
  if(quantity===0)return <button type="button"
    aria-label={"Adicionar "+item.productName+" à cesta"}
    onClick={()=>onUpdate(item.minQuantity)}
    className="grid size-11 shrink-0 place-items-center rounded-full bg-lime text-forest-deep shadow-sm transition active:scale-90 focus-visible:ring-2 focus-visible:ring-forest">
    <Plus size={22} strokeWidth={2.8} aria-hidden/>
  </button>;
  return <div className="flex h-11 shrink-0 items-center rounded-full bg-lime text-forest-deep">
    <button type="button" aria-label={"Diminuir ou remover "+item.productName}
      onClick={()=>onUpdate(quantity<=item.minQuantity?0:Math.max(item.minQuantity,quantity-1))}
      className="grid size-10 place-items-center rounded-full focus-visible:ring-2 focus-visible:ring-forest">
      <Minus size={18} aria-hidden/>
    </button>
    <output aria-label={"Quantidade de "+item.productName}
      className="min-w-5 text-center text-sm font-black tabular-nums">{quantity}</output>
    <button type="button" aria-label={"Adicionar uma unidade de "+item.productName}
      onClick={()=>onUpdate(quantity+1)}
      disabled={quantity>=item.availableQuantity||quantity>=100000}
      className="grid size-10 place-items-center rounded-full disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-forest">
      <Plus size={18} aria-hidden/>
    </button>
  </div>;
}
export function BuyerCatalogBrowser({items,region,userId,buyerOrgId}:{
  items:PrivateOffer[];region:string;userId:string;buyerOrgId:string;
}){
  const [search,setSearch]=useState("");
  const [sort,setSort]=useState("name");
  const [lastMessage,setLastMessage]=useState("");
  const normalizedRegion=region.startsWith("BR-")?region:"BR-"+region;
  const basket=useBuyerBasket(userId,buyerOrgId,normalizedRegion);
  const href="/app/comprador/cesta?regiao="+encodeURIComponent(normalizedRegion);
  const shown=useMemo(()=>{
    const term=search.trim().toLocaleLowerCase("pt-BR");
    const matched=items.filter(item=>!term||[item.productName,item.supplier,item.sku]
      .some(value=>value.toLocaleLowerCase("pt-BR").includes(term)));
    return [...matched].sort((a,b)=>sort==="lowest"?a.priceMinor-b.priceMinor:
      sort==="highest"?b.priceMinor-a.priceMinor:
      a.productName.localeCompare(b.productName,"pt-BR"));
  },[items,search,sort]);
  function update(item:PrivateOffer,next:number){
    if(next>item.availableQuantity||next>100000)return;
    if(basket.setQuantity(item.id,next))setLastMessage(
      next===0?item.productName+" removido da cesta":item.productName+" atualizado na cesta");
    else setLastMessage("A cesta permite até 100 ofertas por solicitação.");
  }
  return <>
    <div className="border-b border-line bg-paper p-4 sm:p-6">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem_auto] sm:items-end">
        <label htmlFor="buyer-catalog-search" className="grid gap-1.5 text-xs font-extrabold text-forest">
          Buscar produtos
          <span className="relative flex items-center">
            <Search size={18} className="pointer-events-none absolute left-3 text-muted" aria-hidden/>
            <input id="buyer-catalog-search" type="search" value={search}
              onChange={event=>setSearch(event.target.value)}
              placeholder="Produto, marca ou fornecedor"
              className="min-h-12 min-w-0 w-full rounded-full border border-line bg-canvas pl-10 pr-10 text-base text-ink focus-visible:outline-2 focus-visible:outline-forest"/>
            {search&&<button type="button" aria-label="Limpar busca" onClick={()=>setSearch("")}
              className="absolute right-3 text-sm font-black text-forest">×</button>}
          </span>
        </label>
        <label htmlFor="buyer-catalog-sort" className="grid gap-1.5 text-xs font-extrabold text-forest">
          Ordenar
          <select id="buyer-catalog-sort" value={sort}
            onChange={event=>setSort(event.target.value)}
            className="min-h-12 rounded-full border border-line bg-canvas px-3 text-sm text-ink focus-visible:outline-2 focus-visible:outline-forest">
            <option value="name">Nome A–Z</option>
            <option value="lowest">Menor preço</option>
            <option value="highest">Maior preço</option>
          </select>
        </label>
        <Link href={href}
          className="hidden min-h-12 items-center justify-center gap-2 rounded-full bg-forest px-5 text-sm font-extrabold text-white sm:inline-flex">
          <ShoppingBasket size={18} aria-hidden/> Minha cesta ({basket.count})
        </Link>
      </div>
      <p role="status" aria-live="polite" className="mt-3 text-xs font-semibold text-muted">
        {shown.length} {shown.length===1?"produto disponível":"produtos disponíveis"} nesta página
        {lastMessage&&<span className="ml-2 text-forest">· {lastMessage}</span>}
      </p>
    </div>
    {shown.length?<div className="grid grid-cols-2 gap-3 bg-canvas p-3 pb-24 sm:grid-cols-3 sm:gap-4 sm:p-6 lg:grid-cols-4 xl:grid-cols-5">
      {shown.map(item=>{
        const qty=basket.getQuantity(item.id);
        const tiers=item.priceTiers.filter(t=>t.minQuantity>item.minQuantity);
        const next=tiers[0];
        const selectedPrice=qty?priceAt(item,qty):item.priceMinor;
        return <article key={item.id}
          className="flex min-w-0 flex-col rounded-[1.8rem] bg-paper p-3 shadow-card ring-1 ring-line/70 transition-shadow hover:shadow-float/30 sm:p-4">
          <div className="relative aspect-square overflow-hidden rounded-2xl bg-paper">
            {item.imageUrl?<Image src={item.imageUrl} alt={item.productName} fill unoptimized
              sizes="(max-width:640px) 45vw, (max-width:1024px) 30vw, 18vw"
              className="object-contain p-2"/>:
              <div className="grid h-full place-items-center bg-canvas text-muted">
                <PackageSearch size={35} aria-label="Sem imagem"/>
              </div>}
            {next&&next.unitPriceMinor<item.priceMinor&&<span
              className="absolute bottom-1 left-0 rounded-full bg-lime-soft px-2 py-1 text-[10px] font-black text-forest">
              {Math.round((1-next.unitPriceMinor/item.priceMinor)*100)}% por volume
            </span>}
          </div>
          <p className="mt-2 truncate text-[10px] font-bold uppercase tracking-wide text-muted sm:text-xs">
            {item.supplier}
          </p>
          <h2 className="mt-1 line-clamp-2 min-h-[2.7rem] text-[13px] font-extrabold leading-snug text-forest-deep sm:text-sm">
            {item.productName}
          </h2>
          <p className="mt-1 truncate text-[11px] text-muted">{item.pack}</p>
          <div className="mt-auto flex items-end justify-between gap-1 pt-4">
            <div className="min-w-0">
              <p className="text-lg font-black tabular-nums text-forest-deep sm:text-xl">{brl(selectedPrice)}</p>
              <p className="mt-1 text-[10px] font-semibold leading-tight text-forest sm:text-xs">
                {next?next.minQuantity+"+ un · "+brl(next.unitPriceMinor):
                  item.minQuantity>1?"Mín. "+item.minQuantity+" un":"Preço por unidade"}
              </p>
            </div>
            <BasketStepper item={item} quantity={qty} onUpdate={value=>update(item,value)}/>
          </div>
        </article>;
      })}
    </div>:<div className="px-6 py-12 text-center">
      {search?<FilterX size={29} className="mx-auto text-forest"/>:
        <PackageSearch size={29} className="mx-auto text-forest"/>}
      <h2 className="mt-4 text-xl font-black text-forest-deep">
        {search?"Nenhuma oferta corresponde à busca":"Nenhuma oferta publicada"}
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-sm text-muted">Experimente outros filtros ou produtos.</p>
      {search&&<button type="button" onClick={()=>setSearch("")}
        className="mt-5 min-h-11 rounded-full bg-forest px-5 text-sm font-extrabold text-white">
        Limpar filtros
      </button>}
    </div>}
    <Link href={href}
      className="fixed bottom-[calc(env(safe-area-inset-bottom)+0.9rem)] left-1/2 z-40 inline-flex min-h-14 w-[min(92vw,25rem)] -translate-x-1/2 items-center justify-center gap-3 rounded-full bg-forest px-6 text-sm font-black text-white shadow-float sm:hidden">
      <ShoppingBasket size={21} aria-hidden/> Minha cesta · {basket.count} {basket.count===1?"unidade":"unidades"}
    </Link>
  </>;
}
