"use client";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
export function PasswordRecoveryForm(){
  const [email,setEmail]=useState("");
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState("");
  const [error,setError]=useState("");
  async function send(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(busy)return;
    setBusy(true);setError("");setNotice("");
    try{
      const result=await createClient().auth.resetPasswordForEmail(email.trim().toLowerCase(),{
        redirectTo:`${window.location.origin}/auth/callback?flow=recovery`,
      });
      if(result.error)throw result.error;
      setNotice("Se esta conta existir, enviaremos instruções de recuperação. Verifique seu e-mail.");
    }catch{
      setError("Não foi possível solicitar a recuperação. Aguarde e tente novamente.");
    }finally{setBusy(false);}
  }
  return <form onSubmit={send} className="mt-6 space-y-4">
    <label htmlFor="recovery-email" className="block text-sm font-extrabold text-forest">E-mail</label>
    <input id="recovery-email" type="email" autoComplete="email" required maxLength={254}
      value={email} onChange={e=>setEmail(e.target.value)}
      className="min-h-12 w-full rounded-xl border border-line px-4 outline-none focus:ring-2 focus:ring-forest"/>
    {notice?<p role="status" className="rounded-xl bg-lime-soft p-3 text-sm text-forest">{notice}</p>:null}
    {error?<p role="alert" className="rounded-xl bg-blush p-3 text-sm text-forest">{error}</p>:null}
    <button disabled={busy} className="min-h-12 w-full rounded-full bg-forest px-5 text-sm font-black text-white disabled:opacity-50">
      {busy?"Aguarde...":"Enviar instruções"}
    </button>
  </form>;
}
