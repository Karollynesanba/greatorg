import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, PencilLine, Plus, Target, Users, X } from "lucide-react";
import { toast } from "sonner";
import { goals, getGoalResponsibleIds, type Goal } from "../data/mockData";
import { useTeamProfiles } from "../data/profiles";
import { useSupabaseSyncedListState } from "../data/supabaseSync";
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
  responsibleIds: number[];
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
    deadline: "",
    responsibleIds: teamMembers[0] ? [teamMembers[0].id] : [],
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
                      !isSelected && isToday && "border border-primary/30 bg-primary/8 text-primary",
                      !isSelected && !isToday && isCurrentMonth && "text-foreground hover:bg-muted",
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

function GoalProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const progress = max === 0 ? 0 : (value / max) * 100;

  return (
    <div className="h-3 overflow-hidden rounded-full bg-muted/70">
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
              "group flex items-center justify-between rounded-2xl border px-3 py-3 text-left transition",
              selected
                ? "border-primary/25 bg-primary/5 shadow-sm"
                : "border-border/70 bg-background hover:border-primary/25 hover:bg-primary/5 dark:bg-card/80",
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
                "inline-flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-bold transition",
                selected
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border/60 text-transparent group-hover:border-primary/35",
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
  const [goalView, setGoalView] = useState<GoalView>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ goalId: number; goalName: string } | null>(null);
  const [form, setForm] = useState<GoalFormState>(() => createInitialGoalForm(teamMembers));
  const migratedGoalsRef = useRef(false);

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
    if (goalView === "all") {
      return items;
    }

    return items.filter((goal) => getGoalView(goal) === goalView);
  }, [goalView, items]);

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
      responsibleIds: getGoalResponsibleIds(editingGoal),
    });
  }, [editingGoal, isCreateOpen]);

  useEffect(() => {
    if (migratedGoalsRef.current || teamCards.length < 2 || items.length === 0) {
      return;
    }

    if (items.some((goal) => getGoalView(goal) === "group")) {
      migratedGoalsRef.current = true;
      return;
    }

    const nextItems = items.map((goal, index) => {
      if (index === 0) {
        return {
          ...goal,
          responsibleId: teamCards[0].id,
          responsibleIds: [teamCards[0].id, teamCards[1].id],
        };
      }

      if (index === 1 && teamCards[2]) {
        return {
          ...goal,
          responsibleId: teamCards[1].id,
          responsibleIds: [teamCards[1].id, teamCards[2].id],
        };
      }

      if (index === 4) {
        return {
          ...goal,
          responsibleId: teamCards[1].id,
          responsibleIds: teamCards.map((member) => member.id),
        };
      }

      return goal;
    });

    migratedGoalsRef.current = true;
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
      responsibleIds: getGoalResponsibleIds(goal),
    });
    setIsCreateOpen(true);
  }

  function closeModal() {
    setIsCreateOpen(false);
    setEditingGoalId(null);
    setForm(createInitialGoalForm(teamCards));
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

  const handleSaveGoal = () => {
    const target = Number(form.target);
    const current = Number(form.current);
    const selectedResponsibleIds = form.responsibleIds.length > 0 ? form.responsibleIds : teamCards[0] ? [teamCards[0].id] : [];

    if (
      !form.name.trim() ||
      !form.description.trim() ||
      !form.deadline.trim() ||
      Number.isNaN(target) ||
      Number.isNaN(current) ||
      selectedResponsibleIds.length === 0
    ) {
      toast.error("Preencha nome, responsáveis, descrição, data, meta e atual.");
      return;
    }

    const goalPayload: Omit<Goal, "id"> = {
      name: form.name.trim(),
      category: form.category,
      responsibleId: selectedResponsibleIds[0],
      responsibleIds: selectedResponsibleIds,
      target,
      current,
      period: form.period,
      deadline: form.deadline,
      description: form.description.trim(),
    };

    if (editingGoalId !== null) {
      setItems((previous) => previous.map((goal) => (goal.id === editingGoalId ? { ...goal, ...goalPayload } : goal)));
      toast.success("Meta atualizada com sucesso.");
    } else {
      setItems((previous) => [
        {
          id: Math.max(...previous.map((goal) => goal.id), 0) + 1,
          ...goalPayload,
        },
        ...previous,
      ]);
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
          description="Crie metas individuais ou em grupo, distribua responsáveis e escolha o prazo com um calendário visual."
          actions={
            <ActionButton onClick={openCreateGoal}>
              <Plus className="h-4 w-4" />
              Nova Meta
            </ActionButton>
          }
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <GlassPanel className="p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Total de metas</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{stats.total}</p>
          </GlassPanel>
          <GlassPanel className="p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Metas em grupo</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{stats.groupGoals}</p>
          </GlassPanel>
          <GlassPanel className="p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Pessoas envolvidas</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{stats.coverage}</p>
          </GlassPanel>
          <GlassPanel className="p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Progresso médio</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{stats.avgProgress.toFixed(0)}%</p>
          </GlassPanel>
        </div>

        <GlassPanel className="border-primary/10 bg-white/80 p-4 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Tipos de metas</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Filtre a lista para ver só metas individuais, só metas em grupo ou tudo junto.
              </p>
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
            const progress = (goal.current / goal.target) * 100;
            const remaining = Math.max(goal.target - goal.current, 0);
            const statusText = progress >= 100 ? "Meta atingida" : `Faltam ${formatValue(remaining)} para concluir`;
            const deadline = parseDateKey(goal.deadline);
            const isGroupGoal = assigneeIds.length > 1;

            return (
              <GlassPanel
                key={goal.id}
                index={index + 1}
                className="group relative h-full overflow-hidden p-6"
                style={{
                  background: isDark
                    ? "linear-gradient(180deg, rgba(24,24,26,0.98), rgba(16,16,18,0.96))"
                    : "linear-gradient(180deg, rgba(255,255,255,0.99), rgba(250,250,250,0.96))",
                  borderColor: `${primaryMember?.color ?? "#e50914"}22`,
                  boxShadow: `0 14px 28px ${primaryMember?.color ?? "#e50914"}0d`,
                  borderLeftWidth: "4px",
                  borderLeftColor: primaryMember?.color ?? "#e50914",
                }}
              >
                <div className="absolute right-4 top-4 z-10 flex gap-2 opacity-0 transition group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => openEditGoal(goal.id)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-white text-muted-foreground shadow-sm transition hover:border-primary/25 hover:text-foreground dark:border-white/8 dark:bg-card/90"
                    aria-label="Editar meta"
                    title="Editar meta"
                  >
                    <PencilLine className="h-4 w-4" />
                  </button>
                  <DeleteIconButton onClick={() => setPendingDelete({ goalId: goal.id, goalName: goal.name })} />
                </div>

                <div className="flex h-full flex-col gap-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{goal.name}</h2>
                        <span
                          className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]"
                          style={{
                            backgroundColor: `${primaryMember?.color ?? "#e50914"}12`,
                            color: primaryMember?.color ?? "#e50914",
                          }}
                        >
                          {goal.category}
                        </span>
                        <span
                          className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]"
                          style={{
                            backgroundColor: isGroupGoal ? `${primaryMember?.color ?? "#e50914"}12` : "rgba(148,163,184,0.16)",
                            color: primaryMember?.color ?? "#e50914",
                          }}
                        >
                          {isGroupGoal ? `Grupo com ${assignees.length}` : "Individual"}
                        </span>
                      </div>
                      {assignees.length > 0 ? (
                        <GoalMemberStack members={assignees} color={primaryMember?.color ?? "#e50914"} />
                      ) : null}
                    </div>

                    <div
                      className="rounded-full px-3 py-1.5 text-sm font-semibold"
                      style={{
                        backgroundColor: progress >= 100 ? `${primaryMember?.color ?? "#e50914"}12` : `${primaryMember?.color ?? "#e50914"}08`,
                        color: primaryMember?.color ?? "#e50914",
                      }}
                    >
                      {progress.toFixed(0)}%
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-border/60 bg-muted/35 p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Atual</p>
                      <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{formatValue(goal.current)}</p>
                      <p className="mt-1 text-sm text-muted-foreground">de {formatValue(goal.target)}</p>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-muted/35 p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Prazo</p>
                      <p className="mt-2 text-base font-semibold text-foreground">
                        {deadline
                          ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(deadline)
                          : "Sem data"}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {goal.period} {isGroupGoal ? " - meta compartilhada" : " - meta individual"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <GoalProgressBar value={goal.current} max={goal.target} color={primaryMember?.color ?? "#e50914"} />
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium text-foreground">{statusText}</span>
                      <span className="text-muted-foreground">{goal.period}</span>
                    </div>
                  </div>
                </div>
              </GlassPanel>
            );
          })}
        </div>

        {isCreateOpen ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-md"
            onClick={closeModal}
          >
            <div
              className="w-full max-w-5xl overflow-hidden rounded-[2rem] border border-border/60 bg-white shadow-[0_30px_100px_rgba(15,23,42,0.22)] dark:border-white/8 dark:bg-card/98"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="grid lg:grid-cols-[1.2fr_0.8fr]">
                <div className="p-6 sm:p-7">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        {editingGoalId !== null ? "Editar Meta" : "Nova Meta"}
                      </p>
                      <h3 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
                        {editingGoalId !== null ? "Editar meta completa" : "Criar meta completa"}
                      </h3>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                        Defina uma meta individual ou em grupo, distribua responsáveis e escolha o prazo em um calendário visual.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={closeModal}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground transition hover:bg-muted/80 hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-6 grid gap-5 md:grid-cols-2">
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
                      <div className="rounded-[1.5rem] border border-border/70 bg-muted/20 p-4">
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-foreground">Selecione uma ou várias pessoas</p>
                            <p className="text-xs text-muted-foreground">A meta pode ser individual ou compartilhada por todo o time.</p>
                          </div>
                          <span className="inline-flex items-center gap-2 rounded-full bg-background px-3 py-1 text-xs font-semibold text-muted-foreground shadow-sm dark:bg-card/80">
                            <Users className="h-3.5 w-3.5" />
                            {form.responsibleIds.length} selecionado{form.responsibleIds.length === 1 ? "" : "s"}
                          </span>
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
                      <GoalDatePicker
                        value={form.deadline}
                        onChange={(value) => setForm((previous) => ({ ...previous, deadline: value }))}
                      />
                    </div>

                    <label className="grid gap-2">
                      <span className="text-sm font-medium text-foreground">Meta</span>
                      <input
                        value={form.target}
                        onChange={(event) => setForm((previous) => ({ ...previous, target: event.target.value }))}
                        inputMode="decimal"
                        placeholder="Ex.: 120000"
                        className="rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/10 dark:bg-white/5"
                      />
                    </label>

                    <label className="grid gap-2">
                      <span className="text-sm font-medium text-foreground">Atual</span>
                      <input
                        value={form.current}
                        onChange={(event) => setForm((previous) => ({ ...previous, current: event.target.value }))}
                        inputMode="decimal"
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
                  </div>
                </div>

                <div className="border-t border-border/60 bg-gradient-to-b from-primary/5 to-transparent p-6 sm:p-7 lg:border-l lg:border-t-0">
                  <div className="rounded-[1.75rem] border border-border/60 bg-white p-5 shadow-sm dark:bg-card/90">
                    <div className="flex items-center gap-3">
                      <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Target className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Pré-visualização</p>
                        <p className="mt-1 text-lg font-semibold text-foreground">{form.name || "Sua nova meta"}</p>
                      </div>
                    </div>

                    <div className="mt-5 space-y-3 rounded-[1.5rem] bg-muted/35 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm text-muted-foreground">Responsáveis</span>
                        <span className="text-sm font-semibold text-foreground">{form.responsibleIds.length}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {teamCards
                          .filter((member) => form.responsibleIds.includes(member.id))
                          .map((member) => (
                            <span
                              key={member.id}
                              className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold"
                              style={{ backgroundColor: `${member.color}14`, color: member.color }}
                            >
                              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: member.color }} />
                              {member.name}
                            </span>
                          ))}
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm text-muted-foreground">Prazo</span>
                        <span className="text-sm font-semibold text-foreground">
                          {form.deadline ? formatDeadlineLabel(form.deadline) : "Sem data"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Meta</p>
                        <p className="mt-2 text-lg font-semibold text-foreground">{form.target || "0"}</p>
                      </div>
                      <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Atual</p>
                        <p className="mt-2 text-lg font-semibold text-foreground">{form.current || "0"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 rounded-[1.75rem] border border-dashed border-border/60 bg-background/70 p-4 text-sm leading-6 text-muted-foreground dark:bg-white/5">
                    Dica: metas em grupo funcionam melhor quando você divide o objetivo por etapa, seleciona todos os responsáveis e define um prazo visual.
                  </div>

                  <div className="mt-6 flex flex-wrap justify-end gap-3">
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
