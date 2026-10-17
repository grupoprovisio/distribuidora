"use client";
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/database.types";
import { publicSupabaseConfig } from "@/lib/supabase/config";

export function createClient() {
  const { url, key } = publicSupabaseConfig();
  return createBrowserClient<Database>(url, key);
}
