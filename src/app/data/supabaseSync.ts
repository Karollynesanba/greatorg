import { useEffect, useRef, useState } from "react";
import { isSupabaseConfigured, supabase } from "./supabase";

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

export function useSupabaseSyncedListState<T extends { id: number }>(options: {
  key: string;
  table: string;
  fallback: T[];
}) {
  const [value, setValue] = useState<T[]>(options.fallback);
  const [hydrated, setHydrated] = useState(!isSupabaseConfigured());
  const hydratedRef = useRef(false);
  const lastRemoteSnapshotRef = useRef<string | null>(null);
  const lastRemoteIdsRef = useRef<number[]>([]);
  const supabaseClient = supabase;

  useEffect(() => {
    if (!isSupabaseConfigured() || !supabaseClient) {
      return;
    }

    let cancelled = false;

    const loadRemote = async () => {
      const { data, error } = await supabaseClient
        .from(options.table)
        .select("id, sort_order, data")
        .order("sort_order", { ascending: true })
        .order("id", { ascending: true });

      if (cancelled) {
        return;
      }

      if (error) {
        console.warn(`Supabase ${options.table} load failed:`, error.message);
        hydratedRef.current = true;
        setHydrated(true);
        return;
      }

      const remoteItems = (data ?? [])
        .map((row) => row.data)
        .filter((item): item is T => Boolean(item) && normalizeId((item as { id?: unknown }).id) !== null);

      if (remoteItems.length > 0) {
        lastRemoteSnapshotRef.current = JSON.stringify(remoteItems);
        lastRemoteIdsRef.current = remoteItems.map((item) => item.id);
        setValue(remoteItems);
        hydratedRef.current = true;
        setHydrated(true);
        return;
      }

      const seedRows = options.fallback.map((item, index) => toRowEnvelope(item, index));
      const { error: seedError } = await supabaseClient.from(options.table).upsert(seedRows, {
        onConflict: "id",
      });

      if (cancelled) {
        return;
      }

      if (seedError) {
        console.warn(`Supabase ${options.table} seed failed:`, seedError.message);
        hydratedRef.current = true;
        setHydrated(true);
        return;
      }

      lastRemoteSnapshotRef.current = JSON.stringify(options.fallback);
      lastRemoteIdsRef.current = options.fallback.map((item) => item.id);
      setValue(options.fallback);
      hydratedRef.current = true;
      setHydrated(true);
    };

    void loadRemote();

    return () => {
      cancelled = true;
    };
  }, [options.fallback, options.table, supabaseClient, setValue]);

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
      const rows = value.map((item, index) => toRowEnvelope(item, index));
      const currentIds = value.map((item) => item.id);

      const { error: upsertError } = await supabaseClient.from(options.table).upsert(rows, {
        onConflict: "id",
      });

      if (cancelled) {
        return;
      }

      if (upsertError) {
        console.warn(`Supabase ${options.table} save failed:`, upsertError.message);
        return;
      }

      const removedIds = lastRemoteIdsRef.current.filter((id) => !currentIds.includes(id));

      if (removedIds.length > 0) {
        const { error: deleteError } = await supabaseClient.from(options.table).delete().in("id", removedIds);

        if (!cancelled && deleteError) {
          console.warn(`Supabase ${options.table} cleanup failed:`, deleteError.message);
        }
      }

      lastRemoteSnapshotRef.current = snapshot;
      lastRemoteIdsRef.current = currentIds;
    };

    void persistRemote();

    return () => {
      cancelled = true;
    };
  }, [options.table, supabaseClient, value]);

  return [value, setValue, hydrated] as const;
}
