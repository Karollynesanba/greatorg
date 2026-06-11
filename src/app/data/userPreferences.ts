import { useEffect, useRef, useState } from "react";
import { useAuthSession } from "../auth";
import { isSupabaseConfigured, supabase } from "./supabase";
import { subscribeSharedChannel } from "./supabaseRealtime";

function snapshotOf<T>(value: T) {
  return JSON.stringify(value);
}

export function useSupabasePreference<T>(key: string, fallback: T) {
  const { session, ready: authReady } = useAuthSession();
  const [value, setValue] = useState<T>(fallback);
  const [ready, setReady] = useState(false);
  const lastSavedSnapshotRef = useRef<string | null>(null);
  useEffect(() => {
    if (!authReady) {
      return;
    }

    if (!isSupabaseConfigured() || !supabase || !session) {
      setValue(fallback);
      lastSavedSnapshotRef.current = snapshotOf(fallback);
      setReady(true);
      return;
    }

    const client = supabase;
    let cancelled = false;

    const loadPreference = async () => {
      try {
        const { data, error } = await client
          .from("app_preferences")
          .select("value")
          .eq("user_id", session.user.id)
          .eq("key", key)
          .maybeSingle();

        if (cancelled) {
          return;
        }

        if (error) {
          throw error;
        }

        if (typeof data?.value !== "undefined") {
          const loadedValue = data.value as T;
          setValue(loadedValue);
          lastSavedSnapshotRef.current = snapshotOf(loadedValue);
          setReady(true);
          return;
        }

        const { data: legacyData, error: legacyError } = await client
          .from("shared_state")
          .select("value")
          .eq("key", key)
          .maybeSingle();

        if (cancelled) {
          return;
        }

        if (legacyError) {
          throw legacyError;
        }

        const loadedValue = (legacyData?.value as T | undefined) ?? fallback;
        setValue(loadedValue);
        lastSavedSnapshotRef.current = snapshotOf(loadedValue);
        setReady(true);

        const { error: seedError } = await client.from("app_preferences").upsert(
          {
            user_id: session.user.id,
            key,
            value: loadedValue,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id,key",
          },
        );

        if (cancelled) {
          return;
        }

        if (seedError) {
          console.warn(`Failed to seed preference ${key}`, seedError.message);
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error(`Failed to load preference ${key}`, error);
        setValue(fallback);
        lastSavedSnapshotRef.current = snapshotOf(fallback);
        setReady(true);
      }
    };

    void loadPreference();

    const unsubscribe = subscribeSharedChannel(
      `great-organico:pref:${key}`,
      (channel, dispatch) => {
        channel.on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "app_preferences",
          },
          (payload) => {
            const row = payload.new as { user_id?: string; key?: string; value?: T } | null;
            if (row?.user_id !== session.user.id || row?.key !== key) {
              return;
            }

            const nextValue = row.value ?? fallback;
            setValue(nextValue);
            lastSavedSnapshotRef.current = snapshotOf(nextValue);
            setReady(true);
            dispatch();
          },
        );
      },
      () => {
        void loadPreference();
      },
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [authReady, fallback, key, session?.user.id]);

  useEffect(() => {
    if (!ready) {
      return;
    }

    const nextSnapshot = snapshotOf(value);
    if (nextSnapshot === lastSavedSnapshotRef.current) {
      return;
    }

    if (!isSupabaseConfigured() || !supabase || !session) {
      return;
    }

    const client = supabase;

    void (async () => {
      const { error } = await client.from("app_preferences").upsert(
        {
          user_id: session.user.id,
          key,
          value,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,key",
        },
      );

      if (error) {
        throw error;
      }

      lastSavedSnapshotRef.current = nextSnapshot;
    })().catch((error: unknown) => {
      console.error(`Failed to sync preference ${key}`, error);
    });
  }, [key, ready, session, value]);

  return [value, setValue, ready] as const;
}
