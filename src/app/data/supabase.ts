import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
const SUPABASE_STORAGE_KEY = "great-organico:supabase-auth";
const memoryStorage = new Map<string, string>();
const storageProbeKey = `${SUPABASE_STORAGE_KEY}:probe`;

function isCypressRuntime() {
  return typeof window !== "undefined" && Boolean((window as Window & { Cypress?: unknown }).Cypress);
}

function shouldDisableSupabaseInCypress() {
  return import.meta.env.VITE_ENABLE_SUPABASE_IN_CYPRESS !== "true";
}

const hasSupabaseConfig =
  (!isCypressRuntime() || !shouldDisableSupabaseInCypress()) &&
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

function canUseStorage(storage: "localStorage" | "sessionStorage") {
  try {
    if (typeof window === "undefined" || typeof window[storage] === "undefined") {
      return false;
    }

    window[storage].setItem(storageProbeKey, "1");
    window[storage].removeItem(storageProbeKey);
    return true;
  } catch {
    return false;
  }
}

const supabaseStorage = {
  getItem(key: string) {
    if (canUseStorage("localStorage")) {
      try {
        const value = window.localStorage.getItem(key);
        if (value !== null) {
          return value;
        }
      } catch {
        return memoryStorage.get(key) ?? null;
      }
    }

    if (canUseStorage("sessionStorage")) {
      try {
        const value = window.sessionStorage.getItem(key);
        if (value !== null) {
          return value;
        }
      } catch {
        return memoryStorage.get(key) ?? null;
      }
    }

    return memoryStorage.get(key) ?? null;
  },
  setItem(key: string, value: string) {
    let persisted = false;

    if (canUseStorage("localStorage")) {
      try {
        window.localStorage.setItem(key, value);
        persisted = true;
      } catch {
        persisted = false;
      }
    }

    if (canUseStorage("sessionStorage")) {
      try {
        window.sessionStorage.setItem(key, value);
        persisted = true;
      } catch {
        persisted = persisted || false;
      }
    }

    memoryStorage.set(key, value);
    if (!persisted) {
      console.warn("[Init] Supabase auth is using in-memory storage fallback only for this tab.");
    }
  },
  removeItem(key: string) {
    memoryStorage.delete(key);

    if (canUseStorage("localStorage")) {
      try {
        window.localStorage.removeItem(key);
      } catch {
        // Ignore storage cleanup failures.
      }
    }

    if (canUseStorage("sessionStorage")) {
      try {
        window.sessionStorage.removeItem(key);
      } catch {
        // Ignore storage cleanup failures.
      }
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
