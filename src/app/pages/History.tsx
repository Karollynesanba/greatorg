import { useEffect, useRef, useState } from "react";
import { CalendarClock, ChevronDown, Clock3, FileText, Lightbulb, Search, SlidersHorizontal, Target, Users } from "lucide-react";
import { toast } from "sonner";
import { historyTimeline } from "../data/mockData";
import { useTeamProfiles } from "../data/profiles";
import { useSupabaseSyncedListState } from "../data/supabaseSync";
import {
  ConfirmDialog,
  DeleteIconButton,
  EmptyState,
  FilterPill,
  GlassPanel,
  MemberChip,
  PageHeader,
  PageTransition,
  cn,
} from "../components/ui";

const typeLabels = {
  idea: "Ideia",
  post: "Conteúdo",
  goal: "Meta",
  schedule: "Calendário",
};

const typeIcons = {
  idea: Lightbulb,
  post: FileText,
  goal: Target,
  schedule: CalendarClock,
} as const;

type PeriodFilter = "all" | "7d" | "30d" | "90d";

const periodLabels: Record<PeriodFilter, string> = {
  all: "Todo o período",
  "7d": "Últimos 7 dias",
  "30d": "Últimos 30 dias",
  "90d": "Últimos 90 dias",
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

function formatHistoryDateLabel(date: string) {
  const parsed = parseHistoryDate(date);
  if (!parsed) {
    return date;
  }

  const label = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);

  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatHistoryFullDate(date: string) {
  const parsed = parseHistoryDate(date);
  if (!parsed) {
    return date;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsed);
}

function extractHistoryTime(description: string) {
  const match = description.match(/(\d{2}:\d{2})/);
  return match?.[1] ?? "--:--";
}

function getPeriodRangeLabel(items: Array<{ date: string }>) {
  if (items.length === 0) {
    return "Sem registros";
  }

  const ordered = [...items].sort((left, right) => left.date.localeCompare(right.date));
  return `${formatHistoryFullDate(ordered[0].date)} - ${formatHistoryFullDate(ordered[ordered.length - 1].date)}`;
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
        className="flex h-11 w-full items-center justify-between gap-3 rounded-full border border-border/70 bg-background px-5 text-sm font-medium text-foreground shadow-sm transition hover:border-primary/25 hover:shadow-md"
      >
        <span className="truncate" style={accentColor ? { color: accentColor } : undefined}>
          {valueLabel}
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition", open && "rotate-180")} />
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
                    backgroundColor: selected ? `${option.color ?? "#e11d48"}12` : undefined,
                  }}
                >
                  <span className="flex items-center gap-3">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{
                        backgroundColor: option.color ?? "#e11d48",
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
  const [teamMembers] = useTeamProfiles();
  const [itemsState, setItemsState] = useSupabaseSyncedListState({
    key: "history",
    table: "history_events",
    fallback: historyTimeline,
    seedOnEmpty: true,
    mergeFallback: true,
  });
  const [view, setView] = useState<"Timeline" | "Tabela">("Timeline");
  const [personFilter, setPersonFilter] = useState<number | "todos">("todos");
  const [typeFilter, setTypeFilter] = useState<"todos" | "post" | "goal" | "schedule" | "idea">("todos");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingDelete, setPendingDelete] = useState<{ historyId: number; historyTitle: string } | null>(null);

  const items = itemsState.filter((item) => {
    const matchesPerson = personFilter === "todos" || item.authorId === personFilter;
    const matchesType = typeFilter === "todos" || item.type === typeFilter;
    const matchesPeriod = isWithinPeriod(item.date, periodFilter);
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const matchesSearch =
      normalizedQuery.length === 0 ||
      `${item.title} ${item.description} ${item.result} ${item.metrics ?? ""}`.toLowerCase().includes(normalizedQuery);

    return matchesPerson && matchesType && matchesPeriod && matchesSearch;
  });

  const orderedItems = [...items].sort((left, right) => {
    const leftKey = `${left.date} ${extractHistoryTime(left.description)}`;
    const rightKey = `${right.date} ${extractHistoryTime(right.description)}`;
    return rightKey.localeCompare(leftKey);
  });

  const groupedTimeline = orderedItems.reduce<Array<{ date: string; entries: typeof orderedItems }>>((groups, item) => {
    const current = groups[groups.length - 1];
    if (!current || current.date !== item.date) {
      groups.push({ date: item.date, entries: [item] });
      return groups;
    }

    current.entries.push(item);
    return groups;
  }, []);

  const totalRecords = orderedItems.length;
  const publicationCount = orderedItems.filter((item) => item.type === "post").length;
  const goalsCount = orderedItems.filter((item) => item.type === "goal").length;
  const peopleCount = new Set(orderedItems.map((item) => item.authorId)).size;
  const periodRangeLabel = getPeriodRangeLabel(orderedItems);
  const latestTableItems = orderedItems.slice(0, 8);

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
      />

      <div className="space-y-6">
        <GlassPanel index={1} className="relative z-30 overflow-visible border border-border/60 bg-white/96 p-4 shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="inline-flex h-11 items-center gap-2 rounded-full border border-border/70 bg-background px-4 text-sm font-medium text-muted-foreground shadow-sm">
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
                  { label: "Todas as pessoas", value: "todos" as const, color: "#e11d48" },
                  ...teamMembers.map((member) => ({
                    label: member.name,
                    value: member.id,
                    color: member.color,
                  })),
                ]}
              />

              <FilterDropdown<"todos" | "post" | "goal" | "schedule" | "idea">
                label="Tipo"
                valueLabel={typeFilter === "todos" ? "Todos os tipos" : typeLabels[typeFilter]}
                onChange={(value) => setTypeFilter(value)}
                triggerDataCy="history-filter-type-trigger"
                optionDataCyPrefix="history-filter-type"
                options={[
                  { label: "Todos os tipos", value: "todos" as const, color: "#e11d48" },
                  { label: "Conteúdo", value: "post" as const, color: "#ef4444" },
                  { label: "Meta", value: "goal" as const, color: "#f43f5e" },
                  { label: "Ideia", value: "idea" as const, color: "#f59e0b" },
                  { label: "Calendário", value: "schedule" as const, color: "#fb7185" },
                ]}
              />

              <FilterDropdown<PeriodFilter>
                label="Período"
                valueLabel={periodLabels[periodFilter]}
                onChange={(value) => setPeriodFilter(value)}
                options={[
                  { label: periodLabels.all, value: "all" as const, color: "#e11d48" },
                  { label: periodLabels["7d"], value: "7d" as const, color: "#ef4444" },
                  { label: periodLabels["30d"], value: "30d" as const, color: "#f43f5e" },
                  { label: periodLabels["90d"], value: "90d" as const, color: "#fb7185" },
                ]}
              />
            </div>

            <div className="flex flex-wrap gap-2 rounded-full border border-border/60 bg-white/96 p-1.5 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
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
          </div>
        </GlassPanel>

        <div className="grid gap-4 xl:grid-cols-5">
          {[
            {
              label: "Total de registros",
              value: String(totalRecords),
              detail: "Visão geral do período filtrado",
              delta: "+18%",
              icon: FileText,
            },
            {
              label: "Publicações",
              value: String(publicationCount),
              detail: "Itens de conteúdo movimentados",
              delta: "+22%",
              icon: CalendarClock,
            },
            {
              label: "Metas atualizadas",
              value: String(goalsCount),
              detail: "Metas criadas ou ajustadas",
              delta: "+8%",
              icon: Target,
            },
            {
              label: "Pessoas envolvidas",
              value: String(peopleCount),
              detail: peopleCount > 0 ? "Sem alteração" : "Nenhuma pessoa no recorte",
              delta: null,
              icon: Users,
            },
            {
              label: "Período exibido",
              value: periodRangeLabel,
              detail: periodFilter === "all" ? "Período completo" : periodLabels[periodFilter],
              delta: null,
              icon: Clock3,
            },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <GlassPanel key={card.label} className="border border-border/60 bg-white/96 p-5 shadow-[0_16px_38px_rgba(15,23,42,0.05)]">
                <div className="flex items-start gap-4">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgb(255,234,234)] text-primary ring-1 ring-[rgb(243,209,209)]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{card.label}</p>
                    <p className="mt-2 truncate text-[clamp(1.45rem,1.8vw,2rem)] font-semibold tracking-tight text-foreground">{card.value}</p>
                    <div className="mt-3 flex items-center gap-2 text-sm">
                      {card.delta ? <span className="font-semibold text-primary">{card.delta}</span> : null}
                      <span className="text-muted-foreground">{card.detail}</span>
                    </div>
                  </div>
                </div>
              </GlassPanel>
            );
          })}
        </div>

        {orderedItems.length === 0 ? (
          <EmptyState
            title="Nenhum registro encontrado"
            description="Tente limpar os filtros para ver o histórico completo da operação."
          />
        ) : (
          <div className={cn("grid gap-6 xl:grid-cols-[0.95fr_1.05fr]", view === "Tabela" && "xl:grid-cols-[1.05fr_0.95fr]")}>
            <GlassPanel
              index={2}
              className={cn(
                "overflow-hidden border border-border/60 bg-white/96 p-5 shadow-[0_18px_42px_rgba(15,23,42,0.05)]",
                view === "Tabela" ? "xl:order-2" : "xl:order-1",
              )}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-[1.65rem] font-semibold tracking-tight text-foreground">Linha do tempo</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Movimentações organizadas por dia e prioridade.</p>
                </div>
              </div>

              <div className="mt-6 space-y-8">
                {groupedTimeline.map((group) => (
                  <div key={group.date} className="relative pl-7">
                    <div className="absolute left-[8px] top-9 bottom-0 w-px bg-gradient-to-b from-[rgb(227,6,19,0.45)] via-[rgb(243,209,209)] to-transparent" />
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="h-4 w-4 rounded-full border-4 border-white bg-primary shadow-[0_0_0_1px_rgba(227,6,19,0.18)]" />
                        <h3 className="text-base font-semibold text-foreground">{formatHistoryDateLabel(group.date)}</h3>
                      </div>
                      <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-full border border-[rgb(243,209,209)] bg-[rgb(255,234,234)] px-3 text-sm font-semibold text-primary">
                        {group.entries.length}
                      </span>
                    </div>

                    <div className="mt-4 space-y-3">
                      {group.entries.map((item) => {
                        const member = teamMembers.find((person) => person.id === item.authorId)!;
                        const Icon = typeIcons[item.type];

                        return (
                          <div key={item.id} className="group flex gap-4">
                            <div className="w-12 pt-5 text-sm font-medium text-muted-foreground">{extractHistoryTime(item.description)}</div>
                            <div className="flex-1 rounded-[1.7rem] border border-border/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(249,249,251,0.97))] p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition hover:shadow-[0_16px_28px_rgba(15,23,42,0.06)]">
                              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                <div className="flex min-w-0 gap-4">
                                  <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[rgb(255,234,234)] text-primary ring-1 ring-[rgb(243,209,209)]">
                                    <Icon className="h-4.5 w-4.5" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <h4 className="text-base font-semibold text-foreground">{item.title}</h4>
                                      <span className="rounded-full bg-[rgb(255,234,234)] px-3 py-1 text-xs font-semibold text-primary">{typeLabels[item.type]}</span>
                                    </div>
                                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
                                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-medium text-muted-foreground">
                                      <span>{item.result}</span>
                                      {item.metrics ? <span>{item.metrics}</span> : null}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <MemberChip name={member.name} role={member.role} color={member.color} src={member.avatarUrl} />
                                  <DeleteIconButton onClick={() => setPendingDelete({ historyId: item.id, historyTitle: item.title })} />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </GlassPanel>

            <GlassPanel
              index={3}
              className={cn(
                "overflow-hidden border border-border/60 bg-white/96 p-0 shadow-[0_18px_42px_rgba(15,23,42,0.05)]",
                view === "Tabela" ? "xl:order-1" : "xl:order-2",
              )}
            >
              <div className="flex flex-col gap-4 border-b border-border/60 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-[1.65rem] font-semibold tracking-tight text-foreground">Últimos registros</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Tabela resumida com os eventos mais recentes do histórico.</p>
                </div>

                <label className="flex h-11 min-w-[280px] items-center gap-3 rounded-full border border-border/70 bg-background px-4 text-sm text-muted-foreground shadow-sm">
                  <Search className="h-4 w-4" />
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Buscar registros..."
                    className="w-full border-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                  />
                </label>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-left">
                  <thead className="border-b border-border/60 bg-[linear-gradient(180deg,rgba(250,250,252,0.95),rgba(248,250,252,0.96))] text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    <tr>
                      <th className="px-5 py-4">Data e hora</th>
                      <th className="px-5 py-4">Tipo</th>
                      <th className="px-5 py-4">Descrição</th>
                      <th className="px-5 py-4">Pessoa</th>
                      <th className="px-5 py-4">Categoria</th>
                      <th className="px-5 py-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {latestTableItems.map((item) => {
                      const member = teamMembers.find((person) => person.id === item.authorId)!;
                      const Icon = typeIcons[item.type];

                      return (
                        <tr key={item.id} className="border-t border-border/60">
                          <td className="px-5 py-4 text-sm text-muted-foreground">
                            <div>{formatHistoryFullDate(item.date)}</div>
                            <div className="mt-1 text-xs">{extractHistoryTime(item.description)}</div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[rgb(255,234,234)] text-primary ring-1 ring-[rgb(243,209,209)]">
                              <Icon className="h-4 w-4" />
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <p className="font-medium text-foreground">{item.title}</p>
                            <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                          </td>
                          <td className="px-5 py-4">
                            <MemberChip name={member.name} role={member.role} color={member.color} src={member.avatarUrl} />
                          </td>
                          <td className="px-5 py-4">
                            <span className="rounded-full bg-[rgb(255,234,234)] px-3 py-1 text-xs font-semibold text-primary">{typeLabels[item.type]}</span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex justify-end">
                              <DeleteIconButton
                                dataCy={`history-delete-table-${item.id}`}
                                onClick={() => setPendingDelete({ historyId: item.id, historyTitle: item.title })}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-4 border-t border-border/60 px-5 py-4 text-sm text-muted-foreground lg:flex-row lg:items-center lg:justify-between">
                <p>Mostrando 1 a {latestTableItems.length} de {totalRecords} registros</p>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4].map((page) => (
                    <button
                      key={page}
                      type="button"
                      className={cn(
                        "inline-flex h-10 w-10 items-center justify-center rounded-xl border text-sm font-semibold transition",
                        page === 1 ? "border-primary bg-primary text-white" : "border-border/70 bg-white text-foreground hover:border-[rgb(243,209,209)] hover:text-primary",
                      )}
                    >
                      {page}
                    </button>
                  ))}
                </div>
              </div>
            </GlassPanel>
          </div>
        )}
      </div>

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
