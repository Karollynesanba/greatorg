import { useEffect, useRef, useState } from "react";
import { CalendarClock, ChevronDown, SlidersHorizontal, Target, FileText } from "lucide-react";
import { toast } from "sonner";
import { historyTimeline } from "../data/mockData";
import { useTeamProfiles } from "../data/profiles";
import { useSupabaseSyncedListState } from "../data/supabaseSync";
import { matchesTeamScope, useTeamScope } from "../data/teamScope";
import { useThemeMode } from "../theme";
import {
  ConfirmDialog,
  DeleteIconButton,
  EmptyState,
  FilterPill,
  GlassPanel,
  MemberChip,
  PageHeader,
  PageTransition,
} from "../components/ui";

const typeLabels = {
  post: "Posts",
  goal: "Metas",
  schedule: "Agendados",
};

const typeIcons = {
  post: FileText,
  goal: Target,
  schedule: CalendarClock,
} as const;

type PeriodFilter = "all" | "7d" | "30d" | "90d";

const periodLabels: Record<PeriodFilter, string> = {
  all: "Todo o periodo",
  "7d": "Ultimos 7 dias",
  "30d": "Ultimos 30 dias",
  "90d": "Ultimos 90 dias",
};

function parseHistoryDate(date: string) {
  const parsed = new Date(`${date}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isWithinPeriod(date: string, period: PeriodFilter) {
  if (period === "all") {
    return true;
  }

  const parsed = parseHistoryDate(date);
  if (!parsed) {
    return true;
  }

  const now = new Date();
  now.setHours(12, 0, 0, 0);
  const periodDays = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const start = new Date(now);
  start.setDate(start.getDate() - periodDays);

  return parsed >= start && parsed <= now;
}

function FilterDropdown<T extends string | number>({
  label,
  valueLabel,
  options,
  onChange,
  accentColor,
  triggerDataCy,
  optionDataCyPrefix,
}: {
  label: string;
  valueLabel: string;
  options: Array<{ label: string; value: T; color?: string }>;
  onChange: (value: T) => void;
  accentColor?: string;
  triggerDataCy?: string;
  optionDataCyPrefix?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

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
    <div ref={rootRef} className="relative z-40 min-w-[220px]">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        data-cy={triggerDataCy}
        className="flex w-full items-center justify-between gap-3 rounded-full border border-border/70 bg-background px-5 py-3 text-sm font-medium text-foreground shadow-sm transition hover:border-primary/25 hover:shadow-md"
      >
        <span className="truncate" style={accentColor ? { color: accentColor } : undefined}>
          {valueLabel}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div className="absolute left-0 top-full z-[60] mt-3 w-full rounded-[1.75rem] border border-border/70 bg-white p-2 shadow-[0_24px_60px_rgba(15,23,42,0.12)]">
          <p className="px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {label}
          </p>
          <div className="space-y-1">
            {options.map((option) => {
              const selected = option.label === valueLabel;

              return (
                <button
                  key={String(option.value)}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  data-cy={optionDataCyPrefix ? `${optionDataCyPrefix}-option-${String(option.value)}` : undefined}
                  className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm transition hover:bg-muted/70"
                  style={{
                    backgroundColor: selected ? `${option.color ?? "#833AB4"}12` : undefined,
                  }}
                >
                  <span className="flex items-center gap-3">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{
                        backgroundColor: option.color ?? "rgb(var(--muted-foreground) / 1)",
                      }}
                    />
                    <span
                      className="font-medium"
                      style={{
                        color: option.color ?? "rgb(var(--foreground) / 1)",
                      }}
                    >
                      {option.label}
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

export function HistoryPage() {
  const { isDark } = useThemeMode();
  const [teamMembers] = useTeamProfiles();
  const [teamScope] = useTeamScope();
  const [itemsState, setItemsState] = useSupabaseSyncedListState({
    key: "history",
    table: "history_events",
    fallback: historyTimeline,
  });
  const [view, setView] = useState<"Timeline" | "Tabela">("Timeline");
  const [personFilter, setPersonFilter] = useState<number | "todos">("todos");
  const [typeFilter, setTypeFilter] = useState<"todos" | "post" | "goal" | "schedule">("todos");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");
  const [pendingDelete, setPendingDelete] = useState<{ historyId: number; historyTitle: string } | null>(null);
  const actionGroupClass = isDark
    ? "flex flex-wrap gap-2 rounded-full border border-border/60 bg-muted/35 p-1.5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]"
    : "flex flex-wrap gap-2 rounded-full border border-border/60 bg-white/96 p-1.5 shadow-[0_10px_24px_rgba(15,23,42,0.06)]";
  const filterShellClass = isDark
    ? "flex flex-col gap-4 rounded-[2rem] border border-border/60 bg-card/95 p-4 shadow-[var(--shadow-card)] lg:flex-row lg:items-center"
    : "flex flex-col gap-4 rounded-[2rem] border border-border/60 bg-white/96 p-4 shadow-[0_18px_48px_rgba(15,23,42,0.06)] lg:flex-row lg:items-center";
  const timelineCardStyle = (color: string) => ({
    background: isDark
      ? "linear-gradient(180deg, rgba(24,24,26,0.98), rgba(16,16,18,0.96))"
      : "linear-gradient(180deg, rgba(255,255,255,0.99), rgba(249,249,251,0.96))",
    borderColor: `${color}28`,
    boxShadow: `0 18px 36px ${color}10`,
    borderLeftWidth: "4px",
    borderLeftColor: color,
  });

  const items = itemsState.filter((item) => {
    const matchesPerson = personFilter === "todos" || item.authorId === personFilter;
    const matchesType = typeFilter === "todos" || item.type === typeFilter;
    const matchesPeriod = isWithinPeriod(item.date, periodFilter);
    const matchesScope = matchesTeamScope(item.authorId, teamScope);

    return matchesPerson && matchesType && matchesPeriod && matchesScope;
  });

  const handleDeleteHistory = (historyId: number) => {
    const removedHistory = itemsState.find((item) => item.id === historyId);

    if (!removedHistory) {
      return;
    }

    setItemsState((previous) => previous.filter((item) => item.id !== historyId));
    setPendingDelete(null);
    toast.success("Registro apagado com sucesso.", {
      action: {
        label: "Desfazer",
        onClick: () => {
          setItemsState((previous) => {
            if (previous.some((item) => item.id === removedHistory.id)) {
              return previous;
            }

            return [removedHistory, ...previous];
          });
        },
      },
    });
  };

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Linha do tempo"
        title="Histórico completo da operação"
        description="Acompanhe publicações, metas e movimentações do calendário em ordem cronológica ou em formato de tabela."
        actions={
          <div className={actionGroupClass}>
            {(["Timeline", "Tabela"] as const).map((item) => (
              <FilterPill
                key={item}
                label={item}
                active={view === item}
                onClick={() => setView(item)}
                dataCy={`history-view-${item.toLowerCase()}`}
              />
            ))}
          </div>
        }
      />

      <GlassPanel index={1} className="relative z-30 overflow-visible">
        <div
          className={filterShellClass}
          style={{
            backgroundColor: isDark ? "rgb(var(--card) / 0.96)" : "rgb(var(--card) / 0.95)",
          }}
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background px-4 py-2.5 text-sm font-medium text-muted-foreground shadow-sm dark:bg-card/80">
            <SlidersHorizontal className="h-4 w-4" />
            Filtros
          </div>

          <div className="flex flex-1 flex-wrap gap-3">
            <FilterDropdown<number | "todos">
              label="Pessoa"
              valueLabel={
                personFilter === "todos"
                  ? "Todas as pessoas"
                  : teamMembers.find((member) => member.id === personFilter)?.name ?? "Todas as pessoas"
              }
              accentColor={
                personFilter === "todos"
                  ? undefined
                  : teamMembers.find((member) => member.id === personFilter)?.color
              }
              onChange={(value) => setPersonFilter(value)}
              triggerDataCy="history-filter-person-trigger"
              optionDataCyPrefix="history-filter-person"
              options={[
                { label: "Todas as pessoas", value: "todos" as const },
                ...teamMembers.map((member) => ({
                  label: member.name,
                  value: member.id,
                  color: member.color,
                })),
              ]}
            />

            <FilterDropdown<"todos" | "post" | "goal" | "schedule">
              label="Tipo"
              valueLabel={typeFilter === "todos" ? "Todos os tipos" : typeLabels[typeFilter]}
              onChange={(value) => setTypeFilter(value)}
              triggerDataCy="history-filter-type-trigger"
              optionDataCyPrefix="history-filter-type"
              options={[
                { label: "Todos os tipos", value: "todos" as const },
                { label: "Posts", value: "post" as const },
                { label: "Metas", value: "goal" as const },
                { label: "Agendados", value: "schedule" as const },
              ]}
            />

            <FilterDropdown<PeriodFilter>
              label="Periodo"
              valueLabel={periodLabels[periodFilter]}
              onChange={(value) => setPeriodFilter(value)}
              options={[
                { label: periodLabels.all, value: "all" as const },
                { label: periodLabels["7d"], value: "7d" as const },
                { label: periodLabels["30d"], value: "30d" as const },
                { label: periodLabels["90d"], value: "90d" as const },
              ]}
            />
          </div>
        </div>
      </GlassPanel>

      {items.length === 0 ? (
        <EmptyState
          title="Nenhum registro encontrado"
          description="Tente limpar os filtros para ver o histórico completo da operação."
        />
      ) : view === "Timeline" ? (
        <div className="grid gap-4">
          {items.map((item, index) => {
            const member = teamMembers.find((person) => person.id === item.authorId)!;
            const Icon = typeIcons[item.type];

            return (
              <GlassPanel
                key={item.id}
                index={index + 2}
                className="group relative"
                style={timelineCardStyle(member.color)}
              >
                <div className="absolute right-4 top-4 z-10 opacity-0 transition group-hover:opacity-100">
                  <DeleteIconButton onClick={() => setPendingDelete({ historyId: item.id, historyTitle: item.title })} />
                </div>
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex gap-4">
                    <div
                      className="inline-flex h-12 w-12 items-center justify-center rounded-2xl"
                      style={{
                        backgroundColor: `${member.color}14`,
                        color: member.color,
                      }}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-lg font-semibold text-foreground">{item.title}</h2>
                        <span
                          className="rounded-full px-3 py-1 text-xs font-semibold"
                          style={{
                            backgroundColor: `${member.color}10`,
                            color: member.color,
                          }}
                        >
                          {typeLabels[item.type]}
                        </span>
                      </div>
                      <p className="text-sm leading-6 text-muted-foreground">{item.description}</p>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <span>{item.date}</span>
                        <span>{item.result}</span>
                        {item.metrics ? <span>{item.metrics}</span> : null}
                      </div>
                    </div>
                  </div>
                  <MemberChip name={member.name} role={member.role} color={member.color} src={member.avatarUrl} />
                </div>
              </GlassPanel>
            );
          })}
        </div>
      ) : (
        <GlassPanel index={2} className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="bg-muted/60 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                <tr>
                  <th className="px-5 py-4">Título / Descrição</th>
                  <th className="px-5 py-4">Tipo</th>
                  <th className="px-5 py-4">Responsável</th>
                  <th className="px-5 py-4">Data</th>
                  <th className="px-5 py-4">Resultado</th>
                  <th className="px-5 py-4">Ações</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const member = teamMembers.find((person) => person.id === item.authorId)!;

                  return (
                    <tr key={item.id} className="border-t border-border/60">
                      <td className="px-5 py-4">
                        <p className="font-medium text-foreground">{item.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                      </td>
                      <td className="px-5 py-4 text-sm text-muted-foreground">{typeLabels[item.type]}</td>
                      <td className="px-5 py-4">
                        <MemberChip name={member.name} role={member.role} color={member.color} src={member.avatarUrl} />
                      </td>
                      <td className="px-5 py-4 text-sm text-muted-foreground">{item.date}</td>
                      <td className="px-5 py-4 text-sm text-foreground">{item.result}</td>
                      <td className="px-5 py-4">
                        <DeleteIconButton
                          dataCy={`history-delete-table-${item.id}`}
                          onClick={() => setPendingDelete({ historyId: item.id, historyTitle: item.title })}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </GlassPanel>
      )}

      {pendingDelete ? (
        <ConfirmDialog
          title="Tem certeza que deseja apagar?"
          description="Essa ação não pode ser desfeita."
          cancelDataCy="history-delete-cancel"
          confirmDataCy="history-delete-confirm"
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => handleDeleteHistory(pendingDelete.historyId)}
        />
      ) : null}
    </PageTransition>
  );
}

