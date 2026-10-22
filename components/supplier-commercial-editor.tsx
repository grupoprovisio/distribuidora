"use client";

import { useActionState, useState } from "react";
import { UF_CODES } from "@/lib/marketplace/brazil-regions";
import {
 updateSupplierStock, submitSupplierPrice, type SupplierCatalogFeedback
} from "@/app/app/fornecedor/catalogo/commercial-actions";

export type SupplierEditableSku = {
 id:string;
 label:string;
 available:number|null;
 priceMinor:number|null;
};
const initial:SupplierCatalogFeedback={status:"idle",message:""};
const input="min-h-11 w-full rounded-xl border border-line bg-canvas px-3 py-2 text-base text-ink focus-visible:outline-2 focus-visible:outline-forest";
const button="min-h-12 w-full rounded-full bg-forest px-5 py-3 text-sm font-extrabold text-white transition hover:bg-forest-deep focus-visible:ring-2 focus-visible:ring-forest disabled:cursor-not-allowed disabled:opacity-50";
const money=new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"});
function Message({data}:{data:SupplierCatalogFeedback}){
 if(!data.message)return null;
 return <p className={data.status==="error"?"rounded-xl bg-blush p-3 text-sm font-semibold text-wine":"rounded-xl bg-lime-soft p-3 text-sm font-semibold text-forest"}
  role={data.status==="error"?"alert":"status"}>{data.message}</p>;
}
function SelectSku({value,onChange,options}:{value:string;onChange:(s:string)=>void;options:SupplierEditableSku[]}){
 return <select name="sku_id" required value={value} onChange={e=>onChange(e.target.value)} className={input}>
   <option value="" disabled>Selecionar SKU homologado</option>
   {options.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
 </select>;
}
export function SupplierCommercialEditor({skus}:{skus:SupplierEditableSku[]}){
 const [stockSku,setStockSku]=useState("");
 const [offerSku,setOfferSku]=useState("");
 const [stock,stockAction,stockBusy]=useActionState(updateSupplierStock,initial);
 const [offer,offerAction,offerBusy]=useActionState(submitSupplierPrice,initial);
 const activeStock=skus.find(s=>s.id===stockSku);
 const activeOffer=skus.find(s=>s.id===offerSku);
 return <section className="mb-7 rounded-[2rem] border border-line bg-paper p-5 sm:p-7" aria-labelledby="supplier-edit-title">
  <h2 id="supplier-edit-title" className="text-xl font-black text-forest-deep">Preços e estoque</h2>
  <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
   Atualize a disponibilidade do seu SKU homologado. Alterações de preços geram uma oferta pendente e só ficam visíveis ao comprador após aprovação administrativa.
  </p>
  {!skus.length?<p className="mt-5 rounded-xl bg-canvas p-4 text-sm text-muted">
   Nenhum SKU homologado disponível para edição nesta página. Solicite um produto e acompanhe sua homologação.
  </p>:<div className="mt-6 grid gap-5 lg:grid-cols-2">
   <form action={stockAction} className="grid content-start gap-4 rounded-2xl border border-line bg-canvas p-5">
    <h3 className="text-base font-black text-forest-deep">Atualizar disponibilidade</h3>
    <label className="grid gap-1.5 text-sm font-bold text-forest">Produto
     <SelectSku options={skus} value={stockSku} onChange={setStockSku}/>
    </label>
    <label className="grid gap-1.5 text-sm font-bold text-forest">Quantidade disponível
     <input key={stockSku} type="number" min="0" max="100000000" step=".001" name="available"
      defaultValue={activeStock?.available??0} required className={input}/>
    </label>
    <p className="text-xs leading-relaxed text-muted">Informe a posição disponível atual, não a movimentação. Reservas permanecem protegidas.</p>
    <button type="submit" className={button} disabled={stockBusy||!stockSku}>{stockBusy?"Gravando…":"Salvar estoque"}</button>
    <Message data={stock}/>
   </form>
   <form action={offerAction} className="grid content-start gap-4 rounded-2xl border border-line bg-canvas p-5">
    <h3 className="text-base font-black text-forest-deep">Solicitar alteração de preço</h3>
    <label className="grid gap-1.5 text-sm font-bold text-forest">Produto
     <SelectSku options={skus} value={offerSku} onChange={setOfferSku}/>
    </label>
    {activeOffer?.priceMinor!==null&&activeOffer?.priceMinor!==undefined&&<p className="text-xs text-muted">
     Preço aprovado em exibição: <strong>{money.format(activeOffer.priceMinor/100)}</strong>
    </p>}
    <div className="grid grid-cols-2 gap-3">
     <label className="grid gap-1.5 text-sm font-bold text-forest">Preço (centavos)
      <input name="price_minor" type="number" min="1" max="1000000000" step="1" required className={input} placeholder="1250"/></label>
     <label className="grid gap-1.5 text-sm font-bold text-forest">Pedido mínimo
      <input name="minimum" type="number" min="1" step="1" defaultValue="1" required className={input}/></label>
    </div>
    <div className="grid grid-cols-2 gap-3">
     <label className="grid gap-1.5 text-sm font-bold text-forest">UF de entrega
      <select name="region" required defaultValue="SP" className={input}>{UF_CODES.map(uf=><option key={uf} value={uf}>{uf}</option>)}</select>
     </label>
     <label className="grid gap-1.5 text-sm font-bold text-forest">Válida até
      <input name="valid_to" type="date" className={input}/></label>
    </div>
    <p className="text-xs leading-relaxed text-muted">A nova oferta permanece pendente até a homologação da Provisio. Nenhum preço é publicado automaticamente.</p>
    <button type="submit" className={button} disabled={offerBusy||!offerSku}>{offerBusy?"Enviando…":"Enviar preço para aprovação"}</button>
    <Message data={offer}/>
   </form>
  </div>}
 </section>;
}
