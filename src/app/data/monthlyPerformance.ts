import { useEffect } from "react";
import { useSupabaseSharedState } from "./supabaseSync";

export type MonthlyPerformanceSnapshot = {
  monthKey: string;
  views: number;
  reach: number;
  socialSellingViews: number;
  socialSellingCount: number;
  updatedAt: string;
};

export function getCurrentMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

export function buildDefaultMonthlyPerformanceSnapshot(monthKey = getCurrentMonthKey()): MonthlyPerformanceSnapshot {
  return {
    monthKey,
    views: 978_855,
    reach: 493_808,
    socialSellingViews: 0,
    socialSellingCount: 0,
    updatedAt: "",
  };
}

export function useMonthlyPerformanceSnapshot() {
  const currentMonthKey = getCurrentMonthKey();
  const state = useSupabaseSharedState<MonthlyPerformanceSnapshot>({
    key: "monthly-performance-snapshot",
    fallback: buildDefaultMonthlyPerformanceSnapshot(currentMonthKey),
  });

  const [snapshot, setSnapshot, hydrated] = state;

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    if (snapshot.monthKey !== currentMonthKey) {
      return;
    }

    const shouldUpdateViews = snapshot.views === 920_285;
    const shouldUpdateReach = snapshot.reach === 428_118;

    if (!shouldUpdateViews && !shouldUpdateReach) {
      return;
    }

    setSnapshot((previous) => ({
      ...previous,
      views: shouldUpdateViews ? 978_855 : previous.views,
      reach: shouldUpdateReach ? 493_808 : previous.reach,
    }));
  }, [currentMonthKey, hydrated, setSnapshot, snapshot.monthKey, snapshot.reach, snapshot.views]);

  return state;
}

export function shouldUseMonthlyPerformanceSnapshot(snapshot: MonthlyPerformanceSnapshot, monthKey: string, isGlobalScope: boolean) {
  return isGlobalScope && snapshot.monthKey === monthKey;
}
