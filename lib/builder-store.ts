"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { Unit } from "@/lib/resolve";

// Rascunho do montador de lista: o que a pessoa pediu ("2 kg de frango"), o que já respondeu e a opção escolhida.
// Guardado no navegador (localStorage), como a lista.

export type Pick = {
  id: string;
  name: string;
  brand: string;
  image?: string;
  dept?: string;
  /** Embalagens que serão adicionadas à lista. */
  units: number;
  /** Preço unitário na quantidade escolhida e total. */
  unit: number;
  total: number;
};

export type DraftItem = {
  id: string;
  /** Texto digitado ("frango"). Vazio nos itens vindos de sugestão, que usam só a categoria. */
  text: string;
  /** Rótulo para exibir ("Arroz branco"). */
  label: string;
  qty: number;
  unit: Unit;
  /** Caminho de categorias escolhido pela pessoa (respostas às perguntas). */
  chosen: string[];
  /** Palavras escolhidas nas perguntas por atributo (ex.: "peito", "integral"). */
  attrs?: string[];
  pick?: Pick;
  /** true quando a pessoa escolheu a opção (senão é só a sugerida automaticamente). */
  manual?: boolean;
  added?: boolean;
};

const KEY = "abp:builder:v1";
const EMPTY: DraftItem[] = [];

let state: DraftItem[] = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

const isUnit = (u: unknown): u is Unit => u === "un" || u === "kg" || u === "l";

function read(): DraftItem[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const arr = JSON.parse(raw) as Partial<DraftItem>[];
      return arr.flatMap((d): DraftItem[] =>
        typeof d.id === "string" && typeof d.label === "string" && Number.isFinite(d.qty)
          ? [
              {
                id: d.id,
                text: typeof d.text === "string" ? d.text.slice(0, 80) : "",
                label: d.label.slice(0, 80),
                qty: Math.min(Math.max(Math.round(d.qty as number), 1), 999),
                unit: isUnit(d.unit) ? d.unit : "un",
                chosen: Array.isArray(d.chosen) ? d.chosen.filter((s): s is string => typeof s === "string").slice(0, 3) : [],
                attrs: Array.isArray(d.attrs) ? d.attrs.filter((s): s is string => typeof s === "string").slice(0, 3) : [],
                pick: d.pick,
                manual: d.manual,
                added: d.added,
              },
            ]
          : [],
      );
    }
  } catch {
    // storage indisponível ou corrompido: começa vazio
  }
  return EMPTY;
}

function commit(next: DraftItem[]) {
  state = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // sem persistência: mantém em memória
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

export function useBuilder() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const add = useCallback((item: Omit<DraftItem, "id"> & { id?: string }) => {
    const id = item.id ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    commit([...getSnapshot().filter((d) => d.id !== id), { ...item, id }]);
    return id;
  }, []);
  const update = useCallback((id: string, patch: Partial<DraftItem>) => commit(getSnapshot().map((d) => (d.id === id ? { ...d, ...patch } : d))), []);
  const remove = useCallback((id: string) => commit(getSnapshot().filter((d) => d.id !== id)), []);
  const replaceAll = useCallback((next: DraftItem[]) => commit(next), []);
  const clear = useCallback(() => commit([]), []);

  return { items, add, update, remove, replaceAll, clear };
}
