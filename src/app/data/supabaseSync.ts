import { useCallback, useEffect, useRef, useState } from "react";
import { isDemoSession, useAuthSession } from "../auth";
import { isSupabaseConfigured, supabase } from "./supabase";
import { subscribeSharedChannel } from "./supabaseRealtime";

type RowEnvelope<T> = {
  id: number;
  user_id?: string | null;
  sort_order: number;
  data: T;
};

function normalizeId(value: unknown) {
  const parsed = typeof value === "string" ? Number(value) : typeof value === "number" ? value : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function toRowEnvelope<T extends { id: number }>(item: T, sortOrder: number): RowEnvelope<T> {
  return {
    id: item.id,
    sort_order: sortOrder,
    data: item,
  };
}

function snapshotOf<T>(value: T) {
  return JSON.stringify(value);
}

async function fetchRemoteRows<T extends { id: number }>(
  table: string,
  currentUserId: string | null,
  userScoped: boolean,
) {
  if (!supabase || (userScoped && !currentUserId)) {
    return { items: [] as T[], hasRows: false };
  }

  try {
    let query = supabase
      .from(table)
      .select(userScoped ? "id, user_id, sort_order, data" : "id, sort_order, data")
      .order("sort_order", {
        ascending: true,
      });

    if (userScoped) {
      query = query.eq("user_id", currentUserId);
    }

    const { data, error } = await (query as unknown as Promise<{ data: RowEnvelope<T>[] | null; error: { message: string } | null }>);

    if (error) {
      throw error;
    }

    const rows = data ?? [];
    const items = rows
      .map((row) => row.data as T)
      .filter((item): item is T => Boolean(item) && normalizeId((item as { id?: unknown }).id) !== null);

    return {
      items,
      hasRows: true,
    };
  } catch (error) {
    console.error(`Failed to load ${table} from Supabase`, error);
    return { items: [] as T[], hasRows: false };
  }
}

async function persistRemoteRows<T extends { id: number }>(
  table: string,
  previousValue: T[],
  nextValue: T[],
  currentUserId: string | null,
  userScoped: boolean,
) {
  if (!supabase || nextValue.length === 0 && previousValue.length === 0) {
    return;
  }

  const client = supabase;
  const rows = nextValue.map((item, index) => ({
    ...toRowEnvelope(item, index),
    ...(userScoped ? { user_id: currentUserId } : {}),
  }));
  const nextIds = new Set(nextValue.map((item) => item.id));
  const removedIds = previousValue.map((item) => item.id).filter((id) => !nextIds.has(id));

  if (rows.length > 0) {
    const { error } = await client.from(table).upsert(rows, { onConflict: "id" });
    if (error) {
      throw error;
    }
  }

  if (removedIds.length > 0) {
    let deleteQuery = client.from(table).delete();

    if (userScoped) {
      deleteQuery = deleteQuery.eq("user_id", currentUserId);
    }

    const { error } = await deleteQuery.in("id", removedIds);
    if (error) {
      throw error;
    }
  }
}

export function useSupabaseSyncedListState<T extends { id: number }>(options: {
  key: string;
  table: string;
  fallback: T[];
  userScoped?: boolean;
  seedOnEmpty?: boolean;
}) {
  const { session, ready: authReady } = useAuthSession();
  const [value, setValue] = useState<T[]>(options.fallback);
  const [hydrated, setHydrated] = useState(false);
  const hydratedRef = useRef(false);
  const lastSavedSnapshotRef = useRef<string | null>(null);
  const lastPersistedValueRef = useRef<T[]>(options.fallback);
  const isRemoteSourceAvailable = isSupabaseConfigured() && Boolean(supabase) && Boolean(session) && !isDemoSession(session);
  const currentUserId = session?.user.id ?? null;
  const userScoped = options.userScoped ?? false;

  const loadValue = useCallback(async () => {
    if (!authReady) {
      return options.fallback;
    }

    if (!isRemoteSourceAvailable) {
      return options.fallback;
    }

    const remote = await fetchRemoteRows<T>(options.table, currentUserId, userScoped);
    if (!remote.hasRows) {
      return lastPersistedValueRef.current.length > 0 ? lastPersistedValueRef.current : options.fallback;
    }

    return remote.items;
  }, [authReady, currentUserId, isRemoteSourceAvailable, options.fallback, options.table, userScoped]);

  const commitValue = useCallback((nextValue: T[]) => {
    setValue(nextValue);
    console.info("[Init] List data loaded", {
      table: options.table,
      count: nextValue.length,
      source: isRemoteSourceAvailable ? "supabase" : "memory",
      userId: currentUserId,
    });
    lastSavedSnapshotRef.current = snapshotOf(nextValue);
    lastPersistedValueRef.current = nextValue;
    hydratedRef.current = true;
    setHydrated(true);
    return nextValue;
  }, [currentUserId, isRemoteSourceAvailable, options.table]);

  const reload = useCallback(async () => {
    if (!authReady) {
      return value;
    }

    const nextValue = await loadValue();
    return commitValue(nextValue);
  }, [authReady, commitValue, loadValue, value]);

  useEffect(() => {
    if (!authReady) {
      return;
    }

    if (!isRemoteSourceAvailable) {
      commitValue(options.fallback);
      return;
    }

    let cancelled = false;

    const loadRemote = async () => {
      try {
        const remote = await fetchRemoteRows<T>(options.table, currentUserId, userScoped);

        if (
          options.seedOnEmpty &&
          remote.hasRows &&
          remote.items.length === 0 &&
          options.fallback.length > 0
        ) {
          await persistRemoteRows(options.table, [], options.fallback, currentUserId, userScoped);
          if (cancelled) {
            return;
          }

          commitValue(options.fallback);
          return;
        }

        const nextValue =
          !remote.hasRows
            ? lastPersistedValueRef.current.length > 0
              ? lastPersistedValueRef.current
              : options.fallback
            : remote.items;

        if (cancelled) {
          return;
        }

        commitValue(nextValue);
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error(`Unexpected failure loading ${options.table}`, error);
        commitValue(lastPersistedValueRef.current.length > 0 ? lastPersistedValueRef.current : options.fallback);
      }
    };

    void loadRemote().catch((error) => {
      console.error(`Unexpected failure loading ${options.table}`, error);
    });

    const unsubscribe = subscribeSharedChannel(
      `great-organico:${options.table}`,
      (channel, dispatch) => {
        channel.on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: options.table,
          },
          () => {
            dispatch();
          },
        );
      },
      () => {
        void loadRemote();
      },
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [authReady, commitValue, currentUserId, isRemoteSourceAvailable, options.fallback, options.seedOnEmpty, options.table, userScoped]);

  useEffect(() => {
    if (!hydratedRef.current) {
      return;
    }

    const snapshot = snapshotOf(value);
    if (snapshot === lastSavedSnapshotRef.current) {
      return;
    }

    if (!isSupabaseConfigured() || !supabase || !session) {
      return;
    }

    const previousValue = lastPersistedValueRef.current;

    void persistRemoteRows(options.table, previousValue, value, currentUserId, userScoped)
      .then(() => {
        lastSavedSnapshotRef.current = snapshot;
        lastPersistedValueRef.current = value;
      })
      .catch((error) => {
        // Keep the optimistic local state so the UI stays responsive.
        console.error(`Failed to sync ${options.table} to Supabase`, error);
      });
  }, [currentUserId, options.table, session, userScoped, value]);

  return [value, setValue, hydrated, reload] as const;
}

type SharedStateRow<T> = {
  key: string;
  value: T;
  updated_at?: string;
};

export function useSupabaseSharedState<T>(options: {
  key: string;
  fallback: T;
}) {
  const { session, ready: authReady } = useAuthSession();
  const [value, setValue] = useState<T>(options.fallback);
  const [hydrated, setHydrated] = useState(!isSupabaseConfigured());
  const hydratedRef = useRef(false);
  const lastRemoteSnapshotRef = useRef<string | null>(null);
  const supabaseClient = supabase;

  useEffect(() => {
    if (!authReady || !isSupabaseConfigured() || !supabaseClient || !session || isDemoSession(session)) {
      hydratedRef.current = true;
      setHydrated(true);
      return;
    }

    let cancelled = false;

    const loadRemote = async () => {
      const { data, error } = await supabaseClient
        .from("shared_state")
        .select("key, value, updated_at")
        .eq("key", options.key)
        .maybeSingle();

      if (cancelled) {
        return;
      }

      if (error) {
        console.warn("Supabase shared_state load failed:", error.message);
        hydratedRef.current = true;
        setHydrated(true);
        return;
      }

      const remoteValue = (data as SharedStateRow<T> | null)?.value;
      if (typeof remoteValue !== "undefined") {
        lastRemoteSnapshotRef.current = JSON.stringify(remoteValue);
        setValue(remoteValue);
        hydratedRef.current = true;
        setHydrated(true);
        return;
      }

      const { error: seedError } = await supabaseClient.from("shared_state").upsert(
        {
          key: options.key,
          value: options.fallback,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" },
      );

      if (cancelled) {
        return;
      }

      if (seedError) {
        console.warn("Supabase shared_state seed failed:", seedError.message);
      }

      lastRemoteSnapshotRef.current = JSON.stringify(options.fallback);
      setValue(options.fallback);
      hydratedRef.current = true;
      setHydrated(true);
    };

    void loadRemote();

    return () => {
      cancelled = true;
    };
  }, [authReady, options.fallback, options.key, supabaseClient]);

  useEffect(() => {
    if (!hydratedRef.current || !isSupabaseConfigured() || !supabaseClient) {
      return;
    }

    const snapshot = JSON.stringify(value);
    if (snapshot === lastRemoteSnapshotRef.current) {
      return;
    }

    let cancelled = false;

    const persistRemote = async () => {
      const { error } = await supabaseClient.from("shared_state").upsert(
        {
          key: options.key,
          value,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" },
      );

      if (cancelled) {
        return;
      }

      if (error) {
        console.warn("Supabase shared_state save failed:", error.message);
        return;
      }

      lastRemoteSnapshotRef.current = snapshot;
    };

    void persistRemote();

    return () => {
      cancelled = true;
    };
  }, [options.key, supabaseClient, value]);

  useEffect(() => {
    if (!isSupabaseConfigured() || !supabaseClient || !session || isDemoSession(session)) {
      return;
    }

    const channel = supabaseClient
      .channel(`shared_state:${options.key}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shared_state", filter: `key=eq.${options.key}` },
        (payload) => {
          const nextValue = (payload.new as SharedStateRow<T> | null)?.value;
          const nextKey = (payload.new as SharedStateRow<T> | null)?.key;
          if (nextKey !== options.key) {
            return;
          }
          if (typeof nextValue === "undefined") {
            return;
          }

          const snapshot = JSON.stringify(nextValue);
          if (snapshot === lastRemoteSnapshotRef.current) {
            return;
          }

          lastRemoteSnapshotRef.current = snapshot;
          setValue(nextValue);
        },
      )
      .subscribe();

    return () => {
      void supabaseClient.removeChannel(channel);
    };
  }, [options.key, supabaseClient]);

  return [value, setValue, hydrated] as const;
}
