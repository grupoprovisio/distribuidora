"use client";

import Link from "next/link";
import { useState } from "react";
import { Barcode, Check, ChevronLeft, Copy, ExternalLink, QrCode, Receipt, ScanLine, Search, Type } from "lucide-react";
import { ProductLookup } from "@/components/product-lookup";
import { ReceiptView } from "@/components/receipt-view";
import { primaryButton } from "@/components/section";
import type { Scan } from "@/lib/scan";

const ICON = { qr: QrCode, barcode: Barcode, text: Type, receipt: Receipt } as const;

/** Só códigos numéricos de 6 a 14 dígitos (EAN/UPC) viram busca de produto. */
const isProductCode = (s: Scan) => s.kind === "barcode" && /^\d{6,14}$/.test(s.text);

/** Painel inferior mostrado assim que algo é reconhecido. Código de barras -> busca o produto e mostra o card. */
export function ScanResult({ scan, onAgain }: { scan: Scan; onAgain: () => void }) {
  const [copied, setCopied] = useState(false);
  // Pilha de produtos vistos: o lido primeiro; "ver o mais barato" empilha o semelhante escolhido.
  const [stack, setStack] = useState<string[]>([scan.text]);
  const current = stack[stack.length - 1];
  const Icon = ICON[scan.kind];
  const lookup = isProductCode(scan);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(scan.text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard indisponível (contexto inseguro ou permissão negada): o texto continua selecionável na tela
    }
  };

  return (
    <section
      role="dialog"
      aria-label="Código reconhecido"
      className="animate-sheet-in absolute inset-x-0 bottom-0 z-20 mx-auto flex max-h-[92dvh] max-w-xl flex-col rounded-t-[2rem] bg-paper text-ink shadow-float"
    >
      <div aria-hidden className="mx-auto mb-1 mt-3 h-1.5 w-10 shrink-0 rounded-full bg-line" />

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-3 pt-2">
        <div className="flex items-center gap-2">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-lime-soft text-forest">
            <Icon size={18} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Reconhecido</p>
            <p className="text-sm font-extrabold">{scan.label}</p>
          </div>
        </div>

        {scan.kind === "receipt" ? (
          <div className="mt-3">
            <ReceiptView url={scan.text} />
          </div>
        ) : lookup ? (
          <div className="mt-3">
            {stack.length > 1 ? (
              <button
                type="button"
                onClick={() => setStack((s) => s.slice(0, -1))}
                className="mb-3 inline-flex items-center gap-1 rounded-full bg-canvas py-1.5 pl-2 pr-3.5 text-xs font-extrabold ring-1 ring-line active:scale-95"
              >
                <ChevronLeft size={15} aria-hidden /> Voltar ao produto lido
              </button>
            ) : null}
            <ProductLookup key={current} ean={current} onOpen={(item) => setStack((s) => [...s, item.ean])} />
          </div>
        ) : (
          <>
            <p
              aria-live="polite"
              className="mt-3 max-h-40 overflow-auto break-all rounded-2xl bg-canvas px-4 py-3 font-mono text-base font-bold select-all"
            >
              {scan.text}
            </p>
            <div className="mt-3 grid gap-2">
              {scan.kind !== "qr" || !scan.url ? (
                <Link href={`/buscar?q=${encodeURIComponent(scan.text)}`} className={`${primaryButton} h-12`}>
                  <Search size={16} aria-hidden /> Buscar “{scan.text.length > 18 ? scan.text.slice(0, 18) + "…" : scan.text}”
                </Link>
              ) : null}
              {scan.url ? (
                <a
                  href={scan.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={
                    scan.kind === "qr"
                      ? `${primaryButton} h-12`
                      : "inline-flex h-12 items-center justify-center gap-2 rounded-full bg-canvas px-4 text-sm font-extrabold ring-1 ring-line"
                  }
                >
                  Abrir link <ExternalLink size={15} aria-hidden />
                </a>
              ) : null}
            </div>
          </>
        )}
      </div>

      <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-line px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3">
        <button
          type="button"
          onClick={copy}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-canvas px-4 text-sm font-extrabold ring-1 ring-line transition-transform active:scale-95"
        >
          {copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
          {copied ? "Copiado" : "Copiar código"}
        </button>
        <button
          type="button"
          onClick={onAgain}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-forest px-4 text-sm font-extrabold text-white transition-transform active:scale-95"
        >
          <ScanLine size={16} aria-hidden /> Escanear outro
        </button>
      </div>
    </section>
  );
}
