"use client";
import { useState, type FormEvent } from "react";
import { MapPin, Search } from "lucide-react";

export function PublicCepAvailability({ regions }: { regions: string[] }) {
  const [cep,setCep]=useState("");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  async function check(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const postal=cep.replace(/\D/g,"");
    if(!/^[0-9]{8}$/.test(postal)){setMessage("Digite um CEP válido com 8 números.");return;}
    setBusy(true);
    setMessage("");
    try {
      // Consulta apenas a localidade, não preços, estoque ou permissões de comprador.
      const controller=new AbortController();
      const timeout=setTimeout(()=>controller.abort(),5000);
      try {
        const res=await fetch("https://viacep.com.br/ws/"+postal+"/json/",{signal:controller.signal});
        if(!res.ok)throw new Error("Falha na consulta");
        const data=await res.json() as {erro?:boolean;uf?:string;localidade?:string};
        if(data.erro||!data.uf){setMessage("CEP não encontrado. Confira os números e tente novamente.");return;}
        const covered=regions.some(region=>region==="BR"||region===data.uf||region==="BR-"+data.uf);
        setMessage(covered
          ? "A região de "+(data.localidade||data.uf)+" ("+data.uf+") está anunciada para este produto. A disponibilidade no endereço e o frete serão confirmados na cotação."
          : "Ainda não há atendimento anunciado para "+(data.localidade||data.uf)+" ("+data.uf+") neste produto. Consulte a Provisio para outras possibilidades.");
      } finally {clearTimeout(timeout);}
    } catch {setMessage("Não foi possível verificar o CEP agora. Tente novamente ou consulte a equipe comercial.");}
    finally {setBusy(false);}
  }
  return <form onSubmit={check} className="mt-6 rounded-2xl bg-canvas p-4">
    <label htmlFor="public-cep" className="flex items-center gap-2 text-sm font-black text-forest">
      <MapPin size={17} aria-hidden/> Verificar região pelo CEP
    </label>
    <div className="mt-3 flex flex-wrap gap-2">
      <input id="public-cep" inputMode="numeric" autoComplete="postal-code" maxLength={9}
        value={cep} onChange={event=>setCep(event.target.value)}
        placeholder="00000-000" className="min-h-11 min-w-0 flex-1 rounded-xl border border-line bg-white px-3 text-base text-forest"/>
      <button type="submit" disabled={busy} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-lime-soft px-4 text-sm font-extrabold text-forest disabled:opacity-60">
        <Search size={16} aria-hidden/>{busy?"Consultando...":"Consultar"}
      </button>
    </div>
    {message&&<p role="status" aria-live="polite" className="mt-3 text-sm leading-relaxed text-forest">{message}</p>}
    <p className="mt-2 text-xs text-muted">Consulta de localidade via ViaCEP. Não representa confirmação de entrega ou valor de frete.</p>
  </form>;
}
