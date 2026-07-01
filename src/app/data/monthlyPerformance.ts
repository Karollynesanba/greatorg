import { useEffect } from "react";
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

export function useMonthlyPerformanceSnapshot() {
  const currentMonthKey = getCurrentMonthKey();
  const state = useSupabaseSharedState<MonthlyPerformanceSnapshot>({
    key: "monthly-performance-snapshot",
    fallback: buildDefaultMonthlyPerformanceSnapshot(currentMonthKey),
    scope: "global",
  });

  const [snapshot, setSnapshot, hydrated] = state;

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    if (snapshot.monthKey !== currentMonthKey) {
      setSnapshot(buildDefaultMonthlyPerformanceSnapshot(currentMonthKey));
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
  }, [currentMonthKey, hydrated, setSnapshot, snapshot.monthKey, snapshot.reach, snapshot.testimonialsCount, snapshot.views]);

  return state;
}

export function shouldUseMonthlyPerformanceSnapshot(snapshot: MonthlyPerformanceSnapshot, monthKey: string, isGlobalScope: boolean) {
  return isGlobalScope && snapshot.monthKey === monthKey;
}
