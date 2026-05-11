import type { CalendarEvent, HistoryEvent } from "./mockData";

const calendarCompletionHistoryBaseId = 900000;

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getCalendarResponsibleIds(event: CalendarEvent) {
  const ids = event.responsibleIds?.filter((value, index, array) => array.indexOf(value) === index) ?? [];
  return ids.length > 0 ? ids : event.responsibleId ? [event.responsibleId] : [];
}

export function getCalendarChecklistItems(event: CalendarEvent) {
  return event.checklist ?? [];
}

export function getCalendarChecklistProgress(event: CalendarEvent) {
  const checklist = getCalendarChecklistItems(event);
  const completed = checklist.filter((item) => item.done).length;

  return {
    completed,
    total: checklist.length,
    isComplete: checklist.length > 0 && completed === checklist.length,
  };
}

export function getCalendarCompletionHistoryId(eventId: number) {
  return calendarCompletionHistoryBaseId + eventId;
}

export function isCalendarTaskCompleted(event: CalendarEvent) {
  return getCalendarChecklistProgress(event).isComplete;
}

export function applyCalendarCompletionState(
  event: CalendarEvent,
  completedBy?: { id: number; name: string } | null,
) {
  const progress = getCalendarChecklistProgress(event);

  if (!progress.isComplete) {
    return {
      ...event,
      completedAt: undefined,
      completedById: undefined,
    };
  }

  const completedById = completedBy?.id ?? event.completedById ?? event.addedById ?? event.responsibleId;

  return {
    ...event,
    completedAt: event.completedAt ?? getLocalDateKey(),
    completedById,
  };
}

export function getLocalDateKey(date = new Date()) {
  return formatDateKey(date);
}

export function buildCalendarCompletionHistoryEvent(
  event: CalendarEvent,
  completedBy?: { id: number; name: string } | null,
): HistoryEvent {
  const progress = getCalendarChecklistProgress(event);
  const completedByName = completedBy?.name ?? "Sistema";
  const completedById = completedBy?.id ?? event.completedById ?? event.addedById ?? event.responsibleId;

  return {
    id: getCalendarCompletionHistoryId(event.id),
    type: "schedule",
    title: `${event.title} concluida`,
    description: `Checklist finalizado por ${completedByName}.`,
    authorId: completedById,
    date: event.completedAt ?? getLocalDateKey(),
    result: "Checklist concluido",
    metrics: `${progress.completed}/${progress.total} itens`,
    source: {
      kind: "calendar_event",
      eventId: event.id,
      memberId: completedById,
    },
    completedAt: event.completedAt ?? getLocalDateKey(),
  } as HistoryEvent;
}
