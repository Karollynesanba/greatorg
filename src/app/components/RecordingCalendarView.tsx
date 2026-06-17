import { useMemo, useState } from "react";
import {
  Ban,
  BellRing,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  Filter,
  MapPin,
  MoreHorizontal,
  Pencil,
  Plus,
  Repeat2,
  Video,
} from "lucide-react";
import type { CalendarEvent, TeamMember } from "../data/mockData";
import { cn } from "./ui";

type CalendarMode = "Todos" | "Mês" | "Semana" | "Lista";

type RecordingCalendarViewProps = {
  currentDate: Date;
  events: CalendarEvent[];
  selectedEvent: CalendarEvent | null;
  teamMembers: TeamMember[];
  onChangeDate: (date: Date) => void;
  onCreate: (date?: string) => void;
  onSelectEvent: (event: CalendarEvent) => void;
  onOpenDetails: () => void;
  onDelete: (event: CalendarEvent) => void;
};

const weekDays = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function buildMonthGrid(date: Date) {
  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
  const gridStart = addDays(monthStart, -monthStart.getDay());
  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
}

function getMonthKey(date: Date) {
  return formatDateKey(date).slice(0, 7);
}

function formatMonth(date: Date) {
  const label = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR").format(parseDateKey(value));
}

function isCompleted(event: CalendarEvent) {
  return Boolean(event.completed) || event.status === "Publicado" || event.status === "Aprovado";
}

function includesOperationalTerm(event: CalendarEvent, term: string) {
  return `${event.title} ${event.description} ${event.status}`.toLocaleLowerCase("pt-BR").includes(term);
}

function eventTone(event: CalendarEvent) {
  if (isCompleted(event)) {
    return { background: "#dcfce7", color: "#15803d", border: "#bbf7d0" };
  }

  if (event.status === "Em produção") {
    return { background: "#fff7ed", color: "#c2410c", border: "#fed7aa" };
  }

  const tones: Record<CalendarEvent["type"], { background: string; color: string; border: string }> = {
    Reels: { background: "#f3e8ff", color: "#7e22ce", border: "#e9d5ff" },
    Stories: { background: "#fce7f3", color: "#be185d", border: "#fbcfe8" },
    Carrossel: { background: "#fef3c7", color: "#b45309", border: "#fde68a" },
    Feed: { background: "#dbeafe", color: "#1d4ed8", border: "#bfdbfe" },
  };

  return tones[event.type];
}

function selectedMember(event: CalendarEvent | null, teamMembers: TeamMember[]) {
  if (!event) {
    return null;
  }

  return teamMembers.find((member) => member.id === event.responsibleId) ?? null;
}

export function RecordingCalendarView({
  currentDate,
  events,
  selectedEvent,
  teamMembers,
  onChangeDate,
  onCreate,
  onSelectEvent,
  onOpenDetails,
  onDelete,
}: RecordingCalendarViewProps) {
  const [mode, setMode] = useState<CalendarMode>("Mês");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"todos" | CalendarEvent["status"]>("todos");
  const [eventMenuOpen, setEventMenuOpen] = useState(false);
  const monthKey = getMonthKey(currentDate);
  const todayKey = formatDateKey(new Date());
  const selectedDateKey = formatDateKey(currentDate);

  const monthEvents = useMemo(
    () =>
      events
        .filter((event) => event.date.startsWith(monthKey))
        .filter((event) => statusFilter === "todos" || event.status === statusFilter)
        .sort((left, right) => `${left.date} ${left.time}`.localeCompare(`${right.date} ${right.time}`)),
    [events, monthKey, statusFilter],
  );

  const eventsByDate = useMemo(() => {
    const grouped = new Map<string, CalendarEvent[]>();
    for (const event of monthEvents) {
      grouped.set(event.date, [...(grouped.get(event.date) ?? []), event]);
    }
    return grouped;
  }, [monthEvents]);

  const monthCells = useMemo(() => buildMonthGrid(currentDate), [currentDate]);
  const completedCount = monthEvents.filter(isCompleted).length;
  const rescheduledCount = monthEvents.filter((event) => event.status === "Reagendado" || includesOperationalTerm(event, "reagend")).length;
  const cancelledCount = monthEvents.filter((event) => event.status === "Cancelado" || includesOperationalTerm(event, "cancelad")).length;
  const returnClients = new Set(
    events
      .filter(isCompleted)
      .filter((event) => {
        const elapsed = Date.now() - parseDateKey(event.date).getTime();
        return elapsed >= 30 * 24 * 60 * 60 * 1000;
      })
      .map((event) => event.title.trim().toLocaleLowerCase("pt-BR")),
  ).size;
  const member = selectedMember(selectedEvent, teamMembers);

  const metricCards = [
    { label: "Gravações no mês", value: monthEvents.length, helper: "agendadas", icon: CalendarDays, tone: "text-violet-600 bg-violet-50" },
    { label: "Concluídas", value: completedCount, helper: "este mês", icon: CheckCircle2, tone: "text-emerald-600 bg-emerald-50" },
    { label: "Reagendadas", value: rescheduledCount, helper: "este mês", icon: Repeat2, tone: "text-amber-600 bg-amber-50" },
    { label: "Canceladas", value: cancelledCount, helper: "este mês", icon: Ban, tone: "text-rose-600 bg-rose-50" },
    { label: "Clientes para retorno", value: returnClients, helper: "há mais de 30 dias", icon: BellRing, tone: "text-blue-600 bg-blue-50" },
  ];

  const navigateMonth = (direction: -1 | 1) => {
    onChangeDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1));
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {metricCards.map((metric) => {
          const Icon = metric.icon;
          return (
            <section
              key={metric.label}
              className="rounded-[1.65rem] border border-border/55 bg-white px-5 py-5 shadow-[0_16px_38px_rgba(15,23,42,0.055)] dark:bg-card"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{metric.label}</p>
                  <p className="mt-2 text-4xl font-semibold tracking-[-0.05em] text-foreground">{metric.value}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{metric.helper}</p>
                </div>
                <span className={cn("inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl", metric.tone)}>
                  <Icon className="h-5 w-5" />
                </span>
              </div>
            </section>
          );
        })}
      </div>

      <section className="overflow-hidden rounded-[2rem] border border-border/55 bg-white shadow-[0_22px_55px_rgba(15,23,42,0.07)] dark:bg-card">
        <header className="flex flex-col gap-4 border-b border-border/55 px-5 py-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Agenda</h2>
            <p className="mt-1 text-sm text-muted-foreground">Visualização mensal com eventos destacados por cor.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => navigateMonth(-1)} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-background transition hover:border-primary/30">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => navigateMonth(1)} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-background transition hover:border-primary/30">
              <ChevronRight className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => onChangeDate(new Date())} className="h-10 rounded-full border border-border/60 bg-background px-4 text-sm font-semibold transition hover:border-primary/30">
              Hoje
            </button>
            <div className="relative">
              <button type="button" onClick={() => setFiltersOpen((current) => !current)} className="inline-flex h-10 items-center gap-2 rounded-full border border-border/60 bg-background px-4 text-sm font-semibold transition hover:border-primary/30">
                <Filter className="h-4 w-4" />
                Filtros
              </button>
              {filtersOpen ? (
                <div className="absolute right-0 top-12 z-30 w-56 rounded-2xl border border-border/60 bg-white p-2 shadow-xl dark:bg-card">
                  {(["todos", "Agendado", "Em produção", "Aprovado", "Publicado", "Reagendado", "Cancelado"] as const).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => {
                        setStatusFilter(status);
                        setFiltersOpen(false);
                      }}
                      className={cn(
                        "w-full rounded-xl px-3 py-2 text-left text-sm transition hover:bg-muted",
                        statusFilter === status && "bg-primary/8 font-semibold text-primary",
                      )}
                    >
                      {status === "todos" ? "Todos os status" : status}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="inline-flex rounded-full border border-border/60 bg-muted/35 p-1">
              {(["Todos", "Mês", "Semana", "Lista"] as CalendarMode[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setMode(item)}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-semibold transition",
                    mode === item ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </header>

        <div className="px-5 py-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-xl font-semibold tracking-tight text-foreground">{formatMonth(currentDate)}</h3>
            <button type="button" onClick={() => onCreate(selectedDateKey)} className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20">
              <Plus className="h-4 w-4" />
              Nova gravação
            </button>
          </div>
        </div>

        <div className="grid gap-5 px-5 pb-5 xl:grid-cols-[minmax(0,1fr)_310px]">
          <div className="min-w-0">
            {mode === "Lista" ? (
              <div className="space-y-3">
                {monthEvents.length > 0 ? monthEvents.map((event) => {
                  const tone = eventTone(event);
                  return (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => onSelectEvent(event)}
                      className="flex w-full items-center justify-between gap-4 rounded-2xl border border-border/55 bg-background p-4 text-left transition hover:border-primary/25 hover:shadow-sm"
                    >
                      <div>
                        <p className="font-semibold text-foreground">{event.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{formatDate(event.date)} às {event.time}</p>
                      </div>
                      <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: tone.background, color: tone.color }}>
                        {event.status}
                      </span>
                    </button>
                  );
                }) : <EmptyCalendarState onCreate={() => onCreate(selectedDateKey)} />}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[760px]">
                  <div className="grid grid-cols-7 gap-2 px-1 pb-2">
                    {weekDays.map((day) => (
                      <div key={day} className="py-2 text-center text-[11px] font-semibold tracking-[0.18em] text-muted-foreground">{day}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    {monthCells.map((date) => {
                      const dateKey = formatDateKey(date);
                      const dayEvents = eventsByDate.get(dateKey) ?? [];
                      const inCurrentMonth = date.getMonth() === currentDate.getMonth();
                      const selected = dateKey === selectedDateKey;
                      const today = dateKey === todayKey;

                      return (
                        <button
                          key={dateKey}
                          type="button"
                          onClick={() => onChangeDate(date)}
                          onDoubleClick={() => onCreate(dateKey)}
                          className={cn(
                            "min-h-[132px] rounded-[1.25rem] border bg-background p-2.5 text-left transition hover:-translate-y-0.5 hover:shadow-md",
                            selected ? "border-primary ring-2 ring-primary/10" : "border-border/55",
                            !inCurrentMonth && "opacity-40",
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className={cn("inline-flex h-7 min-w-7 items-center justify-center rounded-full text-sm font-semibold", today && "bg-primary text-primary-foreground")}>
                              {date.getDate()}
                            </span>
                            {dayEvents.length > 0 ? (
                              <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-primary/8 px-1.5 text-[10px] font-bold text-primary">{dayEvents.length}</span>
                            ) : null}
                          </div>
                          <div className="mt-2 space-y-1.5">
                            {dayEvents.slice(0, 2).map((event) => {
                              const tone = eventTone(event);
                              return (
                                <span
                                  key={event.id}
                                  role="button"
                                  tabIndex={0}
                                  onClick={(clickEvent) => {
                                    clickEvent.stopPropagation();
                                    onSelectEvent(event);
                                  }}
                                  onKeyDown={(keyEvent) => {
                                    if (keyEvent.key === "Enter") {
                                      keyEvent.stopPropagation();
                                      onSelectEvent(event);
                                    }
                                  }}
                                  className="block overflow-hidden rounded-xl border px-2.5 py-2"
                                  style={{ background: tone.background, color: tone.color, borderColor: tone.border }}
                                >
                                  <span className="block truncate text-[11px] font-bold">{event.title}</span>
                                  <span className="mt-0.5 block text-[10px] font-medium opacity-80">{event.time}</span>
                                </span>
                              );
                            })}
                            {dayEvents.length > 2 ? <span className="block px-1 text-[10px] font-semibold text-muted-foreground">+{dayEvents.length - 2} eventos</span> : null}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          <aside className="space-y-4 xl:sticky xl:top-5 xl:self-start">
            {selectedEvent ? (
              <div className="rounded-[1.6rem] border border-border/55 bg-background p-5 shadow-[0_14px_34px_rgba(15,23,42,0.055)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/8 text-primary">
                      <Video className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="text-xl font-semibold tracking-tight text-foreground">{selectedEvent.title}</h3>
                      <p className="mt-1 text-xs font-semibold" style={{ color: member?.color ?? "#e11d48" }}>{selectedEvent.type}</p>
                    </div>
                  </div>
                  <div className="relative">
                    <button type="button" onClick={() => setEventMenuOpen((current) => !current)} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted">
                      <MoreHorizontal className="h-5 w-5" />
                    </button>
                    {eventMenuOpen ? (
                      <div className="absolute right-0 top-10 z-20 w-40 rounded-2xl border border-border/60 bg-white p-2 shadow-xl dark:bg-card">
                        <button type="button" onClick={() => { setEventMenuOpen(false); onOpenDetails(); }} className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-muted">Editar</button>
                        <button type="button" onClick={() => { setEventMenuOpen(false); onDelete(selectedEvent); }} className="w-full rounded-xl px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/8">Excluir</button>
                      </div>
                    ) : null}
                  </div>
                </div>

                <span className={cn("mt-4 inline-flex rounded-full px-3 py-1 text-xs font-semibold", isCompleted(selectedEvent) ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700")}>
                  {isCompleted(selectedEvent) ? "Concluída" : selectedEvent.status}
                </span>

                <div className="mt-4 space-y-2.5">
                  <DetailRow icon={CalendarDays} label="Data" value={formatDate(selectedEvent.date)} />
                  <DetailRow icon={Clock3} label="Horário" value={selectedEvent.time} />
                  <DetailRow icon={MapPin} label="Endereço" value="Não informado" />
                  <DetailRow icon={Video} label="Tipo de gravação" value={`${selectedEvent.type} - ${selectedEvent.visualization ?? "Conteúdo"}`} />
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <button type="button" onClick={onOpenDetails} className="inline-flex h-10 items-center gap-2 rounded-full border border-border/60 px-4 text-sm font-semibold transition hover:border-primary/30">
                    <Pencil className="h-4 w-4" />
                    Editar
                  </button>
                  <button type="button" onClick={onOpenDetails} className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20">
                    <ExternalLink className="h-4 w-4" />
                    Ver detalhes
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-[1.6rem] border border-dashed border-border bg-muted/15 px-6 py-12 text-center">
                <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/8 text-primary">
                  <CalendarDays className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-semibold text-foreground">Nenhuma gravação selecionada</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Selecione um evento no calendário para consultar os detalhes.</p>
              </div>
            )}

            <div className="rounded-[1.6rem] border border-border/55 bg-background p-5 shadow-[0_14px_34px_rgba(15,23,42,0.045)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-foreground">Lembretes de retorno</h3>
                  <p className="mt-1 text-sm leading-5 text-muted-foreground">Clientes que já passaram do prazo ideal.</p>
                </div>
                <button type="button" onClick={() => setMode("Lista")} className="shrink-0 text-sm font-semibold text-primary">Ver todos</button>
              </div>
              <div className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {returnClients > 0 ? `${returnClients} cliente(s) aguardando retorno.` : "Nenhum retorno atrasado neste momento."}
              </div>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: typeof CalendarDays; label: string; value: string }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-border/50 bg-muted/15 p-3.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <div>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-1 text-sm font-semibold leading-5 text-foreground">{value}</p>
      </div>
    </div>
  );
}

function EmptyCalendarState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-border bg-muted/15 px-6 py-14 text-center">
      <p className="font-semibold text-foreground">Nenhuma gravação neste mês</p>
      <p className="mt-2 text-sm text-muted-foreground">Crie a primeira gravação para preencher a agenda.</p>
      <button type="button" onClick={onCreate} className="mt-5 inline-flex h-10 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground">
        <Plus className="h-4 w-4" />
        Nova gravação
      </button>
    </div>
  );
}
