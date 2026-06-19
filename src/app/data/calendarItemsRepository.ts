import { useCallback, useEffect, useRef, useState } from "react";
import type { CalendarEvent } from "./mockData";
import { getSupabaseDiagnostics, isSupabaseConfigured, supabase } from "./supabase";
import { subscribeSharedChannel } from "./supabaseRealtime";

type CalendarItemRow = {
  id?: string | null;
  user_id?: string | null;
  source_calendar_event_id: number | null;
  title?: string | null;
  description?: string | null;
  status?: string | null;
  type?: string | null;
  category?: string | null;
  date?: string | null;
  data?: Partial<CalendarEvent> | null;
  created_at?: string | null;
  deleted_at?: string | null;
  updated_at?: string | null;
};

function snapshotOf<T>(value: T) {
  return JSON.stringify(value);
}

function compareCalendarRowsByFreshness(left: CalendarItemRow, right: CalendarItemRow) {
  const leftStamp = Date.parse(left.updated_at ?? left.created_at ?? "") || 0;
  const rightStamp = Date.parse(right.updated_at ?? right.created_at ?? "") || 0;
  return rightStamp - leftStamp;
}

function toReferenceMonth(date: string) {
  return `${date.slice(0, 7)}-01`;
}

function toStartsAt(date: string, time: string) {
  if (!date) {
    return null;
  }

  return `${date}T${time || "00:00"}:00`;
}

function normalizeCalendarEvent(row: CalendarItemRow): CalendarEvent | null {
  const data = row.data ?? {};
  const id = Number(row.source_calendar_event_id ?? data.id ?? 0);

  if (!Number.isFinite(id) || id <= 0) {
    return null;
  }

  return {
    id,
    title: row.title ?? data.title ?? "",
    description: row.description ?? data.description ?? "",
    type: (row.type ?? row.category ?? data.type ?? "Reels") as CalendarEvent["type"],
    responsibleId: Number(data.responsibleId ?? 1),
    responsibleIds: Array.isArray(data.responsibleIds) ? data.responsibleIds.map(Number) : undefined,
    addedById: typeof data.addedById === "number" ? data.addedById : undefined,
    status: (row.status ?? data.status ?? "Agendado") as CalendarEvent["status"],
    date: row.date ?? data.date ?? "",
    time: data.time ?? "09:00",
    visualization: data.visualization,
    tasks: Array.isArray(data.tasks) ? data.tasks : undefined,
    checklist: Array.isArray(data.checklist) ? data.checklist : undefined,
    completed: Boolean(data.completed),
    completedAt: data.completedAt,
    completedById: typeof data.completedById === "number" ? data.completedById : undefined,
  };
}

function toCalendarItemRow(event: CalendarEvent, userId?: string | null): Record<string, unknown> {
  return {
    ...(userId ? { user_id: userId } : {}),
    reference_month: toReferenceMonth(event.date),
    metric_date: event.date,
    date: event.date,
    category: "calendar_item",
    type: event.type,
    title: event.title,
    description: event.description,
    status: event.status,
    content_type: event.type,
    responsible_profile_id: event.responsibleId,
    source_calendar_event_id: event.id,
    starts_at: toStartsAt(event.date, event.time),
    ends_at: null,
    data: event,
    deleted_at: null,
  };
}

function logCalendar(message: string, details?: Record<string, unknown>) {
  console.info("[CalendarItemsSync]", message, {
    ...getSupabaseDiagnostics(),
    ...details,
  });
}

async function requireAuthenticatedSession() {
  if (!isSupabaseConfigured() || !supabase) {
    return null;
  }

  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw error;
  }

  const userId = data.session?.user.id ?? null;
  if (!userId) {
    console.error("[CalendarItemsSync] Missing authenticated session", getSupabaseDiagnostics());
    throw new Error("Nenhuma sessao autenticada encontrada no Supabase.");
  }

  logCalendar("Authenticated session resolved", { userId });

  return userId;
}

async function fetchCalendarItems() {
  if (!isSupabaseConfigured() || !supabase) {
    logCalendar("Fetch skipped because Supabase is not configured.");
    return { items: [] as CalendarEvent[], hasRows: false };
  }

  try {
    logCalendar("Fetching calendar_items from Supabase.");
    const { data, error } = await supabase
      .from("calendar_items")
      .select("id, user_id, source_calendar_event_id, title, description, status, type, category, date, data, created_at, deleted_at, updated_at")
      .is("deleted_at", null)
      .order("date", { ascending: true })
      .order("updated_at", { ascending: false, nullsFirst: false });

    if (error) {
      throw error;
    }

    const dedupedRows = new Map<number, CalendarItemRow>();
    for (const rawRow of (data ?? []) as CalendarItemRow[]) {
      const eventId = Number(rawRow.source_calendar_event_id ?? rawRow.data?.id ?? 0);
      if (!Number.isFinite(eventId) || eventId <= 0) {
        continue;
      }

      const current = dedupedRows.get(eventId);
      if (!current || compareCalendarRowsByFreshness(rawRow, current) < 0) {
        dedupedRows.set(eventId, rawRow);
      }
    }

    return {
      items: Array.from(dedupedRows.values()).map((row) => normalizeCalendarEvent(row)).filter((row): row is CalendarEvent => Boolean(row)),
      hasRows: true,
    };
  } catch (error) {
    console.error("[CalendarItemsSync] Failed to load calendar_items from Supabase", {
      error,
      ...getSupabaseDiagnostics(),
    });
    return { items: [] as CalendarEvent[], hasRows: false };
  }
}

async function upsertCalendarItem(event: CalendarEvent, currentUserId: string | null) {
  if (!isSupabaseConfigured() || !supabase) {
    return;
  }

  const sessionUserId = await requireAuthenticatedSession();
  const payload = toCalendarItemRow(event, currentUserId ?? sessionUserId);
  logCalendar("Persisting calendar item", {
    action: "upsert",
    eventId: event.id,
    sessionUserId,
    payloadUserId: currentUserId ?? sessionUserId,
    title: event.title,
    date: event.date,
  });

  const updateResult = await supabase
    .from("calendar_items")
    .update(payload)
    .eq("source_calendar_event_id", event.id)
    .is("deleted_at", null)
    .select("id");

  if (updateResult.error) {
    throw updateResult.error;
  }

  if ((updateResult.data ?? []).length > 0) {
    logCalendar("Calendar item updated", {
      action: "update",
      eventId: event.id,
      affectedRows: updateResult.data?.length ?? 0,
    });
    return;
  }

  const insertResult = await supabase.from("calendar_items").insert(payload).select("id");
  if (!insertResult.error && (insertResult.data ?? []).length > 0) {
    logCalendar("Calendar item inserted", {
      action: "insert",
      eventId: event.id,
      affectedRows: insertResult.data?.length ?? 0,
    });
    return;
  }

  const fallbackUpdate = await supabase
    .from("calendar_items")
    .update(payload)
    .eq("source_calendar_event_id", event.id)
    .select("id");

  if (fallbackUpdate.error) {
    throw fallbackUpdate.error;
  }

  if ((fallbackUpdate.data ?? []).length === 0) {
    throw insertResult.error ?? new Error(`O Supabase nao confirmou a gravacao do item ${event.id}.`);
  }

  logCalendar("Calendar item updated after insert fallback", {
    action: "update-fallback",
    eventId: event.id,
    affectedRows: fallbackUpdate.data?.length ?? 0,
  });
}

async function softDeleteCalendarItem(eventId: number) {
  if (!isSupabaseConfigured() || !supabase) {
    return;
  }

  const userId = await requireAuthenticatedSession();
  logCalendar("Soft deleting calendar item", {
    action: "delete",
    eventId,
    userId,
  });

  const { data, error } = await supabase
    .from("calendar_items")
    .update({ deleted_at: new Date().toISOString() })
    .eq("source_calendar_event_id", eventId)
    .is("deleted_at", null)
    .select("id");

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    throw new Error(`O item do calendario ${eventId} nao foi encontrado para exclusao no Supabase.`);
  }

  logCalendar("Calendar item soft deleted", {
    action: "delete",
    eventId,
    affectedRows: data.length,
  });
}

export function useSupabaseCalendarItemsState(fallback: CalendarEvent[]) {
  const [value, setValue] = useState<CalendarEvent[]>(isSupabaseConfigured() ? [] : fallback);
  const [hydrated, setHydrated] = useState(false);
  const hydratedRef = useRef(false);
  const lastSavedSnapshotRef = useRef<string | null>(null);
  const lastPersistedValueRef = useRef<CalendarEvent[]>(isSupabaseConfigured() ? [] : fallback);

  const commitValue = useCallback((nextValue: CalendarEvent[]) => {
    setValue(nextValue);
    lastSavedSnapshotRef.current = snapshotOf(nextValue);
    lastPersistedValueRef.current = nextValue;
    hydratedRef.current = true;
    setHydrated(true);
    return nextValue;
  }, []);

  const reload = useCallback(async () => {
    const remote = await fetchCalendarItems();
    const nextValue =
      !remote.hasRows
        ? lastPersistedValueRef.current
        : remote.items;

    logCalendar("Reload completed", {
      hasRows: remote.hasRows,
      count: nextValue.length,
    });
    return commitValue(nextValue);
  }, [commitValue]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const remote = await fetchCalendarItems();
      if (cancelled) {
        return;
      }

      const nextValue =
        !remote.hasRows
          ? lastPersistedValueRef.current
          : remote.items;

      logCalendar("Initial load completed", {
        hasRows: remote.hasRows,
        count: nextValue.length,
      });
      commitValue(nextValue);
    };

    void load();

    const unsubscribe = subscribeSharedChannel(
      "great-organico:calendar-items-direct",
      (channel, dispatch) => {
        channel.on(
          "postgres_changes",
          { event: "*", schema: "public", table: "calendar_items" },
          () => {
            dispatch();
          },
        );
      },
      () => {
        void load();
      },
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [commitValue, fallback]);

  const createEvent = useCallback(async (event: CalendarEvent, currentUserId?: string | null) => {
    if (!isSupabaseConfigured() || !supabase) {
      logCalendar("Persisting calendar item in memory fallback", {
        action: "create",
        eventId: event.id,
      });
      commitValue([...lastPersistedValueRef.current, event]);
      return event;
    }

    await upsertCalendarItem(event, currentUserId ?? null);
    await reload();
    return event;
  }, [commitValue, reload]);

  const updateEvent = useCallback(async (event: CalendarEvent, currentUserId?: string | null) => {
    if (!isSupabaseConfigured() || !supabase) {
      logCalendar("Updating calendar item in memory fallback", {
        action: "update",
        eventId: event.id,
      });
      commitValue(lastPersistedValueRef.current.map((current) => (current.id === event.id ? event : current)));
      return event;
    }

    await upsertCalendarItem(event, currentUserId ?? null);
    await reload();
    return event;
  }, [commitValue, reload]);

  const deleteEvent = useCallback(async (eventId: number) => {
    if (!isSupabaseConfigured() || !supabase) {
      logCalendar("Deleting calendar item in memory fallback", {
        action: "delete",
        eventId,
      });
      commitValue(lastPersistedValueRef.current.filter((event) => event.id !== eventId));
      return;
    }

    await softDeleteCalendarItem(eventId);
    await reload();
  }, [commitValue, reload]);

  return [value, hydrated, { createEvent, updateEvent, deleteEvent, reload }] as const;
}
