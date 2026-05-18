import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuthSession } from "../auth";
import { isSupabaseConfigured, supabase } from "./supabase";
import { readLocalJson, subscribeLocalKey, writeLocalJson } from "./localStore";
import { subscribeSharedChannel } from "./supabaseRealtime";

type RowEnvelope<T> = {
  id: number;
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

async function fetchRemoteRows<T extends { id: number }>(table: string, fallback: T[]) {
  if (!supabase) {
    return fallback;
  }

  try {
    const client = supabase;
    const { data, error } = await client.from(table).select("id, sort_order, data").order("sort_order", {
      ascending: true,
    });

    if (error) {
      throw error;
    }

    return (data ?? [])
      .map((row) => row.data as T)
      .filter((item): item is T => Boolean(item) && normalizeId((item as { id?: unknown }).id) !== null);
  } catch (error) {
    console.error(`Failed to load ${table} from Supabase`, error);
    return fallback;
  }
}

async function persistRemoteRows<T extends { id: number }>(
  table: string,
  previousValue: T[],
  nextValue: T[],
) {
  if (!supabase || nextValue.length === 0 && previousValue.length === 0) {
    return;
  }

  const client = supabase;
  const rows = nextValue.map((item, index) => toRowEnvelope(item, index));
  const nextIds = new Set(nextValue.map((item) => item.id));
  const removedIds = previousValue.map((item) => item.id).filter((id) => !nextIds.has(id));

  if (rows.length > 0) {
    const { error } = await client.from(table).upsert(rows, { onConflict: "id" });
    if (error) {
      throw error;
    }
  }

  if (removedIds.length > 0) {
    const { error } = await client.from(table).delete().in("id", removedIds);
    if (error) {
      throw error;
    }
  }
}

export function useSupabaseSyncedListState<T extends { id: number }>(options: {
  key: string;
  table: string;
  fallback: T[];
}) {
  const { session, ready: authReady } = useAuthSession();
  const storageKey = useMemo(
    () => `great-organico:list:${session?.user.id ?? "guest"}:${options.table}`,
    [options.table, session?.user.id],
  );
  const [value, setValue] = useState<T[]>(options.fallback);
  const [hydrated, setHydrated] = useState(false);
  const hydratedRef = useRef(false);
  const lastSavedSnapshotRef = useRef<string | null>(null);
  const lastPersistedValueRef = useRef<T[]>(options.fallback);
  const isRemoteSourceAvailable = isSupabaseConfigured() && Boolean(supabase) && Boolean(session);

  const readLocalValue = useCallback(() => {
    const loadedRows = readLocalJson<RowEnvelope<T>[]>(storageKey, options.fallback.map((item, index) => toRowEnvelope(item, index)));
    const loadedItems = loadedRows
      .map((row) => row.data)
      .filter((item): item is T => Boolean(item) && normalizeId((item as { id?: unknown }).id) !== null);

    return loadedItems.length > 0 ? loadedItems : options.fallback;
  }, [options.fallback, storageKey]);

  const loadValue = useCallback(async () => {
    if (!authReady) {
      return options.fallback;
    }

    if (!isRemoteSourceAvailable) {
      return readLocalValue();
    }

    const nextValue = await fetchRemoteRows<T>(options.table, options.fallback);
    return nextValue.length > 0 ? nextValue : options.fallback;
  }, [authReady, isRemoteSourceAvailable, options.fallback, options.table, readLocalValue]);

  const commitValue = useCallback((nextValue: T[]) => {
    setValue(nextValue);
    lastSavedSnapshotRef.current = snapshotOf(nextValue);
    lastPersistedValueRef.current = nextValue;
    hydratedRef.current = true;
    setHydrated(true);
    return nextValue;
  }, []);

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
      commitValue(readLocalValue());

      return subscribeLocalKey(storageKey, () => {
        commitValue(readLocalValue());
      });
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
        commitValue(options.fallback);
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
  }, [authReady, commitValue, isRemoteSourceAvailable, loadValue, options.fallback, options.table, readLocalValue, storageKey]);

  useEffect(() => {
    if (!hydratedRef.current) {
      return;
    }

    const snapshot = snapshotOf(value);
    if (snapshot === lastSavedSnapshotRef.current) {
      return;
    }

    if (!isSupabaseConfigured() || !supabase || !session) {
      const rows = value.map((item, index) => toRowEnvelope(item, index));
      writeLocalJson(storageKey, rows);
      lastSavedSnapshotRef.current = snapshot;
      lastPersistedValueRef.current = value;
      return;
    }

    const previousValue = lastPersistedValueRef.current;

    void persistRemoteRows(options.table, previousValue, value)
      .then(() => {
        lastSavedSnapshotRef.current = snapshot;
        lastPersistedValueRef.current = value;
      })
      .catch((error) => {
        // Keep the optimistic local state so the UI stays responsive.
        console.error(`Failed to sync ${options.table} to Supabase`, error);
      });
  }, [options.table, session, storageKey, value]);

  return [value, setValue, hydrated, reload] as const;
}
