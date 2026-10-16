"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Method = "senha" | "link";

export function MarketplaceLoginForm() {
  const router = useRouter();
  const [method, setMethod] = useState<Method>("senha");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const address = email.trim().toLowerCase();
      const supabase = createClient();
      if (method === "senha") {
        const result = await supabase.auth.signInWithPassword({ email: address, password });
        if (result.error) throw new Error("Não foi possível entrar. Confira os dados e tente novamente.");
        setPassword("");
        router.replace("/app");
        router.refresh();
      } else {
        // Nunca cadastrar contas a partir da tela de login pública.
        // Magic link funciona com o template padrão (um OTP numérico não é garantido).
        const result = await supabase.auth.signInWithOtp({
          email: address,
          options: {
            shouldCreateUser: false,
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (result.error) throw new Error("Não foi possível enviar o acesso. Tente novamente em instantes.");
        setNotice("Se este e-mail tiver uma conta habilitada, receberá um link de acesso.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível concluir o login.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="mt-7">
    <div className="grid grid-cols-2 gap-2 rounded-2xl bg-canvas p-1" role="group" aria-label="Forma de autenticação">
      {(["senha", "link"] as const).map(item =>
        <button key={item} type="button"
          aria-pressed={method === item}
          className={`min-h-11 rounded-xl text-sm font-extrabold transition-colors ${method === item ? "bg-forest text-white" : "text-forest"}`}
          onClick={() => { setMethod(item); setError(""); setNotice(""); }}>
          {item === "senha" ? "E-mail e senha" : "Link por e-mail"}
        </button>
      )}
    </div>
    <form onSubmit={submit} className="mt-5 space-y-4">
      <div>
        <label htmlFor="provisio-email" className="mb-1.5 block text-sm font-extrabold text-forest">E-mail empresarial</label>
        <input id="provisio-email" type="email" autoComplete="email" maxLength={254}
          value={email} required onChange={e => setEmail(e.target.value)}
          className="min-h-12 w-full rounded-xl border border-line bg-white px-4 text-sm text-forest outline-none focus-visible:ring-2 focus-visible:ring-forest"/>
      </div>
      {method === "senha" ? <div>
        <label htmlFor="provisio-password" className="mb-1.5 block text-sm font-extrabold text-forest">Senha</label>
        <input id="provisio-password" type="password" autoComplete="current-password"
          minLength={6} required value={password} onChange={e => setPassword(e.target.value)}
          className="min-h-12 w-full rounded-xl border border-line bg-white px-4 text-sm text-forest outline-none focus-visible:ring-2 focus-visible:ring-forest"/>
      </div> : <p className="text-sm text-muted">Enviaremos um link de acesso ao e-mail da sua conta já cadastrada.</p>}
      {notice ? <p role="status" className="rounded-xl bg-lime-soft px-4 py-3 text-sm text-forest">{notice}</p> : null}
      {error ? <p role="alert" className="rounded-xl bg-blush px-4 py-3 text-sm font-semibold text-[#8f2443]">{error}</p> : null}
      <button type="submit" disabled={busy}
        className="flex min-h-12 w-full items-center justify-center rounded-full bg-forest px-6 text-sm font-black text-white disabled:opacity-60">
        {busy ? "Aguarde..." : method === "senha" ? "Entrar com segurança" : "Enviar link"}
      </button>
    </form>
    <Link href="/recuperar-acesso" className="mt-5 block text-center text-sm font-bold text-forest underline">
      Esqueci minha senha
    </Link>
  </div>;
}
