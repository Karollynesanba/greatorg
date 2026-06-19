import { useMemo } from "react";
import {
  Bar,
  BarChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useNavigate, useParams } from "react-router-dom";
import {
  calendarEvents as seedCalendarEvents,
  getGoalResponsibleIds,
  historyTimeline,
  type HistoryEvent,
  type CalendarEvent,
  type Goal,
} from "../data/mockData";
import { useTeamProfiles } from "../data/profiles";
import { useSupabaseSyncedListState } from "../data/supabaseSync";
import { useThemeMode } from "../theme";
import {
  Avatar,
  DetailGrid,
  GlassPanel,
  PageHeader,
  PageTransition,
  SectionTitle,
  cn,
} from "../components/ui";
import {
  applyCalendarCompletionState,
  buildCalendarCompletionHistoryEvent,
  getCalendarCompletionHistoryId,
  getCalendarResponsibleIds,
  isCalendarTaskCompleted,
} from "../data/calendarWorkflow";

type CalendarChecklistItem = NonNullable<CalendarEvent["checklist"]>[number];

function getEventResponsibleIds(event: CalendarEvent) {
  return getCalendarResponsibleIds(event);
}

function formatDayLabel(date: string) {
  const parsedDate = new Date(`${date}T12:00:00`);
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "short",
  }).format(parsedDate);
}

function getChecklistProgress(items: CalendarChecklistItem[]) {
  const completed = items.filter((item) => item.done).length;
  return { completed, total: items.length };
}

function MemberProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const progress = max === 0 ? 0 : (value / max) * 100;

  return (
    <div className="h-2.5 overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full transition-[width] duration-700 ease-out"
        style={{
          width: `${Math.min(progress, 100)}%`,
          background: `linear-gradient(90deg, ${color} 0%, ${color}CC 100%)`,
        }}
      />
    </div>
  );
}

function formatGoalDeadlineLabel(goal: { deadline: string; deadlineTime?: string }) {
  const date = goal.deadline ? new Date(`${goal.deadline}T12:00:00`) : null;

  if (!date) {
    return "Sem prazo";
  }

  const dateLabel = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);

  return goal.deadlineTime ? `${dateLabel} - ${goal.deadlineTime}` : dateLabel;
}

function getGoalStatus(goal: Goal) {
  const deadline = goal.deadline ? new Date(`${goal.deadline}T${goal.deadlineTime ?? "23:59"}:00`) : null;
  const now = new Date();

  if (goal.current >= goal.target) {
    return { label: "Concluida", tone: "success" as const };
  }

  if (deadline && deadline.getTime() < now.getTime()) {
    return { label: "Atrasada", tone: "danger" as const };
  }

  return { label: "Em andamento", tone: "neutral" as const };
}

export function MemberProfilePage() {
  const navigate = useNavigate();
  const params = useParams();
  const { isDark } = useThemeMode();
  const [teamMembers] = useTeamProfiles();
  const [goals] = useSupabaseSyncedListState<Goal>({ key: "goals", table: "goals", fallback: [] });
  const [calendarEvents, setCalendarEvents] = useSupabaseSyncedListState<CalendarEvent>({
    key: "calendar-events",
    table: "calendar_events",
    fallback: seedCalendarEvents,
  });
  const [, setHistoryEvents] = useSupabaseSyncedListState<HistoryEvent>({
    key: "history",
    table: "history_events",
    fallback: historyTimeline,
  });
  const member = teamMembers.find((item) => String(item.id) === params.id) ?? null;

  if (!member) {
    return (
      <PageTransition>
        <PageHeader
          eyebrow="Team"
          title="Membro não encontrado"
          description="Não foi possível localizar um perfil compatível com esta rota."
        />
      </PageTransition>
    );
  }

  const memberGoals = goals.filter((goal) => getGoalResponsibleIds(goal).includes(member.id));
  const memberCalendarEvents = useMemo(
    () =>
      calendarEvents
        .filter((event) => getEventResponsibleIds(event).includes(member.id))
        .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)),
    [calendarEvents, member.id],
  );
  const calendarChecklistByDay = useMemo(() => {
    const grouped = new Map<string, typeof memberCalendarEvents>();

    memberCalendarEvents.forEach((event) => {
      const current = grouped.get(event.date) ?? [];
      grouped.set(event.date, [...current, event]);
    });

    return Array.from(grouped.entries())
      .sort(([leftDate], [rightDate]) => leftDate.localeCompare(rightDate))
      .map(([date, events]) => ({
        date,
        events: events.sort((a, b) => a.time.localeCompare(b.time)),
      }));
  }, [memberCalendarEvents]);
  const checklistSummary = useMemo(() => {
    const total = memberCalendarEvents.reduce((sum, event) => sum + (event.checklist?.length ?? 0), 0);
    const completed = memberCalendarEvents.reduce((sum, event) => sum + (event.checklist?.filter((item) => item.done).length ?? 0), 0);
    return {
      total,
      completed,
      progress: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }, [memberCalendarEvents]);
  const overdueGoals = memberGoals.filter((goal) => getGoalStatus(goal).tone === "danger");
  const panelBackground = isDark
    ? `linear-gradient(180deg, rgba(24,24,26,0.98), ${member.color}12)`
    : `linear-gradient(180deg, rgba(255,255,255,0.99), rgba(252,252,253,0.98))`;
  const lightCardClass = "rounded-3xl border border-border/60 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]";
  const darkCardClass = "rounded-3xl border border-border/60 bg-[#171c25]";

  const toggleChecklistItem = (eventId: number, checklistItemId: string) => {
    const previousEvent = calendarEvents.find((event) => event.id === eventId);

    if (!previousEvent) {
      return;
    }

    const nextEvent = applyCalendarCompletionState(
      {
        ...previousEvent,
        checklist: (previousEvent.checklist ?? []).map((item) =>
          item.id === checklistItemId ? { ...item, done: !item.done } : item,
        ),
      },
      { id: member.id, name: member.name },
    );

    setCalendarEvents((previous) => previous.map((event) => (event.id === eventId ? nextEvent : event)));
    setHistoryEvents((previous) => {
      const historyId = getCalendarCompletionHistoryId(eventId);
      const nextComplete = isCalendarTaskCompleted(nextEvent);

      if (!nextComplete) {
        return previous.filter((item) => item.id !== historyId);
      }

      const historyItem = buildCalendarCompletionHistoryEvent(nextEvent, { id: member.id, name: member.name });
      const existing = previous.some((item) => item.id === historyId);

      if (!existing) {
        return [historyItem, ...previous];
      }

      return previous.map((item) => (item.id === historyId ? historyItem : item));
    });
  };

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Team"
        title="Performance individual do time criativo"
        description="Visualize especialidades, producao recente e evolucao de qualidade para cada membro da operacao."
        actions={
          <div className="flex flex-wrap gap-2">
            {teamMembers.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(`/member/${item.id}`)}
                className="rounded-full px-4 py-2 text-sm font-medium transition focus:outline-none focus-visible:outline-none"
                style={{
                  backgroundColor: item.id === member.id ? `${item.color}18` : "rgb(var(--muted) / 1)",
                  color: item.id === member.id ? item.color : "rgb(var(--muted-foreground) / 1)",
                }}
              >
                {item.name}
              </button>
            ))}
          </div>
        }
      />

      <GlassPanel
        index={1}
        style={{
          background: panelBackground,
          borderColor: `${member.color}22`,
          boxShadow: `0 18px 36px ${member.color}10`,
        }}
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-5">
            <Avatar name={member.name} color={member.color} src={member.avatarUrl} size="lg" />
            <div className="space-y-2">
              <h2 className="text-3xl font-semibold tracking-tight text-foreground">{member.name}</h2>
              <p className="text-base text-muted-foreground">{member.role}</p>
              <p className="text-sm text-muted-foreground">{member.specialty}</p>
            </div>
          </div>
          <div
            className="rounded-3xl px-6 py-5 text-center"
            style={{ backgroundColor: isDark ? `${member.color}14` : "rgba(255,255,255,0.98)" }}
          >
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Performance Score</p>
            <p className="mt-2 text-5xl font-semibold text-foreground">{member.stats.performance}</p>
          </div>
        </div>

        <div className="mt-6">
          <DetailGrid
            items={[
              { label: "Posts Criados", value: String(member.stats.postsCreated) },
              { label: "Visualizacoes do mes", value: new Intl.NumberFormat("pt-BR").format(member.stats.monthlyViews ?? 0) },
              { label: "Engajamento Medio", value: `${member.stats.avgEngagement}%` },
              { label: "Metas Completadas", value: String(member.stats.goalsCompleted) },
              { label: "Pontualidade", value: `${member.stats.punctuality}%` },
            ]}
          />
        </div>
      </GlassPanel>

      <div className="grid gap-6 2xl:grid-cols-2">
        <GlassPanel index={2} style={{ background: panelBackground, borderColor: `${member.color}18` }}>
          <SectionTitle title="Performance geral" description="Leitura de capacidade criativa, execucao e consistencia." />
          <div className="mt-6 h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={member.radar}>
                <PolarGrid stroke="rgb(var(--border) / 0.5)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: "rgb(var(--muted-foreground) / 1)", fontSize: 12 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} tickLine={false} axisLine={false} />
                <Radar dataKey="value" stroke={member.color} fill={member.color} fillOpacity={0.32} strokeWidth={2} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </GlassPanel>

        <GlassPanel index={3} style={{ background: panelBackground, borderColor: `${member.color}18` }}>
          <SectionTitle title="Posts por mes" description="Volume recente de entregas por ciclo." />
          <div className="mt-6 h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={member.monthlyPosts} margin={{ top: 10, right: 12, left: -16, bottom: 0 }}>
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "rgb(var(--muted-foreground) / 1)", fontSize: 12 }}
                />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: "rgb(var(--muted-foreground) / 1)", fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="posts" radius={[12, 12, 4, 4]} fill={member.color} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassPanel>
      </div>

      <GlassPanel index={4}>
        <SectionTitle title="Metas atribuidas" description="Panorama das metas sob responsabilidade deste membro." />
        <div className="mt-5 grid gap-4">
          {memberGoals.length > 0 ? (
            memberGoals.map((goal) => {
              const status = getGoalStatus(goal);

              return (
                <div
                  key={goal.id}
                  className={`rounded-3xl p-5 ${isDark ? darkCardClass : lightCardClass}`}
                  style={{ backgroundColor: isDark ? `${member.color}12` : undefined }}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-foreground">{goal.name}</h3>
                        <span
                          className="rounded-full px-3 py-1 text-xs font-semibold"
                          style={{
                            backgroundColor:
                              status.tone === "danger"
                                ? "rgba(239,68,68,0.12)"
                                : status.tone === "success"
                                  ? "rgba(34,197,94,0.12)"
                                  : "rgb(var(--muted) / 1)",
                            color:
                              status.tone === "danger"
                                ? "#dc2626"
                                : status.tone === "success"
                                  ? "#16a34a"
                                  : "rgb(var(--muted-foreground) / 1)",
                          }}
                        >
                          {status.label}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">Prazo: {formatGoalDeadlineLabel(goal)}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Atual {goal.current} / Meta {goal.target}
                    </p>
                  </div>
                  <div className="mt-4">
                    <MemberProgressBar value={goal.current} max={goal.target} color={member.color} />
                  </div>
                </div>
              );
            })
          ) : (
            <div className={`rounded-3xl p-5 ${isDark ? darkCardClass : lightCardClass}`}>
              <p className="text-base font-medium text-foreground">Nenhuma meta atribuida para este membro.</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Quando houver metas vinculadas, elas vao aparecer aqui com prazo, progresso e status.
              </p>
            </div>
          )}
        </div>
        {overdueGoals.length > 0 ? (
          <div className="mt-4 rounded-3xl border border-red-500/15 bg-red-500/8 px-4 py-3 text-sm text-red-700 dark:text-red-200">
            {overdueGoals.length} meta{overdueGoals.length > 1 ? "s" : ""} em atraso neste perfil.
          </div>
        ) : null}
      </GlassPanel>

      <GlassPanel index={5}>
        <SectionTitle
          title="Checklist diário"
          description="Tudo que este membro está executando na agenda, agrupado por dia e com o horário ao lado."
        />

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className={cn("rounded-3xl border border-border/60 p-4", isDark ? "bg-card/90" : "bg-white")}>
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Itens totais</p>
            <p className="mt-2 text-3xl font-semibold text-foreground">{checklistSummary.total}</p>
          </div>
          <div className={cn("rounded-3xl border border-border/60 p-4", isDark ? "bg-card/90" : "bg-white")}>
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Concluídos</p>
            <p className="mt-2 text-3xl font-semibold text-foreground">{checklistSummary.completed}</p>
          </div>
          <div className={cn("rounded-3xl border border-border/60 p-4", isDark ? "bg-card/90" : "bg-white")}>
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Progresso</p>
            <p className="mt-2 text-3xl font-semibold text-foreground">{checklistSummary.progress}%</p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {calendarChecklistByDay.length > 0 ? (
            calendarChecklistByDay.map((dayGroup) => (
              <div key={dayGroup.date} className={cn("rounded-3xl border border-border/60 p-4", isDark ? "bg-card/90" : "bg-white")}>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold capitalize text-foreground">{formatDayLabel(dayGroup.date)}</h3>
                  <span className="text-xs text-muted-foreground">{dayGroup.events.length} tarefa{dayGroup.events.length > 1 ? "s" : ""}</span>
                </div>

                <div className="mt-4 space-y-3">
                  {dayGroup.events.map((event) => {
                    const checklist = event.checklist ?? [];
                    const progress = getChecklistProgress(checklist);

                    return (
                      <div key={event.id} className="rounded-2xl border border-border/60 bg-background/70 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{event.title}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{event.description}</p>
                          </div>
                          <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                            {event.time}
                          </span>
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-3">
                          <span className="text-xs font-medium text-muted-foreground">
                            {progress.completed}/{progress.total} itens
                          </span>
                          <span className="text-xs font-semibold text-muted-foreground">{event.status}</span>
                        </div>

                        <div className="mt-3 space-y-2">
                          {checklist.length > 0 ? (
                            checklist.map((item) => (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => toggleChecklistItem(event.id, item.id)}
                                className={cn(
                                  "flex w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left text-sm transition",
                                  item.done
                                    ? "border-primary/20 bg-primary/5 text-foreground"
                                    : "border-border/60 bg-white hover:bg-muted/60",
                                )}
                              >
                                <span
                                  className={cn(
                                    "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold",
                                    item.done
                                      ? "border-primary bg-primary text-primary-foreground"
                                      : "border-border/60 bg-background text-transparent",
                                  )}
                                >
                                  ✓
                                </span>
                                <span className={cn("flex-1", item.done && "text-muted-foreground line-through")}>
                                  {item.label}
                                </span>
                              </button>
                            ))
                          ) : (
                            <div className="rounded-2xl border border-dashed border-border/60 bg-background/60 px-3 py-3 text-sm text-muted-foreground">
                              Sem checklist nesta tarefa.
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-3xl border border-border/60 bg-background/70 p-5 text-sm text-muted-foreground">
              Nenhuma tarefa do calendário para este membro ainda.
            </div>
          )}
        </div>
      </GlassPanel>
    </PageTransition>
  );
}
