"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
export function PasswordUpdateForm(){
  const router=useRouter();
  const [first,setFirst]=useState("");
  const [second,setSecond]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [finished,setFinished]=useState(false);
  async function update(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(busy)return;
    setError("");
    if(first.length<12||first!==second){setError("Use uma senha com pelo menos 12 caracteres e confirme-a corretamente.");return;}
    setBusy(true);
    try{
      const supabase=createClient();
      const {data:{user},error:authError}=await supabase.auth.getUser();
      if(authError||!user)throw new Error("Sessão inválida. Solicite um novo link.");
      const {error:passwordError}=await supabase.auth.updateUser({password:first});
      if(passwordError)throw new Error("Não foi possível atualizar sua senha. Solicite um novo link.");
      setFinished(true);setFirst("");setSecond("");
      await supabase.auth.signOut();
      router.replace("/entrar");
      router.refresh();
    }catch(e){setError(e instanceof Error?e.message:"Falha ao redefinir a senha.");}
    finally{setBusy(false);}
  }
  if(finished)return <p role="status" className="mt-6 text-sm font-semibold text-forest">Senha alterada. Entre novamente na Provisio.</p>;
  return <form onSubmit={update} className="mt-6 space-y-4">
    <label htmlFor="reset-first" className="block text-sm font-extrabold text-forest">Nova senha</label>
    <input id="reset-first" type="password" autoComplete="new-password" required minLength={12}
      value={first} onChange={e=>setFirst(e.target.value)}
      className="min-h-12 w-full rounded-xl border border-line px-4 outline-none focus:ring-2 focus:ring-forest"/>
    <label htmlFor="reset-repeat" className="block text-sm font-extrabold text-forest">Confirmar senha</label>
    <input id="reset-repeat" type="password" autoComplete="new-password" required minLength={12}
      value={second} onChange={e=>setSecond(e.target.value)}
      className="min-h-12 w-full rounded-xl border border-line px-4 outline-none focus:ring-2 focus:ring-forest"/>
    {error?<p role="alert" className="rounded-xl bg-blush p-3 text-sm text-forest">{error}</p>:null}
    <button disabled={busy} className="min-h-12 w-full rounded-full bg-forest px-5 text-sm font-black text-white disabled:opacity-50">
      {busy?"Aguarde...":"Salvar nova senha"}
    </button>
    <Link href="/entrar" className="block text-center text-sm text-forest underline">Voltar ao login</Link>
  </form>;
}
