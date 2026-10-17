/** Todas as sessões B2B devem pertencer EXCLUSIVAMENTE ao Supabase da Provisio. */
const TARGET = "https://xprvdquocenfqvnokmmi.supabase.co";
export function supabaseAuthEnabled() {
  return process.env.MARKETPLACE_AUTH_ENABLED === "true";
}
export function publicSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (url !== TARGET || !key || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) {
    throw new Error("Supabase Provisio nao configurado para autenticacao.");
  }
  return { url, key };
}
