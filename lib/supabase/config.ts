/** Todas as sessões B2B devem pertencer EXCLUSIVAMENTE ao Supabase da Provisio. */
const TARGET = "https://xprvdquocenfqvnokmmi.supabase.co";
export function supabaseAuthEnabled() {
  return process.env.MARKETPLACE_AUTH_ENABLED === "true";
}
export function publicSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  // Real Auth/Postgres/Storage E2E is permitted only on loopback in next dev.
  // Production builds reject localhost even if this test flag is accidentally set.
  const localE2e = process.env.NODE_ENV === "development"
    && process.env.NEXT_PUBLIC_PROVISIO_LOCAL_E2E === "true"
    && url === "http://127.0.0.1:54321"
    && (typeof window === "undefined" || window.location.hostname === "127.0.0.1");
  if ((url !== TARGET && !localE2e) || !key || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) {
    throw new Error("Supabase Provisio nao configurado para autenticacao.");
  }
  return { url, key };
}
