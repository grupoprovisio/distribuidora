"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** `next` = cursor da próxima página, quando ele não é simplesmente "quantos itens já vieram" (ex.: itens descartados no servidor). */
export type Page<T> = { items: T[]; total: number; next?: number; scanned?: number };

/**
 * Lista com rolagem infinita: carrega a primeira página ao montar e a próxima sozinha quando o fim da lista
 * estiver perto da tela. Evita repetir itens já vistos (mesmo que o servidor retorne duplicados).
 * @param load Função que carrega uma página, recebendo o cursor da próxima página (ou 0 para a primeira).
 * @param options.margin Distância do fim da lista para disparar o carregamento da próxima página (padrão: 700px).
 * @returns Estado da lista e referência para o sentinel.
 */
export function useInfinite<T extends { id: string }>(load: (after: number) => Promise<Page<T>>, options?: { margin?: number }) {
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(true); // a primeira página já começa a carregar ao montar
  const [done, setDone] = useState(false); // acabaram as páginas

  const loadRef = useRef(load);
  const fetching = useRef(false);
  const count = useRef(0);
  const exhausted = useRef(false);
  const seen = useRef(new Set<string>());
  const sentinel = useRef<HTMLDivElement | null>(null);

  // Resultado da página: só roda quando a promessa resolve (nunca durante a renderização nem dentro do efeito).
  const apply = useCallback((page: Page<T>) => {
    const fresh = page.items.filter((i) => !seen.current.has(i.id));
    fresh.forEach((i) => seen.current.add(i.id));
    const before = count.current;
    count.current = page.next ?? count.current + page.items.length;
    // Cursor não andou ou já passou do total: acabou (evita ficar pedindo páginas vazias).
    if (count.current <= before || count.current >= page.total) {
      exhausted.current = true;
      setDone(true);
    }
    setItems((prev) => [...prev, ...fresh]);
    setTotal(page.total);
  }, []);
  const fail = useCallback(() => setError(true), []);
  const settle = useCallback(() => {
    fetching.current = false;
    setBusy(false);
  }, []);
  const run = useCallback(() => loadRef.current(count.current).then(apply, fail).finally(settle), [apply, fail, settle]);

  // Chamado pelo observador (evento): não roda durante a renderização.
  const loadMore = useCallback(() => {
    if (fetching.current || exhausted.current) return;
    fetching.current = true;
    setBusy(true);
    setError(false);
    void run();
  }, [run]);

  useEffect(() => {
    fetching.current = true;
    void run();
  }, [run]);

  // Cada vez que a lista cresce, o observador é recriado: se o fim ainda estiver perto da tela, ele dispara na hora.
  useEffect(() => {
    const el = sentinel.current;
    if (!el || error) return;
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && loadMore(), {
      rootMargin: `${options?.margin ?? 700}px 0px`,
    });
    io.observe(el);
    return () => io.disconnect();
  }, [items.length, error, loadMore, options?.margin]);

  const retry = useCallback(() => {
    if (fetching.current) return;
    fetching.current = true;
    setBusy(true);
    setError(false);
    void run();
  }, [run]);

  return {
    items,
    total,
    error,
    /** Carregando (primeira página ou as seguintes). */
    busy,
    /** Ainda há mais para carregar. */
    hasMore: !done,
    retry,
    sentinel,
    /** Primeira página ainda não chegou. */
    initial: items.length === 0 && busy && !error,
  };
}
