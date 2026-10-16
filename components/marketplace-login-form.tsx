"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Method = "senha" | "codigo";
export function MarketplaceLoginForm() {
  const router = useRouter();
  const [method,setMethod] = useState<Method>("senha");
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [token,setToken] = useState("");
  const [sent,setSent] = useState(false);
  const [busy,setBusy] = useState(false);
  const [notice,setNotice] = useState("");
  const [error,setError] = useState("");

  const login = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);setError("");setNotice("");
    try {
      const supabase = createClient();
      if (method === "senha") {
        const result = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(), password,
        });
        if (result.error) throw new Error("Não foi possível entrar. Confira as credenciais e tente novamente.");
      } else if (!sent) {
        // Bloqueia cadastro publico: somente contas criadas/invitadas podem entrar.
        const result = await supabase.auth.signInWithOtp({
          email: email.trim().toLowerCase(),
          options: { shouldCreateUser: false },
        });
        if (result.error) throw new Error("Não foi possível enviar o código. Tente mais tarde.");
        setSent(true);
        setNotice("Se houver uma conta habilitada para este e-mail, enviaremos as instruções de acesso.");
        return;
      } else {
        const result = await supabase.auth.verifyOtp({
          email: email.trim().toLowerCase(),
          token: token.trim(), type: "email",
        });
        if (result.error) throw new Error("Código inválido ou expirado. Solicite um novo acesso.");
      }
      router.replace("/app");
      router.refresh();
    } catch(e) {
      setError(e instanceof Error ? e.message : "Não foi possível completar a autenticação.");
    } finally { setBusy(false); }
  };
  return (
    <div className="mt-7">
      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-canvas p-1" role="group" aria-label="Forma de autenticação">
        {(["senha","codigo"] as const).map(item => <button key={item} type="button"
          className={`min-h-11 rounded-xl text-sm font-extrabold transition-colors ${method===item?"bg-forest text-white":"text-forest"}`}
          onClick={()=>{setMethod(item);setSent(false);setNotice("");setError("");setToken("");}}
        >{item==="senha"?"E-mail e senha":"Código por e-mail"}</button>)}
      </div>
      <form onSubmit={login} className="mt-5 space-y-4">
        <div>
          <label htmlFor="provisio-email" className="mb-1.5 block text-sm font-extrabold text-forest">E-mail</label>
          <input id="provisio-email" autoComplete="email" type="email" required maxLength={254}
            value={email} onChange={e=>{setEmail(e.target.value);if(sent)setSent(false);}}
            placeholder="voce@suaempresa.com.br"
            className="min-h-12 w-full rounded-xl border border-line bg-white px-4 text-sm text-forest outline-none focus-visible:ring-2 focus-visible:ring-forest"/>
        </div>
        {method==="senha" ? <div>
          <label htmlFor="provisio-password" className="mb-1.5 block text-sm font-extrabold text-forest">Senha</label>
          <input id="provisio-password" autoComplete="current-password" type="password" required minLength={6}
            value={password} onChange={e=>setPassword(e.target.value)}
            className="min-h-12 w-full rounded-xl border border-line bg-white px-4 text-sm text-forest outline-none focus-visible:ring-2 focus-visible:ring-forest"/>
        </div> : sent ? <div>
          <label htmlFor="provisio-token" className="mb-1.5 block text-sm font-extrabold text-forest">Código recebido</label>
          <input id="provisio-token" autoComplete="one-time-code" inputMode="numeric" type="text"
            required maxLength={10} value={token} onChange={e=>setToken(e.target.value)}
            className="min-h-12 w-full rounded-xl border border-line bg-white px-4 text-sm text-forest outline-none focus-visible:ring-2 focus-visible:ring-forest"/>
        </div> : null}
        {notice ? <p role="status" className="rounded-xl bg-lime-soft px-4 py-3 text-sm text-forest">{notice}</p> : null}
        {error ? <p role="alert" className="rounded-xl bg-blush px-4 py-3 text-sm font-semibold text-[#8f2443]">{error}</p> : null}
        <button type="submit" disabled={busy}
          className="flex min-h-12 w-full items-center justify-center rounded-full bg-forest px-6 text-sm font-black text-white transition-colors hover:bg-forest-deep disabled:opacity-60">
          {busy ? "Aguarde..." : method==="senha" ? "Entrar com segurança" : sent ? "Confirmar código" : "Enviar código"}
        </button>
        {method==="codigo" && sent ? <button type="button" onClick={()=>{setSent(false);setToken("");setNotice("");}} className="w-full text-sm font-bold text-forest underline">Solicitar outro código</button> : null}
      </form>
    </div>
  );
}
