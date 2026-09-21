"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { FilialInfo } from "@/lib/lookup-types";

// Configurações de comparação. Ficam no navegador (localStorage), valem sem login e são lidas por qualquer tela.

export type Prefs = {
  /** "filiais": compara o produto entre as filiais próximas. "interno": só produtos semelhantes dentro da filial. */
  compare: "filiais" | "interno";
  /** Modelo de compra: define a quantidade sugerida para as comparações. */
  buy: "atacado" | "unitario";
  /** Quantidade usada nas comparações (o degrau de atacado entra sozinho quando atingido). */
  qty: number;
  /** Filial escolhida (por padrão, a mais próxima do usuário). */
  filial?: FilialInfo;
  /** Lojas mais próximas encontradas na última localização, da mais perto à mais longe. */
  nearby: FilialInfo[];
};

export const PRESET_QTY = { atacado: 6, unitario: 1 } as const;

export const DEFAULT_FILIAL: FilialInfo = {
  seller: "atacadaobr60",
  name: "Vila Maria",
  neighborhood: "Vila Guilherme",
  city: "São Paulo",
  uf: "SP",
};

const DEFAULTS: Prefs = { compare: "interno", buy: "atacado", qty: PRESET_QTY.atacado, nearby: [] };

const KEY = "abp:prefs:v1";
const SELLER = /^atacadaobr\d{1,4}$/;

function cleanFilial(f: unknown): FilialInfo | undefined {
  const o = f as Partial<FilialInfo> | null;
  if (!o || typeof o.seller !== "string" || !SELLER.test(o.seller) || typeof o.name !== "string") return undefined;
  return {
    seller: o.seller,
    name: o.name.slice(0, 80),
    neighborhood: typeof o.neighborhood === "string" ? o.neighborhood.slice(0, 80) : undefined,
    city: typeof o.city === "string" ? o.city.slice(0, 80) : "",
    uf: typeof o.uf === "string" ? o.uf.slice(0, 2) : "",
    km: typeof o.km === "number" && Number.isFinite(o.km) ? o.km : undefined,
  };
}

function sanitize(raw: unknown): Prefs {
  const p = (raw ?? {}) as Partial<Prefs>;
  const qty = Number.isInteger(p.qty) ? Math.min(Math.max(p.qty as number, 1), 999) : DEFAULTS.qty;
  return {
    compare: p.compare === "filiais" ? "filiais" : "interno",
    buy: p.buy === "unitario" ? "unitario" : "atacado",
    qty,
    filial: cleanFilial(p.filial),
    nearby: Array.isArray(p.nearby) ? p.nearby.flatMap((f) => cleanFilial(f) ?? []).slice(0, 6) : [],
  };
}

let state: Prefs = DEFAULTS;
let loaded = false;
const listeners = new Set<() => void>();

function read(): Prefs {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) return sanitize(JSON.parse(raw));
  } catch {
    // storage indisponível ou corrompido: usa o padrão
  }
  return DEFAULTS;
}

function commit(next: Prefs) {
  state = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // sem persistência (modo privado etc.): mantém em memória
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

const getServerSnapshot = () => DEFAULTS;

export function usePrefs() {
  const prefs = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const update = useCallback((patch: Partial<Prefs>) => commit(sanitize({ ...getSnapshot(), ...patch })), []);
  /** Troca o modelo de compra e ajusta a quantidade para o padrão dele. */
  const setBuy = useCallback((buy: Prefs["buy"]) => commit(sanitize({ ...getSnapshot(), buy, qty: PRESET_QTY[buy] })), []);
  const reset = useCallback(() => commit(DEFAULTS), []);

  const filial = prefs.filial ?? DEFAULT_FILIAL;
  const known = [...(prefs.filial ? [prefs.filial] : []), ...prefs.nearby];

  return {
    prefs,
    filial,
    /** Sem filial definida pelo usuário: usando a padrão. */
    filialIsDefault: !prefs.filial,
    /** Vendedores enviados para comparar o mesmo produto entre filiais (vazio no modo "interno"). */
    compareSellers:
      prefs.compare === "filiais" ? [...new Set([filial.seller, ...prefs.nearby.map((f) => f.seller)])] : ([] as string[]),
    nameOf: (seller: string) => known.find((f) => f.seller === seller)?.name ?? seller.replace("atacadaobr", "Filial "),
    kmOf: (seller: string) => known.find((f) => f.seller === seller)?.km,
    update,
    setBuy,
    reset,
  };
}
