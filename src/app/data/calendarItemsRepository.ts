import { useCallback, useEffect, useRef, useState } from "react";
import type { CalendarEvent } from "./mockData";
import { getSupabaseDiagnostics, isSupabaseConfigured, supabase } from "./supabase";
import { subscribeSharedChannel } from "./supabaseRealtime";

type CalendarEventRow = {
  id: number;
  user_id?: string | null;
  sort_order?: number | null;
  data?: Partial<CalendarEvent> | null;
  created_at?: string | null;
  updated_at?: string | null;
};

function snapshotOf<T>(value: T) {
  return JSON.stringify(value);
}

function monthKeyToDate(date: string) {
  return `${date.slice(0, 7)}-01`;
}

function toStartsAt(date: string, time: string) {
  if (!date) {
    return null;
  }

  return `${date}T${time || "00:00"}:00`;
}

function normalizeCalendarEvent(row: CalendarEventRow): CalendarEvent | null {
  const data = row.data ?? {};
  const id = Number(row.id ?? data.id ?? 0);

  if (!Number.isFinite(id) || id <= 0) {
    return null;
  }

  return {
    id,
    title: data.title ?? "",
    description: data.description ?? "",
    type: (data.type ?? "Reels") as CalendarEvent["type"],
    responsibleId: Number(data.responsibleId ?? 1),
    responsibleIds: Array.isArray(data.responsibleIds) ? data.responsibleIds.map(Number) : undefined,
    addedById: typeof data.addedById === "number" ? data.addedById : undefined,
    status: (data.status ?? "Agendado") as CalendarEvent["status"],
    date: data.date ?? "",
    time: data.time ?? "09:00",
    visualization: data.visualization,
    tasks: Array.isArray(data.tasks) ? data.tasks : undefined,
    checklist: Array.isArray(data.checklist) ? data.checklist : undefined,
    completed: Boolean(data.completed),
    completedAt: data.completedAt,
    completedById: typeof data.completedById === "number" ? data.completedById : undefined,
  };
}

function toCalendarEventRow(event: CalendarEvent, userId: string, sortOrder: number) {
  return {
    id: event.id,
    user_id: userId,
    sort_order: sortOrder,
    page_module: "calendar",
    reference_month: monthKeyToDate(event.date),
    metric_date: event.date,
    category: "calendar_event",
    item_title: event.title,
    item_status: event.status,
    content_type: event.type,
    responsible_profile_id: event.responsibleId,
    data: event,
    updated_at: new Date().toISOString(),
  };
}

function toCalendarItemRow(event: CalendarEvent, userId: string) {
  return {
    user_id: userId,
    reference_month: monthKeyToDate(event.date),
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
    updated_at: new Date().toISOString(),
  };
}

function logCalendar(message: string, details?: Record<string, unknown>) {
  console.info("[CalendarSync]", message, {
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
    console.error("[CalendarSync] Missing authenticated session", getSupabaseDiagnostics());
    throw new Error("Nenhuma sessao autenticada encontrada no Supabase.");
  }

  logCalendar("Authenticated session resolved", { userId });
  return userId;
}

async function fetchCalendarEvents() {
  if (!isSupabaseConfigured() || !supabase) {
    logCalendar("Fetch skipped because Supabase is not configured.");
    return { items: [] as CalendarEvent[], hasRows: false };
  }

  try {
    logCalendar("Fetching calendar_events from Supabase.");
    const { data, error } = await supabase
      .from("calendar_events")
      .select("id, user_id, sort_order, data, created_at, updated_at")
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true });

    if (error) {
      throw error;
    }

    return {
      items: ((data ?? []) as CalendarEventRow[])
        .map((row) => normalizeCalendarEvent(row))
        .filter((row): row is CalendarEvent => Boolean(row)),
      hasRows: true,
    };
  } catch (error) {
    console.error("[CalendarSync] Failed to load calendar_events from Supabase", {
      error,
      ...getSupabaseDiagnostics(),
    });
    return { items: [] as CalendarEvent[], hasRows: false };
  }
}

async function syncCalendarItemMirror(event: CalendarEvent, userId: string) {
  if (!supabase) {
    return;
  }

  const payload = toCalendarItemRow(event, userId);
  const { error } = await supabase
    .from("calendar_items")
    .upsert(payload, { onConflict: "user_id,source_calendar_event_id" })
    .select("id");

  if (!error) {
    return;
  }

  const updateResult = await supabase
    .from("calendar_items")
    .update(payload)
    .eq("user_id", userId)
    .eq("source_calendar_event_id", event.id)
    .select("id");

  if (updateResult.error) {
    throw updateResult.error;
  }

  if ((updateResult.data ?? []).length > 0) {
    return;
  }

  const insertResult = await supabase.from("calendar_items").insert(payload).select("id");
  if (insertResult.error) {
    throw insertResult.error;
  }
}

async function deleteCalendarItemMirror(eventId: number, userId: string) {
  if (!supabase) {
    return;
  }

  const { error } = await supabase
    .from("calendar_items")
    .delete()
    .eq("user_id", userId)
    .eq("source_calendar_event_id", eventId);

  if (error) {
    throw error;
  }
}

async function upsertCalendarEvent(event: CalendarEvent, sortOrder: number, currentUserId?: string | null) {
  if (!isSupabaseConfigured() || !supabase) {
    return;
  }

  const sessionUserId = await requireAuthenticatedSession();
  const userId = currentUserId ?? sessionUserId;
  if (!userId) {
    throw new Error("Nao foi possivel resolver o usuario autenticado.");
  }

  logCalendar("Persisting calendar event", {
    action: "upsert",
    eventId: event.id,
    userId,
    sortOrder,
    title: event.title,
    date: event.date,
  });

  const { data, error } = await supabase
    .from("calendar_events")
    .upsert(toCalendarEventRow(event, userId, sortOrder), { onConflict: "id" })
    .select("id");

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    throw new Error(`O Supabase nao confirmou a gravacao do evento ${event.id}.`);
  }

  await syncCalendarItemMirror(event, userId);
}

async function hardDeleteCalendarEvent(eventId: number) {
  if (!isSupabaseConfigured() || !supabase) {
    return;
  }

  const userId = await requireAuthenticatedSession();
  if (!userId) {
    throw new Error("Nao foi possivel resolver o usuario autenticado.");
  }
  logCalendar("Deleting calendar event", {
    action: "delete",
    eventId,
    userId,
  });

  const { data, error } = await supabase
    .from("calendar_events")
    .delete()
    .eq("id", eventId)
    .select("id");

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    throw new Error(`O evento ${eventId} nao foi encontrado para exclusao no Supabase.`);
  }

  await deleteCalendarItemMirror(eventId, userId);
}

export function useSupabaseCalendarState(fallback: CalendarEvent[]) {
  const [value, setValue] = useState<CalendarEvent[]>(isSupabaseConfigured() ? [] : fallback);
  const [hydrated, setHydrated] = useState(false);
  const lastPersistedValueRef = useRef<CalendarEvent[]>(isSupabaseConfigured() ? [] : fallback);
  const lastSavedSnapshotRef = useRef<string | null>(null);

  const commitValue = useCallback((nextValue: CalendarEvent[]) => {
    setValue(nextValue);
    lastPersistedValueRef.current = nextValue;
    lastSavedSnapshotRef.current = snapshotOf(nextValue);
    setHydrated(true);
    return nextValue;
  }, []);

  const reload = useCallback(async () => {
    const remote = await fetchCalendarEvents();
    const nextValue = !remote.hasRows ? lastPersistedValueRef.current : remote.items;
    logCalendar("Reload completed", {
      hasRows: remote.hasRows,
      count: nextValue.length,
    });
    return commitValue(nextValue);
  }, [commitValue]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const remote = await fetchCalendarEvents();
      if (cancelled) {
        return;
      }

      const nextValue = !remote.hasRows ? lastPersistedValueRef.current : remote.items;
      logCalendar("Initial load completed", {
        hasRows: remote.hasRows,
        count: nextValue.length,
      });
      commitValue(nextValue);
    };

    void load();

    const unsubscribe = subscribeSharedChannel(
      "great-organico:calendar-events-direct",
      (channel, dispatch) => {
        channel.on(
          "postgres_changes",
          { event: "*", schema: "public", table: "calendar_events" },
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
      commitValue([...lastPersistedValueRef.current, event]);
      return event;
    }

    await upsertCalendarEvent(event, lastPersistedValueRef.current.length, currentUserId ?? null);
    await reload();
    return event;
  }, [commitValue, reload]);

  const updateEvent = useCallback(async (event: CalendarEvent, currentUserId?: string | null) => {
    if (!isSupabaseConfigured() || !supabase) {
      commitValue(lastPersistedValueRef.current.map((current) => (current.id === event.id ? event : current)));
      return event;
    }

    const sortOrder = lastPersistedValueRef.current.findIndex((current) => current.id === event.id);
    await upsertCalendarEvent(event, sortOrder >= 0 ? sortOrder : lastPersistedValueRef.current.length, currentUserId ?? null);
    await reload();
    return event;
  }, [commitValue, reload]);

  const deleteEvent = useCallback(async (eventId: number) => {
    if (!isSupabaseConfigured() || !supabase) {
      commitValue(lastPersistedValueRef.current.filter((event) => event.id !== eventId));
      return;
    }

    await hardDeleteCalendarEvent(eventId);
    await reload();
  }, [commitValue, reload]);

  return [value, hydrated, { createEvent, updateEvent, deleteEvent, reload }] as const;
}

export const useSupabaseCalendarItemsState = useSupabaseCalendarState;
