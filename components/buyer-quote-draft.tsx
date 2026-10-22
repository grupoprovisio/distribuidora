"use client";

import { useState, type FormEvent } from "react";
import { ArrowLeft, CheckCheck, ClipboardCopy, FileText, Mail, Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
import Link from "next/link";
import { UF_CODES } from "@/lib/marketplace/brazil-regions";

type QuoteItem = { product: string; quantity: string; unit: string };
type QuoteDraft = {
  items: QuoteItem[];
  region: string;
  deadline: string;
  notes: string;
};

const MAX_ITEMS = 8;
const makeItem = (): QuoteItem => ({ product: "", quantity: "1", unit: "caixa" });
const INITIAL: QuoteDraft = { items: [makeItem()], region: "", deadline: "", notes: "" };
const UNIT_OPTIONS = [
  ["caixa", "Caixa(s)"], ["pacote", "Pacote(s)"], ["unidade", "Unidade(s)"],
  ["kg", "Quilograma(s)"], ["litro", "Litro(s)"], ["fardo", "Fardo(s)"],
] as const;

function formatDraft(draft: QuoteDraft): string {
  return [
    "SOLICITAÇÃO DE COTAÇÃO - GRUPO PROVISIO",
    "",
    "Itens solicitados:",
    ...draft.items.map((item, index) => String(index + 1) + ". " + item.product + " — " + item.quantity + " " + item.unit),
    "",
    "UF de entrega: " + draft.region,
    "Data desejada: " + (draft.deadline ? draft.deadline.split("-").reverse().join("/") : "A combinar"),
    "",
    "Observações:",
    draft.notes || "Sem observações adicionais.",
    "",
    "Rascunho preparado pelo comprador. Não representa pedido, cotação enviada ou reserva.",
  ].join("\n");
}

/** Preparação local; sem envio, armazenamento, reserva ou concessão de direitos comerciais. */
export function BuyerQuoteDraft() {
  const [fields, setFields] = useState<QuoteDraft>(INITIAL);
  const [prepared, setPrepared] = useState<QuoteDraft | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  const update = (name: "region" | "deadline" | "notes", value: string) => {
    setFields((previous) => ({ ...previous, [name]: value }));
    setCopyState("idle");
  };

  const updateItem = (index: number, key: keyof QuoteItem, value: string) => {
    setFields((previous) => ({
      ...previous,
      items: previous.items.map((item, current) => current === index ? { ...item, [key]: value } : item),
    }));
    setCopyState("idle");
  };

  const addItem = () => setFields((previous) => previous.items.length >= MAX_ITEMS
    ? previous
    : { ...previous, items: [...previous.items, makeItem()] });

  const removeItem = (index: number) => setFields((previous) => previous.items.length <= 1
    ? previous
    : { ...previous, items: previous.items.filter((_, current) => current !== index) });

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    const region = fields.region.trim().toUpperCase();
    const items = fields.items.map((item) => ({ ...item, product: item.product.trim() }));
    if (!UF_CODES.some((code) => code === region) ||
      items.length < 1 || items.length > MAX_ITEMS ||
      items.some((item) => !item.product || !Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0)) return;
    setPrepared({ ...fields, items, region, notes: fields.notes.trim() });
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

  const fieldClass = "mt-2 min-h-12 w-full min-w-0 rounded-2xl border border-line bg-canvas px-4 text-base text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest";
  const labelClass = "block text-sm font-extrabold text-forest-deep";

  return <section aria-labelledby="draft-heading" className="rounded-[2rem] border border-line bg-paper p-5 shadow-card sm:p-8">
    <div className="flex items-start gap-3">
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-lime-soft text-forest"><FileText size={20} aria-hidden /></span>
      <div>
        <h2 id="draft-heading" className="text-xl font-black text-forest-deep sm:text-2xl">Prepare sua solicitação</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">Inclua até oito itens antes de conversar com a equipe comercial. Nenhum dado será enviado ou salvo no marketplace.</p>
      </div>
    </div>
    {!prepared ? (
      <form onSubmit={onSubmit} className="mt-7 grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <h3 className="text-base font-black text-forest-deep">Produtos e quantidades</h3>
          <p className="mt-1 text-sm text-muted">Especifique cada produto separadamente para facilitar a análise da solicitação.</p>
          <div className="mt-4 space-y-4">
            {fields.items.map((item, index) => (
              <fieldset key={index} className="rounded-2xl border border-line bg-canvas/50 p-4">
                <legend className="px-2 text-sm font-black text-forest-deep">Item {index + 1}</legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className={labelClass + " sm:col-span-2"}>Produto ou categoria <span aria-hidden="true">*</span>
                    <input required maxLength={120} autoComplete="off" value={item.product} onChange={(event) => updateItem(index, "product", event.target.value)} placeholder="Ex.: arroz branco, 5 kg" className={fieldClass} />
                  </label>
                  <label className={labelClass}>Quantidade <span aria-hidden="true">*</span>
                    <input required type="number" inputMode="decimal" min="0.01" step="any" value={item.quantity} onChange={(event) => updateItem(index, "quantity", event.target.value)} className={fieldClass} />
                  </label>
                  <label className={labelClass}>Unidade <span aria-hidden="true">*</span>
                    <select required value={item.unit} onChange={(event) => updateItem(index, "unit", event.target.value)} className={fieldClass}>
                      {UNIT_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </label>
                </div>
                {fields.items.length > 1 && <button type="button" onClick={() => removeItem(index)} aria-label={"Remover item " + (index + 1)} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-xs font-extrabold text-wine hover:bg-sand focus-visible:outline-2 focus-visible:outline-wine">
                  <Trash2 size={16} aria-hidden /> Remover item
                </button>}
              </fieldset>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <button type="button" onClick={addItem} disabled={fields.items.length >= MAX_ITEMS} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-5 text-sm font-extrabold text-forest hover:bg-lime-soft focus-visible:outline-2 focus-visible:outline-forest disabled:cursor-not-allowed disabled:opacity-50">
              <Plus size={17} aria-hidden /> Adicionar produto
            </button>
            <span role="status" className="text-xs font-bold text-muted">{fields.items.length} de {MAX_ITEMS} itens</span>
          </div>
        </div>
        <label className={labelClass}>UF de entrega <span aria-hidden="true">*</span>
          <select required name="region" autoComplete="address-level1" value={fields.region} onChange={(event) => update("region", event.target.value)} className={fieldClass}>
            <option value="">Selecione a UF</option>
            {UF_CODES.map((code) => <option key={code} value={code}>{code}</option>)}
          </select>
        </label>
        <label className={labelClass}>Data desejada (opcional)
          <input name="deadline" type="date" value={fields.deadline} onChange={(event) => update("deadline", event.target.value)} className={fieldClass} />
        </label>
        <label className={labelClass + " sm:col-span-2"}>Observações (opcional)
          <textarea name="notes" maxLength={500} rows={4} value={fields.notes} onChange={(event) => update("notes", event.target.value)} placeholder="Marcas, embalagem, frequência de compra ou outras necessidades." className={fieldClass + " py-3"} />
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
          {copyState === "copied" ? <CheckCheck size={17} aria-hidden /> : <ClipboardCopy size={17} aria-hidden />}
          {copyState === "copied" ? "Copiado" : "Copiar rascunho"}
        </button>
        <a href={mailto} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-lime-soft px-5 text-sm font-extrabold text-forest hover:bg-lime focus-visible:outline-2 focus-visible:outline-forest">
          <Mail size={17} aria-hidden /> Abrir e-mail para envio
        </a>
        <button type="button" onClick={() => { setPrepared(null); setCopyState("idle"); }} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-5 text-sm font-extrabold text-forest focus-visible:outline-2 focus-visible:outline-forest">
          <Pencil size={17} aria-hidden /> Editar
        </button>
      </div>
      {copyState === "failed" && <p role="alert" className="mt-3 text-sm font-bold text-wine">Não foi possível copiar automaticamente. Selecione o texto do rascunho acima.</p>}
      {copyState === "copied" && <p role="status" className="mt-3 text-sm font-bold text-forest">Texto copiado. Nenhum e-mail foi enviado.</p>}
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
