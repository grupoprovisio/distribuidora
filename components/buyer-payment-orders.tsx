"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, Circle, PackageCheck, Truck } from "lucide-react";

type Item={id:string;created_at:string;status:string;fulfillment_status:string;basket:{region_code:string;fulfillment_method:"delivery"|"pickup"}|null};
const delivery=["paid","processing","ready_for_delivery","out_for_delivery","delivered"];
const pickup=["paid","processing","ready_for_pickup","picked_up"];
const labels:Record<string,string>={paid:"Pagamento confirmado",processing:"Pedido em preparação",ready_for_delivery:"Pronto para envio",out_for_delivery:"Saiu para entrega",delivered:"Entregue",ready_for_pickup:"Pronto para retirada",picked_up:"Retirado",cancelled:"Cancelado"};
export function BuyerPaymentOrders(){
  const [items,setItems]=useState<Item[]>([]); const [loading,setLoading]=useState(true);
  useEffect(()=>{void fetch("/api/marketplace/payment-orders",{credentials:"same-origin",cache:"no-store"}).then(r=>r.json()).then(d=>{if(d.ok)setItems(d.items??[]);}).finally(()=>setLoading(false));},[]);
  return <section className="mb-8 rounded-[2rem] border border-line bg-paper p-5 shadow-card sm:p-8">
    <div className="flex items-center gap-3"><PackageCheck className="text-forest" aria-hidden/><div><h2 className="text-xl font-black text-forest-deep">Pedidos pagos</h2><p className="text-sm text-muted">Acompanhe cada etapa da entrega ou retirada.</p></div></div>
    {loading?<p className="mt-5 text-sm text-muted">Consultando pedidos...</p>:!items.length?<p className="mt-5 text-sm text-muted">Nenhum pagamento confirmado ainda.</p>:<div className="mt-6 space-y-5">{items.map(item=>{const method=item.basket?.fulfillment_method??"delivery";const steps=method==="pickup"?pickup:delivery;const current=item.fulfillment_status;const currentIndex=steps.indexOf(current);return <article key={item.id} className="rounded-2xl border border-line bg-canvas p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.14em] text-terra">Pedido pago</p><p className="mt-1 text-sm font-bold text-forest-deep">{method==="pickup"?"Retirada no local":"Entrega"} · {item.basket?.region_code??"BR-SP"}</p></div><span className="rounded-full bg-lime-soft px-3 py-1 text-xs font-black text-forest">{labels[current]??current}</span></div><ol className="mt-5 grid gap-3 sm:grid-cols-4">{steps.map((step,index)=>{const done=current!=="cancelled"&&index<=currentIndex;return <li key={step} className="flex items-start gap-2 text-xs"><span className={"mt-0.5 grid size-5 shrink-0 place-items-center rounded-full "+(done?"bg-forest text-white":"border border-line text-muted")}>{done?<CheckCircle2 size={14} aria-hidden/>:<Circle size={12} aria-hidden/>}</span><span className={done?"font-bold text-forest-deep":"text-muted"}>{labels[step]}</span></li>})}</ol><p className="mt-4 flex items-center gap-2 text-xs text-muted">{method==="pickup"?<PackageCheck size={15} aria-hidden/>:<Truck size={15} aria-hidden/>} Atualizado em {new Date(item.created_at).toLocaleString("pt-BR")}</p></article>})}</div>}
  </section>;
}
