import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthSession } from "../auth";
import { useSharedState } from "./sharedState";
import { isSupabaseConfigured, supabase } from "./supabase";
import { subscribeSharedChannel } from "./supabaseRealtime";

type RowEnvelope<T> = {
  id: number;
  user_id?: string | null;
  sort_order: number;
  data: T;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  archived_at?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  archived_by?: string | null;
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
  if (!supabase || !currentUserId) {
    return { items: [] as T[], hasRows: false };
  }

  try {
    let query = supabase
      .from(table)
      .select("id, user_id, sort_order, data, deleted_at, archived_at")
      .order("sort_order", {
        ascending: true,
      });

    if (userScoped) {
      query = query.eq("user_id", currentUserId);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    const rows = data ?? [];
    const items = rows
      .map((row) => row.data as T)
      .filter((_, index) => {
        const row = rows[index] as { deleted_at?: string | null; archived_at?: string | null } | undefined;
        return !row?.deleted_at && !row?.archived_at;
      })
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
  const timestamp = new Date().toISOString();
  const rows = nextValue.map((item, index) => ({
    ...toRowEnvelope(item, index),
    user_id: currentUserId,
    deleted_at: null,
    archived_at: null,
    updated_at: timestamp,
    updated_by: currentUserId,
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
    let query = client.from(table).update({
      deleted_at: timestamp,
      updated_at: timestamp,
      updated_by: currentUserId,
    });

    if (userScoped) {
      query = query.eq("user_id", currentUserId);
    }

    const { error } = await query.in("id", removedIds);
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
}) {
  const { session, ready: authReady } = useAuthSession();
  const [value, setValue] = useState<T[]>(options.fallback);
  const [hydrated, setHydrated] = useState(false);
  const hydratedRef = useRef(false);
  const lastSavedSnapshotRef = useRef<string | null>(null);
  const lastPersistedValueRef = useRef<T[]>(options.fallback);
  const isRemoteSourceAvailable = isSupabaseConfigured() && Boolean(supabase) && Boolean(session);
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
    return remote.hasRows ? remote.items : [];
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
        const nextValue = await loadValue();

        if (cancelled) {
          return;
        }

        commitValue(nextValue);
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error(`Unexpected failure loading ${options.table}`, error);
        commitValue([]);
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
  }, [authReady, commitValue, isRemoteSourceAvailable, loadValue, options.fallback, options.table]);

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
  user_id: string;
  key: string;
  value: T;
  updated_at?: string;
};

export function useSupabaseSharedState<T>(options: {
  key: string;
  fallback: T;
}) {
  const { session, ready: authReady } = useAuthSession();
  const sharedState = useSharedState(options.key, options.fallback);
  const [value, setValue] = sharedState;
  const [hydrated, setHydrated] = useState(!isSupabaseConfigured());
  const hydratedRef = useRef(false);
  const lastRemoteSnapshotRef = useRef<string | null>(null);
  const supabaseClient = supabase;
  const currentUserId = session?.user.id ?? null;

  useEffect(() => {
    if (!authReady || !isSupabaseConfigured() || !supabaseClient || !currentUserId) {
      hydratedRef.current = true;
      setHydrated(true);
      return;
    }

    let cancelled = false;

    const loadRemote = async () => {
      const { data, error } = await supabaseClient
        .from("shared_state")
        .select("user_id, key, value, updated_at")
        .eq("user_id", currentUserId)
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
          user_id: currentUserId,
          key: options.key,
          value: options.fallback,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,key" },
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
  }, [authReady, currentUserId, options.fallback, options.key, supabaseClient, setValue]);

  useEffect(() => {
    if (!hydratedRef.current || !isSupabaseConfigured() || !supabaseClient || !currentUserId) {
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
          user_id: currentUserId,
          key: options.key,
          value,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,key" },
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
  }, [currentUserId, options.key, supabaseClient, value]);

  useEffect(() => {
    if (!isSupabaseConfigured() || !supabaseClient || !currentUserId) {
      return;
    }

    const channel = supabaseClient
      .channel(`shared_state:${currentUserId}:${options.key}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shared_state", filter: `user_id=eq.${currentUserId}` },
        (payload) => {
          const nextValue = (payload.new as SharedStateRow<T> | null)?.value;
          const nextUserId = (payload.new as SharedStateRow<T> | null)?.user_id;
          const nextKey = (payload.new as SharedStateRow<T> | null)?.key;
          if (nextUserId !== currentUserId || nextKey !== options.key) {
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
  }, [currentUserId, options.key, supabaseClient, setValue]);

  return [...sharedState, hydrated] as const;
}
