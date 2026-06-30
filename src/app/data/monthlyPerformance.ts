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
    views: 920_285,
    reach: 428_118,
    socialSellingViews: 0,
    socialSellingCount: 0,
    updatedAt: "",
  };
}

export function useMonthlyPerformanceSnapshot() {
  const currentMonthKey = getCurrentMonthKey();
  return useSupabaseSharedState<MonthlyPerformanceSnapshot>({
    key: "monthly-performance-snapshot",
    fallback: buildDefaultMonthlyPerformanceSnapshot(currentMonthKey),
  });
}

export function shouldUseMonthlyPerformanceSnapshot(snapshot: MonthlyPerformanceSnapshot, monthKey: string, isGlobalScope: boolean) {
  return isGlobalScope && snapshot.monthKey === monthKey;
}
