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
  calendarEvents,
  calendarHours,
  daysOfWeek,
  weekLabel,
  type CalendarEvent,
  type CalendarTaskItem,
} from "../data/mockData";
import { useTeamProfiles } from "../data/profiles";
import { useCurrentTeamMember } from "../data/profiles";
import { useSupabaseSharedState, useSupabaseSyncedListState } from "../data/supabaseSync";
import { matchesTeamScope, useTeamScope } from "../data/teamScope";
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
const weekHeaderLabels = ["DOM.", "SEG.", "TER.", "QUA.", "QUI.", "SEX.", "SÁB."];
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

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
}: {
  event: CalendarEvent;
  teamMembers: { id: number; name: string; color: string }[];
  compact?: boolean;
  onClick?: () => void;
  onDelete?: () => void;
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
          <DeleteIconButton onClick={onDelete} />
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
        "inline-flex h-5 w-5 items-center justify-center rounded-md border text-[11px] transition",
        done ? "border-emerald-500 bg-emerald-500 text-white shadow-sm" : "border-border bg-white text-transparent",
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

  return (
    <div className="md:col-span-2 overflow-hidden rounded-[1.9rem] border border-border/60 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary shadow-[0_10px_20px_rgba(229,9,20,0.12)]">
              <CheckCircle2 className="h-4.5 w-4.5" />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">ATIVIDADES</p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {progress.completed} de {progress.total} atividades concluídas
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-4">
            <div className="flex-1">
              <div className="h-2 overflow-hidden rounded-full bg-slate-200/90">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-lime-500 to-emerald-400 shadow-[0_0_18px_rgba(34,197,94,0.28)] transition-all duration-300"
                  style={{ width: `${Math.min(progress.percent, 100)}%` }}
                />
              </div>
            </div>
            <span className="min-w-[44px] text-right text-sm font-semibold text-muted-foreground">
              {progress.percent}%
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <ActionButton
            variant="secondary"
            onClick={() => {
              const label = draft.label.trim();
              const note = draft.note.trim();
              if (!label) {
                toast.error("Digite o nome da atividade.");
                return;
              }

              onAddTask(createTaskItem(label, note, draft.checklist));
              onClearTaskDraft();
            }}
            className="border-border/60 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.04)] hover:border-primary/20 hover:bg-white"
          >
            <Plus className="h-4 w-4" />
            Adicionar item
          </ActionButton>
          <ActionButton
            onClick={onMarkAllDone}
            className="bg-gradient-to-r from-primary to-[#ff5d6d] text-white shadow-[0_18px_34px_rgba(229,9,20,0.22)] hover:from-[#ff3f53] hover:to-[#ff6d7b]"
          >
            <CheckCircle2 className="h-4 w-4" />
            Marcar todas como concluídas
          </ActionButton>
        </div>
      </div>

      <div className="mt-5 grid gap-4 rounded-[1.55rem] border border-border/60 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
        {tasks.length > 0 ? (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="group rounded-[1.35rem] border border-border/60 bg-[#fbfbfc] px-4 py-4 transition duration-200 hover:-translate-y-0.5 hover:border-primary/15 hover:shadow-[0_14px_28px_rgba(15,23,42,0.06)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => onToggleTask(task.id)}
                    className="flex min-w-0 flex-1 items-start gap-3 text-left"
                  >
                    <ActivityCheckIcon done={task.done} />
                    <span className="min-w-0">
                      <span
                        className={cn(
                          "block text-sm font-semibold transition",
                          task.done ? "text-muted-foreground line-through" : "text-foreground",
                        )}
                      >
                        {task.label}
                      </span>
                      {task.note ? <span className="mt-1 block text-sm text-muted-foreground">{task.note}</span> : null}
                      <span className="mt-3 flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                            task.checklist
                              ? "bg-emerald-500/10 text-emerald-700"
                              : "bg-slate-100 text-slate-500",
                          )}
                        >
                          {task.checklist ? "Checklist" : "Avulsa"}
                        </span>
                        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                          {task.done ? "Concluída" : "Pendente"}
                        </span>
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveTask(task.id)}
                    className="rounded-full border border-border/60 bg-white px-3 py-2 text-xs font-semibold text-muted-foreground transition duration-200 hover:border-primary/20 hover:bg-muted/60 hover:text-foreground"
                  >
                    Remover
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-[1.35rem] border border-dashed border-border/60 bg-[#fbfbfc] px-5 py-8 text-center text-sm text-muted-foreground">
            Nenhuma atividade adicionada ainda.
          </div>
        )}

        <div className="rounded-[1.55rem] border border-border/60 bg-[#fbfbfc] p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <label className="grid gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Nome da atividade</span>
              <input
                value={draft.label}
                onChange={(event) => setDraft((current) => ({ ...current, label: event.target.value }))}
                placeholder="Ex.: aprovar capa"
                className="rounded-2xl border border-border/70 bg-white px-4 py-3 text-sm outline-none transition duration-200 placeholder:text-muted-foreground/60 focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Observação rápida</span>
              <input
                value={draft.note}
                onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))}
                placeholder="Ex.: revisar CTA"
                className="rounded-2xl border border-border/70 bg-white px-4 py-3 text-sm outline-none transition duration-200 placeholder:text-muted-foreground/60 focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
              />
            </label>
            <button
              type="button"
              onClick={() => setDraft((current) => ({ ...current, checklist: !current.checklist }))}
              className={cn(
                "flex h-[48px] items-center justify-center gap-2 self-end rounded-2xl border px-4 text-sm font-semibold transition duration-200",
                draft.checklist
                  ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15"
                : "border-border/70 bg-white text-muted-foreground hover:border-primary/25 hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "inline-flex h-4 w-4 items-center justify-center rounded-[5px] border text-[10px]",
                  draft.checklist ? "border-emerald-500 bg-emerald-500 text-white" : "border-border bg-white text-transparent",
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
}: {
  date: string;
  time: string;
  events: CalendarEvent[];
  teamMembers: { id: number; name: string; color: string }[];
  onDropEvent: (eventId: number, nextDate: string, nextTime: string) => void;
  onSelectEvent: (event: CalendarEvent) => void;
  onAddAtSlot: (date: string, time: string) => void;
  onDeleteEvent: (event: CalendarEvent) => void;
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
        <span className="text-xs font-medium text-muted-foreground">Abr 2026</span>
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
    )}>
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
            >
              <div className="absolute right-2 top-2 z-10 opacity-0 transition group-hover:opacity-100">
                <DeleteIconButton onClick={() => onDelete(event)} />
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
  const [events, setEvents] = useSupabaseSyncedListState({
    key: "calendar-events",
    table: "calendar_events",
    fallback: calendarEvents,
  });
  const [dayViewsByDate, setDayViewsByDate] = useSupabaseSharedState<Record<string, number>>({
    key: "calendar-day-views",
    fallback: {},
  });
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [eventForm, setEventForm] = useState<CalendarEventFormState | null>(null);
  const [pendingDelete, setPendingDelete] = useState<CalendarEvent | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [taskDraft, setTaskDraft] = useState<ActivityDraftState>(() => emptyActivityDraft());
  const [isEditingDayViews, setIsEditingDayViews] = useState(false);
  const [dayViewsDraft, setDayViewsDraft] = useState("0");

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
  const currentDateKey = formatDateKey(currentDate);
  const currentDayViews = dayViewsByDate[currentDateKey] ?? 0;
  const dayCompletedCount = currentDayEvents.filter((event) => event.completed || event.status === "Publicado" || event.status === "Aprovado").length;
  useEffect(() => {
    setDayViewsDraft(String(currentDayViews));
    setIsEditingDayViews(false);
  }, [currentDateKey, currentDayViews]);

  const handleStartEditingDayViews = () => {
    setDayViewsDraft(String(currentDayViews));
    setIsEditingDayViews(true);
  };

  const handleCommitDayViews = () => {
    const parsedValue = Number(String(dayViewsDraft).replace(/[^\d]/g, ""));
    const nextValue = Number.isFinite(parsedValue) ? Math.max(0, Math.round(parsedValue)) : 0;

    setDayViewsByDate((previous) => ({
      ...previous,
      [currentDateKey]: nextValue,
    }));
    setIsEditingDayViews(false);
    toast.success("Visualizações do dia atualizadas.");
  };

  const handleCancelDayViewsEdit = () => {
    setDayViewsDraft(String(currentDayViews));
    setIsEditingDayViews(false);
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
    ? "min-w-[980px] rounded-[2rem] bg-card/95"
    : "min-w-[980px] rounded-[2rem] bg-white";
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

  const handleDropEvent = (eventId: number, nextDate: string, nextTime: string) => {
    setEvents((previous) =>
      previous.map((event) => (event.id === eventId ? { ...event, date: nextDate, time: nextTime } : event)),
    );
    setSelectedEvent((current) => (current?.id === eventId ? { ...current, date: nextDate, time: nextTime } : current));
    setEventForm((current) => (current && selectedEvent?.id === eventId ? { ...current, date: nextDate, time: nextTime } : current));
    toast.success("Post reagendado com sucesso.");
  };

  const handleOpenCreateModal = () => {
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

    const updatedEvent: CalendarEvent = {
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
    };

    setEvents((previous) => previous.map((event) => (event.id === selectedEvent.id ? updatedEvent : event)));
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

    const completedEvent: CalendarEvent = {
      ...selectedEvent,
      completed: true,
      status: "Publicado",
      tasks: (selectedEvent.tasks ?? []).map((task) => ({ ...task, done: true })),
    };

    setEvents((previous) => previous.map((event) => (event.id === selectedEvent.id ? completedEvent : event)));
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

  const handleOpenQuickCreate = (_date: string, _time: string) => {
    setIsCreateOpen(true);
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

  return (
    <PageTransition>
      <PageHeader
        title="Calendário Orgânico"
        actions={
          <ActionButton onClick={handleOpenCreateModal}>
            <Plus className="h-4 w-4" />
            Novo Post
          </ActionButton>
        }
      />

      <div className={cn("grid gap-4", isSidebarCollapsed ? "xl:grid-cols-[56px_minmax(0,1fr)]" : "xl:grid-cols-[220px_minmax(0,1fr)]")}>
        <aside className="flex flex-col gap-4">
          {!isSidebarCollapsed ? (
            <>
              <MiniMonth date={currentDate} />
              <SideAgenda
                events={currentMonthEvents}
                teamMembers={teamMembers}
                onDelete={(event) => setPendingDelete(event)}
              />
            </>
          ) : null}
        </aside>

        <div className="space-y-4">
          <GlassPanel className={controlBarClass}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
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

              <div className="text-left lg:text-center">
                <p className="text-xl font-semibold tracking-tight text-foreground">{dayHeader}</p>
                <p className="text-sm text-muted-foreground">{weekLabel}</p>
              </div>

              <div className="inline-flex rounded-full border border-border/60 bg-muted/50 p-1">
                {viewModes.map((mode) => (
                  <button
                    key={mode}
                    type="button"
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
          </GlassPanel>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)_minmax(0,1fr)]">
            <GlassPanel className="overflow-hidden p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    Dia
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                    {formatDayLabel(currentDate)}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {currentDayEvents.length} atividades previstas no dia selecionado.
                  </p>
                </div>
                <div className="rounded-full border border-border/60 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground shadow-sm">
                  {formatDateKey(currentDate)}
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-[1.25rem] border border-border/60 bg-muted/25 p-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Atividades</p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{currentDayEvents.length}</p>
                  <p className="mt-1 text-sm text-muted-foreground">Total de cards no dia.</p>
                </div>
                <div className="rounded-[1.25rem] border border-border/60 bg-muted/25 p-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Concluídas</p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{dayCompletedCount}</p>
                  <p className="mt-1 text-sm text-muted-foreground">Finalizadas ou já publicadas.</p>
                </div>
                <div className="rounded-[1.25rem] border border-border/60 bg-muted/25 p-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Próximo horário</p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
                    {currentDayEvents[0]?.time ?? "—"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {currentDayEvents[0]?.title ?? "Nenhuma atividade agendada."}
                  </p>
                </div>
              </div>
            </GlassPanel>

            <GlassPanel className="overflow-hidden p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    Conteúdos do mês
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                    {formatMonthLabel(currentDate)}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Quantidade feita por formato neste mês.
                  </p>
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
                    className="rounded-[1.25rem] border border-border/60 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(15,23,42,0.07)]"
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
            </GlassPanel>

            <GlassPanel className="overflow-hidden p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    Visualizações do dia
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{formatDayLabel(currentDate)}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Edite o total diretamente no número, sem abrir formulário.
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-white px-4 py-2 text-xs font-semibold text-foreground shadow-sm">
                  <Eye className="h-4 w-4 text-primary" />
                  {formatViewsNumber(currentDayViews)} visualizações
                </div>
              </div>

              <div className="mt-5 rounded-[1.75rem] border border-border/60 bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Total do dia</p>
                    <p className="mt-2 text-sm text-muted-foreground">Clique no número para editar na hora.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleStartEditingDayViews}
                    className="inline-flex items-center gap-2 self-start rounded-full border border-border/60 bg-muted/20 px-3 py-2 text-sm font-medium text-foreground transition hover:border-primary/25 hover:bg-primary/5"
                  >
                    <Pencil className="h-4 w-4 text-primary" />
                    Editar valor
                  </button>
                </div>

                <div className="mt-5 flex items-end justify-between gap-4">
                  <div className="min-w-0">
                    {isEditingDayViews ? (
                      <div className="flex max-w-[260px] items-center gap-2 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3">
                        <span className="text-sm font-semibold text-primary">👁</span>
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
                        className="group inline-flex items-end gap-3 text-left transition hover:-translate-y-0.5"
                      >
                        <span className="text-5xl font-semibold tracking-tight text-foreground">
                          {formatViewsNumber(currentDayViews)}
                        </span>
                        <span className="pb-2 text-sm font-medium text-muted-foreground transition group-hover:text-foreground">
                          visualizações
                        </span>
                      </button>
                    )}
                  </div>

                  <div className="hidden rounded-full border border-border/60 bg-muted/20 px-4 py-2 text-sm font-semibold text-muted-foreground sm:inline-flex">
                    Atualização em tempo real
                  </div>
                </div>
              </div>
            </GlassPanel>
          </div>

          <GlassPanel className={gridPanelClass}>
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Calendário
                </p>
                <h3 className="mt-2 text-xl font-semibold tracking-tight text-foreground">
                  {view === "Semana" ? "Visualização da semana" : view === "Dia" ? "Visualização do dia" : "Visualização do mês"}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Navegue pela agenda e acompanhe as atividades planejadas.
                </p>
              </div>
            </div>
            {view === "Semana" ? (
              <div className="overflow-x-auto">
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
                        key={dateKey}
                        className={cn(
                          monthCellClass,
                          !isCurrentMonth && "opacity-45",
                        )}
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
      </div>      {selectedEvent ? (
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
            <div className="max-h-[88vh] overflow-y-auto overscroll-contain p-6">
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
                      selectedEvent.completed ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700",
                    )}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {selectedEvent.completed ? "Concluída" : "Agendada"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedEvent(null)}
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
                  <div className="mt-3 flex flex-wrap gap-2">
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
                      selectedEvent.completed ? "bg-emerald-100 text-emerald-700" : "bg-muted text-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "h-2.5 w-2.5 rounded-full",
                        selectedEvent.completed ? "bg-emerald-500" : "bg-primary",
                      )}
                    />
                    {selectedEvent.completed ? "Concluída" : selectedEvent.status}
                  </div>
                </div>
                <div className="rounded-2xl bg-muted/45 p-4 sm:col-span-2">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Adicionado por</p>
                  <div className="mt-3">
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
                  className="bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
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
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => handleDeleteEvent(pendingDelete.id)}
        />
      ) : null}
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
            <div className="max-h-[88vh] overflow-y-auto overscroll-contain p-6">
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
                      selectedEvent.completed ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700",
                    )}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {selectedEvent.completed ? "Concluída" : "Agendada"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedEvent(null)}
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
                  <div className="mt-3 flex flex-wrap gap-2">
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
                      selectedEvent.completed ? "bg-emerald-100 text-emerald-700" : "bg-muted text-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "h-2.5 w-2.5 rounded-full",
                        selectedEvent.completed ? "bg-emerald-500" : "bg-primary",
                      )}
                    />
                    {selectedEvent.completed ? "Concluída" : selectedEvent.status}
                  </div>
                </div>
                <div className="rounded-2xl bg-muted/45 p-4 sm:col-span-2">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Adicionado por</p>
                  <div className="mt-3">
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
                  className="bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
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
    </PageTransition>
  );
}




