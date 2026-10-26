"use client";
import { useEffect,useState } from "react";
import { CheckCircle2,MapPin,Save,UserRound } from "lucide-react";
import { BuyerContact,EMPTY_BUYER_CONTACT,parseBuyerContact } from "@/lib/marketplace/buyer-contact";

const fields=[
 ["fullName","Nome completo","text","Seu nome e sobrenome"],
 ["email","E-mail para contato","email","email@empresa.com"],
 ["phone","Telefone com DDD","tel","(11) 99999-9999"],
 ["postalCode","CEP","text","00000-000"],
 ["state","Estado (UF)","text","SP"],
 ["city","Cidade","text","Cidade"],
 ["neighborhood","Bairro","text","Bairro"],
 ["street","Rua / avenida","text","Logradouro"],
 ["number","Número","text","Número"],
 ["complement","Complemento (opcional)","text","Bloco, apartamento, sala"],
 ["reference","Ponto de referência (opcional)","text","Como localizar o endereço"],
] as const;
type Field=typeof fields[number][0];
type Props={buyerOrgId:string;onSaved?:(p:BuyerContact)=>void;onEdited?:()=>void;compact?:boolean};
const info=(value:string)=>value==="postalCode"?"Digite o CEP com 8 números.":undefined;
export function BuyerProfileForm({buyerOrgId,onSaved,onEdited,compact=false}:Props){
 const [profile,setProfile]=useState<BuyerContact>(EMPTY_BUYER_CONTACT);
 const [load,setLoad]=useState(true);
 const [saving,setSaving]=useState(false);
 const [status,setStatus]=useState<"idle"|"saved"|"error">("idle");
 const [error,setError]=useState("");
 // Every response belongs to the signed in buyer and organization, never a public profile.
 useEffect(()=>{
   const controller=new AbortController();
   void fetch("/api/marketplace/buyer-profile?buyer="+encodeURIComponent(buyerOrgId),{
     credentials:"same-origin",cache:"no-store",signal:controller.signal,
   }).then(async r=>{
     if(!r.ok)throw Error();
     return await r.json() as {ok:boolean;profile:BuyerContact|null;loginEmail?:string};
   }).then(data=>{
     if(controller.signal.aborted)return;
     if(!data.ok)throw Error();
     const saved=data.profile??{...EMPTY_BUYER_CONTACT,email:data.loginEmail??""};
     setProfile(saved);setStatus(data.profile?"saved":"idle");
     if(data.profile)onSaved?.(saved);
   }).catch(()=>{if(!controller.signal.aborted){
     setError("Não foi possível carregar seus dados cadastrais.");setStatus("error");
   }}).finally(()=>{if(!controller.signal.aborted)setLoad(false);});
   return ()=>controller.abort();
 },[buyerOrgId,onSaved]);
 function edit(k:Field,value:string){
   setProfile(prev=>({...prev,[k]:k==="state"?value.toUpperCase().slice(0,2):value}));
   setStatus("idle");setError("");onEdited?.();
 }
 async function save(event:React.FormEvent<HTMLFormElement>){
   event.preventDefault();
   const normalized=parseBuyerContact(profile);
   if(!normalized){setError("Preencha nome completo, contato e endereço válido. Complemento e referência são opcionais.");setStatus("error");return;}
   setSaving(true);setError("");
   try{
     const r=await fetch("/api/marketplace/buyer-profile",{method:"POST",credentials:"same-origin",
       headers:{"content-type":"application/json"},
       body:JSON.stringify({buyerOrgId,profile:normalized})});
     const d=await r.json() as {ok:boolean;profile?:BuyerContact};
     if(!r.ok||!d.ok||!d.profile)throw Error();
     setProfile(d.profile);setStatus("saved");onSaved?.(d.profile);
   }catch{setError("Não foi possível salvar seus dados. Confira seu login e tente novamente.");setStatus("error");}
   finally{setSaving(false);}
 }
 return <section className="rounded-[1.75rem] bg-paper p-5 shadow-card ring-1 ring-line/70 sm:p-6"
   aria-labelledby="buyer-profile-title">
   <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
     <div><p className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-forest">
       <UserRound size={17} aria-hidden/> Seus dados
     </p><h2 id="buyer-profile-title" className="mt-1 text-xl font-black text-forest-deep">
       {compact?"Destinatário e endereço":"Meu cadastro"}
     </h2></div>
     {status==="saved"&&<span role="status" className="inline-flex items-center gap-1 rounded-full bg-lime-soft px-3 py-1 text-xs font-bold text-forest">
       <CheckCircle2 size={15} aria-hidden/> Dados salvos
     </span>}
   </div>
   <p className="mb-5 text-sm leading-relaxed text-muted">
     {compact?"Confira ou atualize o contato e o endereço que serão registrados na sua cotação.":
       "Gerencie seus dados de contato e endereço. As solicitações já enviadas preservam o endereço registrado na data da cotação."}
   </p>
   {load?<p role="status" className="text-sm text-muted">Carregando seu cadastro...</p>:
   <form onSubmit={event=>void save(event)} className="space-y-5">
     <div className="grid gap-4 sm:grid-cols-2">
       {fields.map(([key,label,type,placeholder])=><label key={key}
         className={"grid gap-1.5 text-xs font-extrabold text-forest "+(["fullName","street","reference"].includes(key)?"sm:col-span-2":"")}>
         {label}
         <input
           required={!["complement","reference"].includes(key)}
           aria-describedby={info(key)?key+"-note":undefined}
           name={key} type={type} value={profile[key]} autoComplete={
             key==="fullName"?"name":key==="email"?"email":key==="phone"?"tel":
             key==="postalCode"?"postal-code":key==="state"?"address-level1":
             key==="city"?"address-level2":key==="street"?"address-line1":
             key==="complement"?"address-line2":"off"
           }
           inputMode={key==="phone"?"tel":key==="postalCode"?"numeric":"text"}
           placeholder={placeholder} maxLength={key==="reference"?240:key==="email"?254:160}
           onChange={event=>edit(key,event.target.value)}
           className="min-h-12 w-full min-w-0 rounded-xl border border-line bg-canvas px-4 text-sm font-medium text-ink focus-visible:outline-2 focus-visible:outline-forest"/>
         {info(key)&&<span id={key+"-note"} className="text-[11px] font-medium text-muted">{info(key)}</span>}
       </label>)}
     </div>
     <p className="flex items-center gap-2 text-xs text-muted">
       <MapPin size={15} aria-hidden/> Os dados são usados na cotação e na entrega, conforme a modalidade escolhida.
     </p>
     {error&&<p role="alert" className="rounded-xl bg-sand p-3 text-sm font-semibold text-wine">{error}</p>}
     <button disabled={saving} type="submit" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-forest px-6 text-sm font-extrabold text-white disabled:opacity-60 sm:w-auto">
       <Save size={17} aria-hidden/>{saving?"Salvando cadastro...":"Salvar meus dados"}
     </button>
   </form>}
 </section>;
}
