"use client";
import { useActionState } from "react";
import { reviewSupplierSubmission, type ReviewFeedback } from "@/app/admin/marketplace/solicitacoes/actions";

export type SupplierSubmissionView={
 id:string;supplierName:string;productName:string;sku:string;
 categoryName:string;region:string;priceMinor:number;stock:number;unit:string;quantity:number;
};
const initial:ReviewFeedback={status:"idle",message:""};
const money=new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"});
function Item({entry}:{entry:SupplierSubmissionView}){
 const [status,action,pending]=useActionState(reviewSupplierSubmission,initial);
 const slug=entry.productName.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()
   .replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,120);
 return <article className="rounded-2xl border border-line bg-paper p-5 sm:p-6">
   <p className="text-xs font-extrabold uppercase tracking-wide text-terra">{entry.supplierName} · Aguardando avaliação</p>
   <h2 className="mt-2 text-lg font-black text-forest-deep">{entry.productName}</h2>
   <p className="mt-2 text-sm text-muted">SKU {entry.sku} · {entry.quantity} {entry.unit} · {entry.categoryName} · {entry.region}</p>
   <p className="mt-2 text-sm text-forest">Preço proposto: <strong>{money.format(entry.priceMinor/100)}</strong> · Estoque informado: <strong>{entry.stock}</strong></p>
   <form action={action} className="mt-5 grid gap-3 sm:grid-cols-2">
     <input type="hidden" name="submission_id" value={entry.id}/>
     <label className="text-sm font-bold text-forest sm:col-span-2">Identificador comercial
       <input name="slug" defaultValue={slug} maxLength={120} pattern="[a-z0-9]+(-[a-z0-9]+)*"
        className="mt-1 min-h-11 w-full rounded-xl border border-line bg-canvas p-3 text-base"/></label>
     <label className="text-sm font-bold text-forest sm:col-span-2">GTIN/EAN (se houver)
       <input name="gtin" inputMode="numeric" maxLength={14} pattern="[0-9]{8,14}"
        className="mt-1 min-h-11 w-full rounded-xl border border-line bg-canvas p-3 text-base"/></label>
     <button className="min-h-12 rounded-full bg-forest px-5 py-3 font-bold text-white disabled:opacity-50 sm:col-span-2"
      type="submit" name="decision" value="approve" disabled={pending}>
        {pending?"Processando...":"Aceitar solicitação e preparar cadastro"}
     </button>
   </form>
   <form action={action} className="mt-3 flex flex-wrap items-center gap-3 border-t border-line pt-3">
     <input type="hidden" name="submission_id" value={entry.id}/>
     <label className="flex items-center gap-2 text-xs text-muted">
       <input type="checkbox" required/> Confirmo que esta solicitação deve ser rejeitada
     </label>
     <button name="decision" value="reject" type="submit" disabled={pending}
      className="min-h-11 rounded-full border border-wine px-4 font-bold text-wine disabled:opacity-50">Rejeitar solicitação</button>
   </form>
   {status.message&&<p className="mt-3 rounded-xl bg-canvas p-3 text-sm" role={status.status==="error"?"alert":"status"}>{status.message}</p>}
 </article>;
}
export function SupplierSubmissionReview({submissions}:{submissions:SupplierSubmissionView[]}){
 if(!submissions.length)return <p className="mt-8 rounded-2xl border border-line bg-paper p-7 text-sm text-muted">Nenhuma solicitação pendente.</p>;
 return <div className="mt-7 grid gap-4">{submissions.map(x=><Item key={x.id} entry={x}/>)}</div>;
}
