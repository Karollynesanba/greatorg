import { useEffect, useState } from "react";
import { readLocalJson, subscribeLocalKey, writeLocalJson, writeLocalText } from "./data/localStore";
import { isSupabaseConfigured, supabase } from "./data/supabase";

export type AuthState = {
  session: LocalSession | null;
  ready: boolean;
};

type DemoAccount = {
  email: string;
  id: string;
  name: string;
  password: string;
};

type LocalSession = {
  access_token: string;
  expires_at: number;
  expires_in: number;
  provider_refresh_token: null;
  provider_token: null;
  refresh_token: string;
  token_type: "bearer";
  user: {
    app_metadata: {
      provider: "local";
      providers: string[];
    };
    aud: "authenticated";
    created_at: string;
    email: string;
    email_confirmed_at: string;
    id: string;
    identities: never[];
    last_sign_in_at: string;
    phone: "";
    role: "authenticated";
    updated_at: string;
    user_metadata: {
      name: string;
    };
  };
};

const SESSION_KEY = "great-organico:auth-session";
const PASSWORDS_KEY = "great-organico:demo-passwords";
export const authStorageKey = "great-organico-authenticated";
export const authMemberIdKey = "great-organico-authenticated-member-id";

const demoAccounts: DemoAccount[] = [
  {
    email: "brendarayssa2706@gmail.com",
    id: "4b8a4d0f-6f9e-4c3d-9a1d-2e1f4d58d101",
    name: "Brenda",
    password: "Great2026!",
  },
  {
    email: "hannahleticia13@gmail.com",
    id: "2c1b7d5f-88a4-4b7b-8cb5-7d8a6f5c2b02",
    name: "Hannah",
    password: "Great2026!",
  },
  {
    email: "thiagomarquesdev23@hotmail.com",
    id: "7d8a2c11-0f4e-4e7b-b0a9-3f9d77a1c303",
    name: "Thiago",
    password: "Great2026!",
  },
];

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getDemoAccount(email: string) {
  return demoAccounts.find((account) => account.email === normalizeEmail(email)) ?? null;
}

function readPasswordMap() {
  return readLocalJson<Record<string, string>>(PASSWORDS_KEY, {
    "brendarayssa2706@gmail.com": "Great2026!",
    "hannahleticia13@gmail.com": "Great2026!",
    "thiagomarquesdev23@hotmail.com": "Great2026!",
  });
}

function writePasswordMap(map: Record<string, string>) {
  writeLocalJson(PASSWORDS_KEY, map);
}

function getStoredPassword(email: string) {
  return readPasswordMap()[normalizeEmail(email)] ?? null;
}

function createSession(account: DemoAccount): LocalSession {
  const timestamp = new Date().toISOString();

  return {
    access_token: `local-session:${account.id}`,
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365 * 10,
    expires_in: 60 * 60 * 24 * 365 * 10,
    provider_refresh_token: null,
    provider_token: null,
    refresh_token: `local-refresh:${account.id}`,
    token_type: "bearer",
    user: {
      app_metadata: {
        provider: "local",
        providers: ["local"],
      },
      aud: "authenticated",
      created_at: timestamp,
      email: account.email,
      email_confirmed_at: timestamp,
      id: account.id,
      identities: [],
      last_sign_in_at: timestamp,
      phone: "",
      role: "authenticated",
      updated_at: timestamp,
      user_metadata: {
        name: account.name,
      },
    },
  };
}

function saveSession(session: LocalSession | null) {
  if (session) {
    writeLocalJson(SESSION_KEY, session);
  } else {
    writeLocalText(SESSION_KEY, null);
  }
}

async function syncSupabaseSession(account: DemoAccount, password: string) {
  if (!isSupabaseConfigured() || !supabase) {
    return;
  }

  const client = supabase;
  const currentSession = await client.auth.getSession();
  if (currentSession.data.session?.user.id === account.id) {
    return;
  }

  const signInResult = await client.auth.signInWithPassword({
    email: account.email,
    password,
  });

  if (!signInResult.error) {
    return;
  }

  if (!isDemoAccountEmail(account.email)) {
    throw new Error(signInResult.error.message);
  }

  const bootstrapResult = await client.rpc("bootstrap_demo_account", {
    demo_email: account.email,
    demo_password: password,
  });

  if (bootstrapResult.error) {
    throw new Error(bootstrapResult.error.message);
  }

  const retryResult = await client.auth.signInWithPassword({
    email: account.email,
    password,
  });

  if (retryResult.error) {
    throw new Error(retryResult.error.message);
  }
}

async function clearSupabaseSession() {
  if (!isSupabaseConfigured() || !supabase) {
    return;
  }

  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(error.message);
  }
}

function readLocalSession() {
  const session = readLocalJson<LocalSession | null>(SESSION_KEY, null);
  if (!session) {
    const legacyAuth = typeof window !== "undefined" ? window.localStorage.getItem(authStorageKey) : null;
    if (legacyAuth !== "true") {
      return null;
    }

    const legacyMemberId = typeof window !== "undefined" ? window.localStorage.getItem(authMemberIdKey) : null;
    const parsedLegacyMemberId = legacyMemberId ? Number(legacyMemberId) : null;
    const legacyAccount =
      Number.isFinite(parsedLegacyMemberId) && parsedLegacyMemberId && parsedLegacyMemberId > 0
        ? demoAccounts[parsedLegacyMemberId - 1] ?? demoAccounts[0]
        : demoAccounts.find((account) => String(getDemoAccountUserId(account.email)) === legacyMemberId) ?? demoAccounts[0];
    return createSession(legacyAccount);
  }

  const account = getDemoAccount(session.user.email);
  if (!account) {
    return null;
  }

  return createSession(account);
}

function getDemoAccountId(email: string) {
  return getDemoAccount(email)?.id ?? null;
}

export function isDemoSession(session: LocalSession | null | undefined) {
  return Boolean(session);
}

export function isDemoAccountEmail(email: string) {
  return getDemoAccount(email) !== null;
}

export function useAuthSession() {
  const [state, setState] = useState<AuthState>({
    session: null,
    ready: false,
  });

  useEffect(() => {
    const session = readLocalSession();
    setState({ session, ready: true });

    if (session) {
      const password = getStoredPassword(session.user.email) ?? "Great2026!";
      const account = getDemoAccount(session.user.email);
      if (account) {
        void syncSupabaseSession(account, password).catch((error) => {
          console.error("Failed to sync Supabase auth session", error);
        });
      }
    }

    return subscribeLocalKey(SESSION_KEY, () => {
      const nextSession = readLocalSession();
      setState({ session: nextSession, ready: true });

      if (nextSession) {
        const password = getStoredPassword(nextSession.user.email) ?? "Great2026!";
        const account = getDemoAccount(nextSession.user.email);
        if (account) {
          void syncSupabaseSession(account, password).catch((error) => {
            console.error("Failed to sync Supabase auth session", error);
          });
        }
      }
    });
  }, []);

  return state;
}

export function isAuthenticated() {
  return readLocalSession() !== null;
}

export function getAuthenticatedMemberId() {
  const session = readLocalSession();
  if (!session) {
    if (typeof window === "undefined") {
      return null;
    }

    const legacyAuth = window.localStorage.getItem(authStorageKey);
    if (legacyAuth !== "true") {
      return null;
    }

    const legacyMemberId = window.localStorage.getItem(authMemberIdKey);
    const parsedLegacyMemberId = legacyMemberId ? Number(legacyMemberId) : null;
    return Number.isFinite(parsedLegacyMemberId) ? parsedLegacyMemberId : null;
  }

  const profileIndex = demoAccounts.findIndex((account) => account.id === session.user.id);
  return profileIndex >= 0 ? profileIndex + 1 : null;
}

export async function signInWithPassword(email: string, password: string) {
  const account = getDemoAccount(email);
  if (!account) {
    throw new Error("Conta indisponivel.");
  }

  const storedPassword = getStoredPassword(account.email);
  const isValidPassword = password === account.password || (storedPassword !== null && password === storedPassword);
  if (!isValidPassword) {
    throw new Error("Credenciais invalidas.");
  }

  await syncSupabaseSession(account, password);

  const session = createSession(account);
  saveSession(session);
  return session;
}

export async function signInOrBootstrapDemoAccount(email: string, password: string) {
  const account = getDemoAccount(email);
  if (!account) {
    return signInWithPassword(email, password);
  }

  const currentPasswords = readPasswordMap();
  if (!currentPasswords[account.email]) {
    currentPasswords[account.email] = account.password;
    writePasswordMap(currentPasswords);
  }

  return signInWithPassword(account.email, password);
}

export async function updateDemoAccountPassword(userId: string, nextPassword: string) {
  const account = demoAccounts.find((item) => item.id === userId);
  if (!account) {
    return;
  }

  const currentPasswords = readPasswordMap();
  currentPasswords[account.email] = nextPassword;
  writePasswordMap(currentPasswords);

  const currentSession = readLocalSession();
  if (currentSession?.user.id === userId) {
    const refreshedSession = createSession(account);
    refreshedSession.user.last_sign_in_at = new Date().toISOString();
    refreshedSession.user.updated_at = new Date().toISOString();
    saveSession(refreshedSession);
  }
}

export async function signOut() {
  await clearSupabaseSession().catch((error) => {
    console.error("Failed to sign out from Supabase", error);
  });
  saveSession(null);
}

export function getDemoAccountUserId(email: string) {
  return getDemoAccountId(email);
}
