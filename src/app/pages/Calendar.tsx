import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDrag, useDrop } from "react-dnd";
import {
  CalendarDays,
  Eye,
  ChevronLeft,
  ChevronRight,
  CirclePlus,
  ChevronDown,
  CheckCircle2,
  Pencil,
  Menu,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import {
  calendarHours,
  daysOfWeek,
  weekLabel,
  type CalendarEvent,
  type CalendarTaskItem,
  type HistoryEvent,
} from "../data/mockData";
import { useTeamProfiles } from "../data/profiles";
import { useCurrentTeamMember } from "../data/profiles";
import { formatBrazilDateLabel, getBrazilYesterdayDateKey } from "../data/brazilDate";
import { useSupabaseSharedState, useSupabaseSyncedListState } from "../data/supabaseSync";
import { defaultMonthlyViewsGoal, sumMonthViews, useCalendarDayMetrics } from "../data/calendarMetrics";
import { matchesTeamScope, useTeamScope } from "../data/teamScope";
import { buildCalendarCompletionHistoryEvent, getCalendarCompletionHistoryId } from "../data/calendarWorkflow";
import { removeHistoryEvent, upsertHistoryEvent } from "../data/historyEvents";
import {
  ActionButton,
  ConfirmDialog,
  DeleteIconButton,
  GlassPanel,
  PageHeader,
  PageTransition,
  RoundedDropdown,
  RoundedDatePicker,
  RoundedTimePicker,
  MemberChip,
  cn,
} from "../components/ui";
import { useThemeMode } from "../theme";

const viewModes = ["Dia", "Semana", "Mês"] as const;
const dragType = "calendar-event";
const getTodayDate = () => new Date();
const weekHeaderLabels = daysOfWeek.map((day) => `${day.toUpperCase()}.`);

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
const typeOptions: Array<{ label: string; value: CalendarEvent["type"]; color: string }> = [
  { label: "Reels", value: "Reels", color: "#d946ef" },
  { label: "Stories", value: "Stories", color: "#ec4899" },
  { label: "Carrossel", value: "Carrossel", color: "#f59e0b" },
  { label: "Feed", value: "Feed", color: "#0ea5e9" },
];
const statusOptions: Array<{ label: string; value: CalendarEvent["status"]; color: string }> = [
  { label: "Agendado", value: "Agendado", color: "#8b5cf6" },
  { label: "Em produção", value: "Em produção", color: "#06b6d4" },
  { label: "Aprovado", value: "Aprovado", color: "#10b981" },
  { label: "Publicado", value: "Publicado", color: "#f97316" },
];
const visualizationOptions = [
  { label: "Carrossel", value: "Carrossel" as const, color: "#8b5cf6" },
  { label: "Depoimento", value: "Depoimento" as const, color: "#ec4899" },
  { label: "Agendamento", value: "Agendamento" as const, color: "#f59e0b" },
  { label: "Material", value: "Material" as const, color: "#22c55e" },
  { label: "Vídeo viral", value: "Vídeo viral" as const, color: "#ef4444" },
];

type CalendarVisualizationType = (typeof visualizationOptions)[number]["value"];

function addDays(date: Date, value: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + value);
  return nextDate;
}

function startOfWeek(date: Date) {
  const nextDate = new Date(date);
  const offset = (nextDate.getDay() + 6) % 7;
  nextDate.setDate(nextDate.getDate() - offset);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
}

function formatWeekRange(date: Date) {
  const weekStart = startOfWeek(date);
  const weekEnd = addDays(weekStart, 6);

  return `${new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(weekStart)} - ${new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(weekEnd)}`;
}

function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(date);
}

function formatDayLabel(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "short" }).format(date);
}

function formatViewsNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function inferEventVisualization(event: CalendarEvent & { visualization?: CalendarVisualizationType }) {
  if (event.visualization) {
    return event.visualization;
  }

  const text = `${event.title} ${event.description}`.toLowerCase();

  if (event.type === "Carrossel" || text.includes("carrossel")) {
    return "Carrossel";
  }

  if (text.includes("depoimento") || text.includes("testimonial") || text.includes("prova social")) {
    return "Depoimento";
  }

  if (event.status === "Agendado" || text.includes("agendamento") || text.includes("agenda")) {
    return "Agendamento";
  }

  if (text.includes("material") || text.includes("entrega")) {
    return "Material";
  }

  return "Vídeo viral";
}

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function buildMonthCells(date: Date) {
  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
  const gridStart = startOfWeek(monthStart);

  return Array.from({ length: 35 }, (_, index) => addDays(gridStart, index));
}

function EventChip({
  event,
  teamMembers,
  compact = false,
  onClick,
  onDelete,
  dataCy,
}: {
  event: CalendarEvent;
  teamMembers: { id: number; name: string; color: string }[];
  compact?: boolean;
  onClick?: () => void;
  onDelete?: () => void;
  dataCy?: string;
}) {
  const responsibleIds = event.responsibleIds?.filter((value, index, array) => array.indexOf(value) === index) ?? [];
  const primaryResponsibleId = responsibleIds[0] ?? event.responsibleId;
  const member = teamMembers.find((item) => item.id === primaryResponsibleId)!;
  const extraCount = Math.max(responsibleIds.length - 1, 0);
  const [, drag] = useDrag(() => ({
    type: dragType,
    item: { id: event.id },
  }));
  const attachDragRef = (node: HTMLButtonElement | null) => {
    drag(node);
  };

  return (
    <div className="group relative w-full">
      <button
        ref={attachDragRef}
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onClick?.();
        }}
        data-cy={dataCy}
        className={cn(
          "relative w-full rounded-[1rem] border text-left transition duration-200 hover:-translate-y-0.5 hover:shadow-sm",
          compact ? "px-2.5 py-1.5 shadow-none" : "px-3 py-2 shadow-sm",
        )}
        style={{
          backgroundColor: `${member.color}08`,
          borderColor: `${member.color}22`,
          borderLeft: `4px solid ${member.color}`,
        }}
      >
        <div className="space-y-1">
          <p className="text-[11px] font-semibold leading-4" style={{ color: member.color }}>
            {event.title}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: `${member.color}14`, color: member.color }}>
              {event.type}
            </span>
            <span className="text-[10px] text-muted-foreground">{event.time}</span>
            {extraCount > 0 ? (
              <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-foreground shadow-sm">
                +{extraCount}
              </span>
            ) : null}
            {!compact ? (
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={{ backgroundColor: `${member.color}12`, color: member.color }}
              >
                {event.status}
              </span>
            ) : null}
          </div>
        </div>
      </button>
      {onDelete ? (
        <div className="absolute right-1 top-1 z-20 opacity-0 transition group-hover:opacity-100">
          <DeleteIconButton onClick={onDelete} dataCy={dataCy ? `${dataCy}-delete` : undefined} />
        </div>
      ) : null}
    </div>
  );
}

function getUniqueIds(values: number[]) {
  return values.filter((value, index, array) => array.indexOf(value) === index);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function useFloatingPopoverPosition({
  open,
  anchorRef,
  popoverRef,
  width,
  estimatedHeight,
}: {
  open: boolean;
  anchorRef: { current: HTMLElement | null };
  popoverRef: { current: HTMLElement | null };
  width: number;
  estimatedHeight: number;
}) {
  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    if (!open) {
      setPosition(null);
      return undefined;
    }

    const updatePosition = () => {
      const anchorNode = anchorRef.current;
      if (!anchorNode || typeof window === "undefined") {
        return;
      }

      const rect = anchorNode.getBoundingClientRect();
      const viewportPadding = 12;
      const popoverWidth = Math.min(Math.max(width, rect.width), window.innerWidth - viewportPadding * 2);
      const popoverNode = popoverRef.current;
      const measuredHeight = popoverNode?.offsetHeight ?? estimatedHeight;
      const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
      const spaceAbove = rect.top - viewportPadding;
      const openUp = spaceBelow < measuredHeight && spaceAbove > spaceBelow;
      const left = clamp(rect.right - popoverWidth, viewportPadding, window.innerWidth - popoverWidth - viewportPadding);
      const top = openUp ? rect.top - measuredHeight - 12 : rect.bottom + 12;

      setPosition({
        top: clamp(top, viewportPadding, window.innerHeight - measuredHeight - viewportPadding),
        left,
        width: popoverWidth,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [anchorRef, estimatedHeight, open, popoverRef, width]);

  return position;
}

function getEventResponsibleIds(event: CalendarEvent) {
  const ids = getUniqueIds(event.responsibleIds ?? []);
  if (ids.length > 0) {
    return ids;
  }

  return event.responsibleId ? [event.responsibleId] : [];
}

function createTaskItem(label: string, note = "", checklist = false): CalendarTaskItem {
  return {
    id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    label,
    note,
    checklist,
    done: false,
  };
}

function isCalendarEventFullyCompleted(event: Pick<CalendarEvent, "completed" | "status" | "tasks">) {
  const tasks = event.tasks ?? [];
  const allTasksDone = tasks.length > 0 && tasks.every((task) => task.done);

  return event.completed || event.status === "Publicado" || event.status === "Aprovado" || allTasksDone;
}

function applyCalendarCompletionMetadata(event: CalendarEvent, actorId?: number | null) {
  if (!isCalendarEventFullyCompleted(event)) {
    return {
      ...event,
      completed: false,
      completedAt: undefined,
      completedById: undefined,
    };
  }

  return {
    ...event,
    completed: true,
    completedAt: event.completedAt ?? formatDateKey(getTodayDate()),
    completedById: actorId ?? event.completedById ?? event.addedById ?? event.responsibleId,
  };
}

function calculateTaskProgress(tasks: CalendarTaskItem[]) {
  const total = tasks.length;
  const completed = tasks.filter((task) => task.done).length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { total, completed, percent };
}

function ActivityCheckIcon({ done }: { done: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 w-6 items-center justify-center rounded-full border text-[11px] transition duration-200",
        done
          ? "border-rose-500 bg-rose-500 text-white shadow-[0_8px_18px_rgba(244,63,94,0.18)]"
          : "border-slate-200 bg-white text-transparent shadow-[0_6px_14px_rgba(15,23,42,0.04)]",
      )}
    >
      ✓
    </span>
  );
}

type ActivityDraftState = {
  label: string;
  note: string;
  checklist: boolean;
};

function emptyActivityDraft(): ActivityDraftState {
  return {
    label: "",
    note: "",
    checklist: false,
  };
}

function ActivitySection({
  tasks,
  onAddTask,
  onToggleTask,
  onRemoveTask,
  onMarkAllDone,
  onClearTaskDraft,
  draft,
  setDraft,
}: {
  tasks: CalendarTaskItem[];
  onAddTask: (task: CalendarTaskItem) => void;
  onToggleTask: (taskId: string) => void;
  onRemoveTask: (taskId: string) => void;
  onMarkAllDone: () => void;
  onClearTaskDraft: () => void;
  draft: ActivityDraftState;
  setDraft: (updater: (current: ActivityDraftState) => ActivityDraftState) => void;
}) {
  const progress = calculateTaskProgress(tasks);
  const handleAddDraft = () => {
    const label = draft.label.trim();
    const note = draft.note.trim();

    if (!label) {
      toast.error("Digite o nome da atividade.");
      return;
    }

    onAddTask(createTaskItem(label, note, draft.checklist));
    onClearTaskDraft();
  };

  return (
    <div
      data-cy="calendar-activities-section"
      className="md:col-span-2 overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)]"
    >
      <div className="rounded-[1.7rem] border border-slate-200/70 bg-[#fcfcfe] p-5 shadow-[0_8px_22px_rgba(15,23,42,0.04)] sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-500 shadow-[0_10px_20px_rgba(244,63,94,0.1)]">
                <CheckCircle2 className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500">ATIVIDADES</p>
                <p data-cy="calendar-activities-progress" className="mt-1 text-sm font-medium text-slate-700">
                  {progress.completed} de {progress.total} atividades concluídas
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-4">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#ff6b78] via-[#f43f5e] to-[#dc2626] shadow-[0_0_18px_rgba(244,63,94,0.22)] transition-all duration-300"
                  style={{ width: `${Math.min(progress.percent, 100)}%` }}
                />
              </div>
              <span className="min-w-[48px] text-right text-sm font-semibold text-slate-500">{progress.percent}%</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 lg:justify-end">
            <button
              type="button"
              onClick={() => {
                handleAddDraft();
              }}
              data-cy="calendar-activity-add"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-rose-200 hover:bg-white hover:text-slate-900 hover:shadow-[0_12px_24px_rgba(15,23,42,0.06)]"
            >
              <Plus className="h-4 w-4" />
              Adicionar item
            </button>
            <button
              type="button"
              onClick={onMarkAllDone}
              data-cy="calendar-activity-mark-all"
              className="inline-flex items-center gap-2 rounded-full border border-transparent bg-gradient-to-r from-[#ff6b78] via-[#f43f5e] to-[#dc2626] px-4 py-2.5 text-sm font-medium text-white shadow-[0_14px_28px_rgba(244,63,94,0.22)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_34px_rgba(244,63,94,0.28)]"
            >
              <CheckCircle2 className="h-4 w-4" />
              Marcar todas como concluídas
            </button>
          </div>
        </div>

        <div className="mt-5 rounded-[1.6rem] border border-slate-200/70 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)] sm:p-5">
          {tasks.length > 0 ? (
            <div className="space-y-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="group rounded-[1.35rem] border border-slate-200/70 bg-[#fcfcfe] px-4 py-4 transition duration-200 hover:-translate-y-0.5 hover:border-rose-200 hover:bg-white hover:shadow-[0_14px_28px_rgba(15,23,42,0.06)]"
                >
                  <div className="flex items-start gap-3 sm:items-center">
                    <button
                      type="button"
                      onClick={() => onToggleTask(task.id)}
                      className="mt-0.5 shrink-0"
                      aria-label={task.done ? "Desmarcar atividade" : "Marcar atividade"}
                    >
                      <ActivityCheckIcon done={task.done} />
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                        <div className="min-w-0">
                          <p
                            className={cn(
                              "text-sm font-semibold leading-6 text-slate-900 transition",
                              task.done && "text-slate-400 line-through",
                            )}
                          >
                            {task.label}
                          </p>
                          {task.note ? <p className="mt-1 text-sm leading-6 text-slate-500">{task.note}</p> : null}
                        </div>

                        <button
                          type="button"
                          onClick={() => onRemoveTask(task.id)}
                          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-transparent px-3 py-1.5 text-xs font-medium text-slate-500 transition duration-200 hover:bg-slate-100 hover:text-slate-800"
                        >
                          Remover
                        </button>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                            task.checklist ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-500",
                          )}
                        >
                          {task.checklist ? "Checklist" : "Avulsa"}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                          {task.done ? "Concluída" : "Pendente"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[1.35rem] border border-dashed border-slate-200 bg-[#fcfcfe] px-5 py-10 text-center text-sm text-slate-500">
              Nenhuma atividade adicionada ainda.
            </div>
          )}

          <div className="mt-4 rounded-[1.5rem] border border-slate-200/70 bg-[#fcfcfe] p-4 shadow-[0_8px_22px_rgba(15,23,42,0.03)]">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
              <label className="grid gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Nome da atividade
                </span>
                <input
                  value={draft.label}
                  onChange={(event) => setDraft((current) => ({ ...current, label: event.target.value }))}
                  data-cy="calendar-activity-label"
                  placeholder="Ex.: aprovar capa"
                  className="h-12 rounded-[1.2rem] border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition duration-200 placeholder:text-slate-400 focus:border-rose-200 focus:ring-2 focus:ring-rose-100"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Observação rápida
                </span>
                <input
                  value={draft.note}
                  onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))}
                  data-cy="calendar-activity-note"
                  placeholder="Ex.: revisar CTA"
                  className="h-12 rounded-[1.2rem] border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition duration-200 placeholder:text-slate-400 focus:border-rose-200 focus:ring-2 focus:ring-rose-100"
                />
              </label>

              <button
                type="button"
                onClick={() => setDraft((current) => ({ ...current, checklist: !current.checklist }))}
                data-cy="calendar-activity-checklist-toggle"
                className={cn(
                  "inline-flex h-12 items-center justify-center gap-2 rounded-[1.2rem] border px-4 text-sm font-medium transition duration-200 md:min-w-[112px]",
                  draft.checklist
                    ? "border-rose-200 bg-rose-50 text-rose-600 shadow-[0_10px_20px_rgba(244,63,94,0.08)]"
                    : "border-slate-200 bg-white text-slate-500 hover:border-rose-200 hover:text-rose-600",
                )}
                aria-label="Alternar checklist"
                title="Alternar checklist"
              >
                <span
                  className={cn(
                    "inline-flex h-4 w-4 items-center justify-center rounded-[4px] border text-[10px] leading-none",
                    draft.checklist ? "border-rose-500 bg-rose-500 text-white" : "border-slate-300 bg-white text-transparent",
                  )}
                >
                  ✓
                </span>
                Checklist
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getMonthLabel(dateString: string) {
  const date = new Date(`${dateString}T12:00:00`);
  return new Intl.DateTimeFormat("pt-BR", { month: "short", year: "numeric" }).format(date);
}

type CalendarEventFormState = {
  title: string;
  description: string;
  type: CalendarEvent["type"];
  status: CalendarEvent["status"];
  visualization: CalendarVisualizationType;
  date: string;
  time: string;
  responsibleId: number;
  responsibleIds: number[];
  addedById?: number;
  completed?: boolean;
  tasks: CalendarTaskItem[];
};

function CalendarSlot({
  date,
  time,
  events,
  teamMembers,
  onDropEvent,
  onSelectEvent,
  onAddAtSlot,
  onDeleteEvent,
  dataCy,
}: {
  date: string;
  time: string;
  events: CalendarEvent[];
  teamMembers: { id: number; name: string; color: string }[];
  onDropEvent: (eventId: number, nextDate: string, nextTime: string) => void;
  onSelectEvent: (event: CalendarEvent) => void;
  onAddAtSlot: (date: string, time: string) => void;
  onDeleteEvent: (event: CalendarEvent) => void;
  dataCy?: string;
}) {
  const { isDark } = useThemeMode();
  const [{ isOver }, drop] = useDrop(() => ({
    accept: dragType,
    drop: (item: { id: number }) => onDropEvent(item.id, date, time),
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));
  const attachDropRef = (node: HTMLDivElement | null) => {
    drop(node);
  };

  return (
    <div
      ref={attachDropRef}
      onClick={() => onAddAtSlot(date, time)}
      data-cy={dataCy}
      className={cn(
        "relative min-h-[92px] border-l border-t p-2 transition",
        isDark ? "border-border/60 bg-card/90" : "border-border/30 bg-white/95",
        "cursor-pointer hover:bg-primary/5",
        isOver && "bg-primary/5",
      )}
    >
      <div className="space-y-2">
        {events.map((event) => (
          <EventChip
            key={event.id}
            event={event}
            teamMembers={teamMembers}
            compact
            onClick={() => onSelectEvent(event)}
            onDelete={() => onDeleteEvent(event)}
          />
        ))}
      </div>
    </div>
  );
}

function ResponsibleMultiPicker({
  value,
  teamMembers,
  onChange,
}: {
  value: number[];
  teamMembers: { id: number; name: string; color: string }[];
  onChange: (value: number[]) => void;
}) {
  const { isDark } = useThemeMode();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const selectedIds = getUniqueIds(value);
  const selectedMembers = teamMembers.filter((member) => selectedIds.includes(member.id));
  const firstMember = selectedMembers[0] ?? teamMembers[0];

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const isInsideTrigger = rootRef.current?.contains(target);
      const isInsidePopover = popoverRef.current?.contains(target);

      if (!isInsideTrigger && !isInsidePopover) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const popoverPosition = useFloatingPopoverPosition({
    open,
    anchorRef: rootRef,
    popoverRef,
    width: 360,
    estimatedHeight: 360,
  });

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex w-full items-center justify-between gap-3 rounded-full border border-border/70 px-4 py-3 text-left text-sm transition hover:border-primary/25 hover:shadow-sm",
          isDark ? "bg-card/90 hover:bg-card" : "bg-white hover:bg-muted/60",
        )}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            {selectedMembers.length > 0 ? selectedMembers.length : "0"}
          </span>
          <span className="min-w-0">
            <span className="block text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Responsáveis</span>
            <span className="block truncate font-medium text-foreground">
              {selectedMembers.length > 0
                ? `${firstMember?.name ?? "Selecionar"}${selectedMembers.length > 1 ? ` +${selectedMembers.length - 1}` : ""}`
                : "Selecionar responsáveis"}
            </span>
          </span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && popoverPosition ? createPortal(
        <div
          ref={popoverRef}
          className={cn(
            "z-[9999] overflow-hidden rounded-[1.75rem] border shadow-[0_24px_60px_rgba(15,23,42,0.16)]",
            isDark ? "border-border/60 bg-card dark:shadow-[0_24px_60px_rgba(0,0,0,0.28)]" : "border-border/60 bg-white",
          )}
          style={{
            position: "fixed",
            top: popoverPosition.top,
            left: popoverPosition.left,
            width: popoverPosition.width,
          }}
          onWheelCapture={(event) => event.stopPropagation()}
        >
          <div className="border-b border-border/60 px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Responsáveis</p>
            <p className="mt-1 text-sm text-muted-foreground">Selecione quantos quiser para esta tarefa.</p>
          </div>

          <div className="max-h-64 overflow-y-auto p-2">
            <div className="space-y-1">
              {teamMembers.map((member) => {
                const selected = selectedIds.includes(member.id);

                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => {
                      const nextIds = selected
                        ? selectedIds.filter((id) => id !== member.id)
                        : [...selectedIds, member.id];

                      onChange(nextIds.length > 0 ? getUniqueIds(nextIds) : selectedIds);
                    }}
                  className="flex w-full items-center justify-between rounded-full px-4 py-3 text-left text-sm transition hover:bg-muted"
                    style={{
                      backgroundColor: selected ? "rgb(var(--muted) / 1)" : undefined,
                      boxShadow: selected ? "inset 0 0 0 1px rgb(var(--border) / 0.7)" : undefined,
                    }}
                  >
                    <span className="flex items-center gap-3">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: member.color }} />
                      <span className="font-medium" style={{ color: member.color }}>
                        {member.name}
                      </span>
                    </span>
                    {selected ? <span className="text-xs font-semibold text-muted-foreground">Ativo</span> : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-border/60 px-4 py-3">
            <button
              type="button"
              onClick={() => onChange([])}
              className="rounded-full border border-border/60 bg-muted/40 px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-muted/70"
            >
              Limpar
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className={cn(
                "rounded-full border border-border/60 px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:text-foreground",
                isDark ? "bg-card/80" : "bg-white",
              )}
            >
              Fechar
            </button>
          </div>
        </div>,
        document.body,
      ) : null}
    </div>
  );
}

function MiniMonth({ date }: { date: Date }) {
  const { isDark } = useThemeMode();
  const monthCells = buildMonthCells(date);
  const currentMonth = date.getMonth();
  const currentDay = formatDateKey(getTodayDate());

  return (
    <div className={cn(
      "rounded-[1.75rem] border border-border/60 p-4 shadow-sm",
      isDark ? "bg-card/95 dark:shadow-[0_18px_36px_rgba(0,0,0,0.18)]" : "bg-white shadow-[0_18px_36px_rgba(15,23,42,0.06)]",
    )}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{formatMonthLabel(date)}</h3>
      </div>
      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {daysOfWeek.map((day) => (
          <span key={day}>{day.slice(0, 1)}</span>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1">
        {monthCells.map((day) => {
          const isCurrentMonth = day.getMonth() === currentMonth;
          const isToday = formatDateKey(day) === currentDay;

          return (
            <button
              key={formatDateKey(day)}
              type="button"
              className={cn(
                "flex h-9 items-center justify-center rounded-full text-xs transition",
                isToday && "bg-primary text-primary-foreground shadow-lg shadow-primary/20",
                !isToday && isCurrentMonth && "text-foreground hover:bg-muted",
                !isCurrentMonth && "text-muted-foreground/40",
              )}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SideAgenda({
  events,
  teamMembers,
  onDelete,
}: {
  events: CalendarEvent[];
  teamMembers: { id: number; name: string; color: string }[];
  onDelete: (event: CalendarEvent) => void;
}) {
  const { isDark } = useThemeMode();
  const orderedEvents = [...events].sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));

  return (
    <div className={cn(
      "rounded-[1.75rem] border border-border/60 p-4 shadow-sm",
      isDark ? "bg-card/95 dark:shadow-[0_18px_36px_rgba(0,0,0,0.18)]" : "bg-white shadow-[0_18px_36px_rgba(15,23,42,0.06)]",
    )}
      data-cy="calendar-side-agenda"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Agenda rápida</h3>
        <CirclePlus className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="mt-4 space-y-3">
        {orderedEvents.slice(0, 4).map((event) => {
          const member = teamMembers.find((item) => item.id === event.responsibleId)!;

          return (
            <div
              key={event.id}
              className="group relative rounded-2xl border border-border/60 p-3"
              style={{ backgroundColor: `${member.color}06` }}
              data-cy={`calendar-side-event-${event.id}`}
            >
              <div className="absolute right-2 top-2 z-10 opacity-0 transition group-hover:opacity-100">
                <DeleteIconButton onClick={() => onDelete(event)} dataCy={`calendar-side-event-delete-${event.id}`} />
              </div>
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">{event.title}</p>
                  <p className="text-xs text-muted-foreground">{event.date}</p>
                </div>
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: member.color }} />
              </div>
              <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                <span className="text-muted-foreground">{event.time}</span>
                <span className="font-medium" style={{ color: member.color }}>
                  {member.name}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CalendarPage() {
  const { isDark } = useThemeMode();
  const [view, setView] = useState<(typeof viewModes)[number]>("Semana");
  const [currentDate, setCurrentDate] = useState(() => getTodayDate());
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [teamMembers] = useTeamProfiles();
  const { member: currentMember, memberId: currentMemberId, updateMember } = useCurrentTeamMember();
  const [teamScope] = useTeamScope();
  const [events, setEvents] = useSupabaseSyncedListState<CalendarEvent>({
    key: "calendar-events",
    table: "calendar_events",
    fallback: [],
  });
  const [, setHistoryEvents] = useSupabaseSyncedListState<HistoryEvent>({
    key: "history",
    table: "history_events",
    fallback: [],
  });
  const [dayViewsByDate, setDayViewsByDate, dayReachByDate, setDayReachByDate] = useCalendarDayMetrics();
  const [monthlyViewsGoal, setMonthlyViewsGoal] = useSupabaseSharedState<number>({
    key: "calendar-monthly-views-goal",
    fallback: defaultMonthlyViewsGoal,
  });
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [eventForm, setEventForm] = useState<CalendarEventFormState | null>(null);
  const [pendingDelete, setPendingDelete] = useState<CalendarEvent | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CalendarEventFormState | null>(null);
  const [taskDraft, setTaskDraft] = useState<ActivityDraftState>(() => emptyActivityDraft());
  const [isEditingDayViews, setIsEditingDayViews] = useState(false);
  const [dayViewsDraft, setDayViewsDraft] = useState("0");
  const [isEditingDayReach, setIsEditingDayReach] = useState(false);
  const [dayReachDraft, setDayReachDraft] = useState("0");
  const [isEditingMonthlyViewsGoal, setIsEditingMonthlyViewsGoal] = useState(false);
  const [monthlyViewsGoalDraft, setMonthlyViewsGoalDraft] = useState(String(defaultMonthlyViewsGoal));

  const syncCompletedEventHistory = (event: CalendarEvent, actorId?: number | null) => {
    const historyId = getCalendarCompletionHistoryId(event.id);
    const resolvedActorId = actorId ?? event.completedById ?? event.addedById ?? event.responsibleId;
    const actor =
      typeof resolvedActorId === "number"
        ? teamMembers.find((member) => member.id === resolvedActorId)
        : null;

    setHistoryEvents((previous) => {
      if (!event.completed) {
        return removeHistoryEvent(previous, historyId);
      }

      return upsertHistoryEvent(
        previous,
        buildCalendarCompletionHistoryEvent(
          event,
          actor ? { id: actor.id, name: actor.name } : null,
        ),
      );
    });
  };

  const weekDates = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(currentDate), index)), [currentDate]);
  const monthCells = useMemo(() => buildMonthCells(currentDate), [currentDate]);
  const filteredEvents = useMemo(
    () =>
      events.filter((event) => {
        const responsibleIds = event.responsibleIds?.length ? event.responsibleIds : [event.responsibleId];
        return responsibleIds.some((id) => matchesTeamScope(id, teamScope));
      }),
    [events, teamScope],
  );
  const currentMonthEvents = useMemo(
    () => filteredEvents.filter((event) => event.date.startsWith(getMonthKey(currentDate))),
    [currentDate, filteredEvents],
  );
  const monthTypeCounts = useMemo(
    () =>
      currentMonthEvents.reduce(
        (accumulator, event) => {
          if (event.type === "Reels") {
            accumulator.Reels += 1;
          } else if (event.type === "Stories") {
            accumulator.Stories += 1;
          } else if (event.type === "Carrossel") {
            accumulator.Carrossel += 1;
          } else if (event.type === "Feed") {
            accumulator.Feed += 1;
          }

          return accumulator;
        },
        { Reels: 0, Stories: 0, Carrossel: 0, Feed: 0 },
      ),
    [currentMonthEvents],
  );
  const currentDayEvents = useMemo(
    () =>
      filteredEvents
        .filter((event) => event.date === formatDateKey(currentDate))
        .sort((left, right) => left.time.localeCompare(right.time)),
    [currentDate, filteredEvents],
  );
  const referenceDateKey = getBrazilYesterdayDateKey();
  const referenceDateLabel = formatBrazilDateLabel(referenceDateKey);
  const currentDayViews = dayViewsByDate[referenceDateKey] ?? 0;
  const currentDayReach = dayReachByDate[referenceDateKey] ?? 0;
  const currentMonthKey = getMonthKey(currentDate);
  const currentMonthViews = useMemo(() => sumMonthViews(dayViewsByDate, currentMonthKey), [currentMonthKey, dayViewsByDate]);
  const currentMonthReach = useMemo(() => sumMonthViews(dayReachByDate, currentMonthKey), [currentMonthKey, dayReachByDate]);
  const remainingMonthViews = Math.max(monthlyViewsGoal - currentMonthViews, 0);
  const dayCompletedCount = currentDayEvents.filter((event) => event.completed || event.status === "Publicado" || event.status === "Aprovado").length;
  const currentDayPendingCount = Math.max(currentDayEvents.length - dayCompletedCount, 0);
  const weekDateKeys = useMemo(() => weekDates.map((date) => formatDateKey(date)), [weekDates]);
  const currentWeekEvents = useMemo(
    () => filteredEvents.filter((event) => weekDateKeys.includes(event.date)),
    [filteredEvents, weekDateKeys],
  );
  const weekCompletedCount = useMemo(
    () => currentWeekEvents.filter((event) => event.completed || event.status === "Publicado" || event.status === "Aprovado").length,
    [currentWeekEvents],
  );
  const monthStatusCounts = useMemo(
    () =>
      currentMonthEvents.reduce(
        (accumulator, event) => {
          if (event.status === "Agendado") {
            accumulator.scheduled += 1;
          } else if (event.status === "Em produção") {
            accumulator.production += 1;
          } else if (event.status === "Aprovado") {
            accumulator.approved += 1;
          } else if (event.status === "Publicado") {
            accumulator.published += 1;
          }

          return accumulator;
        },
        { scheduled: 0, production: 0, approved: 0, published: 0 },
      ),
    [currentMonthEvents],
  );
  const monthlyGoalProgress = monthlyViewsGoal > 0 ? Math.min((currentMonthViews / monthlyViewsGoal) * 100, 100) : 0;
  useEffect(() => {
    setDayViewsDraft(String(currentDayViews));
    setIsEditingDayViews(false);
  }, [currentDayViews, referenceDateKey]);

  useEffect(() => {
    setDayReachDraft(String(currentDayReach));
    setIsEditingDayReach(false);
  }, [currentDayReach, referenceDateKey]);

  useEffect(() => {
    setMonthlyViewsGoalDraft(String(monthlyViewsGoal));
    setIsEditingMonthlyViewsGoal(false);
  }, [monthlyViewsGoal]);

  const handleStartEditingDayViews = () => {
    setDayViewsDraft(String(currentDayViews));
    setIsEditingDayViews(true);
  };

  const handleCommitDayViews = () => {
    const parsedValue = Number(String(dayViewsDraft).replace(/[^\d]/g, ""));
    const nextValue = Number.isFinite(parsedValue) ? Math.max(0, Math.round(parsedValue)) : 0;

    setDayViewsByDate((previous) => ({
      ...previous,
      [referenceDateKey]: nextValue,
    }));
    setIsEditingDayViews(false);
    toast.success("Visualizações de ontem atualizadas.");
  };

  const handleCancelDayViewsEdit = () => {
    setDayViewsDraft(String(currentDayViews));
    setIsEditingDayViews(false);
  };

  const handleStartEditingDayReach = () => {
    setDayReachDraft(String(currentDayReach));
    setIsEditingDayReach(true);
  };

  const handleCommitDayReach = () => {
    const parsedValue = Number(String(dayReachDraft).replace(/[^\d]/g, ""));
    const nextValue = Number.isFinite(parsedValue) ? Math.max(0, Math.round(parsedValue)) : 0;

    setDayReachByDate((previous) => ({
      ...previous,
      [referenceDateKey]: nextValue,
    }));
    setIsEditingDayReach(false);
    toast.success("Alcance de ontem atualizado.");
  };

  const handleCancelDayReachEdit = () => {
    setDayReachDraft(String(currentDayReach));
    setIsEditingDayReach(false);
  };

  const handleStartEditingMonthlyViewsGoal = () => {
    setMonthlyViewsGoalDraft(String(monthlyViewsGoal));
    setIsEditingMonthlyViewsGoal(true);
  };

  const handleCommitMonthlyViewsGoal = () => {
    const parsedValue = Number(String(monthlyViewsGoalDraft).replace(/[^\d]/g, ""));
    const nextValue = Number.isFinite(parsedValue) ? Math.max(1, Math.round(parsedValue)) : defaultMonthlyViewsGoal;

    setMonthlyViewsGoal(nextValue);
    setMonthlyViewsGoalDraft(String(nextValue));
    setIsEditingMonthlyViewsGoal(false);
    toast.success("Meta mensal de visualizações atualizada.");
  };

  const handleCancelMonthlyViewsGoalEdit = () => {
    setMonthlyViewsGoalDraft(String(monthlyViewsGoal));
    setIsEditingMonthlyViewsGoal(false);
  };

  const controlBarClass = isDark
    ? "overflow-hidden p-4"
    : "overflow-hidden border border-border/60 bg-white/96 p-4 shadow-[0_18px_48px_rgba(15,23,42,0.06)]";
  const gridPanelClass = isDark
    ? "overflow-hidden p-0"
    : "overflow-hidden border border-border/60 bg-white/96 p-0 shadow-[0_18px_48px_rgba(15,23,42,0.06)]";
  const navButtonClass = isDark
    ? "inline-flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-card/90 text-foreground shadow-sm transition hover:bg-card"
    : "inline-flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-white text-foreground shadow-sm transition hover:bg-muted";
  const todayButtonClass = isDark
    ? "rounded-full border border-border/70 bg-card/90 px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm transition hover:bg-card"
    : "rounded-full border border-border/70 bg-white px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm transition hover:bg-muted";
  const calendarShellClass = isDark
    ? "w-full rounded-[2rem] bg-card/95"
    : "w-full rounded-[2rem] bg-white";
  const calendarHeaderClass = isDark
    ? "sticky top-0 z-10 grid grid-cols-[72px_repeat(7,minmax(0,1fr))] border-b border-border/50 bg-card/95"
    : "sticky top-0 z-10 grid grid-cols-[72px_repeat(7,minmax(0,1fr))] border-b border-border/50 bg-white/98 backdrop-blur";
  const monthCellClass = isDark
    ? "min-h-44 rounded-[1.6rem] border border-border/60 bg-card/95 p-3"
    : "min-h-44 rounded-[1.6rem] border border-border/60 bg-white p-3 shadow-[0_10px_24px_rgba(15,23,42,0.04)]";
  const modalClass = isDark
    ? "w-full max-w-4xl overflow-hidden rounded-[2.5rem] border border-border/60 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.18)] dark:border-white/8 dark:bg-card dark:shadow-[0_30px_80px_rgba(0,0,0,0.35)]"
    : "w-full max-w-4xl overflow-hidden rounded-[2.5rem] border border-border/60 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.12)]";
  const handleNavigate = (direction: -1 | 1) => {
    if (view === "Dia") {
      setCurrentDate((previous) => addDays(previous, direction));
      return;
    }

    if (view === "Semana") {
      setCurrentDate((previous) => addDays(previous, direction * 7));
      return;
    }

    setCurrentDate((previous) => new Date(previous.getFullYear(), previous.getMonth() + direction, 1));
  };

  const createDefaultForm = (date = formatDateKey(currentDate), time = "09:00"): CalendarEventFormState => {
    const fallbackResponsibleId = currentMember?.id ?? teamMembers[0]?.id ?? 1;

    return {
      title: "",
      description: "",
      type: "Reels",
      status: "Agendado",
      visualization: "Vídeo viral",
      date,
      time,
      responsibleId: fallbackResponsibleId,
      responsibleIds: [fallbackResponsibleId],
      addedById: currentMember?.id ?? fallbackResponsibleId,
      tasks: [],
    };
  };

  const handleDropEvent = (eventId: number, nextDate: string, nextTime: string) => {
    setEvents((previous) =>
      previous.map((event) => (event.id === eventId ? { ...event, date: nextDate, time: nextTime } : event)),
    );
    setSelectedEvent((current) => (current?.id === eventId ? { ...current, date: nextDate, time: nextTime } : current));
    setEventForm((current) => (current && selectedEvent?.id === eventId ? { ...current, date: nextDate, time: nextTime } : current));
    toast.success("Post reagendado com sucesso.");
  };

  const handleOpenCreateModal = () => {
    setCreateForm(createDefaultForm());
    setIsCreateOpen(true);
  };

  const handleDuplicateEvent = () => {
    if (!selectedEvent) {
      return;
    }

    const nextId = Math.max(...events.map((event) => event.id), 0) + 1;
    const responsibleIds = getEventResponsibleIds(selectedEvent);
    const duplicatedEvent: CalendarEvent = {
      ...selectedEvent,
      id: nextId,
      responsibleId: responsibleIds[0] ?? selectedEvent.responsibleId,
      responsibleIds,
    };

    setEvents((previous) => [...previous, duplicatedEvent]);
    toast.success("Tarefa duplicada com sucesso.");
  };

  const handleSaveEvent = () => {
    if (!selectedEvent || !eventForm) {
      return;
    }

    if (!eventForm.title.trim() || !eventForm.description.trim()) {
       toast.error("Preencha título e descrição.");
      return;
    }

    const nextResponsibleIds = getUniqueIds(
      eventForm.responsibleIds.length > 0 ? eventForm.responsibleIds : [eventForm.responsibleId],
    );

    const updatedEvent = applyCalendarCompletionMetadata({
      ...selectedEvent,
      title: eventForm.title.trim(),
      description: eventForm.description.trim(),
      type: eventForm.type,
      status: eventForm.status,
      visualization: eventForm.visualization,
      date: eventForm.date,
      time: eventForm.time,
      responsibleId: nextResponsibleIds[0] ?? eventForm.responsibleId,
      responsibleIds: nextResponsibleIds,
      addedById: eventForm.addedById,
      tasks: eventForm.tasks,
    }, currentMemberId ?? currentMember?.id ?? null);

    setEvents((previous) => previous.map((event) => (event.id === selectedEvent.id ? updatedEvent : event)));
    syncCompletedEventHistory(updatedEvent, currentMemberId ?? currentMember?.id ?? null);
    setSelectedEvent(updatedEvent);
    setEventForm({
      title: updatedEvent.title,
      description: updatedEvent.description,
      type: updatedEvent.type,
      status: updatedEvent.status,
      visualization: updatedEvent.visualization ?? inferEventVisualization(updatedEvent),
      date: updatedEvent.date,
      time: updatedEvent.time,
      responsibleId: updatedEvent.responsibleId,
      responsibleIds: updatedEvent.responsibleIds?.length ? updatedEvent.responsibleIds : [updatedEvent.responsibleId],
      addedById: updatedEvent.addedById,
      tasks: updatedEvent.tasks ?? [],
    });
    toast.success("Tarefa atualizada com sucesso.");
  };

  const handleMarkEventCompleted = () => {
    if (!selectedEvent) {
      return;
    }

    if (selectedEvent.completed) {
       toast.info("Essa atividade já está concluída.");
      return;
    }

    const completedEvent = applyCalendarCompletionMetadata({
      ...selectedEvent,
      completed: true,
      status: "Publicado",
      tasks: (selectedEvent.tasks ?? []).map((task) => ({ ...task, done: true })),
    }, currentMemberId ?? currentMember?.id ?? null);

    setEvents((previous) => previous.map((event) => (event.id === selectedEvent.id ? completedEvent : event)));
    syncCompletedEventHistory(completedEvent, currentMemberId ?? currentMember?.id ?? null);
    setSelectedEvent(completedEvent);
    setEventForm((current) =>
      current ? { ...current, status: completedEvent.status, tasks: completedEvent.tasks ?? current.tasks } : current,
    );

    const actorId = getEventResponsibleIds(selectedEvent)[0] ?? currentMemberId ?? currentMember?.id;
    if (typeof actorId === "number") {
      updateMember(actorId, (member) => {
        const monthLabel = getMonthLabel(completedEvent.date);
        const currentStats = member.stats ?? {
          postsCreated: 0,
          avgEngagement: 0,
          goalsCompleted: 0,
          performance: 0,
          punctuality: 0,
        };
        const currentMonthlyPosts = member.monthlyPosts ?? [];
        const currentMonth = currentMonthlyPosts.find((entry) => entry.month === monthLabel);
        const nextMonthlyPosts = currentMonth
          ? currentMonthlyPosts.map((entry) =>
              entry.month === monthLabel ? { ...entry, posts: entry.posts + 1 } : entry,
            )
          : [...currentMonthlyPosts, { month: monthLabel, posts: 1 }];

        return {
          ...member,
          stats: {
            ...currentStats,
            postsCreated: currentStats.postsCreated + 1,
            performance: currentStats.performance + 1,
          },
          monthlyPosts: nextMonthlyPosts,
        };
      });
    }

     toast.success("Atividade marcada como concluída.");
  };

  const handleDeleteEvent = (eventId: number) => {
    const removedEvent = events.find((event) => event.id === eventId);

    if (!removedEvent) {
      return;
    }

    setEvents((previous) => previous.filter((event) => event.id !== eventId));
    setHistoryEvents((previous) => removeHistoryEvent(previous, getCalendarCompletionHistoryId(eventId)));
    setSelectedEvent((current) => (current?.id === eventId ? null : current));
    setPendingDelete(null);
    toast.success("Evento apagado com sucesso.", {
      action: {
        label: "Desfazer",
        onClick: () => {
          setEvents((previous) => {
            if (previous.some((event) => event.id === removedEvent.id)) {
              return previous;
            }

            return [removedEvent, ...previous];
          });
        },
      },
    });
  };

  const handleOpenQuickCreate = (date: string, time: string) => {
    setCreateForm(createDefaultForm(date, time));
    setIsCreateOpen(true);
  };

  const handleCreateEvent = () => {
    if (!createForm) {
      return;
    }

    if (!createForm.title.trim() || !createForm.description.trim()) {
      toast.error("Preencha título e descrição.");
      return;
    }

    const nextId = Math.max(...events.map((event) => event.id), 0) + 1;
    const nextResponsibleIds = getUniqueIds(
      createForm.responsibleIds.length > 0 ? createForm.responsibleIds : [createForm.responsibleId],
    );

    const newEvent = applyCalendarCompletionMetadata({
      id: nextId,
      title: createForm.title.trim(),
      description: createForm.description.trim(),
      type: createForm.type,
      status: createForm.status,
      visualization: createForm.visualization,
      date: createForm.date,
      time: createForm.time,
      responsibleId: nextResponsibleIds[0] ?? createForm.responsibleId,
      responsibleIds: nextResponsibleIds,
      addedById: createForm.addedById,
      tasks: createForm.tasks,
    }, currentMemberId ?? currentMember?.id ?? null);

    setEvents((previous) => [...previous, newEvent]);
    syncCompletedEventHistory(newEvent, currentMemberId ?? currentMember?.id ?? null);
    setSelectedEvent(newEvent);
    setEventForm({
      title: newEvent.title,
      description: newEvent.description,
      type: newEvent.type,
      status: newEvent.status,
      visualization: newEvent.visualization ?? inferEventVisualization(newEvent),
      date: newEvent.date,
      time: newEvent.time,
      responsibleId: newEvent.responsibleId,
      responsibleIds: newEvent.responsibleIds?.length ? newEvent.responsibleIds : [newEvent.responsibleId],
      addedById: newEvent.addedById,
      tasks: newEvent.tasks ?? [],
    });
    setIsCreateOpen(false);
    setCreateForm(null);
    toast.success("Tarefa criada com sucesso.");
  };

  const handleMarkCreateCompleted = () => {
    setCreateForm((current) =>
      current
        ? {
            ...current,
            completed: true,
            status: "Publicado",
            tasks: (current.tasks ?? []).map((task) => ({ ...task, done: true })),
          }
        : current,
    );
    toast.success("Atividade marcada como concluída.");
  };

  const handleDuplicateCreate = () => {
    if (!createForm) {
      return;
    }

    setCreateForm((current) =>
      current
        ? {
            ...current,
            title: current.title ? `${current.title} - cópia` : current.title,
          }
        : current,
    );
    toast.success("Tarefa duplicada com sucesso.");
  };

  useEffect(() => {
    if (!selectedEvent) {
      setEventForm(null);
      setTaskDraft(emptyActivityDraft());
      return undefined;
    }

    setEventForm({
      title: selectedEvent.title,
      description: selectedEvent.description,
      type: selectedEvent.type,
      status: selectedEvent.status,
      visualization: selectedEvent.visualization ?? inferEventVisualization(selectedEvent),
      date: selectedEvent.date,
      time: selectedEvent.time,
      responsibleId: selectedEvent.responsibleId,
      responsibleIds: selectedEvent.responsibleIds?.length ? selectedEvent.responsibleIds : [selectedEvent.responsibleId],
      addedById: selectedEvent.addedById ?? currentMember?.id ?? teamMembers[0]?.id,
      tasks: selectedEvent.tasks ?? [],
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedEvent(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentMember, selectedEvent, teamMembers]);

  useEffect(() => {
    if (!isCreateOpen) {
      setCreateForm(null);
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsCreateOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCreateOpen]);

  useEffect(() => {
    if (!selectedEvent && !isCreateOpen && !pendingDelete) {
      return undefined;
    }

    const previousBodyStyle = {
      overflow: document.body.style.overflow,
    };
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyStyle.overflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [isCreateOpen, pendingDelete, selectedEvent]);

  const dayHeader = view === "Dia" ? formatDayLabel(currentDate) : formatWeekRange(currentDate);
  const selectedEventResponsibleIds = selectedEvent ? getEventResponsibleIds(selectedEvent) : [];
  const selectedEventMembers = selectedEvent
    ? selectedEventResponsibleIds
        .map((id) => teamMembers.find((item) => item.id === id))
        .filter((item): item is (typeof teamMembers)[number] => Boolean(item))
    : [];
  const selectedEventPrimaryMember =
    selectedEvent && selectedEventMembers.length > 0
      ? selectedEventMembers[0]
      : selectedEvent
      ? teamMembers.find((item) => item.id === selectedEvent.responsibleId) ?? teamMembers[0]
      : null;
  const createResponsibleIds = createForm ? getUniqueIds(createForm.responsibleIds.length > 0 ? createForm.responsibleIds : [createForm.responsibleId]) : [];
  const createSelectedMembers = createForm
    ? createResponsibleIds
        .map((id) => teamMembers.find((item) => item.id === id))
        .filter((item): item is (typeof teamMembers)[number] => Boolean(item))
    : [];
  const createPrimaryMember =
    createForm && createSelectedMembers.length > 0
      ? createSelectedMembers[0]
      : createForm
        ? teamMembers.find((item) => item.id === createForm.responsibleId) ?? teamMembers[0]
        : null;

  return (
    <PageTransition>
      <PageHeader
        title="Calendário Orgânico"
        actions={
          <ActionButton dataCy="calendar-open-create" onClick={handleOpenCreateModal}>
            <Plus className="h-4 w-4" />
            Novo Post
          </ActionButton>
        }
      />

      <div className={cn("grid gap-6", isSidebarCollapsed ? "xl:grid-cols-[56px_minmax(0,1fr)]" : "xl:grid-cols-[260px_minmax(0,1fr)]")}>
        <aside className="flex flex-col gap-5 xl:sticky xl:top-6 xl:self-start">
          {!isSidebarCollapsed ? (
            <>
              <GlassPanel className="overflow-hidden p-0">
                <div className="border-b border-border/50 bg-[linear-gradient(135deg,rgba(225,29,72,0.12),rgba(255,255,255,0.96),rgba(251,113,133,0.08))] px-5 py-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Calendário do mês</p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{formatMonthLabel(currentDate)}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">Acompanhe agenda, ritmo de publicação e o pulso da operação criativa.</p>
                </div>
                <div className="p-4">
                  <MiniMonth date={currentDate} />
                </div>
              </GlassPanel>

              <GlassPanel className="overflow-hidden border border-border/60 bg-[linear-gradient(180deg,rgba(255,251,252,0.99),rgba(255,247,249,0.97))] p-6 shadow-[0_18px_42px_rgba(15,23,42,0.06)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Resumo rápido</p>
                    <h3 className="mt-2 text-lg font-semibold tracking-tight text-foreground">Saúde da agenda</h3>
                  </div>
                  <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600">
                    {Math.round(monthlyGoalProgress)}%
                  </span>
                </div>

                <div className="mt-5 space-y-3">
                  <div className="rounded-[1.25rem] border border-border/60 bg-muted/20 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Visualizações do mês</p>
                        <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{formatViewsNumber(currentMonthViews)}</p>
                      </div>
                      <div className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600">
                        {formatViewsNumber(remainingMonthViews)} faltam
                      </div>
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-rose-100">
                      <div className="h-full rounded-full bg-[linear-gradient(90deg,#fb7185_0%,#f43f5e_50%,#e11d48_100%)] transition-all" style={{ width: `${monthlyGoalProgress}%` }} />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                    <div className="rounded-[1.25rem] border border-border/60 bg-white/90 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Agenda da semana</p>
                      <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{currentWeekEvents.length}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{weekCompletedCount} concluídas no período.</p>
                    </div>
                    <div className="rounded-[1.25rem] border border-border/60 bg-white/90 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Alcance do mês</p>
                      <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{formatViewsNumber(currentMonthReach)}</p>
                      <p className="mt-1 text-sm text-muted-foreground">Acumulado automático do mês.</p>
                    </div>
                  </div>
                </div>
              </GlassPanel>

              <GlassPanel className="overflow-hidden p-0">
                <SideAgenda
                  events={currentMonthEvents}
                  teamMembers={teamMembers}
                  onDelete={(event) => setPendingDelete(event)}
                />
              </GlassPanel>
            </>
          ) : null}
        </aside>

        <div className="space-y-5">
          <GlassPanel className={cn(controlBarClass, "overflow-hidden border border-border/60 bg-[linear-gradient(180deg,rgba(255,251,252,0.99),rgba(255,247,249,0.97))] p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)]")}>
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className={navButtonClass}
                    onClick={() => setIsSidebarCollapsed((value) => !value)}
                    aria-label={isSidebarCollapsed ? "Expandir lateral" : "Recolher lateral"}
                  >
                    <Menu className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNavigate(-1)}
                    className={navButtonClass}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNavigate(1)}
                    className={navButtonClass}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentDate(getTodayDate())}
                    className={todayButtonClass}
                  >
                    Hoje
                  </button>
                </div>

                <div className="text-left xl:text-center">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Período ativo</p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{dayHeader}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{weekLabel}</p>
                </div>

                <div className="inline-flex rounded-full border border-border/60 bg-muted/50 p-1">
                  {viewModes.map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      data-cy={`calendar-view-${mode.toLowerCase()}`}
                      aria-pressed={view === mode}
                      onClick={() => setView(mode)}
                      className={cn(
                        "rounded-full px-4 py-2 text-sm font-medium transition",
                        view === mode
                          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
                <div className="rounded-[1.45rem] border border-border/60 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Dia selecionado</p>
                  <p className="mt-2 text-lg font-semibold tracking-tight text-foreground">{formatDayLabel(currentDate)}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{currentDayEvents.length} atividades na agenda.</p>
                </div>
                <div className="rounded-[1.45rem] border border-border/60 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Concluídas no dia</p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{dayCompletedCount}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{currentDayPendingCount} ainda pendentes.</p>
                </div>
                <div className="rounded-[1.45rem] border border-border/60 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Próximo horário</p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{currentDayEvents[0]?.time ?? "—"}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{currentDayEvents[0]?.title ?? "Nenhuma publicação agendada."}</p>
                </div>
                <div className="rounded-[1.45rem] border border-border/60 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Postagens do mês</p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{currentMonthEvents.length}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{monthStatusCounts.published} já publicadas.</p>
                </div>
              </div>
            </div>
          </GlassPanel>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_380px]">
            <GlassPanel className="overflow-hidden border border-border/60 bg-[linear-gradient(180deg,rgba(255,251,252,0.99),rgba(255,247,249,0.97))] p-6 shadow-[0_18px_42px_rgba(15,23,42,0.06)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Planejamento do dia</p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{formatDayLabel(currentDate)}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">Confira o resumo da rotina planejada para o dia e o status das entregas.</p>
                </div>
                <div className="rounded-full border border-border/60 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground shadow-sm">
                  {formatDateKey(currentDate)}
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <div className="rounded-[1.45rem] border border-border/60 bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Atividades</p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{currentDayEvents.length}</p>
                  <p className="mt-1 text-sm text-muted-foreground">Cards previstos no dia.</p>
                </div>
                <div className="rounded-[1.45rem] border border-border/60 bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Conteúdos prontos</p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{dayCompletedCount}</p>
                  <p className="mt-1 text-sm text-muted-foreground">Finalizados ou publicados.</p>
                </div>
                <div className="rounded-[1.45rem] border border-border/60 bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Próxima história</p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{currentDayEvents[0]?.time ?? "—"}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{currentDayEvents[0]?.description ?? "Nenhuma publicação agendada."}</p>
                </div>
              </div>
            </GlassPanel>

            <GlassPanel className="overflow-hidden border border-border/60 bg-[linear-gradient(180deg,rgba(255,251,252,0.99),rgba(255,247,249,0.97))] p-6 shadow-[0_18px_42px_rgba(15,23,42,0.06)]">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="max-w-[36rem] min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Visualizações do mês</p>
                  <h3 className="mt-2 text-[clamp(1.5rem,2vw,2rem)] font-semibold tracking-tight text-foreground">{formatMonthLabel(currentDate)}</h3>
                  <p className="mt-2 max-w-[28rem] text-sm leading-6 text-muted-foreground">Confira o desempenho geral dos conteúdos publicados neste mês.</p>
                </div>
                <button
                  type="button"
                  onClick={handleStartEditingMonthlyViewsGoal}
                  className="inline-flex h-8.5 items-center gap-1.5 self-start rounded-full border border-border/60 bg-white/88 px-3 text-[10px] font-semibold text-foreground shadow-[0_4px_12px_rgba(15,23,42,0.04)] transition hover:border-primary/20 hover:bg-primary/4"
                >
                  <Pencil className="h-3 w-3 text-primary" />
                  Editar meta
                </button>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="group min-w-0 rounded-[1.55rem] border border-border/60 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(249,250,252,0.97))] px-5 py-5.5 shadow-[0_8px_18px_rgba(15,23,42,0.04)] transition duration-200 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-[0_14px_28px_rgba(15,23,42,0.06)]">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-primary">Meta</p>
                  {isEditingMonthlyViewsGoal ? (
                    <div className="mt-4 flex min-w-0 items-center gap-2 rounded-[1.15rem] border border-primary/20 bg-primary/5 px-4 py-4">
                      <input
                        autoFocus
                        value={monthlyViewsGoalDraft}
                        onChange={(event) => setMonthlyViewsGoalDraft(event.target.value)}
                        onBlur={handleCommitMonthlyViewsGoal}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            handleCommitMonthlyViewsGoal();
                          }

                          if (event.key === "Escape") {
                            event.preventDefault();
                            handleCancelMonthlyViewsGoalEdit();
                          }
                        }}
                        inputMode="numeric"
                        className="min-w-0 w-full border-0 bg-transparent text-center text-[clamp(18px,2vw,28px)] font-semibold tracking-tight text-foreground outline-none"
                        placeholder={String(defaultMonthlyViewsGoal)}
                      />
                    </div>
                  ) : (
                    <p className="mt-4 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-center text-[clamp(18px,2vw,28px)] font-semibold tracking-tight text-foreground">
                      {formatViewsNumber(monthlyViewsGoal)}
                    </p>
                  )}
                </div>
                <div className="group min-w-0 rounded-[1.55rem] border border-border/60 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(255,248,250,0.97))] px-5 py-5.5 shadow-[0_8px_18px_rgba(15,23,42,0.04)] transition duration-200 hover:-translate-y-0.5 hover:border-rose-300/40 hover:shadow-[0_14px_28px_rgba(15,23,42,0.06)]">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-rose-500">Atual</p>
                  <p className="mt-4 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-center text-[clamp(18px,2vw,28px)] font-semibold tracking-tight text-foreground">
                    {formatViewsNumber(currentMonthViews)}
                  </p>
                </div>
                <div className="group min-w-0 rounded-[1.55rem] border border-border/60 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(255,248,250,0.97))] px-5 py-5.5 shadow-[0_8px_18px_rgba(15,23,42,0.04)] transition duration-200 hover:-translate-y-0.5 hover:border-rose-300/40 hover:shadow-[0_14px_28px_rgba(15,23,42,0.06)]">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-rose-400">Falta</p>
                  <p className="mt-4 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-center text-[clamp(18px,2vw,28px)] font-semibold tracking-tight text-foreground">
                    {formatViewsNumber(remainingMonthViews)}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-[1.6rem] border border-primary/15 bg-[linear-gradient(180deg,rgba(225,29,72,0.06),rgba(251,113,133,0.04))] px-5 py-5.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Ritmo da meta
                  </span>
                  <span className="text-base font-semibold text-foreground">{Math.round(monthlyGoalProgress)}%</span>
                </div>
                <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[linear-gradient(90deg,rgba(251,113,133,0.12),rgba(225,29,72,0.1))]">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#fb7185_0%,#f43f5e_50%,#e11d48_100%)] shadow-[0_4px_14px_rgba(225,29,72,0.24)] transition-all"
                    style={{ width: `${monthlyGoalProgress}%` }}
                  />
                </div>
                <div className="mt-4 flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  <span>Ritmo da meta</span>
                  <span className="text-[11px] text-muted-foreground/80">Meta mensal em andamento</span>
                </div>
              </div>
            </GlassPanel>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="space-y-5">
              <GlassPanel className={cn(gridPanelClass, "overflow-hidden border border-border/60 p-5 shadow-[0_20px_48px_rgba(15,23,42,0.08)]")}>
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Calendário</p>
                    <h3 className="mt-2 text-xl font-semibold tracking-tight text-foreground">
                      {view === "Semana" ? "Visualização da semana" : view === "Dia" ? "Visualização do dia" : "Visualização do mês"}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">Navegue pela agenda e acompanhe as atividades planejadas.</p>
                  </div>
                </div>
                {view === "Semana" ? (
                  <div className="overflow-hidden">
                    <div className={calendarShellClass}>
                      <div className={calendarHeaderClass}>
                        <div className="px-3 py-4" />
                        {weekDates.map((date, index) => {
                          const isToday = formatDateKey(date) === formatDateKey(getTodayDate());

                          return (
                            <div key={formatDateKey(date)} className="px-2 py-4 text-center">
                              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{weekHeaderLabels[index]}</p>
                              <p
                                className={cn(
                                  "mt-1 inline-flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold",
                                  isToday ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-foreground",
                                )}
                              >
                                {date.getDate()}
                              </p>
                            </div>
                          );
                        })}
                      </div>

                      <div className="grid grid-cols-[72px_repeat(7,minmax(0,1fr))]">
                        {calendarHours.map((hour) => (
                          <div key={hour} className="contents">
                            <div className="border-r border-border/45 px-3 pt-2 text-[11px] text-muted-foreground">
                              {hour}
                            </div>
                            {weekDates.map((date) => {
                              const dateKey = formatDateKey(date);
                              const slotEvents = filteredEvents.filter((event) => event.date === dateKey && event.time === hour);

                              return (
                                <CalendarSlot
                                  key={`${dateKey}-${hour}`}
                                  dataCy={`calendar-slot-${dateKey}-${hour.replace(":", "-")}`}
                                  date={dateKey}
                                  time={hour}
                                  events={slotEvents}
                                  teamMembers={teamMembers}
                                  onDropEvent={handleDropEvent}
                                  onSelectEvent={setSelectedEvent}
                                  onAddAtSlot={handleOpenQuickCreate}
                                  onDeleteEvent={(event) => setPendingDelete(event)}
                                />
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}

                {view === "Dia" ? (
                  <div className="p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">{formatDayLabel(currentDate)}</h3>
                        <p className="text-sm text-muted-foreground">Arraste e solte os posts para reagendar.</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {calendarHours.map((hour) => {
                        const currentKey = formatDateKey(currentDate);
                        const currentEvents = filteredEvents.filter((event) => event.date === currentKey && event.time === hour);

                        return (
                          <div key={hour} className="grid gap-3 lg:grid-cols-[120px_minmax(0,1fr)] lg:items-start">
                            <div className="pt-3 text-sm font-medium text-muted-foreground">{hour}</div>
                            <CalendarSlot
                              dataCy={`calendar-slot-${currentKey}-${hour.replace(":", "-")}`}
                              date={currentKey}
                              time={hour}
                              events={currentEvents}
                              teamMembers={teamMembers}
                              onDropEvent={handleDropEvent}
                              onSelectEvent={setSelectedEvent}
                              onAddAtSlot={handleOpenQuickCreate}
                              onDeleteEvent={(event) => setPendingDelete(event)}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {view === "Mês" ? (
                  <div className="p-4">
                    <div className="mb-4 grid grid-cols-7 gap-3 px-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      {daysOfWeek.map((day) => (
                        <div key={day}>{day}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-3">
                      {monthCells.map((date) => {
                        const dateKey = formatDateKey(date);
                        const monthEvents = filteredEvents.filter((event) => event.date === dateKey);
                        const monthDayViews = dayViewsByDate[dateKey] ?? 0;
                        const isCurrentMonth = date.getMonth() === currentDate.getMonth();

                        return (
                          <div
                            data-cy={`calendar-month-day-${dateKey}`}
                            key={dateKey}
                            tabIndex={0}
                            role="button"
                            onClick={() => {
                              setCurrentDate(date);
                              setView("Dia");
                            }}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                setCurrentDate(date);
                                setView("Dia");
                              }
                            }}
                            className={cn(monthCellClass, !isCurrentMonth && "opacity-45")}
                          >
                            <p className="text-sm font-semibold text-foreground">{date.getDate()}</p>
                            <div className="mt-3 space-y-2">
                              {monthEvents.map((event) => (
                                <EventChip
                                  key={event.id}
                                  event={event}
                                  teamMembers={teamMembers}
                                  compact
                                  onClick={() => setSelectedEvent(event)}
                                  onDelete={() => setPendingDelete(event)}
                                />
                              ))}
                            </div>
                            <div
                              className={cn(
                                "mt-3 inline-flex w-fit max-w-full items-center gap-1.5 rounded-full border border-border/50 bg-white/80 px-2.5 py-1 text-[11px] font-semibold shadow-sm",
                                monthDayViews > 0 ? "text-foreground" : "text-muted-foreground/75",
                              )}
                            >
                              <Eye className="h-3.5 w-3.5 shrink-0 text-primary" />
                              <span className="truncate">{formatViewsNumber(monthDayViews)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </GlassPanel>
            </div>

            <div className="space-y-5 xl:sticky xl:top-6 xl:self-start">
              <GlassPanel className="overflow-hidden border border-border/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(249,250,252,0.97))] p-6 shadow-[0_18px_42px_rgba(15,23,42,0.06)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Conteúdos do mês</p>
                    <h3 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{formatMonthLabel(currentDate)}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">Acompanhe os formatos e o status dos conteúdos planejados neste mês.</p>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-white px-4 py-2 text-xs font-semibold text-foreground shadow-sm">
                    <CirclePlus className="h-4 w-4 text-primary" />
                    {currentMonthEvents.length} no mês
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {[
                    { label: "Reels", value: monthTypeCounts.Reels, color: "#d946ef" },
                    { label: "Stories", value: monthTypeCounts.Stories, color: "#ec4899" },
                    { label: "Carrossel", value: monthTypeCounts.Carrossel, color: "#f59e0b" },
                    { label: "Feed", value: monthTypeCounts.Feed, color: "#0ea5e9" },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-[1.25rem] border border-border/60 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold"
                          style={{ backgroundColor: `${item.color}18`, color: item.color }}
                        >
                          {item.value}
                        </span>
                        <span
                          className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                          style={{ backgroundColor: `${item.color}12`, color: item.color }}
                        >
                          {item.label}
                        </span>
                      </div>
                      <p className="mt-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">Feitos no mês</p>
                      <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {[
                    { label: "Agendados", value: monthStatusCounts.scheduled, tone: "text-rose-600", bg: "bg-rose-100" },
                    { label: "Em produção", value: monthStatusCounts.production, tone: "text-rose-500", bg: "bg-rose-50" },
                    { label: "Aprovados", value: monthStatusCounts.approved, tone: "text-rose-400", bg: "bg-rose-50" },
                    { label: "Publicados", value: monthStatusCounts.published, tone: "text-red-600", bg: "bg-red-50" },
                  ].map((item) => (
                    <div key={item.label} className="rounded-[1.15rem] border border-border/60 bg-muted/15 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className={cn("inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold", item.bg, item.tone)}>
                          {item.label}
                        </span>
                        <span className="text-lg font-semibold tracking-tight text-foreground">{item.value}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassPanel>

              <GlassPanel className="overflow-hidden p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Visualizações do dia</p>
                    <h3 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Referente a {referenceDateLabel}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">Veja o desempenho do dia anterior e ajuste a operação com mais rapidez.</p>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-white px-4 py-2 text-xs font-semibold text-foreground shadow-sm">
                    <Eye className="h-4 w-4 text-primary" />
                    {formatViewsNumber(currentDayViews)}
                  </div>
                </div>

                <div className="mt-5 rounded-[1.6rem] border border-border/60 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Total do dia</p>
                  {isEditingDayViews ? (
                    <div className="mt-4 flex items-center gap-2 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3">
                      <input
                        autoFocus
                        value={dayViewsDraft}
                        onChange={(event) => setDayViewsDraft(event.target.value)}
                        onBlur={handleCommitDayViews}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            handleCommitDayViews();
                          }

                          if (event.key === "Escape") {
                            event.preventDefault();
                            handleCancelDayViewsEdit();
                          }
                        }}
                        inputMode="numeric"
                        className="w-full border-0 bg-transparent text-4xl font-semibold tracking-tight text-foreground outline-none placeholder:text-muted-foreground"
                        placeholder="0"
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleStartEditingDayViews}
                      className="mt-4 inline-flex items-end gap-3 text-left transition hover:-translate-y-0.5"
                    >
                      <span className="text-5xl font-semibold tracking-tight text-foreground">{formatViewsNumber(currentDayViews)}</span>
                      <span className="pb-2 text-sm font-medium text-muted-foreground">visualizações</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleStartEditingDayViews}
                    className="mt-4 inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/20 px-3 py-2 text-sm font-medium text-foreground transition hover:border-primary/25 hover:bg-primary/5"
                  >
                    <Pencil className="h-4 w-4 text-primary" />
                    Editar valor
                  </button>
                </div>
              </GlassPanel>

              <GlassPanel className="overflow-hidden border border-border/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(249,250,252,0.97))] p-6 shadow-[0_18px_42px_rgba(15,23,42,0.06)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Alcance do dia</p>
                    <h3 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Referente a {referenceDateLabel}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">Lance o alcance do dia anterior e acompanhe o acumulado do mês.</p>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-white px-4 py-2 text-xs font-semibold text-foreground shadow-sm">
                    <Eye className="h-4 w-4 text-primary" />
                    {formatViewsNumber(currentDayReach)}
                  </div>
                </div>

                <div className="mt-5 grid gap-4">
                  <div className="rounded-[1.6rem] border border-border/60 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Alcance do dia</p>
                    {isEditingDayReach ? (
                      <div className="mt-4 flex items-center gap-2 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3">
                        <input
                          autoFocus
                          value={dayReachDraft}
                          onChange={(event) => setDayReachDraft(event.target.value)}
                          onBlur={handleCommitDayReach}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              handleCommitDayReach();
                            }

                            if (event.key === "Escape") {
                              event.preventDefault();
                              handleCancelDayReachEdit();
                            }
                          }}
                          inputMode="numeric"
                          className="w-full border-0 bg-transparent text-4xl font-semibold tracking-tight text-foreground outline-none placeholder:text-muted-foreground"
                          placeholder="0"
                        />
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleStartEditingDayReach}
                        className="mt-4 inline-flex items-end gap-3 text-left transition hover:-translate-y-0.5"
                      >
                        <span className="text-5xl font-semibold tracking-tight text-foreground">{formatViewsNumber(currentDayReach)}</span>
                        <span className="pb-2 text-sm font-medium text-muted-foreground">alcance</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleStartEditingDayReach}
                      className="mt-4 inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/20 px-3 py-2 text-sm font-medium text-foreground transition hover:border-primary/25 hover:bg-primary/5"
                    >
                      <Pencil className="h-4 w-4 text-primary" />
                      Editar valor
                    </button>
                  </div>

                  <div className="rounded-[1.6rem] border border-border/60 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Alcance do mês</p>
                    <p className="mt-3 text-4xl font-semibold tracking-tight text-foreground">{formatViewsNumber(currentMonthReach)}</p>
                    <p className="mt-2 text-sm text-muted-foreground">Soma automática de todos os alcances lançados neste mês.</p>
                  </div>
                </div>
              </GlassPanel>
            </div>
          </div>
        </div>
      </div>

      {selectedEvent ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4"
          onWheelCapture={(event) => event.stopPropagation()}
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className={modalClass}
            onWheelCapture={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="max-h-[88vh] overflow-y-auto overscroll-contain p-6" data-cy="calendar-selected-modal-scroll">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm">
                    <CalendarDays className="h-7 w-7" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Agenda</p>
                    <h3 className="text-3xl font-semibold tracking-tight text-foreground">{selectedEvent.title}</h3>
                    <p className="text-sm text-muted-foreground">Defina, confirme e acompanhe esta atividade.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold",
                      selectedEvent.completed ? "bg-rose-100 text-rose-700" : "bg-rose-50 text-rose-600",
                    )}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {selectedEvent.completed ? "Concluída" : "Agendada"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedEvent(null)}
                    data-cy="calendar-selected-close"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground transition hover:bg-muted/80 hover:text-foreground"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-muted/45 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Data</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">{selectedEvent.date}</p>
                </div>
                <div className="rounded-2xl bg-muted/45 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Horário</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">{selectedEvent.time}</p>
                </div>
                <div className="rounded-2xl bg-muted/45 p-4 sm:col-span-2">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Responsáveis</p>
                  <div className="mt-3 flex flex-wrap gap-2" data-cy="calendar-selected-responsibles">
                    {selectedEventMembers.map((member) => (
                      <span
                        key={member.id}
                        className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
                        style={{ backgroundColor: `${member.color}14`, color: member.color }}
                      >
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: member.color }} />
                        {member.name}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl bg-muted/45 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Status</p>
                  <div
                    className={cn(
                      "mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold",
                      selectedEvent.completed ? "bg-rose-100 text-rose-700" : "bg-muted text-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "h-2.5 w-2.5 rounded-full",
                        selectedEvent.completed ? "bg-rose-500" : "bg-primary",
                      )}
                    />
                    {selectedEvent.completed ? "Concluída" : selectedEvent.status}
                  </div>
                </div>
                <div className="rounded-2xl bg-muted/45 p-4 sm:col-span-2">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Adicionado por</p>
                  <div className="mt-3" data-cy="calendar-selected-added-by">
                    {teamMembers.find((item) => item.id === selectedEvent.addedById) ? (
                      (() => {
                        const addedBy = teamMembers.find((item) => item.id === selectedEvent.addedById)!;
                        return <MemberChip name={addedBy.name} role={addedBy.role} color={addedBy.color} src={addedBy.avatarUrl} />;
                      })()
                    ) : (
                      <p className="text-sm text-muted-foreground">Não informado.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-[1.75rem] border border-border/60 bg-muted/20 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
                    style={{ backgroundColor: `${selectedEventPrimaryMember?.color ?? "#7c3aed"}14`, color: selectedEventPrimaryMember?.color ?? "#7c3aed" }}
                  >
                    {selectedEvent.type}
                  </span>
                  <span className="text-sm font-medium text-foreground">{selectedEvent.description}</span>
                </div>
              </div>

              <ActivitySection
                tasks={eventForm?.tasks ?? selectedEvent.tasks ?? []}
                draft={taskDraft}
                setDraft={setTaskDraft}
                onAddTask={(task) => {
                  setEventForm((current) =>
                    current ? { ...current, tasks: [...(current.tasks ?? selectedEvent.tasks ?? []), task] } : current,
                  );
                }}
                onToggleTask={(taskId) => {
                  setEventForm((current) =>
                    current
                      ? {
                          ...current,
                          tasks: (current.tasks ?? selectedEvent.tasks ?? []).map((item) =>
                            item.id === taskId ? { ...item, done: !item.done } : item,
                          ),
                        }
                      : current,
                  );
                }}
                onRemoveTask={(taskId) => {
                  setEventForm((current) =>
                    current
                      ? {
                          ...current,
                          tasks: (current.tasks ?? selectedEvent.tasks ?? []).filter((item) => item.id !== taskId),
                        }
                      : current,
                  );
                }}
                onMarkAllDone={() => {
                  setEventForm((current) =>
                    current
                      ? {
                          ...current,
                          tasks: (current.tasks ?? selectedEvent.tasks ?? []).map((task) => ({ ...task, done: true })),
                        }
                      : current,
                  );
                }}
                onClearTaskDraft={() => setTaskDraft(emptyActivityDraft())}
              />

              <div className="mt-6 rounded-3xl border border-border/60 bg-muted/20 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Editar informações</p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="grid gap-2 md:col-span-2">
                    <span className="text-sm font-medium text-foreground">Título</span>
                    <input
                      value={eventForm?.title ?? ""}
                      onChange={(event) =>
                        setEventForm((previous) => (previous ? { ...previous, title: event.target.value } : previous))
                      }
                      className="rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                    />
                  </label>
                  <label className="grid gap-2 md:col-span-2">
                    <span className="text-sm font-medium text-foreground">Descrição</span>
                    <textarea
                      value={eventForm?.description ?? ""}
                      onChange={(event) =>
                        setEventForm((previous) => (previous ? { ...previous, description: event.target.value } : previous))
                      }
                      rows={3}
                      className="rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-foreground">Tipo</span>
                    <RoundedDropdown
                      label="Tipo"
                      value={eventForm?.type ?? "Reels"}
                      options={typeOptions}
                      onChange={(value) =>
                        setEventForm((previous) => (previous ? { ...previous, type: value } : previous))
                      }
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-foreground">Status</span>
                    <RoundedDropdown
                      label="Status"
                      value={eventForm?.status ?? "Agendado"}
                      options={statusOptions}
                      onChange={(value) =>
                        setEventForm((previous) => (previous ? { ...previous, status: value } : previous))
                      }
                    />
                  </label>
                  <label className="grid gap-2 md:col-span-2">
                    <span className="text-sm font-medium text-foreground">Visualização</span>
                    <RoundedDropdown
                      label="Visualização"
                      value={eventForm?.visualization ?? inferEventVisualization(selectedEvent)}
                      options={visualizationOptions}
                      onChange={(value) =>
                        setEventForm((previous) => (previous ? { ...previous, visualization: value } : previous))
                      }
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-foreground">Data</span>
                    <RoundedDatePicker
                      label="Data"
                      value={eventForm?.date ?? selectedEvent.date}
                      onChange={(value) => setEventForm((previous) => (previous ? { ...previous, date: value } : previous))}
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-foreground">Horário</span>
                    <RoundedTimePicker
                      label="Hora"
                      value={eventForm?.time ?? selectedEvent.time}
                      onChange={(value) => setEventForm((previous) => (previous ? { ...previous, time: value } : previous))}
                    />
                  </label>
                  <label className="grid gap-2 md:col-span-2">
                    <span className="text-sm font-medium text-foreground">Responsáveis</span>
                    <ResponsibleMultiPicker
                      value={eventForm?.responsibleIds ?? selectedEventResponsibleIds}
                      teamMembers={teamMembers}
                      onChange={(value) =>
                        setEventForm((previous) =>
                          previous
                            ? {
                                ...previous,
                                responsibleIds: value,
                                responsibleId: value[0] ?? previous.responsibleId,
                              }
                            : previous,
                        )
                      }
                    />
                  </label>
                  <label className="grid gap-2 md:col-span-2">
                    <span className="text-sm font-medium text-foreground">Adicionado por</span>
                    <select
                      value={eventForm?.addedById ?? currentMember?.id ?? teamMembers[0]?.id ?? ""}
                      onChange={(event) =>
                        setEventForm((previous) =>
                          previous ? { ...previous, addedById: Number(event.target.value) } : previous,
                        )
                      }
                      className="rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                    >
                      {teamMembers.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name} - {member.role}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <ActionButton
                  onClick={handleMarkEventCompleted}
                  className="bg-rose-600 text-white shadow-lg shadow-rose-500/20"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {selectedEvent.completed ? "Concluída" : "Concluir atividade"}
                </ActionButton>
                <ActionButton onClick={handleSaveEvent} className="bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                  Salvar alterações
                </ActionButton>
                <ActionButton
                  onClick={handleDuplicateEvent}
                  className="bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                >
                  <Plus className="h-4 w-4" />
                  Duplicar tarefa
                </ActionButton>
                <ActionButton variant="secondary" onClick={() => setSelectedEvent(null)}>
                  Fechar
                </ActionButton>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {pendingDelete ? (
        <ConfirmDialog
          title="Tem certeza que deseja apagar?"
           description="Essa ação não pode ser desfeita."
          confirmDataCy="calendar-confirm-delete"
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => handleDeleteEvent(pendingDelete.id)}
        />
      ) : null}

      {isCreateOpen ? createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4"
          onWheelCapture={(event) => event.stopPropagation()}
          onClick={() => {
            setIsCreateOpen(false);
            setCreateForm(null);
          }}
        >
          <div
            className={modalClass}
            onWheelCapture={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="max-h-[88vh] overflow-y-auto overscroll-contain p-6" data-cy="calendar-create-modal-scroll">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm">
                    <CalendarDays className="h-7 w-7" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Agenda</p>
                    <h3 className="text-3xl font-semibold tracking-tight text-foreground">Criar atividade rápida</h3>
                    <p className="text-sm text-muted-foreground">Defina, confirme e acompanhe esta atividade.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateOpen(false);
                    setCreateForm(null);
                  }}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground transition hover:bg-muted/80 hover:text-foreground"
                  aria-label="Fechar"
                >
                  ×
                </button>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-muted/45 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Data</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">{createForm?.date ?? formatDateKey(currentDate)}</p>
                </div>
                <div className="rounded-2xl bg-muted/45 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Horário</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">{createForm?.time ?? "09:00"}</p>
                </div>
                <div className="rounded-2xl bg-muted/45 p-4 sm:col-span-2">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Responsáveis</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {createSelectedMembers.map((member) => (
                      <span
                        key={member.id}
                        className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
                        style={{ backgroundColor: `${member.color}14`, color: member.color }}
                      >
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: member.color }} />
                        {member.name}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl bg-muted/45 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Status</p>
                  <div className="mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold bg-muted text-foreground">
                    <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                    {createForm?.status ?? "Agendado"}
                  </div>
                </div>
                <div className="rounded-2xl bg-muted/45 p-4 sm:col-span-2">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Adicionado por</p>
                  <div className="mt-3" data-cy="calendar-create-added-by">
                    {createPrimaryMember ? (
                      <MemberChip
                        name={createPrimaryMember.name}
                        role={createPrimaryMember.role}
                        color={createPrimaryMember.color}
                        src={createPrimaryMember.avatarUrl}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">Não informado.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-[1.75rem] border border-border/60 bg-muted/20 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
                    style={{ backgroundColor: `${createPrimaryMember?.color ?? "#7c3aed"}14`, color: createPrimaryMember?.color ?? "#7c3aed" }}
                  >
                    {createForm?.type ?? "Reels"}
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {createForm?.description || "Defina, confirme e acompanhe esta atividade."}
                  </span>
                </div>
              </div>

              <ActivitySection
                tasks={createForm?.tasks ?? []}
                draft={taskDraft}
                setDraft={setTaskDraft}
                onAddTask={(task) => {
                  setCreateForm((current) => (current ? { ...current, tasks: [...(current.tasks ?? []), task] } : current));
                }}
                onToggleTask={(taskId) => {
                  setCreateForm((current) =>
                    current
                      ? {
                          ...current,
                          tasks: (current.tasks ?? []).map((item) => (item.id === taskId ? { ...item, done: !item.done } : item)),
                        }
                      : current,
                  );
                }}
                onRemoveTask={(taskId) => {
                  setCreateForm((current) =>
                    current ? { ...current, tasks: (current.tasks ?? []).filter((item) => item.id !== taskId) } : current,
                  );
                }}
                onMarkAllDone={() => {
                  setCreateForm((current) =>
                    current ? { ...current, tasks: (current.tasks ?? []).map((task) => ({ ...task, done: true })) } : current,
                  );
                }}
                onClearTaskDraft={() => setTaskDraft(emptyActivityDraft())}
              />

              <div className="mt-6 rounded-3xl border border-border/60 bg-muted/20 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Editar informações</p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="grid gap-2 md:col-span-2">
                    <span className="text-sm font-medium text-foreground">Título</span>
                    <input
                      data-cy="calendar-create-title"
                      value={createForm?.title ?? ""}
                      onChange={(event) =>
                        setCreateForm((previous) => (previous ? { ...previous, title: event.target.value } : previous))
                      }
                      className="rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                    />
                  </label>
                  <label className="grid gap-2 md:col-span-2">
                    <span className="text-sm font-medium text-foreground">Descrição</span>
                    <textarea
                      data-cy="calendar-create-description"
                      value={createForm?.description ?? ""}
                      onChange={(event) =>
                        setCreateForm((previous) => (previous ? { ...previous, description: event.target.value } : previous))
                      }
                      rows={3}
                      className="rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-foreground">Tipo</span>
                    <RoundedDropdown
                      label="Tipo"
                      value={createForm?.type ?? "Reels"}
                      options={typeOptions}
                      onChange={(value) =>
                        setCreateForm((previous) => (previous ? { ...previous, type: value } : previous))
                      }
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-foreground">Status</span>
                    <RoundedDropdown
                      label="Status"
                      value={createForm?.status ?? "Agendado"}
                      options={statusOptions}
                      onChange={(value) =>
                        setCreateForm((previous) => (previous ? { ...previous, status: value } : previous))
                      }
                    />
                  </label>
                  <label className="grid gap-2 md:col-span-2">
                    <span className="text-sm font-medium text-foreground">Visualização</span>
                    <RoundedDropdown
                      label="Visualização"
                      value={createForm?.visualization ?? "Vídeo viral"}
                      options={visualizationOptions}
                      onChange={(value) =>
                        setCreateForm((previous) => (previous ? { ...previous, visualization: value } : previous))
                      }
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-foreground">Data</span>
                    <RoundedDatePicker
                      label="Data"
                      value={createForm?.date ?? formatDateKey(currentDate)}
                      onChange={(value) => setCreateForm((previous) => (previous ? { ...previous, date: value } : previous))}
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-foreground">Horário</span>
                    <RoundedTimePicker
                      label="Hora"
                      value={createForm?.time ?? "09:00"}
                      onChange={(value) => setCreateForm((previous) => (previous ? { ...previous, time: value } : previous))}
                    />
                  </label>
                  <label className="grid gap-2 md:col-span-2">
                    <span className="text-sm font-medium text-foreground">Responsáveis</span>
                    <ResponsibleMultiPicker
                      value={createForm?.responsibleIds ?? [currentMember?.id ?? teamMembers[0]?.id ?? 1]}
                      teamMembers={teamMembers}
                      onChange={(value) =>
                        setCreateForm((previous) =>
                          previous
                            ? {
                                ...previous,
                                responsibleIds: value,
                                responsibleId: value[0] ?? previous.responsibleId,
                              }
                            : previous,
                        )
                      }
                    />
                  </label>
                  <label className="grid gap-2 md:col-span-2">
                    <span className="text-sm font-medium text-foreground">Adicionado por</span>
                    <select
                      value={createForm?.addedById ?? currentMember?.id ?? teamMembers[0]?.id ?? ""}
                      onChange={(event) =>
                        setCreateForm((previous) =>
                          previous ? { ...previous, addedById: Number(event.target.value) } : previous,
                        )
                      }
                      className="rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                    >
                      {teamMembers.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name} - {member.role}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <ActionButton
                  onClick={handleMarkCreateCompleted}
                  className="bg-rose-600 text-white shadow-lg shadow-rose-500/20"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {createForm?.completed ? "Concluída" : "Concluir atividade"}
                </ActionButton>
                <ActionButton dataCy="calendar-create-submit" onClick={handleCreateEvent} className="bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                  <Plus className="h-4 w-4" />
                  Criar post
                </ActionButton>
                <ActionButton onClick={handleDuplicateCreate} className="bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                  <Plus className="h-4 w-4" />
                  Duplicar tarefa
                </ActionButton>
                <ActionButton
                  variant="secondary"
                  onClick={() => {
                    setIsCreateOpen(false);
                    setCreateForm(null);
                  }}
                >
                  Fechar
                </ActionButton>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      ) : null}
    </PageTransition>
  );
}




