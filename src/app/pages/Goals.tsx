import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Eye,
  Info,
  Flag,
  MoreVertical,
  PencilLine,
  Plus,
  Target,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { getGoalResponsibleIds, type Goal, type GoalChecklistItem, type GoalValueEntry } from "../data/mockData";
import { useTeamProfiles } from "../data/profiles";
import { useSupabaseGoalsState } from "../data/goalsRepository";
import { matchesTeamScope, useTeamScope } from "../data/teamScope";
import {
  ActionButton,
  ConfirmDialog,
  DeleteIconButton,
  GlassPanel,
  MemberChip,
  PageHeader,
  PageTransition,
  RoundedDropdown,
  cn,
} from "../components/ui";
import { useThemeMode } from "../theme";

type GoalFormState = {
  name: string;
  category: string;
  status: "Em andamento" | "Concluída" | "Atrasada" | "Pausada";
  priority: "Alta" | "Média" | "Baixa";
  description: string;
  notes: string;
  target: string;
  period: string;
  deadline: string;
  deadlineTime: string;
  responsibleIds: number[];
  checklist: GoalChecklistItem[];
};

type TeamMemberCard = { id: number; name: string; role: string; color: string; avatarUrl: string };
type GoalView = "all" | "individual" | "group";
type GoalModalMode = "detail" | "form";

const goalModalFieldClass =
  "rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none shadow-sm transition duration-200 hover:border-slate-300 hover:shadow-[0_10px_24px_rgba(15,23,42,0.04)] focus:border-primary focus:ring-4 focus:ring-primary/10";

const goalModalShellClass =
  "w-full max-w-[min(96vw,940px)] max-h-[calc(100vh-24px)] overflow-y-auto overscroll-contain rounded-[2.5rem] border border-slate-200 bg-[#fbfbfd] text-slate-900 shadow-[0_34px_110px_rgba(15,23,42,0.18)] sm:max-h-[calc(100vh-32px)] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

const goalSectionCardClass =
  "rounded-[2rem] border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.06)]";

const goalBadgeClass =
  "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset";

const goalStatusOptions = [
  { label: "Em andamento", value: "Em andamento" as const, color: "#3B82F6" },
  { label: "Concluída", value: "Concluída" as const, color: "#22C55E" },
  { label: "Atrasada", value: "Atrasada" as const, color: "#EF4444" },
  { label: "Pausada", value: "Pausada" as const, color: "#EAB308" },
];

const goalPriorityOptions = [
  { label: "Alta", value: "Alta" as const, color: "#EF4444" },
  { label: "Média", value: "Média" as const, color: "#F59E0B" },
  { label: "Baixa", value: "Baixa" as const, color: "#22C55E" },
];

function createInitialGoalForm(teamMembers: TeamMemberCard[]): GoalFormState {
  return {
    name: "",
    category: "Alcance",
    status: "Em andamento",
    priority: "Média",
    description: "",
    notes: "",
    target: "",
    period: "Mês",
    deadline: formatDateKey(new Date()),
    deadlineTime: "18:00",
    responsibleIds: teamMembers[0] ? [teamMembers[0].id] : [],
    checklist: [],
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
          "flex w-full items-center justify-between gap-3 rounded-[1.5rem] border px-4 py-3.5 text-left text-sm transition duration-200",
          "border-slate-200 bg-white text-slate-900 shadow-sm hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_12px_28px_rgba(15,23,42,0.06)]",
        )}
      >
        <span className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm">
            <CalendarDays className="h-4 w-4" />
          </span>
          <span>
            <span className="block text-[11px] uppercase tracking-[0.16em] text-slate-500">Prazo</span>
            <span className="block font-semibold text-slate-900">{value ? formatDeadlineLabel(value) : "Escolher data"}</span>
          </span>
        </span>
        <ChevronRight className={cn("h-4 w-4 text-slate-400 transition", open && "rotate-90")} />
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-3 w-[340px] overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.14)]">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
            <button
              type="button"
              onClick={() => setCursor((current) => addMonths(current, -1))}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="text-center">
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Selecionar prazo</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{formatMonthTitle(cursor)}</p>
            </div>
            <button
              type="button"
              onClick={() => setCursor((current) => addMonths(current, 1))}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="px-4 pb-4 pt-3">
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
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
                    !isSelected && !isToday && isCurrentMonth && "text-slate-700 hover:bg-slate-100",
                    !isCurrentMonth && "text-slate-400/50",
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
                className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
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
      <span className="text-sm font-medium text-slate-700">Horário limite</span>
      <input
        type="time"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={goalModalFieldClass}
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
              "group flex items-center justify-between rounded-[1.5rem] border px-3 py-3 text-left transition duration-200",
              selected
                ? "border-primary/25 bg-primary/5 shadow-[0_12px_30px_rgba(59,130,246,0.08)]"
                : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_12px_24px_rgba(15,23,42,0.05)]",
            )}
          >
            <span className="flex items-center gap-3">
              <span
                className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl text-sm font-semibold text-white shadow-sm ring-1 ring-slate-200"
                style={{ backgroundColor: member.color }}
              >
                {member.avatarUrl ? (
                  <img src={member.avatarUrl} alt={member.name} className="h-full w-full object-cover" />
                ) : (
                  member.name.charAt(0)
                )}
              </span>
              <span>
                <span className="block text-sm font-semibold text-slate-900">{member.name}</span>
                <span className="block text-xs text-slate-500">{member.role}</span>
              </span>
            </span>
            <span
              className={cn(
                "inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold transition",
                selected ? "bg-primary text-primary-foreground shadow-sm" : "bg-slate-100 text-transparent group-hover:bg-primary/10",
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

function GoalResponsibleAvatars({ members }: { members: TeamMemberCard[] }) {
  const visibleMembers = members.slice(0, 3);
  const extraCount = Math.max(members.length - visibleMembers.length, 0);

  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {visibleMembers.map((member) => (
          <span
            key={member.id}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white shadow-[0_6px_18px_rgba(15,23,42,0.14)] dark:border-card"
            style={{ backgroundColor: member.color }}
          >
            {member.name.charAt(0)}
          </span>
        ))}
        {extraCount > 0 ? (
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-xs font-bold text-slate-600 shadow-[0_6px_18px_rgba(15,23,42,0.08)] dark:border-card dark:bg-white/10 dark:text-slate-300">
            +{extraCount}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function formatGoalEntryDate(value: string) {
  const date = parseDateKey(value);
  if (!date) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function getGoalUnitLabel(goal: Goal) {
  const text = `${goal.name} ${goal.category}`.toLowerCase();

  if (text.includes("story") || text.includes("visual")) {
    return "visualizações";
  }

  if (text.includes("engaj")) {
    return "interações";
  }

  if (text.includes("public")) {
    return "publicações";
  }

  return "visualizações";
}

function GoalStatCard({
  icon,
  label,
  value,
  subtitle,
  className,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  subtitle?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-[1.4rem] border border-slate-200 bg-slate-50/90 px-4 py-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04]", className)}>
      <div className="flex items-start gap-4">
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 shadow-sm dark:bg-violet-500/15 dark:text-violet-300">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-700 dark:text-slate-400">{label}</p>
          <p className="mt-1 text-[34px] font-semibold leading-none tracking-tight text-slate-950 dark:text-slate-300">{value}</p>
          {subtitle ? <p className="mt-1 text-sm text-slate-700 dark:text-slate-400">{subtitle}</p> : null}
        </div>
      </div>
    </div>
  );
}

function GoalDetailModal({
  goal,
  teamMembers,
  onClose,
  onDeleteGoal,
  onAddDailyValue,
  formatValue,
}: {
  goal: Goal;
  teamMembers: TeamMemberCard[];
  onClose: () => void;
  onDeleteGoal: () => void;
  onAddDailyValue: (payload: { date: string; value: number }) => void;
  formatValue: (value: number) => string;
}) {
  const { isDark } = useThemeMode();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [dailyDate, setDailyDate] = useState(() => formatDateKey(new Date()));
  const [dailyValue, setDailyValue] = useState("");

  const assigneeIds = getGoalResponsibleIds(goal);
  const assignees = teamMembers.filter((member) => assigneeIds.includes(member.id));
  const unitLabel = getGoalUnitLabel(goal);
  const target = Math.max(goal.target, 1);
  const current = Math.max(goal.current, 0);
  const remaining = Math.max(target - current, 0);
  const progress = Math.min((current / target) * 100, 100);
  const history = [...(goal.history ?? [])].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  const visibleHistory = showAllHistory ? history : history.slice(0, 4);
  const parsedDailyValue = Number(dailyValue || 0);
  const projectedTotal = current + (Number.isFinite(parsedDailyValue) ? Math.max(parsedDailyValue, 0) : 0);
  const projectedProgress = Math.min((projectedTotal / target) * 100, 100);
  const currentProgress = Math.min((current / target) * 100, 100);
  const progressDelta = Math.max(projectedProgress - currentProgress, 0);
  const deadlineLabel = formatDeadlineLabel(goal.deadline);
  const deadlineTimeLabel = goal.deadlineTime ? formatDeadlineTimeLabel(goal.deadlineTime) : "Sem horário";
  const historyCountLabel = `${history.length} lançamento${history.length === 1 ? "" : "s"}`;

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setShowAllHistory(false);
    setDailyDate(formatDateKey(new Date()));
    setDailyValue("");
  }, [goal.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 backdrop-blur-md sm:p-4" onClick={onClose}>
      <div
        ref={rootRef}
        onClick={(event) => event.stopPropagation()}
        className={cn(
          "w-full max-w-[min(96vw,1120px)] max-h-[calc(100vh-24px)] overflow-y-auto overscroll-contain rounded-[2.5rem] shadow-[0_34px_110px_rgba(15,23,42,0.18)] sm:max-h-[calc(100vh-32px)] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
          isDark
            ? "border border-white/8 bg-card/98"
            : "border border-slate-200/90 bg-[#f4f7fb]",
        )}
      >
        <div className="p-5 sm:p-6 lg:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-4">
              <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm">
                <Eye className="h-7 w-7" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-300 sm:text-[28px]">
                    Lançar valor diário
                  </h3>
                  <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                    {goal.name}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Registre o valor diário para atualizar automaticamente o acumulado da meta.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((value) => !value)}
                    className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-primary/20 hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  <MoreVertical className="h-5 w-5" />
                </button>
                {menuOpen ? (
                  <div className="absolute right-0 top-full z-20 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-white/10 dark:bg-card">
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onDeleteGoal();
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                      Excluir meta
                    </button>
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-0 shadow-[0_18px_50px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-white/[0.03]">
            <div className="grid gap-0 lg:grid-cols-3 lg:divide-x lg:divide-slate-200 lg:dark:divide-white/10">
              <div className="px-5 py-5 sm:px-6">
                <GoalStatCard
                  className="h-full"
                  icon={<Target className="h-5 w-5" />}
                  label="Meta (objetivo)"
                  value={formatValue(goal.target)}
                  subtitle={<span className="font-medium text-violet-600 dark:text-slate-400">{unitLabel}</span>}
                />
              </div>
              <div className="px-5 py-5 sm:px-6">
                <GoalStatCard
                  className="h-full"
                  icon={<Eye className="h-5 w-5" />}
                  label="Valor atual (acumulado)"
                  value={formatValue(current)}
                  subtitle={
                    <span className="flex items-center gap-2">
                  <span className="text-slate-700 dark:text-slate-400">{progress.toFixed(2).replace(".", ",")}% da meta</span>
                      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-slate-400">
                        +{Math.max(Math.round(progressDelta), 0)}%
                      </span>
                    </span>
                  }
                />
              </div>
              <div className="px-5 py-5 sm:px-6">
                <GoalStatCard
                  className="h-full"
                  icon={<Flag className="h-5 w-5" />}
                  label="Faltam"
                  value={formatValue(remaining)}
                  subtitle={<span className="text-slate-700 dark:text-slate-400">{Math.max(100 - progress, 0).toFixed(2).replace(".", ",")}% para concluir</span>}
                />
              </div>
            </div>

            <div className="mt-6">
              <div className="relative h-4 overflow-hidden rounded-full bg-slate-300/90 dark:bg-white/10">
                <div
                  className="relative h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${progress}%`,
                    background: "linear-gradient(90deg, #6d28d9 0%, #7c3aed 55%, #8b5cf6 100%)",
                  }}
                >
                  <span className="absolute right-0 top-1/2 inline-flex -translate-y-1/2 translate-x-1/2 rounded-full bg-violet-700 px-3 py-1 text-xs font-semibold text-white shadow-lg shadow-violet-700/20">
                    {progress.toFixed(2).replace(".", ",")}%
                  </span>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm font-medium text-slate-700 dark:text-slate-300">
                <span>0 {unitLabel}</span>
                <span>
                  {formatValue(goal.target)} {unitLabel}
                </span>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between gap-3 rounded-[1.4rem] border border-violet-200 bg-violet-50/80 px-4 py-4 text-sm text-slate-800 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
              <span className="flex items-center gap-3">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-violet-600/10 text-violet-700 dark:text-slate-400">
                  <Info className="h-3.5 w-3.5" />
                </span>
                O valor atual é atualizado automaticamente conforme você adiciona valores diários.
              </span>
              <span className="inline-flex items-center gap-2 font-semibold text-violet-700 dark:text-slate-400">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                Meta contínua
              </span>
            </div>
          </div>

          <div className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-white/[0.03] sm:p-6">
            <div className="grid gap-6 lg:grid-cols-4 lg:divide-x lg:divide-slate-200 lg:dark:divide-white/10">
              <div className="pr-0 lg:pr-6">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Categoria</p>
                <p className="mt-1 text-lg font-semibold text-slate-950 dark:text-slate-300">{goal.category}</p>
              </div>
              <div className="pr-0 lg:px-6">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Período</p>
                <p className="mt-1 text-lg font-semibold text-slate-950 dark:text-slate-300">{goal.period}</p>
              </div>
              <div className="pr-0 lg:px-6">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Responsáveis</p>
                <div className="mt-2">
                  <GoalResponsibleAvatars members={assignees.length > 0 ? assignees : teamMembers.slice(0, 1)} />
                </div>
              </div>
              <div className="lg:pl-6">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Data limite</p>
                <p className="mt-1 text-lg font-semibold text-slate-950 dark:text-slate-300">{deadlineLabel}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">{deadlineTimeLabel}</p>
              </div>
            </div>
          </div>

            <div className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-white/[0.03] sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h4 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-300">Adicionar visualizações do dia</h4>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Registre o valor conquistado hoje para atualizar o progresso da meta.
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
              <div className="grid gap-4 lg:grid-cols-[0.95fr_1.2fr_auto] lg:items-end">
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Data</span>
                  <input
                    data-cy="goal-daily-date-input"
                    type="date"
                    value={dailyDate}
                    onChange={(event) => setDailyDate(event.target.value)}
                    className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-950 placeholder:text-slate-400 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-white/10 dark:bg-slate-950/40 dark:text-slate-300 dark:placeholder:text-slate-500"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Visualizações de hoje</span>
                  <input
                    data-cy="goal-daily-value-input"
                    type="number"
                    min="0"
                    inputMode="numeric"
                    value={dailyValue}
                    onChange={(event) => setDailyValue(event.target.value)}
                    placeholder="6000"
                    className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-950 placeholder:text-slate-400 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-white/10 dark:bg-slate-950/40 dark:text-slate-300 dark:placeholder:text-slate-500"
                  />
                </label>
                <button
                  type="button"
                  data-cy="goal-daily-submit"
                  onClick={() => {
                    onAddDailyValue({
                      date: dailyDate || formatDateKey(new Date()),
                      value: Number(dailyValue),
                    });
                    setDailyValue("");
                  }}
                  disabled={!dailyValue || Number(dailyValue) <= 0}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-700 to-violet-600 px-5 text-sm font-semibold text-white shadow-lg shadow-violet-700/20 transition hover:from-violet-600 hover:to-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Plus className="h-4 w-4" />
                  Adicionar valor
                </button>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[1.4rem] border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-100">
                <span className="flex items-center gap-2 font-medium">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </span>
                  Após adicionar este valor, o total acumulado será:
                </span>
                <span className="inline-flex items-center gap-3 text-base font-semibold text-emerald-800 dark:text-emerald-100">
                  {formatValue(projectedTotal)} {unitLabel}
                  <span className="inline-flex items-center rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-emerald-700 shadow-sm dark:bg-white/10 dark:text-emerald-100">
                    ↑ {Math.max(progressDelta, 0).toFixed(2).replace(".", ",")}%
                  </span>
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-[2rem] border border-slate-200 bg-slate-50/80 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-white/[0.03] sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h4 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-300">Histórico de valores</h4>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Acompanhe todos os valores adicionados à meta.</p>
              </div>
              <span className="rounded-full bg-slate-200/80 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-white/5 dark:text-slate-400">
                {historyCountLabel}
              </span>
            </div>

            <div className="mt-5 overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
              <div className="grid grid-cols-[1.1fr_.9fr_.9fr_1fr_auto] gap-4 border-b border-slate-200 bg-slate-100/80 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
                <span>Data</span>
                <span>Visualizações adicionadas</span>
                <span>Total acumulado</span>
                <span>Adicionado por</span>
                <span />
              </div>

              <div className="divide-y divide-slate-200 dark:divide-white/10">
                {visibleHistory.length > 0 ? (
                  visibleHistory.map((entry, index) => {
                    const member = teamMembers.find((item) => item.id === entry.addedById) ?? teamMembers[0];
                    const isNewest = index === 0;

                    return (
                      <div
                        key={entry.id}
                        data-cy="goal-history-row"
                        className={cn(
                          "grid grid-cols-[1.1fr_.9fr_.9fr_1fr_auto] items-center gap-4 px-4 py-4 text-sm",
                          isNewest && "bg-violet-50/70 dark:bg-white/[0.03]",
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-950 dark:text-slate-300">
                            {formatGoalEntryDate(entry.date)}
                          </span>
                          {isNewest ? (
                            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">
                              Mais recente
                            </span>
                          ) : null}
                        </div>
                        <span className="font-semibold text-slate-950 dark:text-slate-300">{formatValue(entry.value)}</span>
                        <span className="font-semibold text-slate-950 dark:text-slate-300">{formatValue(entry.total)}</span>
                        <div className="flex items-center gap-3">
                          <span
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm"
                            style={{ backgroundColor: member?.color ?? "#7c3aed" }}
                          >
                            {member?.name?.charAt(0) ?? "A"}
                          </span>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-950 dark:text-slate-300">{member?.name ?? "Autor"}</p>
                            <p className="text-xs text-slate-600 dark:text-slate-400">{member?.role ?? "Responsável"}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-600 transition hover:border-slate-400 hover:text-slate-900 dark:border-white/10 dark:bg-slate-950/30 dark:text-slate-300 dark:hover:text-slate-100"
                          aria-label="Mais opções"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <div className="px-4 py-8 text-sm text-slate-600 dark:text-slate-300">
                    Nenhum valor foi adicionado ainda.
                  </div>
                )}
              </div>

              {history.length > visibleHistory.length ? (
                <button
                  type="button"
                  onClick={() => setShowAllHistory((value) => !value)}
                  className="flex w-full items-center justify-center gap-2 border-t border-slate-200 bg-slate-100/70 px-4 py-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-200/70 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400 dark:hover:bg-white/[0.06]"
                >
                  {showAllHistory ? "Mostrar menos" : "Ver todos os lançamentos"}
                  <ChevronRight className={cn("h-4 w-4 transition", showAllHistory && "rotate-90")} />
                </button>
              ) : null}
            </div>
          </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-5 dark:border-white/10">
              <ActionButton variant="secondary" onClick={onClose}>
                Cancelar
              </ActionButton>
            </div>
        </div>
      </div>
    </div>
  );
}

function getGoalView(goal: Goal) {
  return getGoalResponsibleIds(goal).length > 1 ? "group" : "individual";
}

export function GoalsPage() {
  const { isDark } = useThemeMode();
  const [teamMembers] = useTeamProfiles();
  const [items, , { createGoal, updateGoal, deleteGoal }] = useSupabaseGoalsState([]);
  const [teamScope] = useTeamScope();
  const [goalView, setGoalView] = useState<GoalView>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<number | null>(null);
  const [goalModalMode, setGoalModalMode] = useState<GoalModalMode>("form");
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
    void Promise.all(
      nextItems.map((goal, index) => updateGoal(goal, index)),
    ).catch((error) => {
      console.error("[GoalsSync] Failed to migrate initial goals", error);
    });
  }, [items, teamCards, updateGoal]);

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
    setGoalModalMode("form");
    setForm(createInitialGoalForm(teamCards));
    setIsCreateOpen(true);
  }

  function openGoalDetail(goalId: number) {
    const goal = items.find((item) => item.id === goalId);
    if (!goal) {
      return;
    }

    setEditingGoalId(goalId);
    setGoalModalMode("detail");
    setIsCreateOpen(true);
  }

  function closeModal() {
    setIsCreateOpen(false);
    setEditingGoalId(null);
    setGoalModalMode("form");
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

  const setQuickResponsibleCount = (count: number) => {
    const selectedIds = teamCards.slice(0, count).map((member) => member.id);
    setForm((previous) => ({
      ...previous,
      responsibleIds: selectedIds,
    }));
  };

  const handleSaveGoal = async () => {
    const target = Number(form.target);
    const selectedResponsibleIds = form.responsibleIds.length > 0 ? form.responsibleIds : teamCards[0] ? [teamCards[0].id] : [];

    if (
      !form.name.trim() ||
      !form.description.trim() ||
      !form.deadline.trim() ||
      !form.deadlineTime.trim() ||
      Number.isNaN(target) ||
      selectedResponsibleIds.length === 0
    ) {
      toast.error("Preencha nome, responsáveis, descrição, data, horário e meta.");
      return;
    }

    const goalPayload: Omit<Goal, "id"> = {
      name: form.name.trim(),
      category: form.category,
      status: form.status,
      priority: form.priority,
      notes: form.notes.trim(),
      responsibleId: selectedResponsibleIds[0],
      responsibleIds: selectedResponsibleIds,
      target,
      current: 0,
      period: form.period,
      deadline: form.deadline,
      deadlineTime: form.deadlineTime,
      description: form.description.trim(),
      checklist: form.checklist.map((item) => ({ ...item, label: item.label.trim() })).filter((item) => item.label.length > 0),
      history: undefined,
    };

    if (editingGoalId !== null) {
      const nextGoals = items.map((goal) =>
        goal.id === editingGoalId
          ? {
              ...goal,
              ...goalPayload,
              current: goal.current,
              history: goal.history,
            }
          : goal,
      );
      const updatedGoal = nextGoals.find((goal) => goal.id === editingGoalId);
      if (!updatedGoal) {
        return;
      }
      const sortOrder = nextGoals.findIndex((goal) => goal.id === editingGoalId);
      await updateGoal(updatedGoal, sortOrder);
      toast.success("Meta atualizada com sucesso.");
    } else {
      const newGoal: Goal = {
        id: Math.max(...items.map((goal) => goal.id), 0) + 1,
        ...goalPayload,
      };
      await createGoal(newGoal, 0);
      toast.success("Meta criada com sucesso.");
    }

    closeModal();
  };

  const handleDeleteGoal = async (goalId: number) => {
    const removedGoal = items.find((goal) => goal.id === goalId);

    if (!removedGoal) {
      return;
    }

    await deleteGoal(goalId);
    setPendingDelete(null);
    toast.success("Meta apagada com sucesso.");
  };

  const handleAddDailyValue = async ({ date, value }: { date: string; value: number }) => {
    if (editingGoalId === null || !Number.isFinite(value) || value <= 0) {
      toast.error("Informe um valor diário válido.");
      return;
    }

    const selectedGoal = items.find((goal) => goal.id === editingGoalId);
    if (!selectedGoal) {
      return;
    }

    const currentTotal = Math.max(selectedGoal.current, 0);
    const nextTotal = currentTotal + value;
    const responsibleIds = getGoalResponsibleIds(selectedGoal);
    const addedById = responsibleIds[0] ?? teamCards[0]?.id ?? 1;
    const nextEntry: GoalValueEntry = {
      id: `goal-entry-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      date,
      value,
      total: nextTotal,
      addedById,
    };

    const nextGoals = items.map((goal) =>
        goal.id === editingGoalId
          ? {
              ...goal,
              current: nextTotal,
              history: [nextEntry, ...(goal.history ?? [])],
            }
          : goal,
    );
    const updatedGoal = nextGoals.find((goal) => goal.id === editingGoalId);
    if (!updatedGoal) {
      return;
    }
    const sortOrder = nextGoals.findIndex((goal) => goal.id === editingGoalId);
    await updateGoal(updatedGoal, sortOrder);

    toast.success("Valor diário adicionado com sucesso.");
  };

  return (
    <PageTransition>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pb-8 sm:px-6 lg:px-8">
        <PageHeader
          eyebrow="Execution"
          title="Metas vivas e conectadas ao time"
          actions={
            <ActionButton dataCy="goal-create-open" onClick={openCreateGoal}>
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
                    background: "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(251,251,253,0.96))",
                    borderColor: "rgba(229,231,238,0.82)",
                    boxShadow: "0 18px 48px rgba(15,23,42,0.08)",
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
                    background: "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(251,251,253,0.96))",
                    borderColor: "rgba(229,231,238,0.82)",
                    boxShadow: "0 18px 48px rgba(15,23,42,0.08)",
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
                    background: "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(251,251,253,0.96))",
                    borderColor: "rgba(229,231,238,0.82)",
                    boxShadow: "0 18px 48px rgba(15,23,42,0.08)",
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
          className="border-primary/10 bg-white/80 p-4 shadow-[0_14px_40px_rgba(15,23,42,0.06)]"
          style={
            isDark
              ? undefined
              : {
                  background: "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(251,251,253,0.96))",
                  borderColor: "rgba(229,231,238,0.82)",
                  boxShadow: "0 16px 42px rgba(15,23,42,0.08)",
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
            const statusText = `${progressDone.toFixed(0)}% feito • ${progressLeft.toFixed(0)}% faltam`;
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
                className="group relative h-full"
              >
                <GlassPanel
                  index={index + 1}
                  className="overflow-hidden p-6"
                  dataCy="goal-card"
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
                      openGoalDetail(goal.id);
                    }}
                    data-cy="goal-daily-open"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-white text-muted-foreground shadow-sm transition hover:border-primary/25 hover:text-foreground dark:border-white/8 dark:bg-card/90"
                    aria-label="Lançar valor diário"
                    title="Lançar valor diário"
                  >
                    <PencilLine className="h-4 w-4" />
                  </button>
                  <div
                    onClick={(event) => {
                      event.stopPropagation();
                    }}
                  >
                    <DeleteIconButton dataCy="goal-delete-button" onClick={() => setPendingDelete({ goalId: goal.id, goalName: goal.name })} />
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

        {isCreateOpen && editingGoalId !== null && goalModalMode === "detail" && editingGoal ? (
          <GoalDetailModal
            goal={editingGoal}
            teamMembers={teamCards}
            onClose={closeModal}
            onDeleteGoal={() => handleDeleteGoal(editingGoal.id)}
            onAddDailyValue={handleAddDailyValue}
            formatValue={formatValue}
          />
        ) : null}

        {isCreateOpen && goalModalMode === "form" ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/25 p-3 backdrop-blur-sm sm:p-4"
            onClick={closeModal}
          >
            <div
              className={goalModalShellClass}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="p-5 sm:p-6 lg:p-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-4">
                    <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.5rem] bg-primary/10 text-primary shadow-sm ring-1 ring-primary/10">
                      <Target className="h-7 w-7" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-[28px]">
                        Nova meta
                      </h3>
                      <p className="mt-1 text-sm text-slate-600">
                        Crie uma meta e acompanhe os resultados da equipe com clareza.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={closeModal}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <label className="mt-6 grid gap-2">
                  <span className="text-sm font-medium text-slate-700">Nome da meta</span>
                  <input
                    data-cy="goal-name-input"
                    value={form.name}
                    onChange={(event) => setForm((previous) => ({ ...previous, name: event.target.value }))}
                    placeholder="Ex.: Aumentar alcance do mês"
                    className={goalModalFieldClass}
                  />
                </label>

                <div className={cn(goalSectionCardClass, "mt-6 p-5 sm:p-6")}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-500">Meta contínua</p>
                      <p className="mt-1 text-sm text-slate-600">
                        Defina o objetivo da meta. Depois, cada valor diário adicionado aumenta automaticamente o acumulado.
                      </p>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-600 ring-1 ring-violet-100">
                      Acúmulo automático
                    </span>
                  </div>

                  <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
                    <label className="grid gap-2">
                      <span className="text-sm font-medium text-slate-700">Meta (objetivo)</span>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-violet-500">
                          <Target className="h-4 w-4" />
                        </span>
                        <input
                          data-cy="goal-target-input"
                          value={form.target}
                          onChange={(event) => setForm((previous) => ({ ...previous, target: event.target.value }))}
                          inputMode="decimal"
                          placeholder="Ex.: 12000"
                          className={cn(goalModalFieldClass, "w-full py-3 pl-11 pr-4 font-semibold")}
                        />
                      </div>
                    </label>

                    <div className="rounded-[1.6rem] border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-slate-50 p-4 shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-500">Após criar</p>
                          <p className="mt-1 text-lg font-semibold text-slate-900">Contínuo</p>
                        </div>
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 text-violet-600 shadow-sm ring-1 ring-violet-200">
                          <Plus className="h-5 w-5" />
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-600">
                        O valor atual fica zerado no início e cresce conforme os valores diários são lançados.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3 rounded-[1.35rem] border border-violet-100 bg-violet-50/60 px-4 py-3 text-sm text-slate-700">
                    <span className="flex items-center gap-3">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-violet-600">
                        <Info className="h-3.5 w-3.5" />
                      </span>
                      O valor atual será atualizado automaticamente conforme você adicionar valores diários no card.
                    </span>
                    <span className="inline-flex items-center gap-2 font-semibold text-violet-600">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      Meta contínua
                    </span>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-slate-700">Categoria</span>
                    <RoundedDropdown
                      label="Categoria"
                      value={form.category}
                      forceLight
                      dataCy="goal-category-trigger"
                      optionDataCyPrefix="goal-category"
                      options={[
                        { label: "Alcance", value: "Alcance", color: "#3B82F6" },
                        { label: "Engajamento", value: "Engajamento", color: "#8B5CF6" },
                        { label: "Conversão", value: "Conversão", color: "#EF4444" },
                        { label: "Autoridade", value: "Autoridade", color: "#F59E0B" },
                      ]}
                      onChange={(value) => setForm((previous) => ({ ...previous, category: value }))}
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-slate-700">Período</span>
                    <RoundedDropdown
                      label="Período"
                      value={form.period}
                      forceLight
                      dataCy="goal-period-trigger"
                      optionDataCyPrefix="goal-period"
                      options={[
                        { label: "Semana", value: "Semana", color: "#60A5FA" },
                        { label: "Mês", value: "Mês", color: "#A78BFA" },
                        { label: "Trimestre", value: "Trimestre", color: "#F59E0B" },
                        { label: "Ano", value: "Ano", color: "#34D399" },
                      ]}
                      onChange={(value) => setForm((previous) => ({ ...previous, period: value }))}
                    />
                  </label>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-slate-700">Status</span>
                    <RoundedDropdown
                      label="Status"
                      value={form.status}
                      forceLight
                      dataCy="goal-status-trigger"
                      optionDataCyPrefix="goal-status"
                      options={goalStatusOptions}
                      onChange={(value) => setForm((previous) => ({ ...previous, status: value }))}
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-slate-700">Prioridade</span>
                    <RoundedDropdown
                      label="Prioridade"
                      value={form.priority}
                      forceLight
                      dataCy="goal-priority-trigger"
                      optionDataCyPrefix="goal-priority"
                      options={goalPriorityOptions}
                      onChange={(value) => setForm((previous) => ({ ...previous, priority: value }))}
                    />
                  </label>
                </div>

                <div className={cn(goalSectionCardClass, "mt-6 grid gap-4 p-4 sm:p-5")}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <span className="text-sm font-medium text-slate-700">Responsáveis</span>
                      <p className="text-xs text-slate-500">Selecione uma ou várias pessoas para acompanhar a meta.</p>
                    </div>
                    <span className={cn(goalBadgeClass, "gap-2 border border-slate-200 bg-slate-50 text-slate-700")}>
                      <Users className="h-3.5 w-3.5" />
                      {form.responsibleIds.length} selecionado{form.responsibleIds.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setQuickResponsibleCount(1)}
                      className={cn(
                        "rounded-full border px-3 py-2 text-xs font-semibold transition",
                        form.responsibleIds.length === 1
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-slate-200 bg-white text-slate-700 hover:border-primary/40 hover:bg-slate-50",
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
                          : "border-slate-200 bg-white text-slate-700 hover:border-primary/40 hover:bg-slate-50",
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
                          : "border-slate-200 bg-white text-slate-700 hover:border-primary/40 hover:bg-slate-50",
                      )}
                    >
                      3 pessoas
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm((previous) => ({ ...previous, responsibleIds: [] }))}
                      className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-primary/30 hover:bg-slate-50"
                    >
                      Limpar
                    </button>
                  </div>
                  <GoalAssigneeChips members={teamCards} selectedIds={form.responsibleIds} onToggle={toggleResponsible} />
                  {form.responsibleIds.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {teamCards
                        .filter((member) => form.responsibleIds.includes(member.id))
                        .map((member) => (
                          <button
                            key={member.id}
                            type="button"
                            onClick={() => toggleResponsible(member.id)}
                            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: member.color }} />
                            {member.name}
                            <X className="h-3 w-3 text-slate-400" />
                          </button>
                        ))}
                    </div>
                  ) : null}
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-[1.3fr_0.7fr]">
                  <GoalDatePicker
                    value={form.deadline}
                    onChange={(value) => setForm((previous) => ({ ...previous, deadline: value }))}
                  />
                  <GoalTimeInput
                    value={form.deadlineTime}
                    onChange={(value) => setForm((previous) => ({ ...previous, deadlineTime: value }))}
                  />
                </div>

                <label className="mt-6 grid gap-2">
                  <span className="text-sm font-medium text-slate-700">Descrição</span>
                  <textarea
                    data-cy="goal-description-input"
                    value={form.description}
                    onChange={(event) => setForm((previous) => ({ ...previous, description: event.target.value }))}
                    rows={5}
                    placeholder="Explique o objetivo, o contexto e o que precisa acontecer para a meta ser concluída."
                    className={cn(goalModalFieldClass, "rounded-[1.5rem] min-h-[140px]")}
                  />
                </label>

                <label className="mt-6 grid gap-2">
                  <span className="text-sm font-medium text-slate-700">Observações</span>
                  <textarea
                    value={form.notes}
                    onChange={(event) => setForm((previous) => ({ ...previous, notes: event.target.value }))}
                    rows={4}
                    placeholder="Anotações rápidas, contexto adicional ou instruções para o time."
                    className={cn(goalModalFieldClass, "rounded-[1.5rem] min-h-[110px]")}
                  />
                </label>

                <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-5">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    data-cy="goal-save-button"
                    onClick={handleSaveGoal}
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition duration-200 hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-[0_18px_36px_rgba(255,59,78,0.24)]"
                  >
                    <Plus className="h-4 w-4" />
                    {editingGoalId !== null ? "Salvar alterações" : "Criar meta"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
        {pendingDelete ? (
        <ConfirmDialog
          title="Tem certeza que deseja apagar?"
          description={`A meta "${pendingDelete.goalName}" será removida e não poderá ser desfeita.`}
          confirmDataCy="goal-delete-confirm"
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => handleDeleteGoal(pendingDelete.goalId)}
        />
        ) : null}
      </div>
    </PageTransition>
  );
}

