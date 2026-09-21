"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { Receipt } from "@/lib/receipt-types";

// Compras salvas. Cada uma pertence a uma conta do Atacadão (o e-mail) e guarda o que foi planejado (itens, quantidades e os
// preços da filial na hora de salvar). Ao finalizar, recebe a NFC-e para comparar o previsto com o que foi pago.
// Ficam no navegador (localStorage), separadas por conta.

export type PlannedItem = {
  id: string;
  name: string;
  brand?: string;
  image?: string;
  dept?: string;
  qty: number;
  /** Preço por unidade previsto na quantidade da lista (null = a filial não tinha preço para prever). */
  unit: number | null;
};

export type PaidItem = {
  /** SKU do Atacadão quando o item da nota foi reconhecido no catálogo. */
  skuId?: string;
  name: string;
  /** Em unidades do catálogo, como na lista (itens por peso viram unidades de 150 g etc.). */
  qty: number;
  unit: number;
  total: number;
};

export type AttachedReceipt = {
  url: string;
  key: string;
  number: string;
  issuedAt: string;
  issuer: string;
  gross: number;
  discounts: number;
  paid: number;
  items: PaidItem[];
  attachedAt: string;
};

export type Purchase = {
  id: string;
  /** E-mail da conta do Atacadão dona da compra. */
  owner: string;
  name: string;
  savedAt: string;
  filial: { seller: string; name: string };
  items: PlannedItem[];
  receipt?: AttachedReceipt;
};

export type NewPurchase = Pick<Purchase, "owner" | "name" | "filial" | "items">;

const KEY = "abp:purchases:v1";
const MAX = 60;
const SELLER = /^atacadaobr\d{1,4}$/;

const str = (v: unknown, max = 200) => (typeof v === "string" ? v.slice(0, max) : undefined);
const money = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : undefined);

function cleanReceipt(raw: unknown): AttachedReceipt | undefined {
  const r = raw as Partial<AttachedReceipt> | null;
  if (!r || typeof r !== "object" || !Array.isArray(r.items)) return undefined;
  const items = r.items.flatMap((i): PaidItem[] => {
    const name = str(i?.name);
    const qty = money(i?.qty);
    const unit = money(i?.unit);
    const total = money(i?.total);
    return name && qty !== undefined && unit !== undefined && total !== undefined ? [{ skuId: str(i.skuId, 12), name, qty, unit, total }] : [];
  });
  const gross = money(r.gross);
  const paid = money(r.paid);
  if (items.length === 0 || gross === undefined || paid === undefined) return undefined;
  return {
    url: str(r.url, 600) ?? "",
    key: str(r.key, 44) ?? "",
    number: str(r.number, 20) ?? "",
    issuedAt: str(r.issuedAt, 30) ?? "",
    issuer: str(r.issuer, 120) ?? "",
    gross,
    discounts: money(r.discounts) ?? 0,
    paid,
    items,
    attachedAt: str(r.attachedAt, 30) ?? "",
  };
}

function clean(raw: unknown): Purchase[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((p): Purchase[] => {
    const id = str(p?.id, 40);
    const owner = str(p?.owner, 200);
    const name = str(p?.name, 80);
    const seller = str(p?.filial?.seller, 20);
    if (!id || !owner || !name || !seller || !SELLER.test(seller) || !Array.isArray(p.items)) return [];
    const items = (p.items as Partial<PlannedItem>[]).flatMap((i): PlannedItem[] => {
      const iid = str(i?.id, 12);
      const iname = str(i?.name);
      const qty = money(i?.qty);
      if (!iid || !iname || qty === undefined) return [];
      return [{ id: iid, name: iname, brand: str(i.brand, 80), image: str(i.image, 400), dept: str(i.dept, 60), qty, unit: money(i.unit) ?? null }];
    });
    return [{ id, owner, name, savedAt: str(p.savedAt, 30) ?? "", filial: { seller, name: str(p.filial?.name, 80) ?? "" }, items, receipt: cleanReceipt(p.receipt) }];
  });
}

let state: Purchase[] = [];
let loaded = false;
const listeners = new Set<() => void>();

function read(): Purchase[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) return clean(JSON.parse(raw));
  } catch {
    // storage indisponível ou corrompido: começa vazio
  }
  return [];
}

function set(next: Purchase[]) {
  state = next.slice(0, MAX);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // sem persistência: mantém só em memória
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      state = read();
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot() {
  if (!loaded) {
    loaded = true;
    state = read();
  }
  return state;
}

const EMPTY: Purchase[] = [];
const getServerSnapshot = () => EMPTY;

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** Converte a nota lida pelo servidor no que guardamos na compra: quantidades em unidades do catálogo, como na lista. */
export function toAttached(receipt: Receipt, url: string): AttachedReceipt {
  const bySku = new Map<string, PaidItem>();
  const items: PaidItem[] = [];
  for (const i of receipt.items) {
    const qty = i.match ? (i.listQty ?? i.qty) : i.qty;
    if (i.match) {
      const cur = bySku.get(i.match.skuId);
      if (cur) {
        cur.qty += qty;
        cur.total = Math.round((cur.total + i.oldTotal) * 100) / 100;
        continue;
      }
      const item: PaidItem = { skuId: i.match.skuId, name: i.match.name, qty, unit: 0, total: i.oldTotal };
      bySku.set(i.match.skuId, item);
      items.push(item);
    } else {
      items.push({ name: i.description, qty, unit: 0, total: i.oldTotal });
    }
  }
  for (const i of items) i.unit = i.qty > 0 ? Math.round((i.total / i.qty) * 100) / 100 : i.total;
  return {
    url,
    key: receipt.key,
    number: receipt.number,
    issuedAt: receipt.issuedAt,
    issuer: receipt.issuer.name,
    gross: receipt.totals.gross,
    discounts: receipt.totals.discounts,
    paid: receipt.totals.paid,
    items,
    attachedAt: new Date().toISOString(),
  };
}

/** Compras salvas da conta `owner` (null = deslogado: nenhuma). Mais recentes primeiro. */
export function usePurchases(owner: string | null) {
  const all = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const mine = owner ? all.filter((p) => same(p.owner, owner)) : EMPTY;

  const save = useCallback((input: NewPurchase): string => {
    const id = newId();
    set([{ ...input, id, savedAt: new Date().toISOString() }, ...getSnapshot()]);
    return id;
  }, []);

  const patch = useCallback((id: string, fn: (p: Purchase) => Purchase) => set(getSnapshot().map((p) => (p.id === id ? fn(p) : p))), []);

  return {
    purchases: mine,
    /** Compras salvas ainda sem nota fiscal: são o que o aviso da conta lembra de finalizar. */
    open: mine.filter((p) => !p.receipt),
    get: (id: string) => mine.find((p) => p.id === id),
    save,
    rename: (id: string, name: string) => patch(id, (p) => ({ ...p, name: name.trim().slice(0, 80) || p.name })),
    attach: (id: string, receipt: AttachedReceipt) => patch(id, (p) => ({ ...p, receipt })),
    detach: (id: string) =>
      patch(id, (p) => {
        const next = { ...p };
        delete next.receipt;
        return next;
      }),
    remove: (id: string) => set(getSnapshot().filter((p) => p.id !== id)),
  };
}
