import { useCallback, useEffect, useRef, useState } from "react";
import { isDemoSession, useAuthSession } from "../auth";
import { isSupabaseConfigured, supabase } from "./supabase";
import { subscribeSharedChannel } from "./supabaseRealtime";

type ReportRow<T> = {
  id: string;
  user_id: string;
  report_kind: string;
  reference_month: string;
  external_key: string | null;
  payload: T;
  updated_at?: string | null;
};

type SharedStateRow<T> = {
  value: T;
};

function snapshotOf<T>(value: T) {
  return JSON.stringify(value);
}

function monthKeyToDate(monthKey: string) {
  return `${monthKey}-01`;
}

async function loadSharedStateFallback<T>(key: string) {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("shared_state")
    .select("value")
    .eq("key", key)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as SharedStateRow<T> | null)?.value ?? null;
}

async function loadReportValue<T>(params: {
  userId: string;
  reportKind: string;
  referenceMonth: string;
  externalKey: string;
  legacySharedStateKey?: string;
}) {
  if (!supabase) {
    return { value: null as T | null, source: "memory" as const };
  }

  const { userId, reportKind, referenceMonth, externalKey, legacySharedStateKey } = params;
  const { data, error } = await supabase
    .from("reports")
    .select("id, user_id, report_kind, reference_month, external_key, payload, updated_at")
    .eq("user_id", userId)
    .eq("report_kind", reportKind)
    .eq("reference_month", monthKeyToDate(referenceMonth))
    .eq("external_key", externalKey)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!error && data) {
    return {
      value: (data as ReportRow<T>).payload,
      source: "reports" as const,
    };
  }

  if (legacySharedStateKey) {
    const legacyValue = await loadSharedStateFallback<T>(legacySharedStateKey).catch(() => null);
    if (legacyValue !== null) {
      return {
        value: legacyValue,
        source: "shared_state" as const,
      };
    }
  }

  if (error) {
    throw error;
  }

  return {
    value: null as T | null,
    source: "reports" as const,
  };
}

async function saveReportValue<T>(params: {
  userId: string;
  reportKind: string;
  referenceMonth: string;
  externalKey: string;
  title: string;
  value: T;
  category?: string;
  periodStart?: string | null;
  periodEnd?: string | null;
}) {
  if (!supabase) {
    return;
  }

  const { userId, reportKind, referenceMonth, externalKey, title, value, category, periodStart, periodEnd } = params;
  const { error } = await supabase.from("reports").upsert(
    {
      user_id: userId,
      page_module: "reports",
      report_kind: reportKind,
      reference_month: monthKeyToDate(referenceMonth),
      category: category ?? "general",
      external_key: externalKey,
      title,
      period_start: periodStart ?? null,
      period_end: periodEnd ?? null,
      payload: value,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "user_id,page_module,report_kind,reference_month,external_key",
    },
  );

  if (error) {
    throw error;
  }
}

export function useSupabaseReportState<T>(options: {
  reportKind: string;
  referenceMonth: string;
  externalKey: string;
  title: string;
  fallback: T;
  category?: string;
  periodStart?: string | null;
  periodEnd?: string | null;
  legacySharedStateKey?: string;
}) {
  const { session, ready: authReady } = useAuthSession();
  const [value, setValue] = useState<T>(options.fallback);
  const [hydrated, setHydrated] = useState(!isSupabaseConfigured());
  const lastRemoteSnapshotRef = useRef<string | null>(null);
  const hydratedRef = useRef(false);
  const currentUserId = session?.user.id ?? null;

  const loadRemote = useCallback(async () => {
    if (!currentUserId) {
      return options.fallback;
    }

    const result = await loadReportValue<T>({
      userId: currentUserId,
      reportKind: options.reportKind,
      referenceMonth: options.referenceMonth,
      externalKey: options.externalKey,
      legacySharedStateKey: options.legacySharedStateKey,
    });

    if (result.value !== null) {
      if (result.source !== "reports") {
        await saveReportValue({
          userId: currentUserId,
          reportKind: options.reportKind,
          referenceMonth: options.referenceMonth,
          externalKey: options.externalKey,
          title: options.title,
          value: result.value,
          category: options.category,
          periodStart: options.periodStart,
          periodEnd: options.periodEnd,
        });
      }

      return result.value;
    }

    await saveReportValue({
      userId: currentUserId,
      reportKind: options.reportKind,
      referenceMonth: options.referenceMonth,
      externalKey: options.externalKey,
      title: options.title,
      value: options.fallback,
      category: options.category,
      periodStart: options.periodStart,
      periodEnd: options.periodEnd,
    });

    return options.fallback;
  }, [currentUserId, options.category, options.externalKey, options.fallback, options.legacySharedStateKey, options.periodEnd, options.periodStart, options.referenceMonth, options.reportKind, options.title]);

  useEffect(() => {
    if (!authReady) {
      return;
    }

    if (!isSupabaseConfigured() || !supabase || !session || isDemoSession(session) || !currentUserId) {
      hydratedRef.current = true;
      lastRemoteSnapshotRef.current = snapshotOf(options.fallback);
      setValue(options.fallback);
      setHydrated(true);
      return;
    }

    let cancelled = false;

    const sync = async () => {
      try {
        const remoteValue = await loadRemote();
        if (cancelled) {
          return;
        }

        lastRemoteSnapshotRef.current = snapshotOf(remoteValue);
        hydratedRef.current = true;
        setValue(remoteValue);
        setHydrated(true);
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error("Failed to load report state from reports", {
          reportKind: options.reportKind,
          externalKey: options.externalKey,
          error,
        });
        hydratedRef.current = true;
        lastRemoteSnapshotRef.current = snapshotOf(options.fallback);
        setValue(options.fallback);
        setHydrated(true);
      }
    };

    void sync();

    const unsubscribe = subscribeSharedChannel(
      `great-organico:reports:${options.reportKind}:${options.externalKey}`,
      (channel, dispatch) => {
        channel.on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "reports",
          },
          (payload) => {
            const nextRow = payload.new as Partial<ReportRow<T>> | null;
            if (
              nextRow?.user_id !== currentUserId ||
              nextRow?.report_kind !== options.reportKind ||
              nextRow?.external_key !== options.externalKey
            ) {
              return;
            }

            dispatch();
          },
        );
      },
      () => {
        void sync();
      },
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [authReady, currentUserId, loadRemote, options.externalKey, options.fallback, options.reportKind, session]);

  useEffect(() => {
    if (
      !hydratedRef.current ||
      !authReady ||
      !isSupabaseConfigured() ||
      !supabase ||
      !session ||
      isDemoSession(session) ||
      !currentUserId
    ) {
      return;
    }

    const snapshot = snapshotOf(value);
    if (snapshot === lastRemoteSnapshotRef.current) {
      return;
    }

    void saveReportValue({
      userId: currentUserId,
      reportKind: options.reportKind,
      referenceMonth: options.referenceMonth,
      externalKey: options.externalKey,
      title: options.title,
      value,
      category: options.category,
      periodStart: options.periodStart,
      periodEnd: options.periodEnd,
    })
      .then(() => {
        lastRemoteSnapshotRef.current = snapshot;
      })
      .catch((error) => {
        console.error("Failed to save report state to reports", {
          reportKind: options.reportKind,
          externalKey: options.externalKey,
          error,
        });
      });
  }, [authReady, currentUserId, options.category, options.externalKey, options.periodEnd, options.periodStart, options.referenceMonth, options.reportKind, options.title, session, value]);

  return [value, setValue, hydrated] as const;
}
