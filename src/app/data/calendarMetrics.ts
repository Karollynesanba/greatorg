import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuthSession } from "../auth";
import { isSupabaseConfigured, supabase } from "./supabase";
import { subscribeSharedChannel } from "./supabaseRealtime";

export const defaultMonthlyViewsGoal = 800000;
const seededCalendarDayMetrics: Record<string, { views?: number; reach?: number }> = {
  "2026-07-01": { views: 33921 },
  "2026-07-02": { views: 39389 },
  "2026-07-03": { views: 51724 },
  "2026-07-04": { views: 63115 },
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

function applySeedCalendarDayMetrics(records: CalendarDayMetricRecord[]) {
  const byDate = new Map(records.map((record) => [record.date, { ...record }] as const));
  let nextId = Math.max(...records.map((record) => record.id), 0) + 1;

  Object.entries(seededCalendarDayMetrics).forEach(([date, metric]) => {
    const existing = byDate.get(date);

    if (!existing) {
      byDate.set(date, {
        id: nextId++,
        date,
        views: normalizeMetricValue(metric.views),
        reach: normalizeMetricValue(metric.reach),
      });
      return;
    }

    byDate.set(date, {
      ...existing,
      views: metric.views === undefined ? existing.views : Math.max(existing.views, normalizeMetricValue(metric.views)),
      reach: metric.reach === undefined ? existing.reach : Math.max(existing.reach, normalizeMetricValue(metric.reach)),
    });
  });

  return sortRecords([...byDate.values()]);
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

export function hasMonthMetricRecords(dayMetricByDate: Record<string, number>, monthKey: string) {
  return Object.keys(dayMetricByDate).some((dateKey) => dateKey.startsWith(monthKey));
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
      const seededRecords = applySeedCalendarDayMetrics([]);
      setRecords(seededRecords);
      lastSavedSnapshotRef.current = snapshotOf(seededRecords);
      lastPersistedIdsRef.current = new Set(seededRecords.map((record) => record.id));
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
      const seededRecords = applySeedCalendarDayMetrics([]);
      setRecords(seededRecords);
      lastSavedSnapshotRef.current = snapshotOf(seededRecords);
      lastPersistedIdsRef.current = new Set(seededRecords.map((record) => record.id));
      hydratedRef.current = true;
      setReady(true);
      return;
    }

    const remoteRecords = applySeedCalendarDayMetrics((data ?? []).map((row) => toRecord(row as CalendarDayMetricRow)));
    setRecords(remoteRecords);
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
          onConflict: "user_id,metric_date",
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
