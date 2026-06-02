import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Film, PencilLine, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { historyTimeline, storyLogs, type HistoryEvent, type StoryLog } from "../data/mockData";
import { useTeamProfiles } from "../data/profiles";
import { useSupabaseSyncedListState } from "../data/supabaseSync";
import { matchesTeamScope, useTeamScope } from "../data/teamScope";
import { buildStoryHistoryEvent, getStoryHistoryId, removeHistoryEvent, upsertHistoryEvent } from "../data/historyEvents";
import { isCypressRecord, isDateInRange } from "../data/periodMetrics";
import {
  ActionButton,
  GlassPanel,
  EmptyState,
  MemberChip,
  PageHeader,
  PageTransition,
  ProgressBar,
  RoundedDatePicker,
  RoundedDropdown,
  RoundedTimePicker,
  cn,
} from "../components/ui";
import { useThemeMode } from "../theme";

type StoryMediaType = "video" | "photo";
type StoryStatus = "Agendado" | "Publicado" | "Rascunho";
type StoryPeriodMode = "current" | "month" | "custom";

type StoryFormState = {
  date: string;
  time: string;
  quantity: string;
  mediaType: StoryMediaType;
  status: StoryStatus;
  madeById: number;
  postedById: number;
  notes: string;
};

const monthlyGoals = {
  total: 168,
  video: 105,
  photo: 63,
};

function pad(number: number) {
  return String(number).padStart(2, "0");
}

function formatMonthKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function parseDateKey(value: string) {
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value || "Sem data";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatMonthYear(value: string) {
  const parsed = parseDateKey(value);
  if (!parsed) {
    return value;
  }

  const label = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(parsed);

  return label.charAt(0).toUpperCase() + label.slice(1);
}

function normalizePeriodRange(startValue: string, endValue: string, fallback: Date) {
  const start = parseDateKey(startValue);
  const end = parseDateKey(endValue);

  if (start && end) {
    return start <= end ? { start, end } : { start: end, end: start };
  }

  return {
    start: startOfMonth(fallback),
    end: endOfMonth(fallback),
  };
}

function formatLabel(type: StoryMediaType) {
  return type === "video" ? "Vídeo" : "Foto";
}

function formatStatusLabel(status: StoryStatus) {
  return status;
}

function getStoryStatus(item: StoryLog): StoryStatus {
  if (item.status) {
    return item.status;
  }

  const storyDate = new Date(`${item.date}T${item.time}:00`);
  return storyDate.getTime() > Date.now() ? "Agendado" : "Publicado";
}

function emptyForm(teamMembers: Array<{ id: number }>): StoryFormState {
  return {
    date: todayKey(),
    time: "09:00",
    quantity: "",
    mediaType: "video",
    status: "Agendado",
    madeById: teamMembers[0]?.id ?? 1,
    postedById: teamMembers[1]?.id ?? teamMembers[0]?.id ?? 1,
    notes: "",
  };
}

export function StoriesPage() {
  const { isDark } = useThemeMode();
  const [teamMembers] = useTeamProfiles();
  const [items, setItems] = useSupabaseSyncedListState<StoryLog>({
    key: "story-logs",
    table: "story_logs",
    fallback: storyLogs,
  });
  const [, setHistoryEvents] = useSupabaseSyncedListState<HistoryEvent>({
    key: "history",
    table: "history_events",
    fallback: historyTimeline,
  });
  const [teamScope] = useTeamScope();
  const currentMonthAnchor = useMemo(() => new Date(), []);
  const [periodMode, setPeriodMode] = useState<StoryPeriodMode>("current");
  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(currentMonthAnchor));
  const [customStartDate, setCustomStartDate] = useState(() => formatDateKey(startOfMonth(currentMonthAnchor)));
  const [customEndDate, setCustomEndDate] = useState(() => formatDateKey(endOfMonth(currentMonthAnchor)));
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingStoryId, setEditingStoryId] = useState<number | null>(null);
  const [form, setForm] = useState<StoryFormState>(() => emptyForm(teamMembers));
  const currentMonthKey = formatMonthKey(currentMonthAnchor);
  const activeMonthLabel = formatMonthYear(formatDateKey(periodMode === "current" ? currentMonthAnchor : monthCursor));
  const customRange = useMemo(
    () => normalizePeriodRange(customStartDate, customEndDate, currentMonthAnchor),
    [currentMonthAnchor, customEndDate, customStartDate],
  );
  const customRangeLabel = `${formatDate(formatDateKey(customRange.start))} até ${formatDate(formatDateKey(customRange.end))}`;
  const summaryTitle = periodMode === "custom" ? "Meta do período" : "Meta do mês";

  const visibleItems = useMemo(
    () => {
      const currentMonthKey = formatMonthKey(currentMonthAnchor);
      const monthKey = formatMonthKey(monthCursor);
      return items.filter((item) => {
        const matchesMadeBy = matchesTeamScope(item.madeById, teamScope);
        const matchesPostedBy = matchesTeamScope(item.postedById, teamScope);
        const matchesScope = (matchesMadeBy || matchesPostedBy) && !isCypressRecord(item);

        if (!matchesScope) {
          return false;
        }

        if (periodMode === "current") {
          return item.date.startsWith(currentMonthKey);
        }

        if (periodMode === "month") {
          return item.date.startsWith(monthKey);
        }

        return isDateInRange(item.date, customRange.start, customRange.end);
      });
    },
    [customRange.end, customRange.start, currentMonthAnchor, items, monthCursor, periodMode, teamScope],
  );

  const stats = useMemo(() => {
    const total = visibleItems.reduce((sum, item) => sum + item.quantity, 0);
    const video = visibleItems.filter((item) => item.mediaType === "video").reduce((sum, item) => sum + item.quantity, 0);
    const photo = visibleItems.filter((item) => item.mediaType === "photo").reduce((sum, item) => sum + item.quantity, 0);

    return {
      total,
      video,
      photo,
      remainingTotal: Math.max(monthlyGoals.total - total, 0),
    };
  }, [visibleItems]);

  const sortedItems = useMemo(() => {
    return [...visibleItems].sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`));
  }, [visibleItems]);

  const memberContributions = useMemo(
    () =>
      teamMembers
        .filter((member) => matchesTeamScope(member.id, teamScope))
        .map((member) => {
        const memberItems = visibleItems.filter((item) => item.madeById === member.id);
        const total = memberItems.reduce((sum, item) => sum + item.quantity, 0);
        const video = memberItems.filter((item) => item.mediaType === "video").reduce((sum, item) => sum + item.quantity, 0);
        const photo = memberItems.filter((item) => item.mediaType === "photo").reduce((sum, item) => sum + item.quantity, 0);

        return { member, total, video, photo, count: memberItems.length };
        }),
    [teamMembers, teamScope, visibleItems],
  );

  const closeModal = () => {
    setIsCreateOpen(false);
    setEditingStoryId(null);
    setForm(emptyForm(teamMembers));
  };

  const openCreateModal = () => {
    setEditingStoryId(null);
    setForm(emptyForm(teamMembers));
    setIsCreateOpen(true);
  };

  const openEditModal = (story: StoryLog) => {
    setEditingStoryId(story.id);
    setForm({
      date: story.date,
      time: story.time,
      quantity: String(story.quantity),
      mediaType: story.mediaType,
      status: getStoryStatus(story),
      madeById: story.madeById,
      postedById: story.postedById,
      notes: story.notes,
    });
    setIsCreateOpen(true);
  };

  const handleSave = () => {
    const quantity = Number(form.quantity);

    if (!form.date || !form.time || !Number.isFinite(quantity) || quantity <= 0) {
      toast.error("Preencha data, hora e quantidade.");
      return;
    }

    const madeBy = teamMembers.find((member) => member.id === form.madeById);
    const postedBy = teamMembers.find((member) => member.id === form.postedById);

    if (!madeBy || !postedBy) {
      toast.error("Selecione quem fez e quem postou.");
      return;
    }

    const nextItem: StoryLog = {
      id: editingStoryId ?? Math.max(...items.map((item) => item.id), 0) + 1,
      date: form.date,
      time: form.time,
      quantity,
      mediaType: form.mediaType,
      status: form.status,
      madeById: madeBy.id,
      postedById: postedBy.id,
      notes: form.notes.trim(),
    };

    setItems((previous) =>
      editingStoryId !== null
        ? previous.map((item) => (item.id === editingStoryId ? nextItem : item))
        : [nextItem, ...previous],
    );
    setHistoryEvents((previous) =>
      upsertHistoryEvent(
        previous,
        buildStoryHistoryEvent(nextItem, madeBy.name, editingStoryId !== null ? "updated" : "created"),
      ),
    );
    toast.success(editingStoryId !== null ? "Story atualizado." : "Stories registrados.");
    closeModal();
  };

  const handleDelete = (storyId: number) => {
    const removedStory = items.find((item) => item.id === storyId);
    if (!removedStory) {
      return;
    }

    setItems((previous) => previous.filter((item) => item.id !== storyId));
    setHistoryEvents((previous) => removeHistoryEvent(previous, getStoryHistoryId(storyId)));
    toast.success("Registro removido.");
  };

  const cardClass = isDark
    ? "rounded-[2rem] border border-border/60 bg-background/90 p-4 shadow-[0_18px_42px_rgba(15,23,42,0.08)]"
    : "rounded-[2rem] border border-border/60 bg-white/96 p-4 shadow-[0_18px_42px_rgba(15,23,42,0.06)]";
  const summaryBoxClass = isDark
    ? "space-y-3 rounded-2xl border border-border/60 bg-muted/20 p-4"
    : "space-y-3 rounded-2xl border border-border/60 bg-white/96 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]";
  const modalClass = isDark
    ? "w-full max-w-4xl overflow-hidden rounded-[2rem] border border-border/60 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.22)] dark:border-white/8 dark:bg-card/98"
    : "w-full max-w-4xl overflow-hidden rounded-[2rem] border border-border/60 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.14)]";
  const previewClass = isDark
    ? "rounded-2xl border border-border/60 bg-background p-4"
    : "rounded-2xl border border-border/60 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]";
  const filterPanelClass = isDark
    ? "rounded-[2rem] border border-white/10 bg-[#111723] p-5 text-slate-100 shadow-[0_18px_48px_rgba(0,0,0,0.18)] backdrop-blur-xl"
    : "rounded-[2rem] border border-border/70 bg-card p-5 text-card-foreground shadow-[0_18px_48px_rgba(15,23,42,0.06)] backdrop-blur-xl";
  const canGoNextMonth = formatMonthKey(monthCursor) < currentMonthKey;
  const moveMonth = (amount: number) => {
    setPeriodMode("month");
    setMonthCursor((current) => {
      const next = addMonths(current, amount);
      return formatMonthKey(next) > currentMonthKey ? startOfMonth(currentMonthAnchor) : next;
    });
  };

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Conteúdo"
        title="Stories"
        description="Meta mensal: 168 stories, sendo 105 em vídeo. Registre o que foi feito por dia."
        actions={
          <ActionButton onClick={openCreateModal} dataCy="stories-create-open">
            <Plus className="h-4 w-4" />
            Adicionar
          </ActionButton>
        }
      />

      <div className={cn(filterPanelClass, "relative z-30 space-y-4 p-5 sm:p-6")}>
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Período</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Todos os cards abaixo respondem ao intervalo selecionado.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-border/60 bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground">
              {periodMode === "custom" ? "Intervalo personalizado ativo" : activeMonthLabel}
            </span>
          </div>
        </div>

        <div className="relative z-40 grid gap-3 xl:grid-cols-[260px_minmax(0,1fr)_auto] xl:items-center">
          <RoundedDropdown
            label="Período"
            value={periodMode}
            options={[
              { label: "Esse mês", value: "current" as const },
              { label: "Mês selecionado", value: "month" as const },
              { label: "Personalizado", value: "custom" as const },
            ]}
            onChange={(value) => {
              setPeriodMode(value);

              if (value === "current") {
                setMonthCursor(startOfMonth(currentMonthAnchor));
              }
            }}
          />

          <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
            <div className="flex items-center gap-3 rounded-[1.5rem] border border-border/70 bg-background px-4 py-3 shadow-sm">
              <button
                type="button"
                onClick={() => moveMonth(-1)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-card text-muted-foreground transition hover:border-primary/25 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Mês anterior"
                disabled={periodMode !== "month"}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Mês</p>
                <p className="truncate text-sm font-semibold text-foreground">{activeMonthLabel}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!canGoNextMonth) {
                    return;
                  }

                  setMonthCursor((current) => {
                    const next = addMonths(current, 1);
                    return formatMonthKey(next) > currentMonthKey ? startOfMonth(currentMonthAnchor) : next;
                  });
                }}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-card text-muted-foreground transition hover:border-primary/25 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                disabled={periodMode !== "month" || !canGoNextMonth}
                aria-label="Próximo mês"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setPeriodMode("custom")}
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-[1.5rem] border px-5 py-3 text-sm font-semibold transition",
                periodMode === "custom"
                  ? "border-primary/30 bg-primary/8 text-primary shadow-sm"
                  : "border-border/70 bg-background text-foreground hover:border-primary/20 hover:shadow-sm",
              )}
            >
              Personalizado
            </button>

            <div className="hidden xl:block" />
          </div>
        </div>

        {periodMode === "custom" ? (
          <div className="grid gap-3 rounded-[1.75rem] border border-border/60 bg-muted/20 p-4 md:grid-cols-2">
            <RoundedDatePicker
              label="Data inicial"
              value={customStartDate}
              onChange={(value) => setCustomStartDate(value)}
              dataCy="stories-period-start"
            />
            <RoundedDatePicker
              label="Data final"
              value={customEndDate}
              onChange={(value) => setCustomEndDate(value)}
              dataCy="stories-period-end"
            />
            <div className="md:col-span-2 flex items-center justify-between rounded-[1.35rem] border border-border/60 bg-background px-4 py-3 text-sm text-muted-foreground">
              <span>Intervalo aplicado</span>
              <strong className="text-foreground">{customRangeLabel}</strong>
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-3">
            {memberContributions.map((entry) => (
              <GlassPanel key={entry.member.id} className="p-4" style={teamScope === entry.member.id ? { borderColor: `${entry.member.color}55` } : undefined}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{entry.member.name}</p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">{entry.total}</p>
                  </div>
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-semibold text-white" style={{ backgroundColor: entry.member.color }}>
                    {entry.member.name.charAt(0)}
                  </span>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  {entry.video} vídeo(s) • {entry.photo} foto(s) • {entry.count} registro(s)
                </p>
              </GlassPanel>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <GlassPanel className="p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Meta total</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">
                {stats.total} / {monthlyGoals.total}
              </p>
              <ProgressBar value={stats.total} max={monthlyGoals.total} />
            </GlassPanel>
            <GlassPanel className="p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Vídeo</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">
                {stats.video} / {monthlyGoals.video}
              </p>
              <ProgressBar value={stats.video} max={monthlyGoals.video} />
            </GlassPanel>
            <GlassPanel className="p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Foto</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">
                {stats.photo} / {monthlyGoals.photo}
              </p>
              <ProgressBar value={stats.photo} max={monthlyGoals.photo} />
            </GlassPanel>
          </div>

          <GlassPanel className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Histórico</p>
              <h2 className="text-xl font-semibold text-foreground">Lançamentos recentes</h2>
            </div>

            <div className="space-y-3">
              {sortedItems.length > 0 ? sortedItems.map((item) => {
                const madeBy = teamMembers.find((member) => member.id === item.madeById);
                const postedBy = teamMembers.find((member) => member.id === item.postedById);

                const status = getStoryStatus(item);

                return (
                  <div key={item.id} className={cardClass} data-cy={`stories-card-${item.id}`}>
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                            {formatLabel(item.mediaType)}
                          </span>
                          <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                            {formatStatusLabel(status)}
                          </span>
                          <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                            {formatDate(item.date)} · {item.time}
                          </span>
                          <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                            {item.quantity} stories
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{item.notes || "Sem observação"}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          data-cy={`stories-edit-${item.id}`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                          aria-label="Editar registro"
                        >
                          <PencilLine className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          data-cy={`stories-delete-${item.id}`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                          aria-label="Remover registro"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {madeBy ? <MemberChip name={madeBy.name} role={madeBy.role} color={madeBy.color} src={madeBy.avatarUrl} /> : null}
                      {postedBy ? <MemberChip name={postedBy.name} role={postedBy.role} color={postedBy.color} src={postedBy.avatarUrl} /> : null}
                    </div>
                  </div>
                );
              }) : (
                <EmptyState
                  title="Nenhum story registrado"
                  description="Clique em Adicionar para registrar o primeiro story. Quando houver registros no Supabase, eles aparecem aqui de forma compartilhada."
                />
              )}
            </div>
          </GlassPanel>
        </div>

        <GlassPanel className="space-y-4 self-start">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Film className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Resumo</p>
              <h2 className="text-xl font-semibold text-foreground">{summaryTitle}</h2>
            </div>
          </div>

          <div className={summaryBoxClass}>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">Total</span>
              <strong className="text-sm text-foreground">
                {stats.total} / {monthlyGoals.total}
              </strong>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">Vídeo</span>
              <strong className="text-sm text-foreground">
                {stats.video} / {monthlyGoals.video}
              </strong>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">Foto</span>
              <strong className="text-sm text-foreground">
                {stats.photo} / {monthlyGoals.photo}
              </strong>
            </div>
          </div>

          <div className={previewClass}>
            <p className="text-sm text-muted-foreground">Faltam</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{stats.remainingTotal} stories</p>
          </div>
        </GlassPanel>
      </div>

      {isCreateOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-md"
          onClick={closeModal}
        >
          <div
            className={modalClass}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-border/60 p-5 sm:p-6">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  {editingStoryId !== null ? "Editar registro" : "Novo registro"}
                </p>
                <h3 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                  {editingStoryId !== null ? "Editar stories do dia" : "Adicionar stories do dia"}
                </h3>
              </div>
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                {stats.remainingTotal} faltam
              </span>
            </div>

            <div className="grid gap-0 lg:grid-cols-[1fr_280px]">
              <div className="p-5 sm:p-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-foreground">Data</span>
                    <RoundedDatePicker
                      label="Data"
                      value={form.date}
                      onChange={(value) => setForm((previous) => ({ ...previous, date: value }))}
                      dataCy="stories-date"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-foreground">Hora</span>
                    <RoundedTimePicker
                      label="Hora"
                      value={form.time}
                      onChange={(value) => setForm((previous) => ({ ...previous, time: value }))}
                      dataCy="stories-time"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-foreground">Quantidade</span>
                    <input
                      type="number"
                      min="1"
                      value={form.quantity}
                      onChange={(event) => setForm((previous) => ({ ...previous, quantity: event.target.value }))}
                      data-cy="stories-quantity"
                      className="rounded-full border border-border/70 bg-background px-4 py-3 text-sm outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-foreground">Formato</span>
                    <RoundedDropdown
                      label="Formato"
                      value={form.mediaType}
                      options={[
                        { label: "Vídeo", value: "video" },
                        { label: "Foto", value: "photo" },
                      ]}
                      onChange={(value) => setForm((previous) => ({ ...previous, mediaType: value }))}
                      dataCy="stories-media-type"
                      optionDataCyPrefix="stories-media-type"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-foreground">Status</span>
                    <RoundedDropdown
                      label="Status"
                      value={form.status}
                      options={[
                        { label: "Agendado", value: "Agendado" },
                        { label: "Publicado", value: "Publicado" },
                        { label: "Rascunho", value: "Rascunho" },
                      ]}
                      onChange={(value) => setForm((previous) => ({ ...previous, status: value }))}
                      dataCy="stories-status"
                      optionDataCyPrefix="stories-status"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-foreground">Quem fez</span>
                    <RoundedDropdown
                      label="Quem fez"
                      value={form.madeById}
                      options={teamMembers.map((member) => ({
                        label: member.name,
                        value: member.id,
                        color: member.color,
                      }))}
                      onChange={(value) => setForm((previous) => ({ ...previous, madeById: value }))}
                      dataCy="stories-made-by"
                      optionDataCyPrefix="stories-made-by"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-foreground">Quem postou</span>
                    <RoundedDropdown
                      label="Quem postou"
                      value={form.postedById}
                      options={teamMembers.map((member) => ({
                        label: member.name,
                        value: member.id,
                        color: member.color,
                      }))}
                      onChange={(value) => setForm((previous) => ({ ...previous, postedById: value }))}
                      dataCy="stories-posted-by"
                      optionDataCyPrefix="stories-posted-by"
                    />
                  </label>

                  <label className="grid gap-2 md:col-span-2">
                    <span className="text-sm font-medium text-foreground">Observação</span>
                    <textarea
                      value={form.notes}
                      onChange={(event) => setForm((previous) => ({ ...previous, notes: event.target.value }))}
                      rows={4}
                      placeholder="Opcional"
                      data-cy="stories-notes"
                      className="rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                    />
                  </label>
                </div>

                <div className="mt-5 flex justify-end">
                  <ActionButton onClick={handleSave} dataCy="stories-save">
                    <Plus className="h-4 w-4" />
                    {editingStoryId !== null ? "Salvar alterações" : "Adicionar"}
                  </ActionButton>
                </div>
              </div>

              <div className="border-t border-border/60 bg-muted/20 p-5 sm:p-6 lg:border-l lg:border-t-0">
                <div className={previewClass}>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Prévia</p>
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-muted-foreground">Formato</span>
                      <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                        {form.mediaType === "video" ? "Vídeo" : "Foto"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-muted-foreground">Data</span>
                      <span className="text-sm font-medium text-foreground">{formatDate(form.date)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-muted-foreground">Hora</span>
                      <span className="text-sm font-medium text-foreground">{form.time || "--:--"}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-muted-foreground">Quantidade</span>
                      <span className="text-sm font-medium text-foreground">{form.quantity || "0"}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  data-cy="stories-close"
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-border/60 bg-background px-4 py-3 text-sm font-medium text-foreground transition hover:bg-muted/70"
                >
                  <X className="h-4 w-4" />
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </PageTransition>
  );
}
