"use client";

import { Check, Send } from "lucide-react";
import { useState } from "react";
import { track } from "@/lib/analytics";

const input = "mt-1 h-12 w-full rounded-2xl border border-line bg-canvas px-4 text-sm font-semibold text-ink outline-none transition-colors focus:border-forest focus:bg-paper";

export function BusinessRegistrationForm() {
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <div className="rounded-3xl bg-lime-soft p-6 text-forest" role="status">
        <span className="grid size-11 place-items-center rounded-2xl bg-paper"><Check size={22} aria-hidden /></span>
        <h3 className="mt-5 text-xl font-black">Cadastro recebido.</h3>
        <p className="mt-2 text-sm font-medium leading-relaxed">A equipe comercial vai analisar seu perfil, região e volume de compra para apresentar as condições mais adequadas.</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        track("sign_up", { method: "business_registration" });
        setSent(true);
      }}
      className="rounded-[2rem] bg-paper p-6 shadow-card ring-1 ring-line/70 sm:p-8"
    >
      <div>
        <p className="text-xs font-black uppercase tracking-[0.14em] text-forest">Cadastro empresarial</p>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-forest-deep">Conte sobre sua operação.</h2>
        <p className="mt-2 text-sm font-medium leading-relaxed text-muted">Esses dados ajudam a equipe a preparar uma condição comercial adequada ao seu negócio.</p>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-extrabold">Tipo de cliente<select className={input} defaultValue="pj"><option value="pj">Pessoa jurídica</option><option value="pf">Pessoa física</option></select></label>
        <label className="text-sm font-extrabold">Segmento<select className={input} defaultValue="restaurant"><option value="restaurant">Restaurante ou bar</option><option value="market">Mercado ou varejo</option><option value="hotel">Hotelaria</option><option value="office">Escritório ou condomínio</option><option value="reseller">Revendedor</option><option value="other">Outro negócio</option></select></label>
        <label className="text-sm font-extrabold">CNPJ ou CPF<input required className={input} placeholder="00.000.000/0000-00" /></label>
        <label className="text-sm font-extrabold">Nome da empresa<input required className={input} placeholder="Razão social ou nome" /></label>
        <label className="text-sm font-extrabold">Responsável pela compra<input required className={input} placeholder="Nome completo" /></label>
        <label className="text-sm font-extrabold">WhatsApp ou e-mail<input required className={input} placeholder="Seu melhor contato" /></label>
        <label className="text-sm font-extrabold">Cidade e estado<input required className={input} placeholder="Cidade - UF" /></label>
        <label className="text-sm font-extrabold">Volume médio mensal<select className={input} defaultValue="small"><option value="small">Até R$ 5 mil</option><option value="medium">R$ 5 mil a R$ 20 mil</option><option value="large">Acima de R$ 20 mil</option><option value="unknown">Ainda não sei</option></select></label>
        <label className="text-sm font-extrabold sm:col-span-2">Categorias de interesse<textarea className={`${input} h-24 resize-none py-3`} placeholder="Ex.: bebidas, mercearia, limpeza, descartáveis..." /></label>
      </div>
      <button type="submit" className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-forest px-6 text-sm font-extrabold text-white transition-transform active:scale-95"><Send size={16} aria-hidden /> Solicitar análise comercial</button>
    </form>
  );
}
