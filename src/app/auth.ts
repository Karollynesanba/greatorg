import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./data/supabase";

export type AuthState = {
  session: Session | null;
  ready: boolean;
};

function getAuthClient() {
  return supabase;
}

export function useAuthSession() {
  const [state, setState] = useState<AuthState>({
    session: null,
    ready: false,
  });

  useEffect(() => {
    const client = getAuthClient();
    if (!client) {
      setState({ session: null, ready: true });
      return undefined;
    }

    let cancelled = false;

    const loadSession = async () => {
      const { data } = await client.auth.getSession();

      if (!cancelled) {
        setState({ session: data.session, ready: true });
      }
    };

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      setState({ session, ready: true });
    });

    void loadSession();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return state;
}

export async function signInWithPassword(email: string, password: string) {
  const client = getAuthClient();
  if (!client) {
    throw new Error("Supabase not configured.");
  }

  const { data, error } = await client.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    throw error;
  }

  if (!data.session) {
    throw new Error("Não foi possível iniciar a sessão.");
  }

  return data.session;
}

export async function signOut() {
  const client = getAuthClient();
  if (!client) {
    return;
  }

  await client.auth.signOut();
}
