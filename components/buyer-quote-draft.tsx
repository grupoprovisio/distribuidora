"use client";

import { useState, type FormEvent } from "react";
import { ArrowLeft, CheckCheck, ClipboardCopy, FileText, Mail, Pencil, ShieldCheck } from "lucide-react";
import Link from "next/link";

type QuoteDraft = {
  product: string;
  quantity: string;
  unit: string;
  region: string;
  deadline: string;
  notes: string;
};

const INITIAL: QuoteDraft = {
  product: "",
  quantity: "1",
  unit: "caixa",
  region: "",
  deadline: "",
  notes: "",
};

function formatDraft(draft: QuoteDraft): string {
  return [
    "SOLICITAÇÃO DE COTAÇÃO - GRUPO PROVISIO",
    "",
    "Produto ou categoria: " + draft.product,
    "Quantidade: " + draft.quantity + " " + draft.unit,
    "UF de entrega: " + draft.region.toUpperCase(),
    "Data desejada: " + (draft.deadline ? draft.deadline.split("-").reverse().join("/") : "A combinar"),
    "",
    "Observações:",
    draft.notes || "Sem observações adicionais.",
    "",
    "Rascunho preparado pelo comprador. Não representa pedido, cotação enviada ou reserva.",
  ].join("\n");
}

/** Interface de preparação apenas local, sem API, banco ou persistência de dados pessoais. */
export function BuyerQuoteDraft() {
  const [fields, setFields] = useState<QuoteDraft>(INITIAL);
  const [prepared, setPrepared] = useState<QuoteDraft | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  const update = (name: keyof QuoteDraft, value: string) => {
    setFields((prev) => ({ ...prev, [name]: value }));
    setCopyState("idle");
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const product = fields.product.trim();
    const region = fields.region.trim().toUpperCase();
    if (!product || !/^[A-Z]{2}$/.test(region) || Number(fields.quantity) <= 0) return;
    setPrepared({ ...fields, product, region, notes: fields.notes.trim() });
    setCopyState("idle");
  };

  const message = prepared ? formatDraft(prepared) : "";
  const mailto = prepared
    ? "mailto:contato@grupoprovisio.com?subject=" +
      encodeURIComponent("Solicitação de cotação B2B - Grupo Provisio") +
      "&body=" + encodeURIComponent(message)
    : "";

  const copyDraft = async () => {
    if (!message) return;
    try {
      await navigator.clipboard.writeText(message);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  };

  const fieldClass = "mt-2 min-h-12 w-full rounded-2xl border border-line bg-canvas px-4 text-base text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest";
  const labelClass = "block text-sm font-extrabold text-forest-deep";

  return <section aria-labelledby="draft-heading" className="rounded-[2rem] border border-line bg-paper p-5 shadow-card sm:p-8">
    <div className="flex items-start gap-3">
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-lime-soft text-forest"><FileText size={20} aria-hidden /></span>
      <div>
        <h2 id="draft-heading" className="text-xl font-black text-forest-deep sm:text-2xl">Prepare sua solicitação</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">Organize os itens antes de conversar com a equipe comercial. Nenhum dado será enviado ou salvo no marketplace.</p>
      </div>
    </div>
    {!prepared ? (
      <form onSubmit={onSubmit} className="mt-7 grid gap-5 sm:grid-cols-2">
        <label className={labelClass+" sm:col-span-2"}>Produto ou categoria <span aria-hidden="true">*</span>
          <input required maxLength={120} name="product" autoComplete="off" value={fields.product} onChange={(e) => update("product", e.target.value)} placeholder="Ex.: arroz branco, 5 kg" className={fieldClass} />
        </label>
        <label className={labelClass}>Quantidade <span aria-hidden="true">*</span>
          <input required name="quantity" type="number" inputMode="decimal" min="0.01" step="any" value={fields.quantity} onChange={(e) => update("quantity", e.target.value)} className={fieldClass} />
        </label>
        <label className={labelClass}>Unidade <span aria-hidden="true">*</span>
          <select required name="unit" value={fields.unit} onChange={(e) => update("unit", e.target.value)} className={fieldClass}>
            <option value="caixa">Caixa(s)</option><option value="pacote">Pacote(s)</option><option value="unidade">Unidade(s)</option>
            <option value="kg">Quilograma(s)</option><option value="litro">Litro(s)</option><option value="fardo">Fardo(s)</option>
          </select>
        </label>
        <label className={labelClass}>UF de entrega <span aria-hidden="true">*</span>
          <input required name="region" autoComplete="address-level1" maxLength={2} minLength={2} pattern="[A-Za-z]{2}" value={fields.region} onChange={(e) => update("region", e.target.value.toUpperCase())} placeholder="Ex.: SP" className={fieldClass+" uppercase"} />
        </label>
        <label className={labelClass}>Data desejada (opcional)
          <input name="deadline" type="date" value={fields.deadline} onChange={(e) => update("deadline", e.target.value)} className={fieldClass} />
        </label>
        <label className={labelClass+" sm:col-span-2"}>Observações (opcional)
          <textarea name="notes" maxLength={800} rows={4} value={fields.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Marcas, embalagem, frequência de compra ou outras necessidades." className={fieldClass+" py-3"} />
        </label>
        <div className="sm:col-span-2">
          <button type="submit" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-forest px-6 text-sm font-extrabold text-white hover:bg-forest-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest">
            <FileText size={18} aria-hidden /> Preparar rascunho
          </button>
        </div>
      </form>
    ) : <div className="mt-7">
      <div role="status" className="flex items-start gap-3 rounded-2xl bg-lime-soft p-4 text-forest">
        <ShieldCheck size={20} className="shrink-0" aria-hidden />
        <div><p className="font-black">Rascunho pronto para revisão</p><p className="mt-1 text-sm">Não foi criado pedido ou cotação real. Para solicitar atendimento, confira e envie o e-mail manualmente.</p></div>
      </div>
      <pre className="mt-5 overflow-x-auto whitespace-pre-wrap break-words rounded-2xl border border-line bg-canvas p-5 font-sans text-sm leading-relaxed text-ink">{message}</pre>
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" onClick={copyDraft} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-forest px-5 text-sm font-extrabold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest">
          {copyState==="copied"?<CheckCheck size={17} aria-hidden/>:<ClipboardCopy size={17} aria-hidden/>}
          {copyState==="copied"?"Copiado":"Copiar rascunho"}
        </button>
        <a href={mailto} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-lime-soft px-5 text-sm font-extrabold text-forest hover:bg-lime">
          <Mail size={17} aria-hidden /> Abrir e-mail para envio
        </a>
        <button type="button" onClick={() => { setPrepared(null); setCopyState("idle"); }} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-5 text-sm font-extrabold text-forest">
          <Pencil size={17} aria-hidden /> Editar
        </button>
      </div>
      {copyState==="failed"&&<p role="alert" className="mt-3 text-sm font-bold text-wine">Não foi possível copiar automaticamente. Selecione o texto do rascunho acima.</p>}
      {copyState==="copied"&&<p role="status" className="mt-3 text-sm font-bold text-forest">Texto copiado. Nenhum e-mail foi enviado.</p>}
    </div>}
    <p className="mt-7 flex items-start gap-2 border-t border-line pt-5 text-xs leading-relaxed text-muted">
      <ShieldCheck size={16} className="shrink-0" aria-hidden />
      A UF informada aqui não concede acesso a ofertas. Cotações oficiais, preços, pedidos e pagamentos continuam indisponíveis até homologação.
    </p>
    <Link href="/app/comprador" className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-extrabold text-forest hover:underline">
      <ArrowLeft size={16} aria-hidden /> Voltar ao portal
    </Link>
  </section>;
}
