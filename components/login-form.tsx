"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, KeyRound, Loader2, Mail, ShieldCheck } from "lucide-react";

type Step = "email" | "code";
type ApiResult = { ok?: boolean; error?: string; restart?: boolean };

async function post(url: string, body: unknown): Promise<ApiResult & { status: number }> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as ApiResult;
  return { ...json, status: res.status };
}

const input =
  "h-12 w-full rounded-full bg-canvas px-5 text-base font-bold outline-none ring-1 ring-line transition-shadow placeholder:font-medium placeholder:text-muted focus:ring-2 focus:ring-forest";
const button =
  "inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-lime px-6 text-sm font-extrabold text-forest-deep transition-transform active:scale-[0.97] disabled:opacity-60";

/** Login do Atacadão em dois passos: e-mail -> código recebido por e-mail. Sem senha. */
export function LoginForm({ notice }: { notice?: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(id);
  }, [cooldown]);

  const sendCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await post("/api/auth/send", { email });
      if (r.ok) {
        setStep("code");
        setCode("");
        setCooldown(30);
      } else {
        setError(r.error ?? "Não foi possível enviar o código.");
      }
    } catch {
      setError("Sem conexão. Verifique sua internet e tente de novo.");
    } finally {
      setBusy(false);
    }
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await post("/api/auth/verify", { code });
      if (r.ok) {
        router.refresh(); // a página de Conta relê a sessão no servidor
        return;
      }
      setError(r.error ?? "Não foi possível validar o código.");
      if (r.restart) setStep("email");
    } catch {
      setError("Sem conexão. Verifique sua internet e tente de novo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-[2rem] bg-paper p-5 shadow-card ring-1 ring-line/70 sm:p-6" aria-label="Entrar">
      <div className="flex items-center gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-lime-soft text-forest">
          {step === "email" ? <Mail size={22} aria-hidden /> : <KeyRound size={22} aria-hidden />}
        </span>
        <div>
          <h2 className="text-lg font-extrabold tracking-tight">Entrar com sua conta do Atacadão</h2>
          <p className="text-xs font-medium text-muted">
            {step === "email" ? "Enviaremos um código para o seu e-mail." : `Código enviado para ${email}`}
          </p>
        </div>
      </div>

      {notice ? <p className="mt-4 rounded-2xl bg-sand px-4 py-2.5 text-xs font-bold text-[#5c3a06]">{notice}</p> : null}

      {step === "email" ? (
        <form onSubmit={sendCode} className="mt-5 space-y-3">
          <label className="block">
            <span className="sr-only">E-mail</span>
            <input
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className={input}
            />
          </label>
          <button type="submit" disabled={busy || !email} className={button}>
            {busy ? <Loader2 size={18} className="animate-spin" aria-hidden /> : null}
            Enviar código
          </button>
        </form>
      ) : (
        <form onSubmit={verify} className="mt-5 space-y-3">
          <label className="block">
            <span className="sr-only">Código de acesso</span>
            <input
              autoFocus
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9 ]*"
              maxLength={9}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="000000"
              className={`${input} text-center font-mono text-2xl tracking-[0.4em]`}
            />
          </label>
          <button type="submit" disabled={busy || code.replace(/\s/g, "").length < 4} className={button}>
            {busy ? <Loader2 size={18} className="animate-spin" aria-hidden /> : null}
            Entrar
          </button>
          <div className="flex items-center justify-between text-xs font-bold text-muted">
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setError(null);
              }}
              className="inline-flex items-center gap-1 hover:text-ink"
            >
              <ArrowLeft size={13} aria-hidden /> Trocar e-mail
            </button>
            <button
              type="button"
              disabled={cooldown > 0 || busy}
              onClick={() => void sendCode()}
              className="hover:text-ink disabled:opacity-50"
            >
              {cooldown > 0 ? `Reenviar em ${cooldown}s` : "Reenviar código"}
            </button>
          </div>
        </form>
      )}

      {error ? (
        <p role="alert" className="mt-3 rounded-2xl bg-blush px-4 py-2.5 text-xs font-bold text-[#a02a4a]">
          {error}
        </p>
      ) : null}

      <p className="mt-4 flex items-start gap-2 text-[11px] font-medium leading-snug text-muted">
        <ShieldCheck size={14} className="mt-px shrink-0 text-forest" aria-hidden />
        Sua senha não passa pelo app. A sessão fica num cookie protegido deste navegador e você pode sair quando quiser.
      </p>
    </section>
  );
}
