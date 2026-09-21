"use client";

import { useCallback, useSyncExternalStore } from "react";

// Lista de compras + favoritos + checklist, persistidos no localStorage. Store externo lido via useSyncExternalStore:
// sem provider, sem efeito de hidratação e sincronizado entre abas.

/** Dados do item para exibir na lista sem consultar de novo. */
export type ItemMeta = {
  name: string;
  brand?: string;
  image?: string;
  ean?: string;
  /** Departamento, para agrupar a lista em seções. */
  dept?: string;
  /** Quanto vale cada unidade nos itens vendidos por peso (ex.: "150 g"). */
  pack?: string;
  /** Último preço pago (vindo de uma nota fiscal importada), para comparar com o preço de hoje. */
  paid?: { price: number; date: string };
  /** Preço por unidade informado pela pessoa (itens que a loja tem, mas que não aparecem com preço no catálogo online). */
  manual?: number;
};

/** `qty`, `meta` e `done` usam o SKU do Atacadão como chave. */
type State = {
  qty: Record<string, number>;
  meta: Record<string, ItemMeta>;
  fav: string[];
  favMeta: Record<string, ItemMeta>;
  /** Modo checklist ligado: a lista mostra caixas para marcar o que já foi comprado. */
  checklist: boolean;
  /** Itens já marcados como comprados. */
  done: Record<string, true>;
};

const KEY = "abp:list:v1";
const EMPTY: State = { qty: {}, meta: {}, fav: [], favMeta: {}, checklist: false, done: {} };

const str = (v: unknown, max = 200) => (typeof v === "string" ? v.slice(0, max) : undefined);

function cleanMeta(raw: unknown): Record<string, ItemMeta> {
  const out: Record<string, ItemMeta> = {};
  for (const [id, m] of Object.entries((raw ?? {}) as Record<string, Partial<ItemMeta>>)) {
    const name = str(m?.name);
    if (!/^\d{1,9}$/.test(id) || !name) continue;
    const paid = m.paid && Number.isFinite(m.paid.price) && m.paid.price >= 0 ? { price: m.paid.price, date: str(m.paid.date, 10) ?? "" } : undefined;
    const manual = typeof m.manual === "number" && Number.isFinite(m.manual) && m.manual >= 0 ? m.manual : undefined;
    out[id] = { name, brand: str(m.brand), image: str(m.image, 400), ean: str(m.ean, 14), dept: str(m.dept, 60), pack: str(m.pack, 20), paid, manual };
  }
  return out;
}

let state: State = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function read(): State {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<State>;
      const qty = parsed.qty ?? {};
      return {
        qty,
        meta: cleanMeta(parsed.meta),
        fav: parsed.fav ?? [],
        favMeta: cleanMeta(parsed.favMeta),
        checklist: parsed.checklist === true,
        // Só vale marcação de item que ainda está na lista.
        done: Object.fromEntries(Object.keys(parsed.done ?? {}).filter((id) => id in qty).map((id) => [id, true as const])),
      };
    }
  } catch {
    // storage indisponível ou corrompido: começa vazio
  }
  return EMPTY;
}

function set(next: State) {
  state = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // sem persistência (modo privado etc.): mantém só em memória
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

const getServerSnapshot = () => EMPTY;

const clamp = (n: number) => Math.min(Math.max(Math.round(n), 1), 999);

export function useList() {
  const s = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  /** Define a quantidade. `meta` guarda nome/foto do item ao adicioná-lo; quantidade 0 remove o item. */
  const setQty = useCallback((id: string, qty: number, meta?: ItemMeta) => {
    const cur = getSnapshot();
    const nextQty = { ...cur.qty };
    const nextMeta = { ...cur.meta };
    const nextDone = { ...cur.done };
    if (qty <= 0) {
      delete nextQty[id];
      delete nextMeta[id];
      delete nextDone[id];
    } else {
      nextQty[id] = clamp(qty);
      if (meta) nextMeta[id] = meta;
    }
    set({ ...cur, qty: nextQty, meta: nextMeta, done: nextDone });
  }, []);

  /** Adiciona vários itens de uma vez (importação de nota fiscal). Itens já na lista têm a quantidade substituída. */
  const setMany = useCallback((items: { id: string; qty: number; meta: ItemMeta }[]) => {
    const cur = getSnapshot();
    const nextQty = { ...cur.qty };
    const nextMeta = { ...cur.meta };
    for (const it of items) {
      nextQty[it.id] = clamp(it.qty);
      nextMeta[it.id] = it.meta;
    }
    set({ ...cur, qty: nextQty, meta: nextMeta });
  }, []);

  /** Favorita/desfavorita. `meta` guarda nome e foto para mostrar o favorito sem depender de outra consulta. */
  const toggleFav = useCallback((id: string, meta?: ItemMeta) => {
    const cur = getSnapshot();
    const favMeta = { ...cur.favMeta };
    if (cur.fav.includes(id)) {
      delete favMeta[id];
      set({ ...cur, fav: cur.fav.filter((f) => f !== id), favMeta });
    } else {
      if (meta) favMeta[id] = meta;
      set({ ...cur, fav: [...cur.fav, id], favMeta });
    }
  }, []);

  const toggleDone = useCallback((id: string) => {
    const cur = getSnapshot();
    const done = { ...cur.done };
    if (done[id]) delete done[id];
    else done[id] = true;
    set({ ...cur, done });
  }, []);

  /** Guarda (ou apaga, com `undefined`) o preço por unidade que a pessoa informou para um item. */
  const setManualPrice = useCallback((id: string, price: number | undefined) => {
    const cur = getSnapshot();
    if (!cur.meta[id]) return;
    set({ ...cur, meta: { ...cur.meta, [id]: { ...cur.meta[id], manual: price } } });
  }, []);

  const setChecklist = useCallback((on: boolean) => set({ ...getSnapshot(), checklist: on }), []);
  const clearDone = useCallback(() => set({ ...getSnapshot(), done: {} }), []);
  const clear = useCallback(() => set({ ...getSnapshot(), qty: {}, meta: {}, done: {} }), []);

  return {
    qty: s.qty,
    meta: s.meta,
    fav: s.fav,
    favMeta: s.favMeta,
    checklist: s.checklist,
    done: s.done,
    count: Object.values(s.qty).reduce((a, b) => a + b, 0),
    getQty: (id: string) => s.qty[id] ?? 0,
    isFav: (id: string) => s.fav.includes(id),
    setQty,
    setMany,
    toggleFav,
    toggleDone,
    setManualPrice,
    setChecklist,
    clearDone,
    clear,
  };
}
