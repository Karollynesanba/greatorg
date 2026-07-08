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
const SESSION_RECOVERY_GRACE_MS = 5000;

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

function readStoredSession() {
  const session = readLocalJson<LocalSession | null>(SESSION_KEY, null);
  return isStoredSession(session) ? session : null;
}

function isSessionExpired(session: LocalSession) {
  return typeof session.expires_at === "number" && session.expires_at <= Math.floor(Date.now() / 1000) + 30;
}

function isCypressRuntime() {
  return typeof window !== "undefined" && "Cypress" in window;
}

function saveSession(session: LocalSession | null) {
  if (session) {
    writeLocalJson(SESSION_KEY, session);
  } else {
    writeLocalText(SESSION_KEY, null);
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

function readLegacyDemoSession() {
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

function readLocalSession() {
  const session = readStoredSession();
  if (session) {
    return session;
  }

  if (!isSupabaseConfigured() || !supabase) {
    return readLegacyDemoSession();
  }

  return null;
}

async function recoverSupabaseSession() {
  if (!isSupabaseConfigured() || !supabase) {
    return null;
  }

  const client = supabase;
  const currentSession = await client.auth.getSession();
  if (currentSession.data.session) {
    return currentSession.data.session;
  }

  const refreshedSession = await client.auth.refreshSession();
  if (refreshedSession.error) {
    throw refreshedSession.error;
  }

  return refreshedSession.data.session ?? null;
}

function buildAuthErrorMessage(message: string, email?: string) {
  const normalizedEmail = normalizeEmail(email ?? "");
  const isDemoEmail = isDemoAccountEmail(normalizedEmail);
  const rawMessage = message.trim();

  if (/invalid login credentials/i.test(rawMessage)) {
    if (isDemoEmail) {
      return "Email ou senha invalidos no Supabase novo. Se esta conta existia no projeto antigo, ela precisa ser recriada ou importada no Authentication > Users do projeto novo.";
    }

    return "Email ou senha invalidos. Se esta conta existia no Supabase antigo, ela ainda precisa ser recriada ou importada no Authentication > Users do projeto novo.";
  }

  if (/email not confirmed/i.test(rawMessage)) {
    return "Seu email ainda nao foi confirmado no Supabase novo. Confirme o email ou habilite o fluxo apropriado no Auth.";
  }

  if (/signup is disabled/i.test(rawMessage)) {
    return "O Supabase Auth respondeu, mas o cadastro esta desativado. O login so funciona para usuarios que ja existem no Authentication > Users.";
  }

  if (/exceed_egress_quota|service .*restricted|spend caps|restore service/i.test(rawMessage)) {
    if (isDemoEmail) {
      return "O Supabase do projeto esta temporariamente restrito por cota. Vamos liberar o acesso local para este perfil demo enquanto o ambiente remoto e normalizado.";
    }

    return "O Supabase do projeto esta temporariamente restrito por cota. O proprietario precisa normalizar o plano ou remover o limite de gastos para restaurar o login remoto.";
  }

  if (/network|fetch|failed to fetch|load failed/i.test(rawMessage)) {
    return "Não foi possível conectar ao Supabase novo. Verifique a URL, a ANON KEY e as variáveis do Vercel.";
  }

  return rawMessage;
}

function shouldFallbackToLocalDemoAuth(message: string) {
  return /exceed_egress_quota|service .*restricted|spend caps|restore service|network|fetch|failed to fetch|load failed/i.test(
    message.trim(),
  );
}

async function signInToSupabase(email: string, password: string) {
  if (!isSupabaseConfigured() || !supabase) {
    return null;
  }

  const normalizedEmail = normalizeEmail(email);
  const client = supabase;
  // Always exchange the submitted credentials for a fresh refresh token. Reusing
  // a stale session here makes login appear successful until its access token expires.
  const signInResult = await client.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (signInResult.error) {
    throw new Error(buildAuthErrorMessage(signInResult.error.message, normalizedEmail));
  }

  if (!signInResult.data.session) {
    throw new Error("O Supabase nao retornou uma sessao valida apos o login.");
  }

  return signInResult.data.session;
}

export function isDemoSession(session: LocalSession | null | undefined) {
  return session?.user.app_metadata.provider === "local";
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

    const cypressSession = readStoredSession();
    if (cypressSession && isDemoSession(cypressSession) && isCypressRuntime()) {
      console.info("[Init] Using Cypress-seeded demo session", {
        userId: cypressSession.user.id,
        email: cypressSession.user.email,
      });
      setState({ session: cypressSession, ready: true });

      return subscribeLocalKey(SESSION_KEY, () => {
        const nextSession = readStoredSession();
        setState({ session: nextSession, ready: true });
      });
    }

    let cancelled = false;
    const client = supabase;
    let recoveryTimeoutId: number | null = null;
    const applyStoredSessionSnapshot = () => {
      if (cancelled) {
        return;
      }

      const nextSession = readStoredSession();
      if (!nextSession || isSessionExpired(nextSession)) {
        return;
      }

      clearRecoveryTimeout();
      console.info("[Init] Applying locally persisted session snapshot while Supabase confirms auth state", {
        userId: nextSession.user.id,
        email: nextSession.user.email,
      });
      setState({ session: nextSession, ready: true });
    };

    const clearRecoveryTimeout = () => {
      if (recoveryTimeoutId !== null) {
        window.clearTimeout(recoveryTimeoutId);
        recoveryTimeoutId = null;
      }
    };

    const clearPersistedSession = () => {
      saveSession(null);
      console.info("[Init] User session updated", {
        authenticated: false,
        userId: null,
        email: null,
        source: "supabase",
      });
      setState({ session: null, ready: true });
    };

    const tryRecoverPersistedSession = async () => {
      try {
        const recoveredSession = await recoverSupabaseSession();
        if (cancelled) {
          return;
        }

        if (recoveredSession) {
          const nextSession = toStoredSession(recoveredSession);
          saveSession(nextSession);
          console.info("[Init] Supabase session recovered from persisted credentials", {
            userId: nextSession.user.id,
            email: nextSession.user.email,
          });
          setState({ session: nextSession, ready: true });
          return;
        }
      } catch (error) {
        if (!cancelled) {
          console.warn("[Init] Supabase session recovery failed", error);
        }
      }

      if (!cancelled) {
        clearPersistedSession();
      }
    };

    const applySupabaseSession = (session: Session | null) => {
      clearRecoveryTimeout();
      const nextSession = session ? toStoredSession(session) : null;
      if (nextSession) {
        saveSession(nextSession);
        console.info("[Init] User session updated", {
          authenticated: true,
          userId: nextSession.user.id,
          email: nextSession.user.email,
          source: "supabase",
        });
        setState({ session: nextSession, ready: true });
        return;
      }

      const previousSession = readStoredSession();
      if (previousSession && !isSessionExpired(previousSession)) {
        console.warn("[Init] Supabase session temporarily unavailable; keeping last known session during recovery window", {
          userId: previousSession.user.id,
          email: previousSession.user.email,
        });
        setState({ session: previousSession, ready: true });
        recoveryTimeoutId = window.setTimeout(() => {
          void tryRecoverPersistedSession();
        }, SESSION_RECOVERY_GRACE_MS);
        return;
      }

      clearPersistedSession();
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

      const previousSession = readStoredSession();
      if (previousSession && !isSessionExpired(previousSession)) {
        console.warn("[Init] No session returned on first read; attempting Supabase recovery before logout", {
          userId: previousSession.user.id,
          email: previousSession.user.email,
        });
        setState({ session: previousSession, ready: true });
        void tryRecoverPersistedSession();
        return;
      }

      applySupabaseSession(null);
    };

    void initialize();

    const { data: authListener } = client.auth.onAuthStateChange((_event, session) => {
      if (cancelled) {
        return;
      }

      applySupabaseSession(session);
    });

    const unsubscribeLocalSession = subscribeLocalKey(SESSION_KEY, applyStoredSessionSnapshot);

    return () => {
      cancelled = true;
      clearRecoveryTimeout();
      unsubscribeLocalSession();
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
  const normalizedEmail = normalizeEmail(email);
  const trimmedPassword = password.trim();

  if (!normalizedEmail) {
    throw new Error("Informe seu email.");
  }

  if (!trimmedPassword) {
    throw new Error("Informe sua senha.");
  }

  if (isSupabaseConfigured() && supabase) {
    const account = getDemoAccount(normalizedEmail);

    try {
      const session = await signInToSupabase(normalizedEmail, trimmedPassword);
      if (!session) {
        throw new Error("Nao foi possivel iniciar a sessao no Supabase.");
      }

      const storedSession = toStoredSession(session, account?.name);
      saveSession(storedSession);
      return storedSession;
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : String(error);
      if (account && shouldFallbackToLocalDemoAuth(rawMessage)) {
        const localSession = createLocalSession(account);
        saveSession(localSession);
        return localSession;
      }

      throw error;
    }
  }

  const account = getDemoAccount(normalizedEmail);
  if (!account) {
    throw new Error("Este ambiente local sem Supabase so aceita as contas demo configuradas.");
  }

  const storedPassword = getStoredPassword(account.email);
  const isValidPassword = trimmedPassword === account.password || (storedPassword !== null && trimmedPassword === storedPassword);
  if (!isValidPassword) {
    throw new Error("Credenciais invalidas.");
  }

  const localSession = createLocalSession(account);
  saveSession(localSession);
  return localSession;
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

  if (isSupabaseConfigured() && supabase) {
    return signInWithPassword(account.email, password);
  }

  return signInWithPassword(account.email, password);
}

export async function signInWithProfile(email: string, password?: string) {
  const account = getDemoAccount(email);
  if (!account) {
    throw new Error("Perfil indisponivel.");
  }

  const nextPassword = password?.trim();
  if (!nextPassword) {
    throw new Error("Informe a senha para entrar com este perfil.");
  }

  return signInWithPassword(account.email, nextPassword);
}

export async function updateDemoAccountPassword(userId: string, nextPassword: string) {
  const account = demoAccounts.find((item) => normalizeEmail(item.email) === normalizeEmail(userId));
  const trimmedPassword = nextPassword.trim();

  if (!trimmedPassword) {
    return;
  }

  if (isSupabaseConfigured() && supabase) {
    const { data } = await supabase.auth.getSession();
    if (normalizeEmail(data.session?.user.email ?? "") !== normalizeEmail(userId)) {
      throw new Error("A senha do Supabase so pode ser alterada pelo usuario autenticado.");
    }

    const { error } = await supabase.auth.updateUser({
      password: trimmedPassword,
    });

    if (error) {
      throw new Error(buildAuthErrorMessage(error.message, userId));
    }
  }

  if (!account) {
    return;
  }

  const currentPasswords = readPasswordMap();
  currentPasswords[account.email] = trimmedPassword;
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
