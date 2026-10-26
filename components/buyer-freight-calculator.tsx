"use client";
import { useCallback,useEffect,useState } from "react";
import { MapPin,Truck } from "lucide-react";
import { normalizeCep } from "@/lib/marketplace/buyer-contact";
export type FreightInfo={
 ok:boolean;available:boolean;reason?:string|null;cep:string;pickupAvailable:boolean;
 origin?:{label:string;postalCode:string;street:string;number:string;
  complement:string;neighborhood:string;city:string;state:string;pickupInstructions:string};
 quote?:{label:string;state:string;freightMinor:number;minBusinessDays:number;maxBusinessDays:number}|null;
};
const money=new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"});
export function BuyerFreightCalculator({buyerOrgId,postalCode,onPostalCodeChange,onQuote,auto=false}:{
 buyerOrgId:string;postalCode:string;onPostalCodeChange:(cep:string)=>void;
 onQuote:(quote:FreightInfo|null)=>void;auto?:boolean;
}){
 const [loading,setLoading]=useState(false);
 const [message,setMessage]=useState("");
 const [shown,setShown]=useState<FreightInfo|null>(null);
 const quote=useCallback(async(zip:string,signal?:AbortSignal)=>{
  const cep=normalizeCep(zip);
  if(cep.length!==8){setMessage("Informe um CEP válido com 8 números.");onQuote(null);return;}
  setLoading(true);setMessage("");
  try{
    const params=new URLSearchParams({buyer:buyerOrgId,cep});
    const r=await fetch("/api/marketplace/frete?"+params.toString(),{
      credentials:"same-origin",cache:"no-store",signal,
    });
    const data=await r.json() as FreightInfo;
    if(!r.ok||!data.ok)throw Error();
    if(signal?.aborted)return;
    setShown(data);onQuote(data);
  }catch{if(!signal?.aborted){setMessage("Não foi possível calcular o frete. Tente novamente.");onQuote(null);}}
  finally{if(!signal?.aborted)setLoading(false);}
 },[buyerOrgId,onQuote]);
 useEffect(()=>{
   if(!auto||normalizeCep(postalCode).length!==8)return;
   const controller=new AbortController();
   const cep=normalizeCep(postalCode);
   const params=new URLSearchParams({buyer:buyerOrgId,cep});
   void fetch("/api/marketplace/frete?"+params.toString(),{
     credentials:"same-origin",cache:"no-store",signal:controller.signal
   }).then(async r=>{if(!r.ok)throw Error();return await r.json() as FreightInfo;})
     .then(data=>{if(!controller.signal.aborted){setShown(data);onQuote(data);setMessage("");}})
     .catch(()=>{if(!controller.signal.aborted){
       setMessage("Não foi possível calcular o frete.");onQuote(null);
     }});
   return ()=>controller.abort();
 },[auto,postalCode,buyerOrgId,onQuote]);
 const current=shown?.cep===normalizeCep(postalCode)?shown:null;
 return <section aria-label="Calcular frete" className="space-y-3 rounded-2xl border border-line bg-canvas p-4">
   <h3 className="flex items-center gap-2 text-sm font-black text-forest-deep">
     <Truck size={18} aria-hidden/> Frete e prazo por CEP
   </h3>
   <label className="grid gap-1.5 text-xs font-bold text-forest">
     CEP do endereço de entrega
     <div className="flex flex-col gap-2 sm:flex-row">
       <input type="text" inputMode="numeric" autoComplete="postal-code"
         value={postalCode} placeholder="00000-000" maxLength={9}
         onChange={e=>{onPostalCodeChange(e.target.value);setShown(null);setMessage("");onQuote(null);}}
         className="min-h-11 min-w-0 flex-1 rounded-xl border border-line bg-paper px-3 text-sm text-ink focus-visible:outline-2 focus-visible:outline-forest"/>
       <button type="button" onClick={()=>void quote(postalCode)} disabled={loading}
         className="min-h-11 rounded-xl bg-forest px-4 text-sm font-extrabold text-white disabled:opacity-60">
         {loading?"Calculando...":"Calcular frete"}
       </button>
     </div>
   </label>
   {message&&<p role="alert" className="text-xs font-semibold text-wine">{message}</p>}
   {current?.available&&current.quote&&<div role="status" className="rounded-xl bg-lime-soft p-3">
     <p className="text-base font-black text-forest">
       {current.quote.freightMinor===0?"Frete grátis":money.format(current.quote.freightMinor/100)}
     </p>
     <p className="mt-1 text-xs font-semibold text-forest">
       {current.quote.label} · {current.quote.minBusinessDays} a {current.quote.maxBusinessDays} dias úteis
     </p>
     <p className="mt-1 text-xs text-muted">Tarifa definida pela Provisio. Prazo estimado a partir do despacho.</p>
   </div>}
   {current&&!current.available&&<p role="status" className="rounded-xl bg-paper p-3 text-xs font-semibold text-muted">
     {current.reason==="origin_not_configured"?
       "A Provisio ainda não cadastrou seu endereço de expedição.":
       "Ainda não há uma tarifa de entrega cadastrada para este CEP. Escolha retirada, se disponível, ou consulte a Provisio."}
   </p>}
   {current?.origin&&current.pickupAvailable&&<p className="flex items-start gap-2 text-xs leading-relaxed text-muted">
     <MapPin size={15} className="mt-0.5 shrink-0" aria-hidden/>
     <span>Retirada disponível em {current.origin.label}: {current.origin.street},
       {" "}{current.origin.number} — {current.origin.city}/{current.origin.state}.
       {current.origin.pickupInstructions?" "+current.origin.pickupInstructions:""}</span>
   </p>}
 </section>;
}
