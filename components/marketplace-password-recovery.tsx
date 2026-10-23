"use client";
import Link from "next/link";
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
    setBusy(true);
    setError("");
    setNotice("");
    try{
      const result=await createClient().auth.resetPasswordForEmail(email.trim().toLowerCase(),{
        redirectTo:`${window.location.origin}/auth/callback?flow=recovery`,
      });
      if(result.error){
        if(result.error.status===429 || result.error.code==="over_email_send_rate_limit"){
          setError("O serviço de e-mails atingiu um limite temporário de envio. Aguarde a renovação da cota antes de solicitar outro link. Sua conta permanece cadastrada.");
          return;
        }
        throw result.error;
      }
      setNotice("Se esta conta existir, enviaremos instruções de recuperação. Verifique seu e-mail.");
    }catch{
      setError("Não foi possível solicitar a recuperação. Verifique sua conexão e tente novamente mais tarde.");
    }finally{
      setBusy(false);
    }
  }

  return <>
    <form onSubmit={send} className="mt-6 space-y-4">
      <label htmlFor="recovery-email" className="block text-sm font-extrabold text-forest">E-mail</label>
      <input id="recovery-email" type="email" autoComplete="email" required maxLength={254}
        value={email} onChange={e=>setEmail(e.target.value)}
        className="min-h-12 w-full rounded-xl border border-line px-4 outline-none focus:ring-2 focus:ring-forest"/>
      {notice?<p role="status" className="rounded-xl bg-lime-soft p-3 text-sm text-forest">{notice}</p>:null}
      {error?<p role="alert" className="rounded-xl bg-blush p-3 text-sm text-forest">{error}</p>:null}
      <button type="submit" disabled={busy} className="min-h-12 w-full rounded-full bg-forest px-5 text-sm font-black text-white disabled:opacity-50">
        {busy?"Aguarde...":"Enviar instruções"}
      </button>
    </form>
    <p className="mt-6 text-sm leading-relaxed text-muted">
      Já confirmou seu acesso e ainda está conectado neste navegador?{" "}
      <Link href="/redefinir-senha" className="font-bold text-forest underline underline-offset-2">
        Tentar definir uma nova senha
      </Link>. Esta opção exige uma sessão autenticada válida.
    </p>
  </>;
}
