"use client";

import { useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { SiteFooter } from "@/components/site-footer";
import { WRAP } from "@/lib/ui";

const LEGACY_STORAGE_KEYS = [
  "abp:list:v1",
  "abp:purchases:v1",
  "abp:builder:v1",
  "abp:prefs:v1",
] as const;

/** Historical browser data is NEVER uploaded, converted into products or used at checkout. */
export default function LegacyArchivePage() {
  const [message, setMessage] = useState("");

  const downloadBackup = () => {
    try {
      const entries: Record<string, string> = {};
      for (const key of LEGACY_STORAGE_KEYS) {
        const value = window.localStorage.getItem(key);
        if (value !== null) entries[key] = value;
      }
      if (Object.keys(entries).length === 0) {
        setMessage("Nenhum dado legado foi encontrado neste navegador.");
        return;
      }
      const backup = {
        format: "provisio-legacy-browser-backup",
        exportedAt: new Date().toISOString(),
        note: "Arquivo local de historico; nenhum item pode virar oferta vendavel automaticamente.",
        entries,
      };
      const objectUrl = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = "provisio-historico-legado.json";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
      setMessage("Arquivo de backup gerado no dispositivo. Nenhum dado foi enviado ao servidor.");
    } catch {
      setMessage("Nao foi possivel acessar o armazenamento do navegador. Verifique as permissoes deste dispositivo.");
    }
  };

  return (
    <div className="min-h-dvh bg-canvas">
      <AppHeader theme="forest" title="Histórico do comparador" backHref="/produtos" showListButton={false} />
      <main className={`${WRAP} animate-page-in py-8 sm:py-12`}>
        <section className="max-w-3xl rounded-[2rem] bg-paper p-7 shadow-card ring-1 ring-line/70 sm:p-10">
          <p className="text-xs font-extrabold uppercase tracking-wide text-terra">Migração controlada</p>
          <h1 className="mt-3 text-3xl font-black text-forest-deep">Preserve os dados antigos do navegador</h1>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            O antigo comparador de preços externos foi desativado neste projeto em desenvolvimento.
            Listas, preferências e compras salvas continuam no armazenamento local deste dispositivo.
            Você pode baixar uma cópia antes de limpar o navegador.
          </p>
          <p className="mt-3 text-sm font-semibold text-muted">
            Este arquivo pode conter dados pessoais e de compras: guarde-o em local seguro.
            O backup não importa preços, produtos ou fornecedores externos para o marketplace.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" onClick={downloadBackup} className="min-h-11 rounded-full bg-forest px-6 py-3 text-sm font-extrabold text-white hover:bg-forest-deep focus-visible:ring-4 focus-visible:ring-lime/50">
              Exportar histórico deste navegador (JSON)
            </button>
            <Link href="/produtos" className="inline-flex min-h-11 items-center rounded-full bg-lime px-5 py-3 text-sm font-extrabold text-forest-deep">
              Ir para catálogo autorizado
            </Link>
          </div>
          {message && <p className="mt-4 text-sm font-semibold text-forest" role="status" aria-live="polite">{message}</p>}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
