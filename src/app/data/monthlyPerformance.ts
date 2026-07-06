import { useEffect, useMemo } from "react";
import { useSupabaseSharedState } from "./supabaseSync";
import { getBrazilMonthKey } from "./brazilDate";

export type MonthlyPerformanceSnapshot = {
  monthKey: string;
  views: number;
  reach: number;
  socialSellingViews: number;
  socialSellingCount: number;
  testimonialsCount: number;
  updatedAt: string;
};

export type MonthlyPerformanceHistory = Record<string, MonthlyPerformanceSnapshot>;

type MonthlyPerformanceState = {
  snapshotState: ReturnType<typeof useSupabaseSharedState<MonthlyPerformanceSnapshot>>;
  historyState: ReturnType<typeof useSupabaseSharedState<MonthlyPerformanceHistory>>;
};

export function getCurrentMonthKey() {
  return getBrazilMonthKey(new Date());
}

export function buildDefaultMonthlyPerformanceSnapshot(monthKey = getCurrentMonthKey()): MonthlyPerformanceSnapshot {
  return {
    monthKey,
    views: 0,
    reach: 0,
    socialSellingViews: 0,
    socialSellingCount: 0,
    testimonialsCount: 0,
    updatedAt: "",
  };
}

function useMonthlyPerformanceSnapshotState() {
  const currentMonthKey = getCurrentMonthKey();
  const fallbackSnapshot = useMemo(() => buildDefaultMonthlyPerformanceSnapshot(currentMonthKey), [currentMonthKey]);
  const snapshotState = useSupabaseSharedState<MonthlyPerformanceSnapshot>({
    key: "monthly-performance-snapshot",
    fallback: fallbackSnapshot,
    scope: "global",
  });
  const [snapshot, setSnapshot, hydrated] = snapshotState;

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    const shouldUpdateViews = snapshot.views === 920_285;
    const shouldUpdateReach = snapshot.reach === 428_118;
    const shouldBackfillTestimonials = typeof snapshot.testimonialsCount !== "number";

    if (!shouldUpdateViews && !shouldUpdateReach && !shouldBackfillTestimonials) {
      return;
    }

    setSnapshot((previous) => ({
      ...previous,
      views: shouldUpdateViews ? 978_855 : previous.views,
      reach: shouldUpdateReach ? 493_808 : previous.reach,
      testimonialsCount: typeof previous.testimonialsCount === "number" ? previous.testimonialsCount : 0,
    }));
  }, [hydrated, setSnapshot, snapshot, snapshot.reach, snapshot.testimonialsCount, snapshot.views]);

  return snapshotState;
}

export function useMonthlyPerformanceState(): MonthlyPerformanceState {
  const currentMonthKey = getCurrentMonthKey();
  const snapshotState = useMonthlyPerformanceSnapshotState();
  const historyFallback = useMemo(() => ({}), []);
  const historyState = useSupabaseSharedState<MonthlyPerformanceHistory>({
    key: "monthly-performance-history",
    fallback: historyFallback,
    scope: "global",
  });
  const [, setHistory, historyHydrated] = historyState;

  const [snapshot, setSnapshot, hydrated] = snapshotState;

  useEffect(() => {
    if (!hydrated || !historyHydrated) {
      return;
    }

    if (snapshot.monthKey !== currentMonthKey) {
      if (snapshot.monthKey) {
        setHistory((currentHistory) => ({
          ...currentHistory,
          [snapshot.monthKey]: snapshot,
        }));
      }
      setSnapshot(buildDefaultMonthlyPerformanceSnapshot(currentMonthKey));
      return;
    }

  }, [currentMonthKey, historyHydrated, hydrated, setHistory, setSnapshot, snapshot, snapshot.monthKey]);

  return {
    snapshotState,
    historyState,
  };
}

export function useMonthlyPerformanceSnapshot() {
  return useMonthlyPerformanceSnapshotState();
}

export function shouldUseMonthlyPerformanceSnapshot(snapshot: MonthlyPerformanceSnapshot, monthKey: string, isGlobalScope: boolean) {
  return isGlobalScope && snapshot.monthKey === monthKey;
}

export function useMonthlyPerformanceHistory() {
  return useMonthlyPerformanceState().historyState;
}
