import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { readLocalJson, subscribeLocalKey, writeLocalJson, writeLocalText } from "./data/localStore";
import { isSupabaseConfigured, supabase } from "./data/supabase";

export type AuthState = {
  session: LocalSession | null;
  ready: boolean;
};

type DemoAccount = {
  email: string;
  name: string;
  password: string;
};

type LocalSession = {
  access_token: string;
  expires_at: number;
  expires_in: number;
  provider_refresh_token: string | null;
  provider_token: string | null;
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
    name: "Brenda",
    password: "Great2026!",
  },
  {
    email: "hannahleticia13@gmail.com",
    name: "Hannah",
    password: "Great2026!",
  },
  {
    email: "thiagomarquesdev23@hotmail.com",
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

function createLocalSession(account: DemoAccount): LocalSession {
  const timestamp = new Date().toISOString();

  return {
    access_token: `local-session:${normalizeEmail(account.email)}`,
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365 * 10,
    expires_in: 60 * 60 * 24 * 365 * 10,
    provider_refresh_token: null,
    provider_token: null,
    refresh_token: `local-refresh:${normalizeEmail(account.email)}`,
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
      id: normalizeEmail(account.email),
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

function toStoredSession(session: Session, fallbackName?: string): LocalSession {
  return {
    access_token: session.access_token,
    expires_at: session.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
    expires_in: session.expires_in ?? 3600,
    provider_refresh_token: session.provider_refresh_token ?? null,
    provider_token: session.provider_token ?? null,
    refresh_token: session.refresh_token,
    token_type: session.token_type as "bearer",
    user: {
      app_metadata: {
        provider: (session.user.app_metadata.provider as "local") ?? "local",
        providers: Array.isArray(session.user.app_metadata.providers)
          ? (session.user.app_metadata.providers as string[])
          : [String(session.user.app_metadata.provider ?? "email")],
      },
      aud: "authenticated",
      created_at: session.user.created_at,
      email: session.user.email ?? "",
      email_confirmed_at: session.user.email_confirmed_at ?? session.user.created_at,
      id: session.user.id,
      identities: [],
      last_sign_in_at: session.user.last_sign_in_at ?? session.user.created_at,
      phone: "",
      role: "authenticated",
      updated_at: new Date().toISOString(),
      user_metadata: {
        name:
          (typeof session.user.user_metadata?.name === "string" && session.user.user_metadata.name) ||
          (typeof session.user.user_metadata?.full_name === "string" && session.user.user_metadata.full_name) ||
          fallbackName ||
          "",
      },
    },
  };
}

function isStoredSession(value: unknown): value is LocalSession {
  const candidate = value as Partial<LocalSession> | null;
  return Boolean(candidate?.user?.id && candidate?.user?.email && candidate?.access_token);
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
    return null;
  }

  const client = supabase;
  const currentSession = await client.auth.getSession();
  if (normalizeEmail(currentSession.data.session?.user.email ?? "") === normalizeEmail(account.email)) {
    return currentSession.data.session;
  }

  const signInResult = await client.auth.signInWithPassword({
    email: account.email,
    password,
  });

  if (!signInResult.error) {
    return signInResult.data.session;
  }

  if (!isDemoAccountEmail(account.email)) {
    throw new Error(signInResult.error.message);
  }

  const signUpResult = await client.auth.signUp({
    email: account.email,
    password,
    options: {
      data: {
        name: account.name,
      },
    },
  });

  if (
    signUpResult.error &&
    !/already registered|already exists|user already registered/i.test(signUpResult.error.message)
  ) {
    throw new Error(signUpResult.error.message);
  }

  if (signUpResult.data.session) {
    return signUpResult.data.session;
  }

  const retryResult = await client.auth.signInWithPassword({
    email: account.email,
    password,
  });

  if (retryResult.error) {
    throw new Error(retryResult.error.message);
  }

  return retryResult.data.session;
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
  if (isStoredSession(session)) {
    return session;
  }

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
        : demoAccounts.find((account) => normalizeEmail(account.email) === normalizeEmail(legacyMemberId ?? "")) ?? demoAccounts[0];
    return createLocalSession(legacyAccount);
  }

  return null;
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
    if (!isSupabaseConfigured() || !supabase) {
      const session = readLocalSession();
      console.info("[Init] User session updated", {
        authenticated: Boolean(session),
        userId: session?.user.id ?? null,
        email: session?.user.email ?? null,
      });
      setState({ session, ready: true });

      return subscribeLocalKey(SESSION_KEY, () => {
        const nextSession = readLocalSession();
        console.info("[Init] User session updated", {
          authenticated: Boolean(nextSession),
          userId: nextSession?.user.id ?? null,
          email: nextSession?.user.email ?? null,
        });
        setState({ session: nextSession, ready: true });
      });
    }

    let cancelled = false;
    const client = supabase;

    const applySupabaseSession = (session: Session | null) => {
      const nextSession = session ? toStoredSession(session) : null;
      saveSession(nextSession);
      console.info("[Init] User session updated", {
        authenticated: Boolean(nextSession),
        userId: nextSession?.user.id ?? null,
        email: nextSession?.user.email ?? null,
        source: "supabase",
      });
      setState({ session: nextSession, ready: true });
    };

    const initialize = async () => {
      const { data, error } = await client.auth.getSession();
      if (cancelled) {
        return;
      }

      if (error) {
        console.error("Failed to read Supabase auth session", error);
      }

      if (data.session) {
        applySupabaseSession(data.session);
        return;
      }

      const localSession = readLocalSession();
      const account = getDemoAccount(localSession?.user.email ?? "");
      const password = localSession ? getStoredPassword(localSession.user.email) ?? "Great2026!" : null;

      if (account && password) {
        try {
          const syncedSession = await syncSupabaseSession(account, password);
          if (cancelled) {
            return;
          }

          if (syncedSession) {
            applySupabaseSession(syncedSession);
            return;
          }
        } catch (syncError) {
          console.error("Failed to sync Supabase auth session", syncError);
        }
      }

      saveSession(null);
      console.info("[Init] User session loaded", {
        authenticated: false,
        userId: null,
        email: null,
        source: "supabase",
      });
      setState({ session: null, ready: true });
    };

    void initialize();

    const { data: authListener } = client.auth.onAuthStateChange((_event, session) => {
      if (cancelled) {
        return;
      }

      applySupabaseSession(session);
    });

    return () => {
      cancelled = true;
      authListener.subscription.unsubscribe();
    };
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

  const profileIndex = demoAccounts.findIndex((account) => normalizeEmail(account.email) === normalizeEmail(session.user.email));
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

  const syncedSession = await syncSupabaseSession(account, password);

  const session = syncedSession ? toStoredSession(syncedSession, account.name) : createLocalSession(account);
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
  const account = demoAccounts.find((item) => normalizeEmail(item.email) === normalizeEmail(userId));
  if (!account) {
    return;
  }

  const currentPasswords = readPasswordMap();
  currentPasswords[account.email] = nextPassword;
  writePasswordMap(currentPasswords);

  const currentSession = readLocalSession();
  if (currentSession?.user.email && normalizeEmail(currentSession.user.email) === normalizeEmail(account.email)) {
    const refreshedSession = {
      ...currentSession,
      user: {
        ...currentSession.user,
        last_sign_in_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_metadata: {
          ...currentSession.user.user_metadata,
          name: account.name,
        },
      },
    };
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
  return normalizeEmail(email);
}
