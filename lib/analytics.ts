"use client";

/** Eventos compatíveis com GA4/GTM sem acoplar a aplicação a um provedor específico. */
export function track(event: string, params: Record<string, string | number | undefined> = {}) {
  if (typeof window === "undefined") return;
  const dataLayer = (window as Window & { dataLayer?: unknown[] }).dataLayer ?? [];
  dataLayer.push({ event, ...params });
  (window as Window & { dataLayer?: unknown[] }).dataLayer = dataLayer;
  window.dispatchEvent(new CustomEvent("distribuidora:analytics", { detail: { event, params } }));
}
