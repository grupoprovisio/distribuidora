"use client";
import { useCallback,useEffect,useState } from "react";
import { CheckCircle2,MapPin,PlusCircle,Save,Truck } from "lucide-react";

type OriginRecord={
  label:string;postal_code:string;street:string;street_number:string;complement:string;
  neighborhood:string;city:string;state_code:string;pickup_instructions:string;pickup_enabled:boolean;active:boolean;
};
type RateRecord={id:string;label:string;postal_start:number;postal_end:number;
  destination_state:string;price_minor:number;min_business_days:number;max_business_days:number;active:boolean};
type OriginDraft={
 label:string;postalCode:string;street:string;number:string;complement:string;
 neighborhood:string;city:string;state:string;pickupInstructions:string;pickupEnabled:boolean;
};
type RateDraft={id?:string;label:string;postalStart:string;postalEnd:string;state:string;
 price:string;minBusinessDays:string;maxBusinessDays:string};
const blankOrigin:OriginDraft={label:"",postalCode:"",street:"",number:"",complement:"",
 neighborhood:"",city:"",state:"SP",pickupInstructions:"",pickupEnabled:false};
const blankRate:RateDraft={label:"",postalStart:"",postalEnd:"",state:"SP",price:"",
 minBusinessDays:"2",maxBusinessDays:"5"};
const originFields=[
 ["label","Nome da unidade","Unidade Provisio"],
 ["postalCode","CEP de origem","00000000"],
 ["street","Rua / avenida","Logradouro"],
 ["number","Número","Número"],
 ["complement","Complemento (opcional)","Galpão, bloco ou sala"],
 ["neighborhood","Bairro","Bairro"],
 ["city","Cidade","Cidade"],
 ["state","Estado (UF)","SP"],
 ["pickupInstructions","Orientações para retirada (opcional)","Horário e orientação para retirada"],
] as const;
const brl=(n:number)=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(n/100);
const z=(n:number)=>String(n).padStart(8,"0");
const toDraft=(v:OriginRecord):OriginDraft=>({
 label:v.label,postalCode:v.postal_code,street:v.street,number:v.street_number,
 complement:v.complement,neighborhood:v.neighborhood,city:v.city,state:v.state_code,
 pickupInstructions:v.pickup_instructions,pickupEnabled:v.pickup_enabled,
});
export function AdminFreightSettings(){
 const [origin,setOrigin]=useState<OriginDraft>(blankOrigin);
 const [hasOrigin,setHasOrigin]=useState(false);
 const [rates,setRates]=useState<RateRecord[]>([]);
 const [rate,setRate]=useState<RateDraft>(blankRate);
 const [loaded,setLoaded]=useState(false);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 const [error,setError]=useState("");
 const reload=useCallback(async()=>{
   try{
    const r=await fetch("/api/marketplace/admin-frete",{credentials:"same-origin",cache:"no-store"});
    const data=await r.json() as {ok:boolean;origin:OriginRecord|null;rates:RateRecord[]};
    if(!r.ok||!data.ok)throw Error();
    setHasOrigin(!!data.origin);
    if(data.origin)setOrigin(toDraft(data.origin));
    setRates(data.rates);
   }catch{setError("Não foi possível carregar as regras de frete. Verifique a autenticação ADM com MFA.");}
   finally{setLoaded(true);}
 },[]);
 useEffect(()=>{void reload();},[reload]);
 async function send(payload:unknown){
   setBusy(true);setError("");setMessage("");
   try{
     const r=await fetch("/api/marketplace/admin-frete",{method:"POST",credentials:"same-origin",
       headers:{"content-type":"application/json"},body:JSON.stringify(payload)});
     const data=await r.json() as {ok:boolean;reason?:string};
     if(!r.ok||!data.ok){
       if(data.reason==="overlapping_range")setError("Essa faixa de CEP se sobrepõe a outra faixa ativa. Ajuste os intervalos.");
       else setError("Não foi possível salvar. Confira os campos e sua sessão ADM com MFA.");
       return false;
     }
     await reload();setMessage("Configuração salva com sucesso.");return true;
   }catch{setError("Falha de conexão ao salvar.");return false;}
   finally{setBusy(false);}
 }
 async function saveOrigin(e:React.FormEvent){e.preventDefault();
   await send({action:"origin",origin});
 }
 async function saveRate(e:React.FormEvent){e.preventDefault();
   const match=rate.price.trim().match(/^([0-9]{1,7})(?:[,.]([0-9]{1,2}))?$/);
   if(!match){setError("Informe o preço em reais, por exemplo: 19,90.");return;}
   const priceMinor=Number(match[1])*100+Number((match[2]??"").padEnd(2,"0"));
   const ok=await send({action:"rate",rate:{
     id:rate.id??null,label:rate.label,postalStart:rate.postalStart.replace(/\D/g,""),
     postalEnd:rate.postalEnd.replace(/\D/g,""),state:rate.state.toUpperCase(),
     priceMinor,minBusinessDays:Number(rate.minBusinessDays),maxBusinessDays:Number(rate.maxBusinessDays)
   }});
   if(ok)setRate(blankRate);
 }
 return <div className="space-y-7">
  <section className="rounded-[1.75rem] border border-line bg-paper p-5 sm:p-7">
   <div className="mb-5 flex items-start gap-3">
     <MapPin size={24} className="shrink-0 text-forest" aria-hidden/>
     <div>
       <h2 className="text-xl font-black text-forest-deep">Origem da entrega e retirada</h2>
       <p className="mt-2 text-sm leading-relaxed text-muted">
         Cadastre o endereço verdadeiro da unidade Provisio. Esse local será apresentado ao comprador para retirada
         e usado como referência operacional dos valores de frete cadastrados.
       </p>
     </div>
   </div>
   {!loaded?<p role="status" className="text-sm text-muted">Carregando configuração...</p>:
    <form onSubmit={e=>void saveOrigin(e)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
       {originFields.map(([key,label,placeholder])=><label key={key}
         className={"grid gap-1.5 text-xs font-extrabold text-forest "+(["label","street","pickupInstructions"].includes(key)?"sm:col-span-2":"")}>
         {label}
         <input value={origin[key]} placeholder={placeholder}
           required={!["complement","pickupInstructions"].includes(key)}
           maxLength={key==="pickupInstructions"?350:160}
           onChange={e=>setOrigin(v=>({...v,[key]:key==="state"?e.target.value.toUpperCase().slice(0,2):e.target.value}))}
           className="min-h-12 rounded-xl border border-line bg-canvas px-4 text-sm font-medium text-ink focus-visible:outline-2 focus-visible:outline-forest"/>
       </label>)}
      </div>
      <label className="flex min-h-12 items-center gap-3 rounded-xl border border-line px-4 text-sm font-bold text-forest-deep">
       <input type="checkbox" checked={origin.pickupEnabled}
         onChange={e=>setOrigin(v=>({...v,pickupEnabled:e.target.checked}))}/>
       Permitir retirada de pedidos nesta unidade
      </label>
      <button type="submit" disabled={busy} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-forest px-6 text-sm font-extrabold text-white disabled:opacity-50">
       <Save size={17} aria-hidden/>{busy?"Salvando...":hasOrigin?"Atualizar endereço da Provisio":"Cadastrar unidade Provisio"}
      </button>
    </form>}
  </section>

  <section className="rounded-[1.75rem] border border-line bg-paper p-5 sm:p-7">
    <div className="mb-5 flex gap-3">
      <Truck size={24} className="shrink-0 text-forest" aria-hidden/>
      <div>
        <h2 className="text-xl font-black text-forest-deep">Fretes por faixa de CEP</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Informe as tarifas reais da operação e o prazo em dias úteis para cada faixa.
          Os intervalos ativos não podem se sobrepor. Sem faixa cadastrada, o comprador verá frete indisponível.
        </p>
      </div>
    </div>
    <form onSubmit={e=>void saveRate(e)} className="grid gap-4 sm:grid-cols-2">
      {([
        ["label","Nome da região","Ex.: São Paulo capital"],
        ["state","Estado de destino","SP"],
        ["postalStart","CEP inicial (8 números)","01000000"],
        ["postalEnd","CEP final (8 números)","05999999"],
        ["price","Valor do frete em R$","19,90"],
        ["minBusinessDays","Prazo mínimo (dias úteis)","2"],
        ["maxBusinessDays","Prazo máximo (dias úteis)","5"],
      ] as const).map(([key,label,placeholder])=><label key={key}
        className="grid gap-1.5 text-xs font-extrabold text-forest">
        {label}<input required value={rate[key]} placeholder={placeholder}
        inputMode={["postalStart","postalEnd","price","minBusinessDays","maxBusinessDays"].includes(key)?"decimal":"text"}
        maxLength={key==="label"?100:15}
        onChange={e=>setRate(v=>({...v,[key]:e.target.value}))}
        className="min-h-12 rounded-xl border border-line bg-canvas px-4 text-sm font-medium text-ink focus-visible:outline-2 focus-visible:outline-forest"/>
      </label>)}
      <div className="flex flex-wrap items-end gap-3 sm:col-span-2">
        <button disabled={busy||!hasOrigin} type="submit"
          className="inline-flex min-h-12 items-center gap-2 rounded-full bg-forest px-6 text-sm font-extrabold text-white disabled:opacity-50">
          <PlusCircle size={17} aria-hidden/>{rate.id?"Atualizar tarifa":"Adicionar faixa de frete"}
        </button>
        {rate.id&&<button type="button" onClick={()=>setRate(blankRate)}
          className="min-h-12 rounded-full border border-line px-5 text-sm font-bold text-forest">
          Cancelar edição
        </button>}
      </div>
      {!hasOrigin&&<p className="text-xs font-semibold text-muted sm:col-span-2">Cadastre primeiro a origem da entrega.</p>}
    </form>
    <div className="mt-7 space-y-3" aria-label="Tabela de tarifas">
      {rates.length===0?<p className="rounded-xl bg-canvas p-4 text-sm text-muted">
        Nenhuma faixa de CEP configurada. Ainda não há frete disponível para cotação.
      </p>:rates.map(item=><div key={item.id}
        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line p-4">
        <div>
          <p className="font-black text-forest-deep">{item.label}</p>
          <p className="mt-1 text-xs font-medium text-muted">
           {z(item.postal_start)} a {z(item.postal_end)} · {item.destination_state}
          </p>
          <p className="mt-1 text-sm font-black text-forest">
            {brl(item.price_minor)} · {item.min_business_days}–{item.max_business_days} dias úteis
          </p>
          {!item.active&&<p className="text-xs font-bold text-wine">Faixa inativa</p>}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={()=>setRate({
           id:item.id,label:item.label,postalStart:z(item.postal_start),postalEnd:z(item.postal_end),
           state:item.destination_state,price:(item.price_minor/100).toFixed(2).replace(".",","),
           minBusinessDays:String(item.min_business_days),maxBusinessDays:String(item.max_business_days)})}
           className="min-h-11 rounded-full border border-line px-4 text-xs font-bold text-forest">Editar</button>
          {item.active&&<button type="button" disabled={busy}
           onClick={()=>{if(window.confirm("Desativar esta tarifa?"))void send({action:"disable",id:item.id});}}
           className="min-h-11 rounded-full border border-line px-4 text-xs font-bold text-wine">Desativar</button>}
        </div>
      </div>)}
    </div>
  </section>
  {message&&<p role="status" className="flex items-center gap-2 rounded-xl bg-lime-soft p-4 text-sm font-bold text-forest">
    <CheckCircle2 size={17} aria-hidden/>{message}</p>}
  {error&&<p role="alert" className="rounded-xl bg-sand p-4 text-sm font-semibold text-wine">{error}</p>}
 </div>;
}
