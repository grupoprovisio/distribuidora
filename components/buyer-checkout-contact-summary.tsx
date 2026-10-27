"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { MapPin, UserRound, ArrowRight } from "lucide-react";
import type { BuyerContact } from "@/lib/marketplace/buyer-contact";

export function BuyerCheckoutContactSummary({
  buyerOrgId, onLoaded,
}:{
  buyerOrgId:string;
  onLoaded:(profile:BuyerContact|null)=>void;
}){
  const [profile,setProfile]=useState<BuyerContact|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(false);
  useEffect(()=>{
    const controller=new AbortController();
    void fetch("/api/marketplace/buyer-profile?buyer="+encodeURIComponent(buyerOrgId),{
      credentials:"same-origin",cache:"no-store",signal:controller.signal,
    }).then(async response=>{
      if(!response.ok)throw Error("Falha ao buscar cadastro");
      return await response.json() as {ok:boolean;profile:BuyerContact|null};
    }).then(data=>{
      if(controller.signal.aborted)return;
      if(!data.ok)throw Error("Cadastro indisponível");
      setProfile(data.profile);onLoaded(data.profile);
    }).catch(()=>{
      if(!controller.signal.aborted){setError(true);onLoaded(null);}
    }).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return ()=>controller.abort();
  },[buyerOrgId,onLoaded]);
  const address=profile?[
    [profile.street,profile.number].filter(Boolean).join(", "),
    profile.complement,profile.neighborhood,
    [profile.city,profile.state].filter(Boolean).join(" / "),
    "CEP "+profile.postalCode.replace(/^(\d{5})(\d{3})$/,"$1-$2"),
  ].filter(Boolean).join(" · "):"";
  return <section aria-labelledby="buyer-address-title"
    className="rounded-[1.75rem] bg-paper p-4 shadow-card ring-1 ring-line/70 sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 id="buyer-address-title" className="text-base font-black text-forest-deep">
        Destinatário e endereço
      </h2>
      <Link href="/app/comprador/cadastro"
        className="inline-flex min-h-10 items-center gap-1 text-xs font-extrabold text-forest hover:underline">
        Alterar em Meu cadastro <ArrowRight size={14} aria-hidden/>
      </Link>
    </div>
    {loading?<p role="status" className="mt-2 text-sm text-muted">Carregando dados cadastrados...</p>:
      error?<p role="alert" className="mt-2 text-sm text-wine">Não foi possível carregar seus dados. A cotação ficará bloqueada até o cadastro ser consultado.</p>:
      !profile?<p role="status" className="mt-2 text-sm text-muted">Cadastre o destinatário e endereço em Meu cadastro antes de solicitar a cotação.</p>:
      <div className="mt-3 space-y-2 text-sm">
        <p className="flex items-start gap-2 text-ink"><UserRound size={17} className="mt-0.5 shrink-0 text-forest" aria-hidden/>
          <span><strong className="font-bold">{profile.fullName}</strong> · {profile.phone}<span className="block break-all text-muted">{profile.email}</span></span>
        </p>
        <p className="flex items-start gap-2 text-muted"><MapPin size={17} className="mt-0.5 shrink-0 text-forest" aria-hidden/>
          <span>{address}{profile.reference?" · Ref.: "+profile.reference:""}</span>
        </p>
      </div>}
  </section>;
}
