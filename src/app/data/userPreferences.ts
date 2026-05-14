import { useEffect, useMemo, useRef, useState } from "react";
import { useAuthSession } from "../auth";
import { supabase } from "./supabase";

type AppPreferenceRow<T> = {
  user_id: string;
  key: string;
  value: T;
  updated_at?: string;
};

function snapshotOf<T>(value: T) {
  return JSON.stringify(value);
}

export function useSupabasePreference<T>(key: string, fallback: T) {
  const { session, ready: authReady } = useAuthSession();
  const [value, setValue] = useState<T>(fallback);
  const [ready, setReady] = useState(false);
  const lastSavedSnapshotRef = useRef<string | null>(null);
  const supabaseClient = supabase;
  const fallbackSnapshot = useMemo(() => snapshotOf(fallback), [fallback]);

  useEffect(() => {
    if (!authReady) {
      return;
    }

    if (!supabaseClient || !session?.user.id) {
      setValue(fallback);
      setReady(true);
      lastSavedSnapshotRef.current = fallbackSnapshot;
      return;
    }

    let cancelled = false;

    const loadPreference = async () => {
      const { data, error } = await supabaseClient
        .from("app_preferences")
        .select("value")
        .eq("user_id", session.user.id)
        .eq("key", key)
        .maybeSingle();

      if (cancelled) {
        return;
      }

      if (error) {
        console.warn(`Supabase preference ${key} load failed:`, error.message);
        setValue(fallback);
        lastSavedSnapshotRef.current = fallbackSnapshot;
        setReady(true);
        return;
      }

      const loadedValue = (data?.value ?? fallback) as T;
      setValue(loadedValue);
      lastSavedSnapshotRef.current = snapshotOf(loadedValue);
      setReady(true);
    };

    void loadPreference();

    return () => {
      cancelled = true;
    };
  }, [authReady, fallback, fallbackSnapshot, key, session?.user.id, supabaseClient]);

  useEffect(() => {
    if (!ready || !supabaseClient || !session?.user.id) {
      return;
    }

    const nextSnapshot = snapshotOf(value);
    if (nextSnapshot === lastSavedSnapshotRef.current) {
      return;
    }

    let cancelled = false;

    const persistPreference = async () => {
      const row: AppPreferenceRow<T> = {
        user_id: session.user.id,
        key,
        value,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabaseClient.from("app_preferences").upsert(row, {
        onConflict: "user_id,key",
      });

      if (cancelled) {
        return;
      }

      if (error) {
        console.warn(`Supabase preference ${key} save failed:`, error.message);
        return;
      }

      lastSavedSnapshotRef.current = nextSnapshot;
    };

    void persistPreference();

    return () => {
      cancelled = true;
    };
  }, [key, ready, session?.user.id, supabaseClient, value]);

  return [value, setValue, ready] as const;
}
