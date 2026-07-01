import { useEffect, useMemo, useState } from "react";
import { isDemoSession, useAuthSession } from "../auth";
import type { CalendarEvent, Goal, Idea, Post, StoryLog } from "./mockData";
import { isSupabaseConfigured, supabase } from "./supabase";

type SnapshotModule = "posts" | "goals" | "ideas" | "calendar" | "stories";

type SnapshotRow = {
  reference_month: string;
  page_module: SnapshotModule;
  payload?: {
    items?: unknown[];
  } | null;
};

export type HistoricalMonthlyData = {
  posts: Post[];
  goals: Goal[];
  ideas: Idea[];
  calendarEvents: CalendarEvent[];
  storyLogs: StoryLog[];
};

const emptyHistoricalMonthlyData: HistoricalMonthlyData = {
  posts: [],
  goals: [],
  ideas: [],
  calendarEvents: [],
  storyLogs: [],
};

function normalizeSnapshotItem<T>(item: unknown): T | null {
  if (!item || typeof item !== "object") {
    return null;
  }

  const candidate = item as { data?: unknown };
  const value = typeof candidate.data !== "undefined" ? candidate.data : item;

  return value as T;
}

function toReferenceMonth(monthKey: string) {
  return `${monthKey}-01`;
}

export function getMonthKeysBetween(start: Date, end: Date) {
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const limit = new Date(end.getFullYear(), end.getMonth(), 1);
  const monthKeys: string[] = [];

  while (cursor <= limit) {
    monthKeys.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`);
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return monthKeys;
}

export function useHistoricalMonthlyData(monthKeys: string[]) {
  const { session, ready } = useAuthSession();
  const [value, setValue] = useState<HistoricalMonthlyData>(emptyHistoricalMonthlyData);
  const [hydrated, setHydrated] = useState(!isSupabaseConfigured());
  const normalizedMonthKeys = useMemo(
    () => Array.from(new Set(monthKeys.filter(Boolean))).sort(),
    [monthKeys],
  );

  useEffect(() => {
    if (!ready) {
      return;
    }

    if (!isSupabaseConfigured() || !supabase || !session || isDemoSession(session) || normalizedMonthKeys.length === 0) {
      setValue(emptyHistoricalMonthlyData);
      setHydrated(true);
      return;
    }

    let cancelled = false;
    const client = supabase;

    const load = async () => {
      const { data, error } = await client
        .from("operation_monthly_snapshots")
        .select("reference_month, page_module, payload")
        .in("reference_month", normalizedMonthKeys.map(toReferenceMonth));

      if (cancelled) {
        return;
      }

      if (error) {
        console.error("Failed to load operation_monthly_snapshots", error);
        setValue(emptyHistoricalMonthlyData);
        setHydrated(true);
        return;
      }

      const nextValue: HistoricalMonthlyData = {
        posts: [],
        goals: [],
        ideas: [],
        calendarEvents: [],
        storyLogs: [],
      };

      for (const row of (data ?? []) as SnapshotRow[]) {
        const items = Array.isArray(row.payload?.items) ? row.payload.items : [];

        if (row.page_module === "posts") {
          nextValue.posts.push(...items.map((item) => normalizeSnapshotItem<Post>(item)).filter((item): item is Post => Boolean(item)));
          continue;
        }

        if (row.page_module === "goals") {
          nextValue.goals.push(...items.map((item) => normalizeSnapshotItem<Goal>(item)).filter((item): item is Goal => Boolean(item)));
          continue;
        }

        if (row.page_module === "ideas") {
          nextValue.ideas.push(...items.map((item) => normalizeSnapshotItem<Idea>(item)).filter((item): item is Idea => Boolean(item)));
          continue;
        }

        if (row.page_module === "calendar") {
          nextValue.calendarEvents.push(...items.map((item) => normalizeSnapshotItem<CalendarEvent>(item)).filter((item): item is CalendarEvent => Boolean(item)));
          continue;
        }

        if (row.page_module === "stories") {
          nextValue.storyLogs.push(...items.map((item) => normalizeSnapshotItem<StoryLog>(item)).filter((item): item is StoryLog => Boolean(item)));
        }
      }

      setValue(nextValue);
      setHydrated(true);
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [normalizedMonthKeys, ready, session]);

  return [value, hydrated] as const;
}
