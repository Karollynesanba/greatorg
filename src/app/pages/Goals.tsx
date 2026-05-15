import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, PencilLine, Plus, Users, X } from "lucide-react";
import { toast } from "sonner";
import { goals, getGoalResponsibleIds, historyTimeline, type Goal, type GoalChecklistItem, type HistoryEvent } from "../data/mockData";
import { useTeamProfiles } from "../data/profiles";
import { useSupabaseSyncedListState } from "../data/supabaseSync";
import { matchesTeamScope, useTeamScope } from "../data/teamScope";
import { buildGoalHistoryEvent, getGoalHistoryId, removeHistoryEvent, upsertHistoryEvent } from "../data/historyEvents";
import {
  ActionButton,
  ConfirmDialog,
  DeleteIconButton,
  GlassPanel,
  MemberChip,
  PageHeader,
  PageTransition,
  cn,
} from "../components/ui";
import { useThemeMode } from "../theme";

type GoalFormState = {
  name: string;
  category: string;
  description: string;
  target: string;
  current: string;
  period: string;
  deadline: string;
  deadlineTime: string;
  responsibleIds: number[];
  checklist: GoalChecklistItem[];
};

type TeamMemberCard = { id: number; name: string; role: string; color: string; avatarUrl: string };
type GoalView = "all" | "individual" | "group";

function createInitialGoalForm(teamMembers: TeamMemberCard[]): GoalFormState {
  return {
    name: "",
    category: "Alcance",
    description: "",
    target: "",
    current: "",
    period: "Mês",
    deadline: formatDateKey(new Date()),
    deadlineTime: "18:00",
    responsibleIds: teamMembers[0] ? [teamMembers[0].id] : [],
    checklist: [],
  };
}

function createChecklistItem(label: string): GoalChecklistItem {
  return {
    id: `goal-check-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    label,
    done: false,
  };
}

function pad(number: number) {
  return String(number).padStart(2, "0");
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseDateKey(value: string) {
  return value ? new Date(`${value}T12:00:00`) : null;
}

function formatDeadlineLabel(value: string) {
  const date = parseDateKey(value);

  if (!date) {
    return "Selecione o prazo";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDeadlineTimeLabel(value?: string) {
  if (!value) {
    return "Horário";
  }

  const [hour, minute] = value.split(":");
  if (!hour || !minute) {
    return "Horário";
  }

  return `${pad(Number(hour))}:${pad(Number(minute))}`;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function buildMonthGrid(date: Date) {
  const firstDay = startOfMonth(date);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - startOffset);
  gridStart.setHours(12, 0, 0, 0);

  return Array.from({ length: 42 }, (_, index) => {
    const nextDate = new Date(gridStart);
    nextDate.setDate(gridStart.getDate() + index);
    return nextDate;
  });
}

function formatMonthTitle(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(date);
}

function GoalDatePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(() => parseDateKey(value) ?? new Date());

  useEffect(() => {
    const nextDate = parseDateKey(value);
    if (nextDate) {
      setCursor(nextDate);
    }
  }, [value]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  const todayKey = formatDateKey(new Date());
  const selectedKey = value || todayKey;
  const monthGrid = buildMonthGrid(cursor);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition",
          "border-border/70 bg-background shadow-sm hover:border-primary/25 hover:shadow-md dark:bg-card/85",
        )}
      >
        <span className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <CalendarDays className="h-4 w-4" />
          </span>
          <span>
            <span className="block text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Prazo</span>
            <span className="block font-medium text-foreground">{value ? formatDeadlineLabel(value) : "Escolher data"}</span>
          </span>
        </span>
        <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition", open && "rotate-90")} />
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-3 w-[340px] overflow-hidden rounded-[1.5rem] border border-border/70 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.16)] dark:border-white/10 dark:bg-card/98">
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-4">
            <button
              type="button"
              onClick={() => setCursor((current) => addMonths(current, -1))}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground transition hover:bg-muted/80"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="text-center">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Selecionar prazo</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{formatMonthTitle(cursor)}</p>
            </div>
            <button
              type="button"
              onClick={() => setCursor((current) => addMonths(current, 1))}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground transition hover:bg-muted/80"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="px-4 pb-4 pt-3">
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {["S", "T", "Q", "Q", "S", "S", "D"].map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-7 gap-1">
              {monthGrid.map((date) => {
                const key = formatDateKey(date);
                const isCurrentMonth = date.getMonth() === cursor.getMonth();
                const isSelected = key === selectedKey;
                const isToday = key === todayKey;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      onChange(key);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex h-10 items-center justify-center rounded-full text-sm transition",
                      isSelected && "bg-primary text-primary-foreground shadow-lg shadow-primary/20",
                      !isSelected && isToday && "bg-primary/10 text-primary",
                      !isSelected && !isToday && isCurrentMonth && "text-foreground hover:bg-muted/80",
                      !isCurrentMonth && "text-muted-foreground/35",
                    )}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  onChange(formatDateKey(now));
                  setCursor(now);
                  setOpen(false);
                }}
                className="rounded-full border border-border/60 bg-muted/40 px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-muted/70"
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-border/60 bg-background px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:text-foreground dark:bg-card/80"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function GoalTimeInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-foreground">Horário limite</span>
      <input
        type="time"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/10 dark:bg-white/5"
      />
    </label>
  );
}

function GoalProgressBar({ progress, color }: { progress: number; color: string }) {
  const safeProgress = Math.min(Math.max(progress, 0), 100);

  return (
    <div className="h-3 overflow-hidden rounded-full bg-muted/70">
      <div
        className="h-full rounded-full transition-[width] duration-700 ease-out"
        style={{
          width: `${safeProgress}%`,
          background: `linear-gradient(90deg, ${color} 0%, ${color}CC 100%)`,
        }}
      />
    </div>
  );
}

function GoalAssigneeChips({
  members,
  selectedIds,
  onToggle,
}: {
  members: TeamMemberCard[];
  selectedIds: number[];
  onToggle: (id: number) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {members.map((member) => {
        const selected = selectedIds.includes(member.id);

        return (
          <button
            key={member.id}
            type="button"
            onClick={() => onToggle(member.id)}
            className={cn(
              "group flex items-center justify-between rounded-2xl px-3 py-3 text-left transition",
              selected ? "bg-primary/10 shadow-sm" : "bg-background hover:bg-primary/5 dark:bg-card/80",
            )}
          >
            <span className="flex items-center gap-3">
              <span
                className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl text-sm font-semibold text-white shadow-sm"
                style={{ backgroundColor: member.color }}
              >
                {member.avatarUrl ? (
                  <img src={member.avatarUrl} alt={member.name} className="h-full w-full object-cover" />
                ) : (
                  member.name.charAt(0)
                )}
              </span>
              <span>
                <span className="block text-sm font-semibold text-foreground">{member.name}</span>
                <span className="block text-xs text-muted-foreground">{member.role}</span>
              </span>
            </span>
            <span
              className={cn(
                "inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold transition",
                selected ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-transparent group-hover:bg-primary/10",
              )}
            >
              ✓
            </span>
          </button>
        );
      })}
    </div>
  );
}

function GoalMemberStack({
  members,
  color,
}: {
  members: TeamMemberCard[];
  color: string;
}) {
  const primary = members[0];
  const extraCount = Math.max(members.length - 1, 0);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {primary ? <MemberChip name={primary.name} role={primary.role} color={primary.color} src={primary.avatarUrl} /> : null}
      {extraCount > 0 ? (
        <span
          className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold"
          style={{ borderColor: `${color}2A`, color, backgroundColor: `${color}0D` }}
        >
          +{extraCount} pessoa{extraCount > 1 ? "s" : ""}
        </span>
      ) : null}
    </div>
  );
}

function getGoalView(goal: Goal) {
  return getGoalResponsibleIds(goal).length > 1 ? "group" : "individual";
}

export function GoalsPage() {
  const { isDark } = useThemeMode();
  const [teamMembers] = useTeamProfiles();
  const [items, setItems] = useSupabaseSyncedListState({ key: "goals", table: "goals", fallback: goals });
  const [, setHistoryEvents] = useSupabaseSyncedListState<HistoryEvent>({
    key: "history",
    table: "history_events",
    fallback: historyTimeline,
  });
  const [teamScope] = useTeamScope();
  const [goalView, setGoalView] = useState<GoalView>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ goalId: number; goalName: string } | null>(null);
  const [form, setForm] = useState<GoalFormState>(() => createInitialGoalForm(teamMembers));
  const [checklistDraft, setChecklistDraft] = useState("");
  const goalSeedMigrationAppliedRef = useRef(false);

  const teamCards = teamMembers as TeamMemberCard[];
  const editingGoal = useMemo(() => items.find((goal) => goal.id === editingGoalId) ?? null, [editingGoalId, items]);

  const formatValue = (value: number) => new Intl.NumberFormat("pt-BR").format(value);

  const stats = useMemo(() => {
    const total = items.length;
    const groupGoals = items.filter((goal) => getGoalResponsibleIds(goal).length > 1).length;
    const coverage = new Set(items.flatMap((goal) => getGoalResponsibleIds(goal))).size;
    const avgProgress =
      total === 0 ? 0 : items.reduce((sum, goal) => sum + (goal.current / Math.max(goal.target, 1)) * 100, 0) / total;

    return {
      total,
      groupGoals,
      coverage,
      avgProgress,
    };
  }, [items]);

  const filteredItems = useMemo(() => {
    const byScope = items.filter((goal) => getGoalResponsibleIds(goal).some((id) => matchesTeamScope(id, teamScope)));

    if (goalView === "all") {
      return byScope;
    }

    return byScope.filter((goal) => getGoalView(goal) === goalView);
  }, [goalView, items, teamScope]);

  useEffect(() => {
    if (!isCreateOpen) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeModal();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCreateOpen]);

  useEffect(() => {
    if (!isCreateOpen || !editingGoal) {
      return;
    }

    setForm({
      name: editingGoal.name,
      category: editingGoal.category,
      description: editingGoal.description,
      target: String(editingGoal.target),
      current: String(editingGoal.current),
      period: editingGoal.period,
      deadline: editingGoal.deadline,
      deadlineTime: editingGoal.deadlineTime ?? "18:00",
      responsibleIds: getGoalResponsibleIds(editingGoal),
      checklist: editingGoal.checklist ?? [],
    });
  }, [editingGoal, isCreateOpen]);

  useEffect(() => {
    if (goalSeedMigrationAppliedRef.current || items.length === 0) {
      return;
    }

    if (items.some((goal) => getGoalView(goal) === "group")) {
      goalSeedMigrationAppliedRef.current = true;
      return;
    }

    const legacyResponsibleMap = new Map<number, number[]>([
      [1, [1, 2]],
      [2, [2, 3]],
      [4, [1, 2, 3]],
    ]);

    const nextItems = items.map((goal) => {
      const nextResponsibleIds = legacyResponsibleMap
        .get(goal.id)
        ?.filter((memberId) => teamCards.some((member) => member.id === memberId));

      if (!nextResponsibleIds || nextResponsibleIds.length === 0) {
        return goal;
      }

      return {
        ...goal,
        responsibleId: nextResponsibleIds[0],
        responsibleIds: nextResponsibleIds,
      };
    });

    goalSeedMigrationAppliedRef.current = true;
    setItems(nextItems);
  }, [items, setItems, teamCards]);

  useEffect(() => {
    if (form.responsibleIds.length > 0) {
      return;
    }

    if (teamCards[0]) {
      setForm((previous) => ({ ...previous, responsibleIds: [teamCards[0].id] }));
    }
  }, [form.responsibleIds.length, teamCards]);

  function openCreateGoal() {
    setEditingGoalId(null);
    setForm(createInitialGoalForm(teamCards));
    setChecklistDraft("");
    setIsCreateOpen(true);
  }

  function openEditGoal(goalId: number) {
    const goal = items.find((item) => item.id === goalId);
    if (!goal) {
      return;
    }

    setEditingGoalId(goalId);
    setForm({
      name: goal.name,
      category: goal.category,
      description: goal.description,
      target: String(goal.target),
      current: String(goal.current),
      period: goal.period,
      deadline: goal.deadline,
      deadlineTime: goal.deadlineTime ?? "18:00",
      responsibleIds: getGoalResponsibleIds(goal),
      checklist: goal.checklist ?? [],
    });
    setChecklistDraft("");
    setIsCreateOpen(true);
  }

  function closeModal() {
    setIsCreateOpen(false);
    setEditingGoalId(null);
    setForm(createInitialGoalForm(teamCards));
    setChecklistDraft("");
  }

  const toggleResponsible = (memberId: number) => {
    setForm((previous) => {
      const hasMember = previous.responsibleIds.includes(memberId);
      const nextResponsibleIds = hasMember
        ? previous.responsibleIds.filter((id) => id !== memberId)
        : [...previous.responsibleIds, memberId];

      return {
        ...previous,
        responsibleIds: nextResponsibleIds,
      };
    });
  };

  const setQuickResponsibleCount = (count: number) => {
    const selectedIds = teamCards.slice(0, count).map((member) => member.id);
    setForm((previous) => ({
      ...previous,
      responsibleIds: selectedIds,
    }));
  };

  const addChecklistItem = (label: string) => {
    const normalizedLabel = label.trim();

    if (!normalizedLabel) {
      return;
    }

    setForm((previous) => ({
      ...previous,
      checklist: [...previous.checklist, createChecklistItem(normalizedLabel)],
    }));
  };

  const updateChecklistItem = (itemId: string, nextLabel: string) => {
    setForm((previous) => ({
      ...previous,
      checklist: previous.checklist.map((item) => (item.id === itemId ? { ...item, label: nextLabel } : item)),
    }));
  };

  const toggleChecklistItem = (itemId: string) => {
    setForm((previous) => ({
      ...previous,
      checklist: previous.checklist.map((item) => (item.id === itemId ? { ...item, done: !item.done } : item)),
    }));
  };

  const removeChecklistItem = (itemId: string) => {
    setForm((previous) => ({
      ...previous,
      checklist: previous.checklist.filter((item) => item.id !== itemId),
    }));
  };

  const handleSaveGoal = () => {
    const target = Number(form.target);
    const current = Number(form.current);
    const selectedResponsibleIds = form.responsibleIds.length > 0 ? form.responsibleIds : teamCards[0] ? [teamCards[0].id] : [];
    const uniqueResponsibleIds = selectedResponsibleIds.filter((value, index, array) => array.indexOf(value) === index);

    if (
      !form.name.trim() ||
      !form.description.trim() ||
      !form.deadline.trim() ||
      !form.deadlineTime.trim() ||
      Number.isNaN(target) ||
      Number.isNaN(current) ||
      !Number.isInteger(target) ||
      !Number.isInteger(current) ||
      target <= 0 ||
      current < 0 ||
      uniqueResponsibleIds.length === 0
    ) {
      toast.error("Preencha nome, responsáveis, descrição, data, horário, meta e atual com valores válidos.");
      return;
    }

    const goalPayload: Omit<Goal, "id"> = {
      name: form.name.trim(),
      category: form.category,
      responsibleId: uniqueResponsibleIds[0],
      responsibleIds: uniqueResponsibleIds,
      target,
      current,
      period: form.period,
      deadline: form.deadline,
      deadlineTime: form.deadlineTime,
      description: form.description.trim(),
      checklist: form.checklist.map((item) => ({ ...item, label: item.label.trim() })).filter((item) => item.label.length > 0),
    };

    if (editingGoalId !== null) {
      setItems((previous) => previous.map((goal) => (goal.id === editingGoalId ? { ...goal, ...goalPayload } : goal)));
      setHistoryEvents((previous) =>
        upsertHistoryEvent(
          previous,
          buildGoalHistoryEvent(
            { id: editingGoalId, ...goalPayload },
            teamCards.find((member) => member.id === uniqueResponsibleIds[0])?.name ?? "Equipe",
            "updated",
          ),
        ),
      );
      toast.success("Meta atualizada com sucesso.");
    } else {
      const nextGoalId = Math.max(...items.map((goal) => goal.id), 0) + 1;
      setItems((previous) => [
        {
          id: nextGoalId,
          ...goalPayload,
        },
        ...previous,
      ]);
      setHistoryEvents((previous) =>
        upsertHistoryEvent(
          previous,
          buildGoalHistoryEvent(
            { id: nextGoalId, ...goalPayload },
            teamCards.find((member) => member.id === uniqueResponsibleIds[0])?.name ?? "Equipe",
            "created",
          ),
        ),
      );
      toast.success("Meta criada com sucesso.");
    }

    closeModal();
  };

  const handleDeleteGoal = (goalId: number) => {
    const removedGoal = items.find((goal) => goal.id === goalId);

    if (!removedGoal) {
      return;
    }

    setItems((previous) => previous.filter((goal) => goal.id !== goalId));
    setHistoryEvents((previous) => removeHistoryEvent(previous, getGoalHistoryId(goalId)));
    setPendingDelete(null);
    toast.success("Meta apagada com sucesso.", {
      action: {
        label: "Desfazer",
        onClick: () => {
          setItems((previous) => {
            if (previous.some((goal) => goal.id === removedGoal.id)) {
              return previous;
            }

            return [removedGoal, ...previous];
          });
          setHistoryEvents((previous) =>
            upsertHistoryEvent(
              previous,
              buildGoalHistoryEvent(
                removedGoal,
                teamCards.find((member) => member.id === getGoalResponsibleIds(removedGoal)[0])?.name ?? "Equipe",
                "updated",
              ),
            ),
          );
        },
      },
    });
  };

  return (
    <PageTransition>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pb-8 sm:px-6 lg:px-8">
        <PageHeader
          eyebrow="Execution"
          title="Metas vivas e conectadas ao time"
          actions={
            <ActionButton onClick={openCreateGoal}>
              <Plus className="h-4 w-4" />
              Nova Meta
            </ActionButton>
          }
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <GlassPanel
            className="p-5"
            style={
              isDark
                ? undefined
                : {
                    background: "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(246,252,245,0.96))",
                    borderColor: "rgba(209,233,204,0.82)",
                    boxShadow: "0 18px 48px rgba(34,197,94,0.06)",
                  }
            }
          >
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Total de metas</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{stats.total}</p>
          </GlassPanel>
          <GlassPanel
            className="p-5"
            style={
              isDark
                ? undefined
                : {
                    background: "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(246,252,245,0.96))",
                    borderColor: "rgba(209,233,204,0.82)",
                    boxShadow: "0 18px 48px rgba(34,197,94,0.06)",
                  }
            }
          >
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Metas em grupo</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{stats.groupGoals}</p>
          </GlassPanel>
          <GlassPanel
            className="p-5"
            style={
              isDark
                ? undefined
                : {
                    background: "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(246,252,245,0.96))",
                    borderColor: "rgba(209,233,204,0.82)",
                    boxShadow: "0 18px 48px rgba(34,197,94,0.06)",
                  }
            }
          >
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Pessoas envolvidas</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{stats.coverage}</p>
          </GlassPanel>
          <GlassPanel
            className="p-5"
            style={
              isDark
                ? undefined
                : {
                    background: "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(251,251,253,0.96))",
                    borderColor: "rgba(229,231,238,0.82)",
                    boxShadow: "0 18px 48px rgba(15,23,42,0.08)",
                  }
            }
          >
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Progresso médio</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{stats.avgProgress.toFixed(0)}%</p>
          </GlassPanel>
        </div>

        <GlassPanel
          className="border-emerald-200/60 bg-white/80 p-4 shadow-[0_14px_40px_rgba(34,197,94,0.06)]"
          style={
            isDark
              ? undefined
              : {
                  background: "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(246,252,245,0.96))",
                  borderColor: "rgba(209,233,204,0.82)",
                  boxShadow: "0 16px 42px rgba(34,197,94,0.06)",
                }
          }
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Tipos de metas</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { key: "all" as GoalView, label: "Todas", value: items.length },
                { key: "individual" as GoalView, label: "Individuais", value: items.filter((goal) => getGoalView(goal) === "individual").length },
                { key: "group" as GoalView, label: "Em grupo", value: items.filter((goal) => getGoalView(goal) === "group").length },
              ].map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setGoalView(option.key)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition",
                    goalView === option.key
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                      : "border border-border/60 bg-background text-muted-foreground hover:border-primary/20 hover:text-foreground",
                  )}
                >
                  {option.label}
                  <span
                    className={cn(
                      "inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold",
                      goalView === option.key ? "bg-white/15 text-white" : "bg-muted text-foreground",
                    )}
                  >
                    {option.value}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </GlassPanel>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredItems.map((goal, index) => {
            const assigneeIds = getGoalResponsibleIds(goal);
            const assignees = teamCards.filter((item) => assigneeIds.includes(item.id));
            const primaryMember = assignees[0] ?? teamCards[0];
            const checklistTotal = goal.checklist?.length ?? 0;
            const checklistDone = goal.checklist?.filter((item) => item.done).length ?? 0;
            const checklistProgress = checklistTotal > 0 ? (checklistDone / checklistTotal) * 100 : null;
            const progress = checklistProgress ?? (goal.current / goal.target) * 100;
            const progressDone = Math.min(Math.max(progress, 0), 100);
            const progressLeft = Math.max(0, 100 - progressDone);
            const statusText = `${progressDone.toFixed(0)}% feito · ${progressLeft.toFixed(0)}% faltam`;
            const deadline = parseDateKey(goal.deadline);
            const deadlineLabel = deadline
              ? `${new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(deadline)}${goal.deadlineTime ? ` • ${formatDeadlineTimeLabel(goal.deadlineTime)}` : ""}`
              : "Sem data";
            const isGroupGoal = assigneeIds.length > 1;
            const accentColor = isGroupGoal ? null : (primaryMember?.color ?? "#e50914");
            const progressColor = accentColor ?? "#94a3b8";

            return (
              <div
                key={goal.id}
                role="button"
                tabIndex={0}
                onClick={() => openEditGoal(goal.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openEditGoal(goal.id);
                  }
                }}
                className="group relative h-full cursor-pointer transition hover:-translate-y-0.5"
              >
                <GlassPanel
                  index={index + 1}
                  className="overflow-hidden p-6"
                  style={{
                    background:
                      isGroupGoal
                        ? isDark
                          ? "linear-gradient(180deg, rgba(24,24,26,0.98), rgba(16,16,18,0.96))"
                          : "linear-gradient(180deg, rgba(255,255,255,0.99), rgba(250,250,250,0.96))"
                        : isDark
                          ? "linear-gradient(180deg, rgba(24,24,26,0.98), rgba(16,16,18,0.96))"
                          : "linear-gradient(180deg, rgba(255,255,255,0.99), rgba(250,250,250,0.96))",
                    borderColor: isGroupGoal
                      ? isDark
                        ? "rgba(255,255,255,0.06)"
                        : "rgba(229,231,238,0.82)"
                      : isDark
                        ? `${accentColor}22`
                        : "rgba(229,231,238,0.82)",
                    boxShadow: isGroupGoal
                      ? isDark
                        ? "0 14px 28px rgba(15,23,42,0.18)"
                        : "0 18px 48px rgba(15,23,42,0.08)"
                      : isDark
                        ? `0 14px 28px ${accentColor}0d`
                        : "0 18px 48px rgba(15,23,42,0.08)",
                    borderLeftWidth: isGroupGoal ? "0px" : "4px",
                    borderLeftColor: accentColor ?? "transparent",
                  }}
                >
                <div className="absolute right-4 top-4 z-10 flex gap-2 opacity-0 transition group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      openEditGoal(goal.id);
                    }}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-white text-muted-foreground shadow-sm transition hover:border-primary/25 hover:text-foreground dark:border-white/8 dark:bg-card/90"
                    aria-label="Editar meta"
                    title="Editar meta"
                  >
                    <PencilLine className="h-4 w-4" />
                  </button>
                  <div
                    onClick={(event) => {
                      event.stopPropagation();
                    }}
                  >
                    <DeleteIconButton onClick={() => setPendingDelete({ goalId: goal.id, goalName: goal.name })} />
                  </div>
                </div>

                  <div className="flex h-full flex-col gap-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 space-y-3">
                      <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{goal.name}</h2>
                      {assignees.length > 0 ? (
                        <GoalMemberStack members={assignees} color={primaryMember?.color ?? "#e50914"} />
                      ) : null}
                    </div>

                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-border/60 bg-muted/35 p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Meta de visualizações</p>
                      <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{formatValue(goal.current)}</p>
                      <p className="mt-1 text-sm text-muted-foreground">de {formatValue(goal.target)}</p>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-muted/35 p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Prazo</p>
                      <p className="mt-2 text-base font-semibold text-foreground">
                        {deadlineLabel}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {goal.period} {isGroupGoal ? " - meta compartilhada" : " - meta individual"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <GoalProgressBar progress={progressDone} color={progressColor} />
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium text-foreground">{statusText}</span>
                      <span className="text-muted-foreground">{goal.period}</span>
                    </div>
                  </div>
                </div>
                </GlassPanel>
              </div>
            );
          })}
        </div>

        {isCreateOpen ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 backdrop-blur-md sm:p-4"
            onClick={closeModal}
          >
            <div
            className="w-full max-w-[min(94vw,920px)] max-h-[calc(100vh-24px)] overflow-y-auto overscroll-contain rounded-[2.5rem] border border-border/60 bg-white shadow-[0_34px_110px_rgba(15,23,42,0.24)] dark:border-white/8 dark:bg-card/98 sm:max-h-[calc(100vh-32px)] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="block">
                <div className="p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                        Nova Meta
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={closeModal}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground transition hover:bg-muted/80 hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <label className="grid gap-2 md:col-span-2">
                      <span className="text-sm font-medium text-foreground">Nome da meta</span>
                      <input
                        value={form.name}
                        onChange={(event) => setForm((previous) => ({ ...previous, name: event.target.value }))}
                        placeholder="Ex.: Lançar 12 reels no mês"
                        className="rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/10 dark:bg-white/5"
                      />
                    </label>

                    <label className="grid gap-2">
                      <span className="text-sm font-medium text-foreground">Categoria</span>
                      <input
                        value={form.category}
                        onChange={(event) => setForm((previous) => ({ ...previous, category: event.target.value }))}
                        className="rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/10 dark:bg-white/5"
                      />
                    </label>

                    <label className="grid gap-2">
                      <span className="text-sm font-medium text-foreground">Período</span>
                      <select
                        value={form.period}
                        onChange={(event) => setForm((previous) => ({ ...previous, period: event.target.value }))}
                        className="rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/10 dark:bg-white/5"
                      >
                        <option value="Semana">Semana</option>
                        <option value="Mês">Mês</option>
                        <option value="Trimestre">Trimestre</option>
                        <option value="Ano">Ano</option>
                      </select>
                    </label>

                    <div className="md:col-span-2">
                      <span className="mb-2 block text-sm font-medium text-foreground">Responsáveis</span>
                      <div className="rounded-[2.25rem] border border-border/70 bg-muted/20 p-4">
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-foreground">Selecione uma ou várias pessoas</p>
                            <p className="text-xs text-muted-foreground">
                              A meta pode ser individual ou compartilhada por 2 ou 3 pessoas.
                            </p>
                          </div>
                          <span className="inline-flex items-center gap-2 rounded-full bg-background px-3 py-1 text-xs font-semibold text-muted-foreground shadow-sm dark:bg-card/80">
                            <Users className="h-3.5 w-3.5" />
                            {form.responsibleIds.length} selecionado{form.responsibleIds.length === 1 ? "" : "s"}
                          </span>
                        </div>
                        <div className="mb-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setQuickResponsibleCount(1)}
                            className={cn(
                              "rounded-full border px-3 py-2 text-xs font-semibold transition",
                              form.responsibleIds.length === 1
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border/60 bg-background text-foreground hover:border-primary/25 hover:bg-primary/5",
                            )}
                          >
                            1 pessoa
                          </button>
                          <button
                            type="button"
                            onClick={() => setQuickResponsibleCount(2)}
                            className={cn(
                              "rounded-full border px-3 py-2 text-xs font-semibold transition",
                              form.responsibleIds.length === 2
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border/60 bg-background text-foreground hover:border-primary/25 hover:bg-primary/5",
                            )}
                          >
                            2 pessoas
                          </button>
                          <button
                            type="button"
                            onClick={() => setQuickResponsibleCount(3)}
                            className={cn(
                              "rounded-full border px-3 py-2 text-xs font-semibold transition",
                              form.responsibleIds.length >= 3
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border/60 bg-background text-foreground hover:border-primary/25 hover:bg-primary/5",
                            )}
                          >
                            3 pessoas
                          </button>
                          <button
                            type="button"
                            onClick={() => setForm((previous) => ({ ...previous, responsibleIds: [] }))}
                            className="rounded-full border border-border/60 bg-background px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:border-primary/20 hover:text-foreground"
                          >
                            Limpar
                          </button>
                        </div>
                        <GoalAssigneeChips members={teamCards} selectedIds={form.responsibleIds} onToggle={toggleResponsible} />
                      </div>
                      {form.responsibleIds.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {teamCards
                            .filter((member) => form.responsibleIds.includes(member.id))
                            .map((member) => (
                              <button
                                key={member.id}
                                type="button"
                                onClick={() => toggleResponsible(member.id)}
                                className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-rose-50 dark:bg-card/80 dark:hover:bg-white/5"
                              >
                                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: member.color }} />
                                {member.name}
                                <X className="h-3 w-3 text-muted-foreground" />
                              </button>
                            ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="md:col-span-2">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div>
                          <span className="block text-sm font-medium text-foreground">Data limite</span>
                        </div>
                      </div>
                      <div className="grid gap-3 md:grid-cols-[1.3fr_0.7fr]">
                        <GoalDatePicker
                          value={form.deadline}
                          onChange={(value) => setForm((previous) => ({ ...previous, deadline: value }))}
                        />
                        <GoalTimeInput
                          value={form.deadlineTime}
                          onChange={(value) => setForm((previous) => ({ ...previous, deadlineTime: value }))}
                        />
                      </div>
                    </div>

                    <label className="grid gap-2">
                      <span className="text-sm font-medium text-foreground">Meta</span>
                      <input
                        value={form.target}
                        onChange={(event) => setForm((previous) => ({ ...previous, target: event.target.value }))}
                        inputMode="numeric"
                        placeholder="Ex.: 120000"
                        className="rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/10 dark:bg-white/5"
                      />
                    </label>

                    <label className="grid gap-2">
                      <span className="text-sm font-medium text-foreground">Atual</span>
                      <input
                        value={form.current}
                        onChange={(event) => setForm((previous) => ({ ...previous, current: event.target.value }))}
                        inputMode="numeric"
                        placeholder="Ex.: 84500"
                        className="rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/10 dark:bg-white/5"
                      />
                    </label>

                    <label className="grid gap-2 md:col-span-2">
                      <span className="text-sm font-medium text-foreground">Descrição</span>
                      <textarea
                        value={form.description}
                        onChange={(event) => setForm((previous) => ({ ...previous, description: event.target.value }))}
                        rows={5}
                        placeholder="Explique o objetivo, o contexto e o que precisa acontecer para a meta ser concluída."
                        className="rounded-[1.5rem] border border-border/70 bg-background px-4 py-3 text-sm outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/10 dark:bg-white/5"
                      />
                    </label>

                    <div className="grid gap-3 md:col-span-2">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <span className="text-sm font-medium text-foreground">Checklist da meta</span>
                        </div>
                        <span className="rounded-full bg-muted/50 px-3 py-1 text-xs font-semibold text-muted-foreground">
                          {form.checklist.filter((item) => item.done).length}/{form.checklist.length || 0} concluídas
                        </span>
                      </div>

                      <div className="flex flex-col gap-2 rounded-[1.5rem] border border-border/70 bg-background p-3 sm:flex-row">
                        <input
                          value={checklistDraft}
                          onChange={(event) => setChecklistDraft(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              addChecklistItem(checklistDraft);
                              setChecklistDraft("");
                            }
                          }}
                          placeholder="Ex.: Escrever roteiro da etapa 1"
                          className="min-w-0 flex-1 rounded-2xl border border-border/70 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/10 dark:bg-white/5"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            addChecklistItem(checklistDraft);
                            setChecklistDraft("");
                          }}
                          className="inline-flex items-center justify-center rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
                        >
                          Adicionar item
                        </button>
                      </div>

                      {form.checklist.length > 0 ? (
                        <div className="space-y-2">
                          {form.checklist.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center gap-3 rounded-[1.35rem] border border-border/60 bg-white p-3 shadow-sm dark:bg-card/80"
                            >
                              <button
                                type="button"
                                onClick={() => toggleChecklistItem(item.id)}
                                className={cn(
                                  "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition",
                                  item.done
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-border/60 bg-background text-transparent hover:border-primary/30",
                                )}
                                aria-label={item.done ? "Desmarcar item" : "Marcar item"}
                              >
                                ✓
                              </button>
                              <input
                                value={item.label}
                                onChange={(event) => updateChecklistItem(item.id, event.target.value)}
                                className={cn(
                                  "min-w-0 flex-1 bg-transparent text-sm outline-none",
                                  item.done && "text-muted-foreground line-through",
                                )}
                              />
                              <button
                                type="button"
                                onClick={() => removeChecklistItem(item.id)}
                                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
                                aria-label="Remover item"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                  <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-border/60 pt-5">
                    <ActionButton variant="secondary" onClick={closeModal}>
                      Cancelar
                    </ActionButton>
                    <ActionButton onClick={handleSaveGoal}>
                      <Plus className="h-4 w-4" />
                      {editingGoalId !== null ? "Salvar alterações" : "Criar meta"}
                    </ActionButton>
                  </div>
                </div>
              </div>
            </div>
        ) : null}

        {pendingDelete ? (
          <ConfirmDialog
            title="Tem certeza que deseja apagar?"
            description={`A meta "${pendingDelete.goalName}" será removida e não poderá ser desfeita.`}
            onCancel={() => setPendingDelete(null)}
            onConfirm={() => handleDeleteGoal(pendingDelete.goalId)}
          />
        ) : null}
      </div>
    </PageTransition>
  );
}

