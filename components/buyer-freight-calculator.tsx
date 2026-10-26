"use client";
import { useCallback,useEffect,useState } from "react";
import { MapPin,PackageCheck,Truck } from "lucide-react";
import { normalizeCep } from "@/lib/marketplace/buyer-contact";

export type FreightInfo={
  ok:boolean;available:boolean;reason?:string|null;cep:string;pickupAvailable:boolean;
  destination?:{city:string;state:string}|null;
  origin?:{label:string;postalCode:string;street:string;number:string;
    complement:string;neighborhood:string;city:string;state:string;pickupInstructions:string};
  quote?:{label:string;state:string;freightMinor:number;
    minBusinessDays:number;maxBusinessDays:number;source?:"cep_range"|"state_default"}|null;
};
type Method="delivery"|"pickup";
type Props={
  buyerOrgId:string;postalCode:string;onPostalCodeChange:(cep:string)=>void;
  onQuote:(quote:FreightInfo|null)=>void;method:Method;
  onMethodChange:(mode:Method)=>void;auto?:boolean;
};
const money=new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"});
const choiceClass=(selected:boolean)=>"flex cursor-pointer items-start gap-3 rounded-2xl border p-3.5 transition-colors "+
  (selected?"border-forest bg-lime-soft/40":"border-line bg-paper hover:border-forest/40");
export function BuyerFreightCalculator({
  buyerOrgId,postalCode,onPostalCodeChange,onQuote,method,onMethodChange,auto=false
}:Props){
  const [loading,setLoading]=useState(false);
  const [message,setMessage]=useState("");
  const [shown,setShown]=useState<FreightInfo|null>(null);
  const [originOnly,setOriginOnly]=useState<FreightInfo|null>(null);
  const cep=normalizeCep(postalCode);
  const current=shown?.cep===cep?shown:null;
  const pickupAvailable=current?.pickupAvailable??originOnly?.pickupAvailable??false;
  const origin=current?.origin??originOnly?.origin;

  // Pickup has its own availability, independent of a shipping destination.
  useEffect(()=>{
    const controller=new AbortController();
    const params=new URLSearchParams({buyer:buyerOrgId});
    void fetch("/api/marketplace/frete?"+params,{credentials:"same-origin",
      cache:"no-store",signal:controller.signal})
      .then(async r=>r.ok?await r.json() as FreightInfo:null)
      .then(data=>{if(!controller.signal.aborted&&data?.ok)setOriginOnly(data);})
      .catch(()=>{});
    return ()=>controller.abort();
  },[buyerOrgId]);

  const requestQuote=useCallback(async(zip:string,signal?:AbortSignal)=>{
    const digits=normalizeCep(zip);
    if(digits.length!==8){setMessage("Informe um CEP válido com 8 números.");onQuote(null);return;}
    setLoading(true);setMessage("");
    try{
      const params=new URLSearchParams({buyer:buyerOrgId,cep:digits});
      const r=await fetch("/api/marketplace/frete?"+params,{
        credentials:"same-origin",cache:"no-store",signal
      });
      const data=await r.json() as FreightInfo;
      if(!r.ok||!data.ok)throw Error();
      if(signal?.aborted)return;
      setShown(data);onQuote(data);
    }catch{
      if(!signal?.aborted){setMessage("Não foi possível consultar o frete. Tente novamente.");onQuote(null);}
    }finally{if(!signal?.aborted)setLoading(false);}
  },[buyerOrgId,onQuote]);

  // In checkout, recalculate automatically against the recipient saved on the server.
  useEffect(()=>{
    if(!auto||cep.length!==8)return;
    const controller=new AbortController();
    const params=new URLSearchParams({buyer:buyerOrgId,cep});
    void fetch("/api/marketplace/frete?"+params,{
      credentials:"same-origin",cache:"no-store",signal:controller.signal,
    }).then(async r=>{
      if(!r.ok)throw Error();
      return await r.json() as FreightInfo;
    }).then(data=>{
      if(!controller.signal.aborted){setShown(data);onQuote(data);setMessage("");}
    }).catch(()=>{
      if(!controller.signal.aborted){
        setMessage("Não foi possível consultar o frete.");onQuote(null);
      }
    });
    return ()=>controller.abort();
  },[auto,cep,buyerOrgId,onQuote]);

  const pickupLabel=origin?.label??"Unidade Provisio";
  const address=origin?
    origin.street+", "+origin.number+
      (origin.complement?", "+origin.complement:"")+" — "+origin.city+"/"+origin.state:
    "";
  return <section aria-label="Entrega ou retirada" className="min-w-0 space-y-4">
    <div className="space-y-1">
      <h3 className="flex items-center gap-2 text-sm font-black text-forest-deep">
        <Truck size={18} aria-hidden/> Entrega ou retirada
      </h3>
      <p className="text-xs leading-relaxed text-muted">
        Consulte o frete para seu CEP e escolha a modalidade antes de continuar.
      </p>
    </div>
    <div className="space-y-2">
      <label htmlFor="basket-freight-cep" className="text-xs font-bold text-forest">
        CEP de entrega
      </label>
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-stretch gap-2">
        <input id="basket-freight-cep" type="text" inputMode="numeric"
          autoComplete="postal-code" value={postalCode} placeholder="00000-000"
          maxLength={9}
          onChange={e=>{onPostalCodeChange(e.target.value);setShown(null);setMessage("");onQuote(null);}}
          className="h-11 min-w-0 w-full rounded-xl border border-line bg-paper px-3 text-sm text-ink focus-visible:outline-2 focus-visible:outline-forest"/>
        <button type="button" onClick={()=>void requestQuote(postalCode)}
          disabled={loading||cep.length!==8}
          className="h-11 shrink-0 whitespace-nowrap rounded-xl bg-forest px-3 text-xs font-extrabold text-white transition hover:bg-forest-deep disabled:opacity-50">
          {loading?"Consultando...":"Calcular frete"}
        </button>
      </div>
      {message&&<p role="alert" className="text-xs font-semibold text-wine">{message}</p>}
      {current?.destination&&<p className="text-xs font-medium text-muted">
        CEP consultado: {current.destination.city}/{current.destination.state}
      </p>}
    </div>
    <fieldset className="space-y-2">
      <legend className="mb-2 text-xs font-bold text-forest-deep">Como deseja receber?</legend>
      <label className={choiceClass(method==="delivery")}>
        <input type="radio" name="basket-delivery-method" value="delivery"
          checked={method==="delivery"} onChange={()=>onMethodChange("delivery")}
          className="mt-1 shrink-0 accent-forest"/>
        <Truck size={18} className="mt-0.5 shrink-0 text-forest" aria-hidden/>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-black text-forest-deep">Receber no endereço</span>
          {current?.available&&current.quote?<>
            <span className="mt-1 block text-base font-black tabular-nums text-forest">
              {current.quote.freightMinor===0?"Frete grátis":money.format(current.quote.freightMinor/100)}
            </span>
            <span className="mt-1 block text-xs font-semibold text-muted">
              {current.quote.minBusinessDays}–{current.quote.maxBusinessDays} dias úteis estimados
            </span>
            <span className="mt-1 block text-[11px] text-muted">
              {current.quote.label} · valor definido pela Provisio
            </span>
          </>:<span className="mt-1 block text-xs leading-relaxed text-muted">
            {current?.reason==="invalid_cep"?"CEP não localizado. Confira os números.":
              current?.reason==="area_not_covered"?
                "Ainda não há tarifa para esta região. A administração pode configurar a tarifa estadual.":
              current?.reason==="origin_not_configured"?"Unidade de origem indisponível.":
              "Digite o CEP e toque em Calcular frete para conferir valor e prazo."}
          </span>}
        </span>
      </label>
      {pickupAvailable&&origin&&<label className={choiceClass(method==="pickup")}>
        <input type="radio" name="basket-delivery-method" value="pickup"
          checked={method==="pickup"} onChange={()=>onMethodChange("pickup")}
          className="mt-1 shrink-0 accent-forest"/>
        <PackageCheck size={18} className="mt-0.5 shrink-0 text-forest" aria-hidden/>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-black text-forest-deep">Retirar no local — grátis</span>
          <span className="mt-1 block text-xs font-bold text-forest">{pickupLabel}</span>
          <span className="mt-1 flex items-start gap-1 text-xs leading-relaxed text-muted">
            <MapPin size={13} className="mt-0.5 shrink-0" aria-hidden/>{address}
          </span>
          {origin.pickupInstructions&&<span className="mt-1 block text-xs font-semibold text-forest">
            Horário: {origin.pickupInstructions}
          </span>}
        </span>
      </label>}
      {!pickupAvailable&&originOnly&&<p className="text-xs text-muted">
        Retirada indisponível no momento.
      </p>}
    </fieldset>
  </section>;
}
