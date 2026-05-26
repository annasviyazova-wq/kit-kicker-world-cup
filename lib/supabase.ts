import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const secretKey =
  process.env.SUPABASE_SECRET_KEY ??
  process.env.SUPABASE_SERVICE_ROLE_KEY;

export function getPublicSupabase() {
  if (!supabaseUrl || !publishableKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  }

  return createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: false }
  });
}

export function getAdminSupabase() {
  if (!supabaseUrl || !secretKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY");
  }

  return createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false }
  });
}

export function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}
