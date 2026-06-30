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
  mergeFallback?: boolean;
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

        if (options.mergeFallback && remote.hasRows && options.fallback.length > 0) {
          const remoteIds = new Set(remote.items.map((item) => item.id));
          const missingFallbackItems = options.fallback.filter((item) => !remoteIds.has(item.id));

          if (missingFallbackItems.length > 0) {
            const mergedItems = [...remote.items, ...missingFallbackItems];
            await persistRemoteRows(options.table, remote.items, mergedItems, currentUserId, userScoped);
            if (cancelled) {
              return;
            }

            commitValue(mergedItems);
            return;
          }
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
  }, [authReady, commitValue, currentUserId, isRemoteSourceAvailable, options.fallback, options.mergeFallback, options.seedOnEmpty, options.table, userScoped]);

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
  user_id?: string | null;
};

function getErrorMessage(error: unknown) {
  return error && typeof error === "object" && "message" in error ? String((error as { message?: unknown }).message ?? "") : "";
}

function isMissingSharedStateConstraint(error: unknown) {
  return /no unique or exclusion constraint matching the on conflict specification/i.test(getErrorMessage(error));
}

function isMissingColumnError(error: unknown, column: string) {
  const escapedColumn = column.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`column\\s+.*${escapedColumn}.*does not exist`, "i").test(getErrorMessage(error));
}

function isUserScopedSharedStateRequired(error: unknown) {
  return /(null value in column "user_id"|violates row-level security policy|new row violates row-level security policy)/i.test(
    getErrorMessage(error),
  );
}

async function fetchSharedStateRow<T>(key: string, currentUserId: string | null) {
  if (!supabase) {
    return { row: null as SharedStateRow<T> | null, error: null as { message: string } | null, mode: null as string | null };
  }

  const errors: string[] = [];

  if (currentUserId) {
    const scopedResult = await supabase
      .from("shared_state")
      .select("key, value, updated_at, user_id")
      .eq("key", key)
      .eq("user_id", currentUserId)
      .order("updated_at", { ascending: false })
      .limit(1);

    if (!scopedResult.error) {
      const scopedRow = (scopedResult.data?.[0] as SharedStateRow<T> | undefined) ?? null;
      if (scopedRow) {
        return {
          row: scopedRow,
          error: null,
          mode: "user-scoped",
        };
      }
    } else if (!isMissingColumnError(scopedResult.error, "user_id")) {
      errors.push(`user-scoped load failed: ${scopedResult.error.message}`);
    }
  }

  const globalResult = await supabase
    .from("shared_state")
    .select("key, value, updated_at")
    .eq("key", key)
    .order("updated_at", { ascending: false })
    .limit(1);

  return {
    row: (globalResult.data?.[0] as SharedStateRow<T> | undefined) ?? null,
    error:
      globalResult.error ??
      (errors.length > 0
        ? {
            message: errors.join(" | "),
          }
        : null),
    mode: globalResult.error ? null : "global",
  };
}

async function persistSharedStateValue<T>(key: string, value: T, currentUserId: string | null) {
  if (!supabase) {
    return { mode: "memory" as const };
  }

  const updatedAt = new Date().toISOString();
  const errors: string[] = [];

  if (currentUserId) {
    const scopedRow = {
      user_id: currentUserId,
      key,
      value,
      updated_at: updatedAt,
    };
    const scopedResult = await supabase.from("shared_state").upsert(scopedRow, { onConflict: "user_id,key" });

    if (!scopedResult.error) {
      return { mode: "user-scoped" as const };
    }

    errors.push(`user-scoped save failed: ${scopedResult.error.message}`);

    if (!isMissingSharedStateConstraint(scopedResult.error) && !isMissingColumnError(scopedResult.error, "user_id")) {
      if (!isUserScopedSharedStateRequired(scopedResult.error)) {
        throw scopedResult.error;
      }
    }
  }

  const globalRow = {
    key,
    value,
    updated_at: updatedAt,
  };
  const globalResult = await supabase.from("shared_state").upsert(globalRow, { onConflict: "key" });

  if (!globalResult.error) {
    return { mode: "global" as const };
  }

  errors.push(`global save failed: ${globalResult.error.message}`);

  if (!isMissingSharedStateConstraint(globalResult.error)) {
    throw new Error(errors.join(" | "));
  }

  const fallbackRow = currentUserId ? { ...globalRow, user_id: currentUserId } : globalRow;
  const { error: insertError } = await supabase.from("shared_state").insert(fallbackRow);
  if (insertError) {
    errors.push(`insert fallback failed: ${insertError.message}`);
    throw new Error(errors.join(" | "));
  }

  return { mode: currentUserId ? "user-scoped-insert" as const : "global-insert" as const };
}

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
  const currentUserId = session?.user.id ?? null;

  useEffect(() => {
    if (!authReady) {
      return;
    }

    if (!isSupabaseConfigured() || !supabaseClient || !session || isDemoSession(session)) {
      hydratedRef.current = true;
      setHydrated(true);
      return;
    }

    let cancelled = false;

    const loadRemote = async () => {
      const { row, error, mode } = await fetchSharedStateRow<T>(options.key, currentUserId);

      if (cancelled) {
        return;
      }

      if (error) {
        console.warn("Supabase shared_state load failed:", {
          key: options.key,
          userId: currentUserId,
          error: error.message,
        });
        hydratedRef.current = true;
        setHydrated(true);
        return;
      }

      const remoteValue = row?.value;
      if (typeof remoteValue !== "undefined") {
        console.info("[SharedState] Loaded remote value", {
          key: options.key,
          mode,
          userId: currentUserId,
        });
        lastRemoteSnapshotRef.current = JSON.stringify(remoteValue);
        setValue(remoteValue);
        hydratedRef.current = true;
        setHydrated(true);
        return;
      }

      let seedError: { message: string } | null = null;
      try {
        await persistSharedStateValue(options.key, options.fallback, currentUserId);
      } catch (error) {
        seedError = {
          message: getErrorMessage(error),
        };
      }

      if (cancelled) {
        return;
      }

      if (seedError) {
        console.warn("Supabase shared_state seed failed:", {
          key: options.key,
          userId: currentUserId,
          error: seedError.message,
        });
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
  }, [authReady, currentUserId, options.fallback, options.key, session, supabaseClient]);

  useEffect(() => {
    if (
      !hydratedRef.current ||
      !authReady ||
      !isSupabaseConfigured() ||
      !supabaseClient ||
      !session ||
      isDemoSession(session)
    ) {
      return;
    }

    const snapshot = JSON.stringify(value);
    if (snapshot === lastRemoteSnapshotRef.current) {
      return;
    }

    let cancelled = false;

    const persistRemote = async () => {
      try {
        const result = await persistSharedStateValue(options.key, value, currentUserId);
        if (cancelled) {
          return;
        }

        console.info("[SharedState] Saved remote value", {
          key: options.key,
          mode: result.mode,
          userId: currentUserId,
        });
        lastRemoteSnapshotRef.current = snapshot;
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error("Supabase shared_state save failed:", {
          key: options.key,
          userId: currentUserId,
          error: getErrorMessage(error),
        });

        const { row } = await fetchSharedStateRow<T>(options.key, currentUserId);
        if (cancelled) {
          return;
        }

        if (typeof row?.value !== "undefined") {
          const remoteSnapshot = JSON.stringify(row.value);
          lastRemoteSnapshotRef.current = remoteSnapshot;
          setValue(row.value);
          return;
        }

        lastRemoteSnapshotRef.current = JSON.stringify(options.fallback);
        setValue(options.fallback);
      }
    };

    void persistRemote();

    return () => {
      cancelled = true;
    };
  }, [authReady, currentUserId, options.fallback, options.key, session, supabaseClient, value]);

  useEffect(() => {
    if (!isSupabaseConfigured() || !supabaseClient || !session || isDemoSession(session)) {
      return;
    }

    let cancelled = false;

    const channel = supabaseClient
      .channel(`shared_state:${options.key}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shared_state", filter: `key=eq.${options.key}` },
        () => {
          void fetchSharedStateRow<T>(options.key, currentUserId).then(({ row, error, mode }) => {
            if (cancelled) {
              return;
            }

            if (error) {
              console.warn("Supabase shared_state realtime refresh failed:", {
                key: options.key,
                userId: currentUserId,
                error: error.message,
              });
              return;
            }

            const nextValue = row?.value;
            if (typeof nextValue === "undefined") {
              return;
            }

            const snapshot = JSON.stringify(nextValue);
            if (snapshot === lastRemoteSnapshotRef.current) {
              return;
            }

            console.info("[SharedState] Realtime refresh applied", {
              key: options.key,
              mode,
              userId: currentUserId,
            });
            lastRemoteSnapshotRef.current = snapshot;
            setValue(nextValue);
          }).catch((error) => {
            if (cancelled) {
              return;
            }

            console.warn("Supabase shared_state realtime refresh failed:", {
              key: options.key,
              userId: currentUserId,
              error: getErrorMessage(error),
            });
          });
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabaseClient.removeChannel(channel);
    };
  }, [currentUserId, options.key, session, supabaseClient]);

  return [value, setValue, hydrated] as const;
}
