import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuthSession } from "../auth";
import { isSupabaseConfigured, supabase } from "./supabase";
import { subscribeSharedChannel } from "./supabaseRealtime";

export const defaultMonthlyViewsGoal = 800000;

const seededViewsByDate: Record<string, number> = {
  "2026-06-01": 20404,
  "2026-06-02": 15181,
  "2026-06-03": 16794,
  "2026-06-04": 6964,
  "2026-06-05": 22258,
  "2026-06-06": 10122,
  "2026-06-07": 12145,
  "2026-06-08": 17387,
  "2026-06-09": 17281,
  "2026-06-10": 16994,
  "2026-06-11": 24475,
  "2026-06-12": 22120,
  "2026-06-13": 8966,
  "2026-06-14": 5952,
};

type CalendarDayMetricRow = {
  id: number;
  user_id: string;
  metric_date: string;
  views: number;
  reach: number;
  created_at?: string;
  updated_at?: string;
};

export type CalendarDayMetricRecord = {
  id: number;
  userId?: string;
  date: string;
  views: number;
  reach: number;
  createdAt?: string;
  updatedAt?: string;
};

function snapshotOf(value: CalendarDayMetricRecord[]) {
  return JSON.stringify(value);
}

function normalizeDateKey(value: string) {
  return value.slice(0, 10);
}

function normalizeMetricValue(value: unknown) {
  return Math.max(0, Math.round(Number(value) || 0));
}

function toRecord(row: CalendarDayMetricRow): CalendarDayMetricRecord {
  return {
    id: row.id,
    userId: row.user_id,
    date: normalizeDateKey(row.metric_date),
    views: normalizeMetricValue(row.views),
    reach: normalizeMetricValue(row.reach),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(record: CalendarDayMetricRecord, userId: string) {
  return {
    id: record.id,
    user_id: userId,
    metric_date: normalizeDateKey(record.date),
    views: normalizeMetricValue(record.views),
    reach: normalizeMetricValue(record.reach),
    updated_at: new Date().toISOString(),
  };
}

function sortRecords(records: CalendarDayMetricRecord[]) {
  return [...records].sort((left, right) => left.date.localeCompare(right.date));
}

function mergeSeededMetrics(records: CalendarDayMetricRecord[]) {
  const byDate = new Map(records.map((record) => [record.date, record] as const));
  let nextId = Math.max(...records.map((record) => record.id), 0) + 1;
  let changed = false;

  for (const [date, views] of Object.entries(seededViewsByDate)) {
    if (byDate.has(date)) {
      continue;
    }

    byDate.set(date, {
      id: nextId++,
      date,
      views,
      reach: 0,
    });
    changed = true;
  }

  return {
    changed,
    records: sortRecords([...byDate.values()]),
  };
}

function recordsToMaps(records: CalendarDayMetricRecord[]) {
  return records.reduce(
    (accumulator, record) => {
      accumulator.viewsByDate[record.date] = record.views;
      accumulator.reachByDate[record.date] = record.reach;
      return accumulator;
    },
    {
      viewsByDate: {} as Record<string, number>,
      reachByDate: {} as Record<string, number>,
    },
  );
}

function mergeMetricMap(
  records: CalendarDayMetricRecord[],
  nextMap: Record<string, number>,
  metric: "views" | "reach",
) {
  const byDate = new Map(records.map((record) => [record.date, { ...record }] as const));
  const nextDates = new Set(Object.keys(nextMap));
  const dates = new Set([...byDate.keys(), ...nextDates]);
  let nextId = Math.max(...records.map((record) => record.id), 0) + 1;

  const nextRecords = [...dates].map((date) => {
    const existing = byDate.get(date);
    const currentRecord = existing ?? {
      id: nextId++,
      date,
      views: 0,
      reach: 0,
    };

    return {
      ...currentRecord,
      [metric]: normalizeMetricValue(nextMap[date] ?? currentRecord[metric]),
    };
  });

  return sortRecords(nextRecords);
}

export function sumMonthViews(dayViewsByDate: Record<string, number>, monthKey: string) {
  return Object.entries(dayViewsByDate).reduce((sum, [dateKey, value]) => {
    return dateKey.startsWith(monthKey) ? sum + Math.max(0, value) : sum;
  }, 0);
}

export function useCalendarDayMetrics() {
  const { session, ready: authReady } = useAuthSession();
  const [records, setRecords] = useState<CalendarDayMetricRecord[]>([]);
  const [ready, setReady] = useState(false);
  const hydratedRef = useRef(false);
  const lastSavedSnapshotRef = useRef<string | null>(null);
  const lastPersistedIdsRef = useRef<Set<number>>(new Set());
  const supabaseClient = supabase;

  const syncFromRemote = useCallback(async () => {
    if (!authReady) {
      return;
    }

    if (!isSupabaseConfigured() || !supabaseClient || !session) {
      setRecords([]);
      lastSavedSnapshotRef.current = snapshotOf([]);
      lastPersistedIdsRef.current = new Set();
      hydratedRef.current = true;
      setReady(true);
      return;
    }

    const { data, error } = await supabaseClient
      .from("calendar_day_metrics")
      .select("id, user_id, metric_date, views, reach, created_at, updated_at")
      .order("metric_date", { ascending: true });

    if (error) {
      console.warn("Supabase calendar_day_metrics load failed:", error.message);
      setRecords([]);
      lastSavedSnapshotRef.current = snapshotOf([]);
      lastPersistedIdsRef.current = new Set();
      hydratedRef.current = true;
      setReady(true);
      return;
    }

    const remoteRecords = sortRecords((data ?? []).map((row) => toRecord(row as CalendarDayMetricRow)));
    const mergedRecords = mergeSeededMetrics(remoteRecords).records;
    setRecords(mergedRecords);
    lastSavedSnapshotRef.current = snapshotOf(remoteRecords);
    lastPersistedIdsRef.current = new Set(remoteRecords.map((record) => record.id));
    hydratedRef.current = true;
    setReady(true);
  }, [authReady, session, supabaseClient]);

  useEffect(() => {
    void syncFromRemote();
  }, [syncFromRemote]);

  useEffect(() => {
    if (!isSupabaseConfigured() || !supabaseClient || !session) {
      return;
    }

    const unsubscribe = subscribeSharedChannel(
      "great-organico:calendar_day_metrics",
      (channel, dispatch) => {
        channel.on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "calendar_day_metrics",
          },
          () => {
            dispatch();
          },
        );
      },
      () => {
        void syncFromRemote();
      },
    );

    return () => {
      unsubscribe();
    };
  }, [session, supabaseClient, syncFromRemote]);

  useEffect(() => {
    if (!hydratedRef.current) {
      return;
    }

    const snapshot = snapshotOf(records);
    if (snapshot === lastSavedSnapshotRef.current) {
      return;
    }

    const nextRecords = sortRecords(records);
    const nextIds = new Set(nextRecords.map((record) => record.id));

    if (!isSupabaseConfigured() || !supabaseClient || !session) {
      lastSavedSnapshotRef.current = snapshotOf(nextRecords);
      lastPersistedIdsRef.current = nextIds;
      return;
    }

    const previousIds = lastPersistedIdsRef.current;
    const removedIds = [...previousIds].filter((id) => !nextIds.has(id));

    let cancelled = false;

    const persist = async () => {
      const rows = nextRecords.map((record) => toRow(record, session.user.id));

      if (rows.length > 0) {
        const { error } = await supabaseClient.from("calendar_day_metrics").upsert(rows, {
          onConflict: "id",
        });

        if (error) {
          throw error;
        }
      }

      if (removedIds.length > 0) {
        const { error } = await supabaseClient
          .from("calendar_day_metrics")
          .delete()
          .in("id", removedIds);

        if (error) {
          throw error;
        }
      }

      if (!cancelled) {
        lastSavedSnapshotRef.current = snapshotOf(nextRecords);
        lastPersistedIdsRef.current = nextIds;
      }
    };

    void persist().catch((error) => {
      console.error("Failed to sync calendar day metrics", error);
    });

    return () => {
      cancelled = true;
    };
  }, [records, session, supabaseClient]);

  const { viewsByDate, reachByDate } = useMemo(() => recordsToMaps(records), [records]);

  const setDayViewsByDate = useCallback(
    (nextValue: Record<string, number> | ((previous: Record<string, number>) => Record<string, number>)) => {
      setRecords((previousRecords) => {
        const previousMap = recordsToMaps(previousRecords).viewsByDate;
        const resolvedNextMap = typeof nextValue === "function" ? nextValue(previousMap) : nextValue;
        return mergeMetricMap(previousRecords, resolvedNextMap, "views");
      });
    },
    [],
  );

  const setDayReachByDate = useCallback(
    (nextValue: Record<string, number> | ((previous: Record<string, number>) => Record<string, number>)) => {
      setRecords((previousRecords) => {
        const previousMap = recordsToMaps(previousRecords).reachByDate;
        const resolvedNextMap = typeof nextValue === "function" ? nextValue(previousMap) : nextValue;
        return mergeMetricMap(previousRecords, resolvedNextMap, "reach");
      });
    },
    [],
  );

  const reload = useCallback(async () => {
    await syncFromRemote();
  }, [syncFromRemote]);

  return [viewsByDate, setDayViewsByDate, reachByDate, setDayReachByDate, ready, reload] as const;
}
