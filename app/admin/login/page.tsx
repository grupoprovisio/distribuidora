"use client";

import Link from "next/link";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { useState } from "react";
import { AppHeader } from "@/components/app-header";
import { SiteFooter } from "@/components/site-footer";
import { WRAP } from "@/lib/ui";

export default function AdminLoginPage() {
  const [error, setError] = useState("");
  return <div className="min-h-dvh bg-canvas"><AppHeader theme="wine" title="Acesso administrativo" backHref="/" /><main className={`${WRAP} grid min-h-[calc(100dvh-7rem)] place-items-center py-10`}><form onSubmit={(event) => { event.preventDefault(); setError("A autenticação será conectada ao servidor quando o acesso administrativo estiver configurado."); }} className="w-full max-w-md rounded-[2rem] bg-paper p-6 shadow-card ring-1 ring-line/70 sm:p-8"><span className="grid size-12 place-items-center rounded-2xl bg-blush text-wine"><LockKeyhole size={22} aria-hidden /></span><p className="mt-6 text-xs font-black uppercase tracking-[0.14em] text-wine">Área restrita</p><h1 className="mt-2 text-3xl font-black tracking-tight text-forest-deep">Entrar no painel</h1><p className="mt-3 text-sm font-medium leading-relaxed text-muted">Acesso para equipes comercial, estoque e logística.</p><label className="mt-7 block text-sm font-extrabold">E-mail<input required type="email" className="mt-1 h-12 w-full rounded-2xl border border-line bg-canvas px-4 text-sm font-semibold outline-none focus:border-wine" placeholder="equipe@empresa.com" /></label><label className="mt-4 block text-sm font-extrabold">Senha<input required type="password" className="mt-1 h-12 w-full rounded-2xl border border-line bg-canvas px-4 text-sm font-semibold outline-none focus:border-wine" placeholder="Sua senha" /></label>{error ? <p role="alert" className="mt-4 rounded-2xl bg-sand px-4 py-3 text-xs font-bold text-[#5c3a06]">{error}</p> : null}<button type="submit" className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-wine px-5 text-sm font-extrabold text-white active:scale-95">Entrar no painel <ArrowRight size={16} aria-hidden /></button><Link href="/contato" className="mt-4 block text-center text-xs font-extrabold text-forest hover:underline">Precisa de acesso? Fale com a equipe</Link></form></main><SiteFooter /></div>;
}
