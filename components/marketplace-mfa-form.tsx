"use client";
import Image from "next/image";
import { mfaQrImageUrl } from "@/lib/marketplace/mfa-qr";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type TotpInfo = { factorId: string; qr?: string; secret?: string };
export function MarketplaceMfaForm() {
  const router=useRouter();
  const [factor,setFactor]=useState<TotpInfo|null>(null);
  const [enrolled,setEnrolled]=useState(false);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [code,setCode]=useState("");
  const [error,setError]=useState("");
  const [finished,setFinished]=useState(false);

  useEffect(()=>{
    let mounted=true;
    void (async()=>{
      try {
        const {data,error}=await createClient().auth.mfa.listFactors();
        if(error) throw error;
        const verified = data.totp?.find(item => item.status === "verified");
        if(mounted && verified) {
          setFactor({factorId:verified.id});
          setEnrolled(true);
        }
      }catch{
        if(mounted)setError("Não foi possível consultar a verificação em duas etapas.");
      }finally{if(mounted)setLoading(false);}
    })();
    return ()=>{mounted=false;};
  },[]);

  async function startEnrollment(){
    if(busy)return;
    setBusy(true);setError("");
    try{
      const supabase = createClient();
      // Inscricoes incompletas podem ficar no Auth apos atualizar a pagina.
      // Nunca removemos fatores ja verificados; eles exigem AAL2 para serem desativados.
      const existing = await supabase.auth.mfa.listFactors();
      if (existing.error) throw existing.error;
      for (const pending of existing.data.all ?? []) {
        if (pending.status === "unverified" && pending.factor_type === "totp") {
          const cleanup = await supabase.auth.mfa.unenroll({factorId:pending.id});
          if (cleanup.error) throw cleanup.error;
        }
      }
      const result=await supabase.auth.mfa.enroll({factorType:"totp",friendlyName:"Provisio Administração"});
      if(result.error)throw result.error;
      setFactor({factorId:result.data.id,qr:mfaQrImageUrl(result.data.totp.qr_code),secret:result.data.totp.secret});
      setEnrolled(false);
    }catch{setError("Não foi possível configurar o autenticador. Tente novamente.");}
    finally{setBusy(false);}
  }

  async function verify(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(busy||!factor||!/^[0-9]{6}$/.test(code))return;
    setBusy(true);setError("");
    try{
      const supabase=createClient();
      const challenge=await supabase.auth.mfa.challenge({factorId:factor.factorId});
      if(challenge.error)throw challenge.error;
      const verified=await supabase.auth.mfa.verify({
        factorId:factor.factorId, challengeId:challenge.data.id, code,
      });
      if(verified.error)throw verified.error;
      setFinished(true);
      setCode("");
      router.replace("/admin/marketplace");
      router.refresh();
    }catch{
      setError("Código incorreto ou expirado. Confira o autenticador e tente novamente.");
    }finally{setBusy(false);}
  }
  return <div className="mt-6 space-y-5">
    {loading ? <p className="text-sm text-muted">Verificando fatores cadastrados...</p> : null}
    {!loading && !factor ? <button type="button" onClick={startEnrollment} disabled={busy}
      className="min-h-12 rounded-full bg-forest px-5 text-sm font-bold text-white disabled:opacity-50">
      {busy?"Aguarde...":"Configurar aplicativo autenticador"}
    </button> : null}
    {factor?.qr && !enrolled ? <div className="space-y-3">
      <p className="text-sm font-medium text-forest">
        Leia este QR Code no aplicativo autenticador do seu celular. Depois digite o código de seis dígitos.
      </p>
      <Image src={factor.qr} alt="QR Code para cadastrar autenticação em duas etapas" width={220} height={220}
        unoptimized className="rounded-2xl bg-white p-3"/>
      <p className="text-xs font-semibold text-muted">
        Caso não consiga escanear, cadastre manualmente esta chave privada. Não compartilhe a chave.
      </p>
      <code className="block break-all rounded-xl bg-canvas p-3 text-xs text-forest">{factor.secret}</code>
    </div> : null}
    {factor ? <form onSubmit={verify} className="space-y-4">
      <label htmlFor="mfa-code" className="block text-sm font-extrabold text-forest">Código do autenticador</label>
      <input id="mfa-code" type="text" inputMode="numeric" autoComplete="one-time-code"
        minLength={6} maxLength={6} pattern="[0-9]{6}" required value={code}
        onChange={e=>setCode(e.target.value.replace(/\D/g,"").slice(0,6))}
        className="min-h-12 w-full rounded-xl border border-line bg-white px-4 text-lg tracking-[.2em] focus-visible:ring-2 focus-visible:ring-forest"/>
      <button type="submit" disabled={busy||finished}
        className="min-h-12 w-full rounded-full bg-forest px-5 text-sm font-extrabold text-white disabled:opacity-50">
        {busy?"Confirmando...":"Confirmar verificação"}
      </button>
    </form> : null}
    {error ? <p role="alert" className="rounded-xl bg-blush p-3 text-sm font-semibold text-[#8f2443]">{error}</p> : null}
  </div>;
}
