import { useEffect, useMemo, useRef, useState } from "react";
import { useDrag, useDrop } from "react-dnd";
import {
  ChevronLeft,
  ChevronRight,
  CirclePlus,
  ChevronDown,
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
} from "../data/mockData";
import { useTeamProfiles } from "../data/profiles";
import { useSupabaseSyncedListState } from "../data/supabaseSync";
import {
  ActionButton,
  ConfirmDialog,
  DeleteIconButton,
  GlassPanel,
  PageHeader,
  PageTransition,
  RoundedDatePicker,
  RoundedTimePicker,
  cn,
} from "../components/ui";

const viewModes = ["Dia", "Semana", "Mês"] as const;
const dragType = "calendar-event";
const referenceDate = new Date("2026-04-30T12:00:00");
const weekHeaderLabels = ["DOM.", "SEG.", "TER.", "QUA.", "QUI.", "SEX.", "SÁB."];

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
  const member = teamMembers.find((item) => item.id === event.responsibleId)!;
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
      onClick={() => {
        if (events.length === 0) {
          onAddAtSlot(date, time);
        }
      }}
      className={cn(
        "relative min-h-[92px] border-l border-t border-border/45 bg-white/85 p-2 transition dark:bg-card/90 dark:border-border/60",
        events.length === 0 && "cursor-pointer hover:bg-primary/5",
        isOver && "bg-primary/5",
      )}
    >
      <div className={cn("space-y-2", events.length > 0 && "pb-7")}>
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
      {events.length > 0 ? (
        <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onAddAtSlot(date, time);
            }}
            className="absolute bottom-2 left-1/2 z-20 inline-flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full border border-rose-200 bg-white text-[11px] font-bold leading-none text-rose-600 shadow-sm transition hover:bg-rose-50 dark:border-[#3c2127] dark:bg-card dark:text-[#ff8da5] dark:hover:bg-[#2a171b]"
            aria-label="Adicionar tarefa neste horário"
          >
            +
          </button>
      ) : null}
    </div>
  );
}

function MiniMonth({ date }: { date: Date }) {
  const monthCells = buildMonthCells(date);
  const currentMonth = date.getMonth();
  const currentDay = formatDateKey(referenceDate);

  return (
    <div className="rounded-[1.75rem] border border-border/60 bg-white p-4 shadow-sm dark:bg-card/95 dark:shadow-[0_18px_36px_rgba(0,0,0,0.18)]">
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
  const orderedEvents = [...events].sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));

  return (
    <div className="rounded-[1.75rem] border border-border/60 bg-white p-4 shadow-sm dark:bg-card/95 dark:shadow-[0_18px_36px_rgba(0,0,0,0.18)]">
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

function MemberDropdown({
  value,
  teamMembers,
  onChange,
}: {
  value: number;
  teamMembers: { id: number; name: string; color: string }[];
  onChange: (value: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selectedMember = teamMembers.find((member) => member.id === value) ?? teamMembers[0];

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm transition hover:border-primary/25 hover:shadow-sm dark:bg-card/90 dark:hover:bg-card"
      >
        <span className="flex items-center gap-3 text-left">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: selectedMember.color }} />
          <span className="font-medium" style={{ color: selectedMember.color }}>
            {selectedMember.name}
          </span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div className="absolute left-0 top-full z-50 mt-2 w-full rounded-[1.5rem] border border-border/70 bg-white p-2 shadow-[0_24px_60px_rgba(15,23,42,0.14)] dark:border-border/60 dark:bg-card/95 dark:shadow-[0_24px_60px_rgba(0,0,0,0.28)]">
          <p className="px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Responsável
          </p>
          <div className="space-y-1">
            {teamMembers.map((member) => {
              const selected = member.id === selectedMember.id;

              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => {
                    onChange(member.id);
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm transition hover:bg-muted/70"
                  style={{
                    backgroundColor: selected ? `${member.color}12` : undefined,
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
      ) : null}
    </div>
  );
}

export function CalendarPage() {
  const [view, setView] = useState<(typeof viewModes)[number]>("Semana");
  const [currentDate, setCurrentDate] = useState(referenceDate);
  const [teamMembers] = useTeamProfiles();
  const [events, setEvents] = useSupabaseSyncedListState({
    key: "calendar-events",
    table: "calendar_events",
    fallback: calendarEvents,
  });
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [pendingDelete, setPendingDelete] = useState<CalendarEvent | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: "",
    description: "",
    type: "Reels" as CalendarEvent["type"],
    status: "Agendado" as CalendarEvent["status"],
    date: formatDateKey(referenceDate),
    time: "09:00",
    responsibleId: teamMembers[0].id,
  });

  const weekDates = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(currentDate), index)), [currentDate]);
  const monthCells = useMemo(() => buildMonthCells(currentDate), [currentDate]);
  const currentMonthEvents = useMemo(
    () => events.filter((event) => event.date.startsWith(`${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`)),
    [currentDate, events],
  );
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
    toast.success("Post reagendado com sucesso.");
  };

  const handleDuplicateEvent = () => {
    if (!selectedEvent) {
      return;
    }

    const nextId = Math.max(...events.map((event) => event.id), 0) + 1;
    const duplicatedEvent: CalendarEvent = {
      ...selectedEvent,
      id: nextId,
    };

    setEvents((previous) => [...previous, duplicatedEvent]);
    toast.success("Nova atividade criada neste horário.");
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

  const handleOpenQuickCreate = (date: string, time: string) => {
    setCreateForm((previous) => ({
      ...previous,
      date,
      time,
      title: "",
      description: "",
    }));
    setIsCreateOpen(true);
  };

  const handleCreateEvent = () => {
    if (!createForm.title.trim() || !createForm.description.trim()) {
      toast.error("Preencha título e descrição.");
      return;
    }

    const nextId = Math.max(...events.map((event) => event.id), 0) + 1;
    setEvents((previous) => [
      ...previous,
      {
        id: nextId,
        title: createForm.title.trim(),
        description: createForm.description.trim(),
        type: createForm.type,
        responsibleId: createForm.responsibleId,
        status: createForm.status,
        date: createForm.date,
        time: createForm.time,
      },
    ]);
    setIsCreateOpen(false);
    toast.success("Novo post criado com sucesso.");
  };

  useEffect(() => {
    if (!selectedEvent) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedEvent(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedEvent]);

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

  const dayHeader = view === "Dia" ? formatDayLabel(currentDate) : formatWeekRange(currentDate);

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Planner"
        title="Calendário editorial com visão operacional"
        description="Uma experiência mais próxima do Google Calendar, com visão semanal dominante, agenda lateral e slots rápidos de reagendamento."
        actions={
          <ActionButton onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Novo Post
          </ActionButton>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="flex flex-col gap-4">
          <GlassPanel className="overflow-hidden p-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-white text-foreground shadow-sm transition hover:bg-muted dark:bg-card/90 dark:hover:bg-card"
                onClick={() => setCurrentDate(referenceDate)}
              >
                <Menu className="h-4 w-4" />
              </button>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Calendário</p>
                <h2 className="text-lg font-semibold text-foreground">Great Orgânico</h2>
              </div>
            </div>
          </GlassPanel>

          <MiniMonth date={currentDate} />
          <SideAgenda
            events={currentMonthEvents}
            teamMembers={teamMembers}
            onDelete={(event) => setPendingDelete(event)}
          />
        </aside>

        <div className="space-y-4">
          <GlassPanel className="overflow-hidden p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleNavigate(-1)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-white text-foreground shadow-sm transition hover:bg-muted dark:bg-card/90 dark:hover:bg-card"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleNavigate(1)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-white text-foreground shadow-sm transition hover:bg-muted dark:bg-card/90 dark:hover:bg-card"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentDate(referenceDate)}
                className="rounded-full border border-border/70 bg-white px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm transition hover:bg-muted dark:bg-card/90 dark:hover:bg-card"
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

          <GlassPanel className="overflow-hidden p-0">
            {view === "Semana" ? (
              <div className="overflow-x-auto">
                <div className="min-w-[980px] rounded-[2rem] bg-white dark:bg-card/95">
                  <div className="sticky top-0 z-10 grid grid-cols-[72px_repeat(7,minmax(0,1fr))] border-b border-border/50 bg-white/95 backdrop-blur dark:bg-card/95">
                    <div className="px-3 py-4" />
                    {weekDates.map((date, index) => {
                      const isToday = formatDateKey(date) === formatDateKey(referenceDate);

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
                          const slotEvents = events.filter((event) => event.date === dateKey && event.time === hour);

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
                    const currentEvents = events.filter((event) => event.date === currentKey && event.time === hour);

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
                    const monthEvents = events.filter((event) => event.date === dateKey);
                    const isCurrentMonth = date.getMonth() === currentDate.getMonth();

                    return (
                        <div
                          key={dateKey}
                          className={cn(
                          "min-h-44 rounded-[1.6rem] border border-border/60 bg-white p-3 dark:bg-card/95",
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
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </GlassPanel>
        </div>
      </div>

      {selectedEvent ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4 backdrop-blur-[2px]"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="w-full max-w-lg rounded-[2rem] border border-border/60 bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.18)] dark:bg-card/95 dark:shadow-[0_30px_80px_rgba(0,0,0,0.35)]"
            onClick={(event) => event.stopPropagation()}
          >
            {(() => {
              const member = teamMembers.find((item) => item.id === selectedEvent.responsibleId)!;

              return (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Atividade</p>
                      <h3 className="text-2xl font-semibold tracking-tight text-foreground">{selectedEvent.title}</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedEvent(null)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground transition hover:bg-muted/80 hover:text-foreground"
                    >
                      ×
                    </button>
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
                    <div className="rounded-2xl bg-muted/45 p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Responsável</p>
                      <p className="mt-2 text-sm font-semibold text-foreground">{member.name}</p>
                    </div>
                    <div className="rounded-2xl bg-muted/45 p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Status</p>
                      <p className="mt-2 text-sm font-semibold text-foreground">{selectedEvent.status}</p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-2">
                    <span
                      className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
                      style={{ backgroundColor: `${member.color}14`, color: member.color }}
                    >
                      {selectedEvent.type}
                    </span>
                    <span className="text-sm text-muted-foreground">{selectedEvent.description}</span>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <ActionButton
                      onClick={handleDuplicateEvent}
                      className="bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    >
                      <Plus className="h-4 w-4" />
                      Adicionar outra atividade neste horário
                    </ActionButton>
                    <ActionButton variant="secondary" onClick={() => setSelectedEvent(null)}>
                      Fechar
                    </ActionButton>
                  </div>
                </>
              );
            })()}
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

      {isCreateOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4 backdrop-blur-[2px]"
          onClick={() => setIsCreateOpen(false)}
        >
          <div
            className="w-full max-w-2xl rounded-[2rem] border border-border/60 bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.18)] dark:bg-card/95 dark:shadow-[0_30px_80px_rgba(0,0,0,0.35)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Novo Post</p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Criar atividade rápida</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground transition hover:bg-muted/80 hover:text-foreground"
              >
                <span className="text-lg leading-none">×</span>
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 md:col-span-2">
                <span className="text-sm font-medium text-foreground">Título</span>
                <input
                  value={createForm.title}
                  onChange={(event) => setCreateForm((previous) => ({ ...previous, title: event.target.value }))}
                  className="rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                />
              </label>
              <label className="grid gap-2 md:col-span-2">
                <span className="text-sm font-medium text-foreground">Descrição</span>
                <textarea
                  value={createForm.description}
                  onChange={(event) =>
                    setCreateForm((previous) => ({ ...previous, description: event.target.value }))
                  }
                  rows={3}
                  className="rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-medium text-foreground">Tipo</span>
                <select
                  value={createForm.type}
                  onChange={(event) =>
                    setCreateForm((previous) => ({ ...previous, type: event.target.value as CalendarEvent["type"] }))
                  }
                  className="rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                >
                  <option value="Reels">Reels</option>
                  <option value="Stories">Stories</option>
                  <option value="Carrossel">Carrossel</option>
                  <option value="Feed">Feed</option>
                </select>
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-medium text-foreground">Status</span>
                <select
                  value={createForm.status}
                  onChange={(event) =>
                    setCreateForm((previous) => ({ ...previous, status: event.target.value as CalendarEvent["status"] }))
                  }
                  className="rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                >
                  <option value="Agendado">Agendado</option>
                  <option value="Em produção">Em produção</option>
                  <option value="Aprovado">Aprovado</option>
                  <option value="Publicado">Publicado</option>
                </select>
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-medium text-foreground">Data</span>
                <RoundedDatePicker
                  label="Data"
                  value={createForm.date}
                  onChange={(value) => setCreateForm((previous) => ({ ...previous, date: value }))}
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-medium text-foreground">Horário</span>
                <RoundedTimePicker
                  label="Hora"
                  value={createForm.time}
                  onChange={(value) => setCreateForm((previous) => ({ ...previous, time: value }))}
                />
              </label>
              <label className="grid gap-2 md:col-span-2">
                <span className="text-sm font-medium text-foreground">Responsável</span>
                <MemberDropdown
                  value={createForm.responsibleId}
                  teamMembers={teamMembers}
                  onChange={(value) => setCreateForm((previous) => ({ ...previous, responsibleId: value }))}
                />
              </label>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <ActionButton variant="secondary" onClick={() => setIsCreateOpen(false)}>
                Cancelar
              </ActionButton>
              <ActionButton onClick={handleCreateEvent}>
                <Plus className="h-4 w-4" />
                Criar post
              </ActionButton>
            </div>
          </div>
        </div>
      ) : null}
    </PageTransition>
  );
}
