"use client";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { passwordUpdateErrorMessage } from "@/lib/marketplace/password-update";

type VerifiedTotp = { id: string; name: string };
type RecoveryMfa = { required: boolean; factors: VerifiedTotp[] };
const unavailableMfa = "Esta conta exige verificação em duas etapas, mas não há um autenticador disponível. Entre em contato com o suporte.";

async function recoveryMfa(client: ReturnType<typeof createClient>, force = false): Promise<RecoveryMfa> {
  const assurance = await client.auth.mfa.getAuthenticatorAssuranceLevel();
  if (assurance.error) throw assurance.error;
  if (!force && (assurance.data.currentLevel === "aal2" || !assurance.data.currentLevel)) {
    return { required: false, factors: [] };
  }
  // Consultar os fatores existentes; recuperacao nunca cadastra ou remove MFA.
  // nextLevel pode refletir fatores antigos do cache da sessao.
  const result = await client.auth.mfa.listFactors();
  if (result.error) throw result.error;
  const required = force || assurance.data.nextLevel === "aal2"
    || result.data.all.some(factor => factor.status === "verified");
  if (!required) return { required: false, factors: [] };
  const factors = result.data.totp.filter(factor => factor.status === "verified");
  return {
    required: true,
    factors: factors.map((factor, index) => ({
      id: factor.id,
      name: factors.length > 1
        ? `${factor.friendly_name || "Autenticador"} (${index + 1})`
        : factor.friendly_name || "Autenticador",
    })),
  };
}

function selectedFactor(factors: VerifiedTotp[], previous = "") {
  if (factors.some(factor => factor.id === previous)) return previous;
  return factors.length === 1 ? factors[0].id : "";
}

export function PasswordUpdateForm(){
  const router=useRouter();
  const [first,setFirst]=useState("");
  const [second,setSecond]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [finished,setFinished]=useState(false);
  const [logoutError,setLogoutError]=useState("");
  const [checkingMfa,setCheckingMfa]=useState(true);
  const [mfa,setMfa]=useState<RecoveryMfa>({required:false,factors:[]});
  const [forceMfa,setForceMfa]=useState(false);
  const [factorId,setFactorId]=useState("");
  const [code,setCode]=useState("");

  useEffect(()=>{
    let mounted=true;
    void (async()=>{
      try{
        const requirement=await recoveryMfa(createClient());
        if(mounted){
          setMfa(requirement);
          setFactorId(selectedFactor(requirement.factors));
        }
      }catch(cause){
        if(mounted)setError(passwordUpdateErrorMessage(cause));
      }finally{
        if(mounted)setCheckingMfa(false);
      }
    })();
    return ()=>{mounted=false;};
  },[]);

  async function finishLogout(){
    setBusy(true);setLogoutError("");
    try{
      const {error:signOutError}=await createClient().auth.signOut();
      if(signOutError){
        setLogoutError("Sua senha foi alterada, mas não foi possível encerrar a sessão. Tente sair novamente.");
        return;
      }
      router.replace("/entrar");
      router.refresh();
    }catch{
      setLogoutError("Sua senha foi alterada, mas não foi possível encerrar a sessão. Tente sair novamente.");
    }finally{setBusy(false);}
  }

  async function update(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(busy||checkingMfa)return;
    setError("");
    if(first.length<12||first!==second){setError("Use uma senha com pelo menos 12 caracteres e confirme-a corretamente.");return;}
    setBusy(true);
    try{
      const supabase=createClient();
      const {data:{user},error:authError}=await supabase.auth.getUser();
      if(authError){setError(passwordUpdateErrorMessage(authError));return;}
      if(!user||user.is_anonymous){setError("Sua sessão expirou. Entre novamente ou solicite outro link de recuperação.");return;}
      const requirement=await recoveryMfa(supabase,forceMfa);
      const selected=selectedFactor(requirement.factors,factorId);
      setMfa(requirement);setFactorId(selected);
      if(requirement.required){
        if(!requirement.factors.length){setError(unavailableMfa);return;}
        if(!selected){setError("Selecione o autenticador que deseja usar.");return;}
        if(!/^[0-9]{6}$/.test(code)){setError("Informe o código de seis dígitos do autenticador.");return;}
        const verification=await supabase.auth.mfa.challengeAndVerify({factorId:selected,code});
        if(verification.error){setError(passwordUpdateErrorMessage(verification.error));return;}
        setCode("");setForceMfa(false);setMfa({required:false,factors:[]});
      }
      const {error:passwordError}=await supabase.auth.updateUser({password:first});
      if(passwordError){
        if(passwordError.code==="insufficient_aal"){
          // O servidor continua sendo a autoridade caso os fatores da sessao estejam desatualizados.
          setForceMfa(true);
          const refreshed=await recoveryMfa(supabase,true);
          setMfa(refreshed);setFactorId(selectedFactor(refreshed.factors,factorId));
          setError(refreshed.factors.length?passwordUpdateErrorMessage(passwordError):unavailableMfa);
        }else setError(passwordUpdateErrorMessage(passwordError));
        return;
      }
      setFinished(true);setFirst("");setSecond("");
      setCode("");
      await finishLogout();
    }catch(cause){setError(passwordUpdateErrorMessage(cause));}
    finally{setBusy(false);}
  }
  if(finished)return <div className="mt-6 space-y-4">
    <p role="status" className="text-sm font-semibold text-forest">Senha alterada. Entre novamente na Provisio.</p>
    {logoutError?<>
      <p role="alert" className="rounded-xl bg-blush p-3 text-sm text-forest">{logoutError}</p>
      <button type="button" disabled={busy} onClick={()=>void finishLogout()}
        className="min-h-12 w-full rounded-full bg-forest px-5 text-sm font-black text-white disabled:opacity-50">
        {busy?"Aguarde...":"Sair e entrar novamente"}
      </button>
    </>:null}
  </div>;
  return <form onSubmit={update} className="mt-6 space-y-4">
    <label htmlFor="reset-first" className="block text-sm font-extrabold text-forest">Nova senha</label>
    <input id="reset-first" type="password" autoComplete="new-password" required minLength={12} disabled={busy}
      value={first} onChange={e=>setFirst(e.target.value)}
      className="min-h-12 w-full rounded-xl border border-line px-4 outline-none focus:ring-2 focus:ring-forest"/>
    <label htmlFor="reset-repeat" className="block text-sm font-extrabold text-forest">Confirmar senha</label>
    <input id="reset-repeat" type="password" autoComplete="new-password" required minLength={12} disabled={busy}
      value={second} onChange={e=>setSecond(e.target.value)}
      className="min-h-12 w-full rounded-xl border border-line px-4 outline-none focus:ring-2 focus:ring-forest"/>
    {checkingMfa?<p role="status" className="text-sm text-muted">Verificando a proteção da sua conta...</p>:null}
    {mfa.required?mfa.factors.length?<fieldset disabled={busy} className="space-y-3 rounded-xl border border-line p-4">
      <legend className="px-1 text-sm font-extrabold text-forest">Verificação em duas etapas</legend>
      <p id="reset-mfa-help" className="text-sm text-muted">Use o código do aplicativo autenticador já cadastrado na sua conta para salvar a nova senha.</p>
      {mfa.factors.length>1?<>
        <label htmlFor="reset-mfa-factor" className="block text-sm font-extrabold text-forest">Autenticador</label>
        <select id="reset-mfa-factor" value={factorId} required
          onChange={event=>{setFactorId(event.target.value);setCode("");}}
          className="min-h-12 w-full rounded-xl border border-line bg-white px-4 outline-none focus:ring-2 focus:ring-forest">
          <option value="">Selecione o autenticador</option>
          {mfa.factors.map(factor=><option key={factor.id} value={factor.id}>{factor.name}</option>)}
        </select>
      </>:null}
      <label htmlFor="reset-mfa-code" className="block text-sm font-extrabold text-forest">Código do autenticador</label>
      <input id="reset-mfa-code" type="text" inputMode="numeric" autoComplete="one-time-code" aria-describedby="reset-mfa-help"
        minLength={6} maxLength={6} pattern="[0-9]{6}" required value={code}
        onChange={event=>setCode(event.target.value.replace(/\D/g,"").slice(0,6))}
        className="min-h-12 w-full rounded-xl border border-line bg-white px-4 text-lg tracking-[.2em] outline-none focus:ring-2 focus:ring-forest"/>
    </fieldset>:<p role="alert" className="rounded-xl bg-blush p-3 text-sm text-forest">{unavailableMfa}</p>:null}
    {error?<p role="alert" className="rounded-xl bg-blush p-3 text-sm text-forest">{error}</p>:null}
    <button type="submit" disabled={busy||checkingMfa} className="min-h-12 w-full rounded-full bg-forest px-5 text-sm font-black text-white disabled:opacity-50">
      {busy?"Aguarde...":"Salvar nova senha"}
    </button>
    <Link href="/entrar" className="block text-center text-sm text-forest underline">Voltar ao login</Link>
  </form>;
}
