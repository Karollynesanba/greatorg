import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
const SUPABASE_STORAGE_KEY = "great-organico:supabase-auth";
const memoryStorage = new Map<string, string>();

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

function canUseLocalStorage() {
  try {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
  } catch {
    return false;
  }
}

const supabaseStorage = {
  getItem(key: string) {
    if (canUseLocalStorage()) {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return memoryStorage.get(key) ?? null;
      }
    }

    return memoryStorage.get(key) ?? null;
  },
  setItem(key: string, value: string) {
    if (canUseLocalStorage()) {
      try {
        window.localStorage.setItem(key, value);
        return;
      } catch {
        memoryStorage.set(key, value);
        return;
      }
    }

    memoryStorage.set(key, value);
  },
  removeItem(key: string) {
    memoryStorage.delete(key);

    if (!canUseLocalStorage()) {
      return;
    }

    try {
      window.localStorage.removeItem(key);
    } catch {
      return;
    }
  },
};

export const supabaseProjectHost = getSupabaseHost(supabaseUrl);

export const supabase = hasSupabaseConfig
  ? (() => {
      const url = supabaseUrl as string;
      const anonKey = supabaseAnonKey as string;

      return createClient(url, anonKey, {
        auth: {
          autoRefreshToken: true,
          detectSessionInUrl: true,
          persistSession: true,
          storage: {
            getItem(key) {
              return supabaseStorage.getItem(`${SUPABASE_STORAGE_KEY}:${key}`);
            },
            setItem(key, value) {
              supabaseStorage.setItem(`${SUPABASE_STORAGE_KEY}:${key}`, value);
            },
            removeItem(key) {
              supabaseStorage.removeItem(`${SUPABASE_STORAGE_KEY}:${key}`);
            },
          },
        },
      });
    })()
  : null;

export function isSupabaseConfigured() {
  return supabase !== null;
}

export function getSupabaseDiagnostics() {
  return {
    configured: hasSupabaseConfig,
    urlPresent: Boolean(supabaseUrl),
    anonKeyPresent: Boolean(supabaseAnonKey),
    projectHost: supabaseProjectHost,
  };
}
