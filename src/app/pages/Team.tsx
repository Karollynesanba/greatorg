import { useMemo } from "react";
import { CalendarRange, ChevronRight, Sparkles, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { calendarEvents as seedCalendarEvents, type CalendarEvent } from "../data/mockData";
import { useTeamProfiles, useCurrentTeamMember } from "../data/profiles";
import { useSupabaseSyncedListState } from "../data/supabaseSync";
import { useThemeMode } from "../theme";
import { Avatar, ActionButton, GlassPanel, PageHeader, PageTransition, ProgressBar, SectionTitle, cn, formatPercent } from "../components/ui";
import { getCalendarChecklistProgress, getCalendarResponsibleIds } from "../data/calendarWorkflow";

function formatDayLabel(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(new Date(`${date}T12:00:00`));
}

export function TeamPage() {
  const { isDark } = useThemeMode();
  const [teamMembers] = useTeamProfiles();
  const { member: currentMember } = useCurrentTeamMember();
  const [calendarEvents] = useSupabaseSyncedListState<CalendarEvent>({
    key: "calendar-events",
    table: "calendar_events",
    fallback: seedCalendarEvents,
  });

  const eventsByMember = useMemo(() => {
    return teamMembers.map((member) => {
      const memberEvents = calendarEvents.filter((event) => getCalendarResponsibleIds(event).includes(member.id));
      const checklistTotals = memberEvents.reduce(
        (acc, event) => {
          const progress = getCalendarChecklistProgress(event);
          acc.items += progress.total;
          acc.done += progress.completed;
          acc.tasks += progress.total > 0 ? 1 : 0;
          return acc;
        },
        { items: 0, done: 0, tasks: 0 },
      );

      return {
        member,
        memberEvents,
        checklistTotals,
      };
    });
  }, [calendarEvents, teamMembers]);

  const upcomingEvents = useMemo(() => {
    const today = new Date();
    const todayKey = today.toISOString().slice(0, 10);
    const end = new Date(today);
    end.setDate(end.getDate() + 7);
    const endKey = end.toISOString().slice(0, 10);

    return calendarEvents
      .filter((event) => event.date >= todayKey && event.date <= endKey)
      .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  }, [calendarEvents]);

  const highlightCardClass = isDark
    ? "rounded-[2rem] border border-border/60 bg-muted/35 p-5 dark:bg-card/95"
    : "rounded-[2rem] border border-border/60 bg-card/95 p-5 shadow-[0_14px_32px_rgba(15,23,42,0.05)]";

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Equipe"
        title="Hub do time"
        description="Veja quem está ativo, o que cada pessoa tem no calendário e como os checklists estão evoluindo."
        actions={
          <div className="flex flex-wrap gap-2">
            <ActionButton variant="secondary" onClick={() => undefined}>
              <Users className="h-4 w-4" />
              {currentMember?.name ?? "Minha equipe"}
            </ActionButton>
            <ActionButton variant="secondary" onClick={() => undefined}>
              <Sparkles className="h-4 w-4" />
              Progresso diário
            </ActionButton>
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <GlassPanel className="space-y-5 p-5">
          <SectionTitle title="Visão geral" description="Resumo do time e do recorte de execução." />
          <div className="grid gap-3 sm:grid-cols-3">
            <div className={highlightCardClass}>
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Pessoas</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">{teamMembers.length}</p>
              <p className="mt-2 text-sm text-muted-foreground">Membros cadastrados na operação.</p>
            </div>
            <div className={highlightCardClass}>
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Tarefas no calendário</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">{calendarEvents.length}</p>
              <p className="mt-2 text-sm text-muted-foreground">Planejamentos ativos e agendados.</p>
            </div>
            <div className={highlightCardClass}>
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Checklist concluído</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">
                {formatPercent(
                  calendarEvents.reduce((acc, event) => acc + getCalendarChecklistProgress(event).completed, 0) /
                    Math.max(calendarEvents.reduce((acc, event) => acc + getCalendarChecklistProgress(event).total, 0), 1) *
                    100,
                  0,
                )}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">Quanto do trabalho já foi marcado.</p>
            </div>
          </div>

          <div className="grid gap-4">
            {eventsByMember.map(({ member, memberEvents, checklistTotals }) => {
              const completionRate = checklistTotals.items > 0 ? (checklistTotals.done / checklistTotals.items) * 100 : 0;

              return (
                <Link
                  key={member.id}
                  to={`/member/${member.id}`}
                  className={cn(
                    "flex flex-col gap-4 rounded-[2rem] border border-border/60 p-4 transition hover:-translate-y-0.5 hover:shadow-[0_18px_34px_rgba(15,23,42,0.06)] md:flex-row md:items-center md:justify-between",
                    isDark ? "bg-card/95" : "bg-white",
                  )}
                >
                  <div className="flex items-center gap-4">
                    <Avatar name={member.name} color={member.color} size="lg" />
                    <div>
                      <p className="text-base font-semibold text-foreground">{member.name}</p>
                      <p className="text-sm text-muted-foreground">{member.role}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{member.specialty}</p>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:min-w-[280px]">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">{memberEvents.length} tarefas</span>
                      <span className="font-semibold text-foreground">{formatPercent(completionRate, 0)}</span>
                    </div>
                    <ProgressBar value={checklistTotals.done} max={Math.max(checklistTotals.items, 1)} label="Checklist" />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{checklistTotals.done}/{checklistTotals.items} itens</span>
                      <span className="inline-flex items-center gap-1 text-primary">
                        Abrir perfil
                        <ChevronRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </GlassPanel>

        <div className="space-y-6">
          <GlassPanel className="space-y-4 p-5">
            <SectionTitle title="Agenda da semana" description="Tarefas com horário, organizadas por dia." />
            <div className="space-y-3">
              {upcomingEvents.length > 0 ? (
                upcomingEvents.map((event) => {
                  const responsibleNames = teamMembers.filter((member) => getCalendarResponsibleIds(event).includes(member.id)).map((member) => member.name);
                  const progress = getCalendarChecklistProgress(event);

                  return (
                    <div key={event.id} className={cn("rounded-2xl border border-border/60 p-4", isDark ? "bg-muted/30" : "bg-card/90")}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                            {formatDayLabel(event.date)} • {event.time}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-foreground">{event.title}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{responsibleNames.join(", ")}</p>
                        </div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                          <CalendarRange className="h-3.5 w-3.5" />
                          {progress.completed}/{progress.total}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma tarefa encontrada para os próximos dias.</p>
              )}
            </div>
          </GlassPanel>

          <GlassPanel className="space-y-4 p-5">
            <SectionTitle title="Atalho" description="Um caminho mais claro para executar o trabalho." />
            <div className="grid gap-3">
              <Link
                to="/calendar"
                className={cn(
                  "flex items-center justify-between rounded-2xl border border-border/60 px-4 py-3 transition hover:bg-muted/50",
                  isDark ? "bg-card/90" : "bg-white",
                )}
              >
                <span className="text-sm font-medium text-foreground">Abrir calendário</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
              <Link
                to="/reports"
                className={cn(
                  "flex items-center justify-between rounded-2xl border border-border/60 px-4 py-3 transition hover:bg-muted/50",
                  isDark ? "bg-card/90" : "bg-white",
                )}
              >
                <span className="text-sm font-medium text-foreground">Ir para relatórios</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            </div>
          </GlassPanel>
        </div>
      </div>
    </PageTransition>
  );
}
