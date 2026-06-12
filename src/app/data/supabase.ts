import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

const hasSupabaseConfig =
  Boolean(supabaseUrl) &&
  Boolean(supabaseAnonKey) &&
  !supabaseUrl!.includes("YOUR-PROJECT-REF") &&
  !supabaseAnonKey!.includes("your-anon-public-key");

function getSupabaseHost(value: string | undefined) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).host;
  } catch {
    return "invalid-url";
  }
}

console.info("[Init] Supabase configuration evaluated", {
  configured: hasSupabaseConfig,
  urlPresent: Boolean(supabaseUrl),
  anonKeyPresent: Boolean(supabaseAnonKey),
  projectHost: getSupabaseHost(supabaseUrl),
});

if (!hasSupabaseConfig) {
  console.error("[Init] Supabase environment is incomplete. Expected VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
}

export const supabase = hasSupabaseConfig
  ? (() => {
      const url = supabaseUrl as string;
      const anonKey = supabaseAnonKey as string;

      return createClient(url, anonKey, {
        auth: {
          autoRefreshToken: true,
          detectSessionInUrl: true,
          persistSession: true,
        },
      });
    })()
  : null;

export function isSupabaseConfigured() {
  return supabase !== null;
}
