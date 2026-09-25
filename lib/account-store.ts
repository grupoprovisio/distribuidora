"use client";

import { useEffect, useSyncExternalStore } from "react";
import { ACCOUNT_COOKIE } from "@/lib/account";

// E-mail da conta da Distribuidora logada neste navegador, lido do cookie `abp_account` (definido no login e apagado no logout).

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

function read(): string | null {
  const raw = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${ACCOUNT_COOKIE}=`))
    ?.slice(ACCOUNT_COOKIE.length + 1);
  if (!raw) return null;
  try {
    return decodeURIComponent(raw) || null;
  } catch {
    return null;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Outra aba pode entrar/sair da conta: relê ao voltar para esta.
  window.addEventListener("focus", listener);
  document.addEventListener("visibilitychange", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("focus", listener);
    document.removeEventListener("visibilitychange", listener);
  };
}

/** Grava (ou apaga, com null) o e-mail da conta neste navegador e avisa quem estiver ouvindo. */
export function setAccountEmail(email: string | null) {
  document.cookie = email
    ? `${ACCOUNT_COOKIE}=${encodeURIComponent(email)}; path=/; max-age=${60 * 60 * 24 * 7}; samesite=lax`
    : `${ACCOUNT_COOKIE}=; path=/; max-age=0; samesite=lax`;
  notify();
}

/** E-mail da conta logada, ou null (deslogado). */
export function useAccountEmail() {
  return useSyncExternalStore(subscribe, read, () => null);
}

/** false no servidor e na hidratação, true depois: evita mostrar "deslogado" antes de ler o cookie. */
export function useHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

/** Mantém o cookie igual ao que o servidor sabe da sessão (para quem entrou antes deste recurso existir). */
export function useSyncAccount(email: string | null) {
  useEffect(() => {
    if (read() !== email) setAccountEmail(email);
  }, [email]);
}
