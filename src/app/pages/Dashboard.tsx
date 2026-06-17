import type { CSSProperties } from "react";
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BarChart3, Eye, Rocket, Sparkles, type LucideIcon } from "lucide-react";
import { getGoalResponsibleIds, type CalendarEvent, type Goal, type StoryLog } from "../data/mockData";
import { usePosts } from "../data/posts";
import { useTeamProfiles } from "../data/profiles";
import { useSupabaseSyncedListState } from "../data/supabaseSync";
import { defaultMonthlyViewsGoal, sumMonthViews, useCalendarDayMetrics } from "../data/calendarMetrics";
import { useSupabasePreference } from "../data/userPreferences";
import { matchesTeamScope, useTeamScope } from "../data/teamScope";
import {
  GlassPanel,
  EmptyState,
  PageTransition,
  SectionTitle,
  formatCompactNumber,
  formatLongNumber,
  formatPercent,
} from "../components/ui";
import { useThemeMode } from "../theme";
import { useAuthSession } from "../auth";
import { fetchStoriesMonthlySummary } from "../data/storiesRepository";

const metricIcons = [Eye, BarChart3, Sparkles, Rocket];
type ComparisonMetricId = "views" | "reach" | "engagement" | "followers";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeNumberRecord(value: unknown) {
  if (!isRecord(value)) {
    return {} as Record<string, number>;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, Number(item) || 0]),
  );
}

function normalizeMetricGoals(value: unknown) {
  if (!isRecord(value)) {
    return { reach: 0, engagement: 0, followers: 0 };
  }

  return {
    reach: Number(value.reach) || 0,
    engagement: Number(value.engagement) || 0,
    followers: Number(value.followers) || 0,
  };
}

function asNumber(value: unknown) {
  return Number(value) || 0;
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function formatDashboardDateRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const monthLabel = new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(now);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return `1 — ${daysInMonth} de ${monthLabel} de ${year}`;
}

function todayKey() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function currentMonthKey() {
  return todayKey().slice(0, 7);
}

function isCurrentMonthDate(value: string) {
  return value.startsWith(currentMonthKey());
}

function getCalendarResponsibleIds(event: CalendarEvent) {
  const ids = event.responsibleIds?.length ? event.responsibleIds : [event.responsibleId];
  return Array.from(new Set(ids.filter((id) => Number.isFinite(id))));
}

function isCompletedCalendarEvent(event: CalendarEvent) {
  const tasks = event.tasks ?? [];
  const allTasksDone = tasks.length > 0 && tasks.every((task) => task.done);
  return event.completed || event.status === "Publicado" || event.status === "Aprovado" || allTasksDone;
}


function buildRecentDateKeys(days: number) {
  const now = new Date();

  return Array.from({ length: days }, (_, index) => {
    const next = new Date(now);
    next.setDate(now.getDate() - (days - index - 1));
    const pad = (value: number) => String(value).padStart(2, "0");
    return `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}`;
  });
}

function formatAxisDateLabel(value: string) {
  const [, month, day] = value.split("-");
  return `${day}/${month}`;
}

function buildSvgLinePoints(values: number[], width: number, height: number, padding: number, maxValue: number) {
  if (values.length === 0) {
    return "";
  }

  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;
  const safeMax = maxValue <= 0 ? 1 : maxValue;

  return values
    .map((value, index) => {
      const x = padding + (values.length === 1 ? usableWidth / 2 : (index / (values.length - 1)) * usableWidth);
      const y = height - padding - (Math.max(0, value) / safeMax) * usableHeight;
      return `${x},${y}`;
    })
    .join(" ");
}

function buildSvgAreaPoints(values: number[], width: number, height: number, padding: number, maxValue: number) {
  if (values.length === 0) {
    return "";
  }

  const linePoints = buildSvgLinePoints(values, width, height, padding, maxValue);
  const baselineY = height - padding;
  const firstX = padding;
  const lastX = padding + (values.length === 1 ? (width - padding * 2) / 2 : width - padding * 2);

  return `${firstX},${baselineY} ${linePoints} ${lastX},${baselineY}`;
}

const instagramThemeLight = {
  ["--primary" as never]: "131 58 180",
  ["--primary-foreground" as never]: "255 255 255",
  ["--background" as never]: "249 249 251",
  ["--foreground" as never]: "28 28 32",
  ["--card" as never]: "255 255 255",
  ["--card-foreground" as never]: "28 28 32",
  ["--muted" as never]: "245 246 249",
  ["--muted-foreground" as never]: "111 114 126",
  ["--border" as never]: "229 231 238",
  ["--ring" as never]: "131 58 180",
  ["--shadow" as never]: "131 58 180",
} as CSSProperties;

const instagramThemeDark = {
  ["--primary" as never]: "255 99 132",
  ["--primary-foreground" as never]: "255 255 255",
  ["--background" as never]: "8 10 14",
  ["--foreground" as never]: "244 246 250",
  ["--card" as never]: "18 21 28",
  ["--card-foreground" as never]: "244 246 250",
  ["--muted" as never]: "28 33 42",
  ["--muted-foreground" as never]: "168 175 190",
  ["--border" as never]: "40 46 59",
  ["--ring" as never]: "255 99 132",
  ["--shadow" as never]: "2 6 23",
} as CSSProperties;

function InstagramHealthScoreRing({ score }: { score: number }) {
  const radius = 74;
  const circumference = 2 * Math.PI * radius;
  const progress = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex h-56 w-56 items-center justify-center">
      <svg className="-rotate-90 h-56 w-56" viewBox="0 0 180 180">
        <defs>
          <linearGradient id="instagramRingGradient" x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#833AB4" />
            <stop offset="52%" stopColor="#E1306C" />
            <stop offset="100%" stopColor="#F56040" />
          </linearGradient>
        </defs>
        <circle cx="90" cy="90" r={radius} fill="none" stroke="rgba(255,255,255,0.26)" strokeWidth="12" />
        <circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          stroke="url(#instagramRingGradient)"
          strokeLinecap="round"
          strokeWidth="12"
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: progress,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-sm text-white/78">Saúde do perfil</span>
        <strong data-cy="dashboard-health-score" className="text-5xl font-semibold tracking-tight text-white">{score}</strong>
        <span className="text-sm font-medium text-white/78">de 100</span>
      </div>
    </div>
  );
}

function DashboardMetricCard({
  icon: Icon,
  label,
  value,
  change,
  detail,
  darkMode = false,
  dataCy,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  change: number;
  detail: string;
  darkMode?: boolean;
  dataCy?: string;
}) {
  const positive = change >= 0;
  const shellStyle = darkMode
    ? {
        background: "linear-gradient(180deg, rgba(16,18,24,0.98), rgba(10,12,17,0.96))",
        borderColor: "rgba(255,255,255,0.08)",
      }
    : {
        background: "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(252,252,253,0.98))",
        borderColor: "rgba(229,231,238,0.82)",
        boxShadow: "0 18px 48px rgba(15,23,42,0.08)",
      };

  return (
    <GlassPanel
      className="overflow-hidden"
      dataCy={dataCy}
      style={shellStyle}
    >
      <div className="flex items-start justify-between gap-4">
        <div
          className="inline-flex h-12 w-12 items-center justify-center rounded-2xl text-[#8A2FB1] ring-1 ring-[#833AB4]/10"
          style={
            darkMode
              ? {
                  background:
                    "linear-gradient(135deg,rgba(131,58,180,0.14),rgba(225,48,108,0.14),rgba(245,96,64,0.12))",
                }
              : {
                  background: "rgba(131,58,180,0.08)",
                  boxShadow: "inset 0 0 0 1px rgba(131,58,180,0.08)",
                }
          }
        >
          <Icon className="h-5 w-5" />
        </div>
        <span
          className={[
            "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold",
            positive
              ? darkMode
                ? "bg-[#833AB4]/10 text-[#6C2CA1]"
                : "bg-[#7C3AED]/10 text-[#7C3AED]"
              : darkMode
                ? "bg-[#F56040]/10 text-[#B94A2D]"
                : "bg-[#F97316]/10 text-[#C2410C]",
          ].join(" ")}
        >
          <Sparkles className="h-3.5 w-3.5" />
          {change > 0 ? "+" : ""}
          {change}%
        </span>
      </div>
      <div className="mt-6 space-y-2">
        <p className="text-sm text-muted-foreground">{label}</p>
        <h3 className="text-3xl font-semibold tracking-tight text-foreground">{value}</h3>
        <p className="text-sm text-muted-foreground">{detail}</p>
      </div>
      <div className={darkMode ? "mt-6 h-2 overflow-hidden rounded-full bg-muted" : "mt-6 h-2 overflow-hidden rounded-full bg-slate-100"}>
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,#833AB4_0%,#E1306C_50%,#F56040_100%)] transition-[width] duration-500"
          style={{ width: `${Math.min(Math.abs(change) * 6, 100)}%` }}
        />
      </div>
    </GlassPanel>
  );
}

function DashboardProgressBar({ value, max, label }: { value: number; max: number; label?: string }) {
  const progress = max === 0 ? 0 : (value / max) * 100;

  return (
    <div className="space-y-2">
      {label ? (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{label}</span>
          <span>{progress.toFixed(0)}%</span>
        </div>
      ) : null}
      <div className="h-2.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,#833AB4_0%,#E1306C_50%,#F56040_100%)] transition-[width] duration-700 ease-out"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
    </div>
  );
}

function resolveComparisonStatus(percent: number) {
  if (percent >= 100) {
    return "ðŸŸ¢ Meta atingida";
  }

  if (percent >= 70) {
    return "ðŸŸ¡ Em andamento";
  }

  return "ðŸ”´ Abaixo do esperado";
}

function buildComparisonSummary(params: { label: string; actual: number; goal: number; percent: number }) {
  const { label, actual, goal, percent } = params;
  const remaining = Math.max(goal - actual, 0);
  const labelLower = label.toLowerCase();

  if (goal <= 0) {
    return [];
  }

  const items = [`Você já atingiu ${formatPercent(percent, 2)} da meta de ${labelLower}.`];

  if (remaining > 0) {
    items.push(`Faltam ${formatLongNumber(remaining)} ${labelLower} para atingir a meta.`);
  } else {
    items.push(`A meta de ${labelLower} já foi atingida neste mês.`);
  }

  if (percent < 70) {
    items.push(`${label} está abaixo da curva esperada.`);
  } else if (percent < 100) {
    items.push(`${label} está próximo do objetivo, faltando apenas ${formatPercent(100 - percent, 2)}.`);
  }

  return items;
}

class DashboardSectionBoundary extends React.Component<
  { title: string; children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error(`Dashboard section failed: ${this.props.title}`, error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <GlassPanel className="bg-white/95">
          <SectionTitle
            title={this.props.title}
            description="Esta seção encontrou um dado inválido e foi isolada para não apagar a página inteira."
          />
          <div className="mt-4 rounded-3xl border border-dashed border-border/70 bg-white/70 p-5 text-sm text-muted-foreground dark:bg-white/5">
            Recarregue a página. Se continuar assim, esta área específica do dashboard ainda precisa de ajuste nos dados.
          </div>
        </GlassPanel>
      );
    }

    return this.props.children;
  }
}

export function DashboardPage() {
  useEffect(() => {
    console.info("[Init] Dashboard rendered");
  }, []);

  const { isDark } = useThemeMode();
  const { session } = useAuthSession();
  const [teamMembers] = useTeamProfiles();
  const fallbackMember = teamMembers[0] ?? { id: 0, name: "Equipe Great", color: "#833AB4" };
  const [posts] = usePosts();
  const [goals] = useSupabaseSyncedListState<Goal>({ key: "goals", table: "goals", fallback: [] });
  const [calendarItems] = useSupabaseSyncedListState<CalendarEvent>({ key: "calendar-events", table: "calendar_events", fallback: [] });
  const [storyItems, , storyItemsHydrated] = useSupabaseSyncedListState<StoryLog>({ key: "story-logs", table: "story_logs", fallback: [] });
  const dashboardMonthKey = currentMonthKey();
  const [monthlyStoriesSnapshot, setMonthlyStoriesSnapshot] = useState<{
    currentValue: number;
    goalValue: number;
  } | null>(null);
  const [dayViewsByDate, , dayReachByDate] = useCalendarDayMetrics();
  const [monthlyViewsGoal] = useSupabasePreference<number>("calendar-monthly-views-goal", defaultMonthlyViewsGoal);
  const [dashboardMetricGoals] = useSupabasePreference<Record<Exclude<ComparisonMetricId, "views">, number>>("dashboard-metric-goals", {
    reach: 0,
    engagement: 0,
    followers: 0,
  });
  const [dashboardDailyFollowers] = useSupabasePreference<Record<string, number>>("dashboard-daily-followers", {});
  const [teamScope] = useTeamScope();

  useEffect(() => {
    if (!session?.user.id) {
      setMonthlyStoriesSnapshot(null);
      return;
    }

    let cancelled = false;

    const loadMonthlyStories = async () => {
      try {
        const snapshot = await fetchStoriesMonthlySummary(session.user.id, dashboardMonthKey);
        if (cancelled) {
          return;
        }

        setMonthlyStoriesSnapshot({
          currentValue: snapshot.totalCurrent,
          goalValue: snapshot.totalGoal,
        });
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load monthly stories in dashboard", error);
          setMonthlyStoriesSnapshot(null);
        }
      }
    };

    void loadMonthlyStories();

    return () => {
      cancelled = true;
    };
  }, [dashboardMonthKey, session?.user.id]);

  const safeDayViewsByDate = normalizeNumberRecord(dayViewsByDate);
  const safeDayReachByDate = normalizeNumberRecord(dayReachByDate);
  const safeDashboardDailyFollowers = normalizeNumberRecord(dashboardDailyFollowers);
  const safeDashboardMetricGoals = normalizeMetricGoals(dashboardMetricGoals);
  const visiblePosts = posts.filter((post) => {
    const authorId = asNumber((post as { authorId?: unknown }).authorId);
    const date = asString((post as { date?: unknown }).date);
    return matchesTeamScope(authorId, teamScope) && Boolean(date) && isCurrentMonthDate(date);
  });
  const visibleStoryLogs = storyItems.filter((story) => {
    const madeById = asNumber((story as { madeById?: unknown }).madeById);
    const postedById = asNumber((story as { postedById?: unknown }).postedById);
    const date = asString((story as { date?: unknown }).date);
    return (matchesTeamScope(madeById, teamScope) || matchesTeamScope(postedById, teamScope)) && Boolean(date) && isCurrentMonthDate(date);
  });
  const visibleGoals = goals.filter((goal) => {
    const deadline = asString((goal as { deadline?: unknown }).deadline);
    return getGoalResponsibleIds(goal).some((id) => matchesTeamScope(id, teamScope)) && Boolean(deadline) && isCurrentMonthDate(deadline);
  });
  const visibleCalendarItems = calendarItems.filter((event) => {
    const date = asString((event as { date?: unknown }).date);
    return getCalendarResponsibleIds(event).some((id) => matchesTeamScope(id, teamScope)) && Boolean(date) && isCurrentMonthDate(date);
  });
  const topPosts = [...visiblePosts].sort((a, b) => asNumber(b.engagement) - asNumber(a.engagement)).slice(0, 5);
  const worstPosts = [...visiblePosts].sort((a, b) => asNumber(a.engagement) - asNumber(b.engagement)).slice(0, 2);
  const monthKey = dashboardMonthKey;
  const monthViews = sumMonthViews(safeDayViewsByDate, currentMonthKey());
  const monthReach = sumMonthViews(safeDayReachByDate, monthKey);
  const monthFollowers = sumMonthViews(safeDashboardDailyFollowers, monthKey);
  const storyLogMonthTotal = visibleStoryLogs.reduce((sum, story) => sum + asNumber((story as { quantity?: unknown }).quantity), 0);
  const monthStories = Math.max(monthlyStoriesSnapshot?.currentValue ?? 0, storyLogMonthTotal);
  const monthlyStoriesGoal = monthlyStoriesSnapshot?.goalValue ?? 168;
  const monthlyStoriesReady = monthlyStoriesSnapshot !== null || storyItemsHydrated;
  const remainingViews = Math.max(monthlyViewsGoal - monthViews, 0);
  const remainingStories = Math.max(monthlyStoriesGoal - monthStories, 0);
  const totalEngagement = visiblePosts.reduce((sum, post) => sum + asNumber(post.engagement), 0);
  const completedGoals = visibleGoals.filter((goal) => asNumber((goal as { current?: unknown }).current) >= asNumber((goal as { target?: unknown }).target)).length;
  const completedCalendarItems = visibleCalendarItems.filter((event) => isCompletedCalendarEvent(event)).length;
  const healthScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        (visibleGoals.length > 0 ? (completedGoals / visibleGoals.length) * 45 : 0) +
        (visibleCalendarItems.length > 0 ? (completedCalendarItems / visibleCalendarItems.length) * 30 : 0) +
        (monthlyViewsGoal > 0 ? (monthViews / monthlyViewsGoal) * 25 : 0),
      ),
    ),
  );
  const showOverallGoalCard = teamScope === "todos";
  const dashboardSummary = {
    healthScore,
    monthReach,
    monthViews,
    remainingViews,
  };
  const dashboardMetrics = [
    {
      id: "views-goal",
      label: "Visualizações do mês",
      value: formatLongNumber(monthViews),
      change: 0,
      highlight: remainingViews > 0 ? `Faltam ${formatLongNumber(remainingViews)} para bater a meta.` : "Meta mensal de visualizações batida.",
    },
    {
      id: "stories",
      label: "Stories do mês",
      value: monthlyStoriesReady ? formatLongNumber(monthStories) : "...",
      change: 0,
      highlight: monthlyStoriesReady
        ? monthStories > 0
          ? `Faltam ${formatLongNumber(remainingStories)} stories para bater a meta.`
          : "Nenhum story registrado neste mês."
        : "Carregando o total mensal de stories.",
    },
    {
      id: "calendar",
      label: "Posts concluídos no calendário",
      value: `${completedCalendarItems}/${visibleCalendarItems.length || 0}`,
      change: 0,
      highlight: visibleCalendarItems.length > 0 ? "Acompanhando os posts marcados como concluídos no calendário." : "Nenhum post de calendário neste mês.",
    },
  ] as const;
  const comparisonMetrics = [
    {
      id: "views" as const,
      label: "Visualizações",
      goal: Math.max(0, monthlyViewsGoal),
      actual: monthViews,
    },
    {
      id: "reach" as const,
      label: "Alcance",
      goal: Math.max(0, safeDashboardMetricGoals.reach || 0),
      actual: monthReach,
    },
    {
      id: "engagement" as const,
      label: "Engajamento",
      goal: Math.max(0, safeDashboardMetricGoals.engagement || 0),
      actual: totalEngagement,
    },
    {
      id: "followers" as const,
      label: "Seguidores",
      goal: Math.max(0, safeDashboardMetricGoals.followers || 0),
      actual: monthFollowers,
    },
  ]
    .filter((metric) => metric.goal > 0)
    .map((metric) => {
      const percent = metric.goal > 0 ? (metric.actual / metric.goal) * 100 : 0;

      return {
        ...metric,
        percent,
        status: resolveComparisonStatus(percent),
        summary: buildComparisonSummary({ ...metric, percent }),
      };
    });
  const recentDateKeys = buildRecentDateKeys(30);
  const engagementByDate = visiblePosts.reduce<Record<string, number>>((acc, post) => {
    acc[post.date] = (acc[post.date] ?? 0) + post.engagement;
    return acc;
  }, {});
  const dailyRows = recentDateKeys.map((date) => ({
    date,
    views: Math.max(0, safeDayViewsByDate[date] ?? 0),
    reach: Math.max(0, safeDayReachByDate[date] ?? 0),
    engagement: Math.max(0, engagementByDate[date] ?? 0),
    followers: Math.max(0, safeDashboardDailyFollowers[date] ?? 0),
  }));
  const hasEvolutionData = dailyRows.some((entry) => entry.views > 0 || entry.reach > 0 || entry.engagement > 0 || entry.followers > 0);
  let cumulativeViews = 0;
  let cumulativeReach = 0;
  const evolutionData = dailyRows.map((entry) => {
    cumulativeViews += entry.views;
    cumulativeReach += entry.reach;
    const entryDate = new Date(`${entry.date}T12:00:00`);
    const isCurrentMonthEntry =
      entryDate.getFullYear() === new Date().getFullYear() && entryDate.getMonth() === new Date().getMonth();
    const projectedMeta = isCurrentMonthEntry
      ? Math.round((monthlyViewsGoal / new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()) * entryDate.getDate())
      : 0;

    return {
      date: entry.date,
      label: formatAxisDateLabel(entry.date),
      views: cumulativeViews,
      reach: cumulativeReach,
      projectedMeta,
    };
  });
  const currentProjectedMeta = evolutionData[evolutionData.length - 1]?.projectedMeta ?? 0;
  const chartWidth = 760;
  const chartHeight = 340;
  const chartPadding = 30;
  const chartMaxValue = Math.max(
    1,
    ...evolutionData.map((item) => Math.max(item.views, item.reach, item.projectedMeta)),
  );
  const viewsPolyline = buildSvgLinePoints(evolutionData.map((item) => item.views), chartWidth, chartHeight, chartPadding, chartMaxValue);
  const reachPolyline = buildSvgLinePoints(evolutionData.map((item) => item.reach), chartWidth, chartHeight, chartPadding, chartMaxValue);
  const projectedPolyline = buildSvgLinePoints(evolutionData.map((item) => item.projectedMeta), chartWidth, chartHeight, chartPadding, chartMaxValue);
  const viewsArea = buildSvgAreaPoints(evolutionData.map((item) => item.views), chartWidth, chartHeight, chartPadding, chartMaxValue);
  const reachArea = buildSvgAreaPoints(evolutionData.map((item) => item.reach), chartWidth, chartHeight, chartPadding, chartMaxValue);
  const chartTicks = [1, 0.75, 0.5, 0.25, 0].map((ratio) => ({
    ratio,
    y: chartHeight - chartPadding - ratio * (chartHeight - chartPadding * 2),
    value: Math.round(chartMaxValue * ratio),
  }));
  const paceSummary =
    monthViews > currentProjectedMeta
      ? "Desempenho acima do esperado"
      : monthViews < currentProjectedMeta
        ? "Ritmo atual insuficiente para atingir a meta"
        : "Meta sendo atingida conforme planejado";
  const lastEvolutionPoint = evolutionData[evolutionData.length - 1] ?? { views: 0, reach: 0, projectedMeta: 0 };
  const dashboardDateRange = formatDashboardDateRange();

  return (
    <PageTransition>
      <div style={isDark ? instagramThemeDark : instagramThemeLight} className="space-y-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-end">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="inline-flex items-center gap-3 rounded-2xl border border-border/70 bg-white/90 px-4 py-3 text-sm text-foreground shadow-[0_10px_28px_rgba(15,23,42,0.05)] dark:bg-white/5">
              <span className="text-muted-foreground">ðŸ“…</span>
              <span>{dashboardDateRange}</span>
            </div>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border/70 bg-white/90 px-4 py-3 text-sm font-semibold text-foreground shadow-[0_10px_28px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 dark:bg-white/5"
            >
              <span>⇩</span>
              Exportar relatório
            </button>
          </div>
        </div>

        <div className={showOverallGoalCard ? "grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]" : "grid gap-6 xl:grid-cols-1"}>
          {showOverallGoalCard ? (
            <DashboardSectionBoundary title="Resumo do dashboard">
              <GlassPanel
                className="sticky top-4 flex flex-col items-center justify-center overflow-hidden p-6 text-white shadow-[0_28px_60px_rgba(131,58,180,0.18)]"
                index={1}
                dataCy="dashboard-summary"
                style={{
                  background: isDark
                    ? "linear-gradient(145deg, rgba(131,58,180,0.95) 0%, rgba(225,48,108,0.92) 52%, rgba(245,96,64,0.9) 100%)"
                    : "linear-gradient(145deg, #833AB4 0%, #E1306C 52%, #F56040 100%)",
                  borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.10)",
                }}
              >
                <InstagramHealthScoreRing score={dashboardSummary.healthScore} />
                <div className="mt-5 grid w-full gap-3">
                  <div className="rounded-2xl bg-white/12 p-4 text-center backdrop-blur dark:bg-white/7">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-white/72">Alcance do mês</p>
                    <p data-cy="dashboard-summary-reach" className="mt-2 text-[1.85rem] font-semibold text-white">
                      {formatLongNumber(dashboardSummary.monthReach)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/12 p-4 text-center backdrop-blur dark:bg-white/7">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-white/72">Visualizações do mês</p>
                    <p className="mt-2 text-[1.85rem] font-semibold text-white">{formatLongNumber(dashboardSummary.monthViews)}</p>
                  </div>
                  <div className="rounded-2xl bg-white/12 p-4 text-center backdrop-blur dark:bg-white/7">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-white/72">Falta para a meta</p>
                    <p className="mt-2 text-[1.85rem] font-semibold text-white">{formatLongNumber(dashboardSummary.remainingViews)}</p>
                  </div>
                </div>
              </GlassPanel>
            </DashboardSectionBoundary>
          ) : null}

          <div className="space-y-6">
            <div className="grid gap-4 xl:grid-cols-3">
            {dashboardMetrics.map((metric, index) => {
              const Icon = metricIcons[index];

              return (
                <DashboardMetricCard
                  key={metric.id}
                  icon={Icon}
                  label={metric.label}
                  value={metric.value}
                  change={metric.change}
                  detail={metric.highlight}
                  darkMode={isDark}
                  dataCy={`dashboard-metric-${metric.id}`}
                />
              );
            })}
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <DashboardSectionBoundary title="Evolução nos últimos 30 dias">
                <GlassPanel
                  index={5}
                  className="bg-white/95"
                  dataCy="dashboard-evolution"
                  style={
                    isDark
                      ? {
                          background: "linear-gradient(180deg, rgba(16,18,24,0.98), rgba(10,12,17,0.96))",
                          borderColor: "rgba(255,255,255,0.08)",
                        }
                      : {
                          background: "rgba(255,255,255,0.95)",
                          borderColor: "rgba(229,231,238,0.82)",
                          boxShadow: "0 16px 44px rgba(15,23,42,0.08)",
                        }
                  }
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <SectionTitle
                        title="Evolução nos últimos 30 dias"
                        description="Leitura diária de crescimento, estabilidade ou queda a partir dos dados cadastrados pelo usuário."
                      />
                      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full bg-[#E1306C]" />
                          Visualizações reais
                        </span>
                        <span className="inline-flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full bg-[#833AB4]" />
                          Alcance real
                        </span>
                        <span className="inline-flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full bg-[#94A3B8]" />
                          Meta projetada
                        </span>
                      </div>
                    </div>
                    <div className="inline-flex rounded-2xl border border-border/70 bg-white/85 p-1 text-xs shadow-[0_8px_20px_rgba(15,23,42,0.04)] dark:bg-white/5">
                      <span className="rounded-xl bg-foreground px-3 py-1.5 font-semibold text-background">Diário</span>
                      <span className="px-3 py-1.5 text-muted-foreground">Semanal</span>
                      <span className="px-3 py-1.5 text-muted-foreground">Mensal</span>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px]">
                    <div className="overflow-hidden rounded-[1.8rem] border border-border/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.86),rgba(248,250,252,0.98))] p-4 dark:bg-[linear-gradient(180deg,rgba(17,23,35,0.98),rgba(12,18,29,0.98))]">
                      <div className="h-[350px]">
                        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-full w-full" role="img" aria-label="Gráfico de evolução do dashboard">
                          <defs>
                            <linearGradient id="viewsFill" x1="0" x2="0" y1="0" y2="1">
                              <stop offset="0%" stopColor="rgba(225,48,108,0.24)" />
                              <stop offset="100%" stopColor="rgba(225,48,108,0.02)" />
                            </linearGradient>
                            <linearGradient id="reachFill" x1="0" x2="0" y1="0" y2="1">
                              <stop offset="0%" stopColor="rgba(131,58,180,0.18)" />
                              <stop offset="100%" stopColor="rgba(131,58,180,0.02)" />
                            </linearGradient>
                          </defs>
                          {chartTicks.map((tick) => (
                            <g key={tick.ratio}>
                              <line x1={chartPadding} y1={tick.y} x2={chartWidth - chartPadding} y2={tick.y} stroke="rgba(148,163,184,0.16)" strokeDasharray="4 8" />
                              <text x={8} y={tick.y + 4} fontSize="11" fill="rgba(100,116,139,1)">{formatCompactNumber(tick.value)}</text>
                            </g>
                          ))}
                          <polygon fill="url(#reachFill)" points={reachArea} />
                          <polygon fill="url(#viewsFill)" points={viewsArea} />
                          <polyline fill="none" stroke="#94A3B8" strokeWidth="2.5" strokeDasharray="8 8" points={projectedPolyline} />
                          <polyline fill="none" stroke="#833AB4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={reachPolyline} />
                          <polyline fill="none" stroke="#E1306C" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" points={viewsPolyline} />
                          {(() => {
                            const lastIndex = evolutionData.length - 1;
                            const lastX = chartPadding + (lastIndex <= 0 ? (chartWidth - chartPadding * 2) / 2 : (lastIndex / lastIndex) * (chartWidth - chartPadding * 2));
                            const usableHeight = chartHeight - chartPadding * 2;
                            const lastViewsY = chartHeight - chartPadding - (Math.max(0, lastEvolutionPoint.views) / chartMaxValue) * usableHeight;
                            const lastReachY = chartHeight - chartPadding - (Math.max(0, lastEvolutionPoint.reach) / chartMaxValue) * usableHeight;
                            return (
                              <>
                                <circle cx={lastX} cy={lastViewsY} r="5" fill="#E1306C" />
                                <circle cx={lastX} cy={lastReachY} r="5" fill="#833AB4" />
                              </>
                            );
                          })()}
                          {evolutionData.map((item, index) => {
                            if (index % 5 !== 0 && index !== evolutionData.length - 1) {
                              return null;
                            }
                            const x = chartPadding + (evolutionData.length === 1 ? (chartWidth - chartPadding * 2) / 2 : (index / (evolutionData.length - 1)) * (chartWidth - chartPadding * 2));
                            return <text key={item.date} x={x} y={chartHeight - 6} textAnchor="middle" fontSize="11" fill="rgba(100,116,139,1)">{item.label}</text>;
                          })}
                        </svg>
                      </div>
                    </div>
                    <div className="grid gap-3">
                      <div className="rounded-[1.6rem] border border-border/60 bg-white/72 px-4 py-4 dark:bg-white/5">
                        <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Visualizações atuais</p>
                        <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{formatLongNumber(lastEvolutionPoint.views)}</p>
                        <p className="mt-1 text-sm text-[#E1306C]">Faltam {formatLongNumber(remainingViews)} para a meta</p>
                      </div>
                      <div className="rounded-[1.6rem] border border-border/60 bg-white/72 px-4 py-4 dark:bg-white/5">
                        <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Meta do mês</p>
                        <p className="mt-2 text-2xl font-semibold text-foreground">{formatLongNumber(monthlyViewsGoal)}</p>
                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-[linear-gradient(90deg,#833AB4_0%,#E1306C_60%,#F56040_100%)]" style={{ width: `${Math.min((monthViews / Math.max(monthlyViewsGoal, 1)) * 100, 100)}%` }} />
                        </div>
                      </div>
                      <div className="rounded-[1.6rem] border border-border/60 bg-white/72 px-4 py-4 dark:bg-white/5">
                        <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Projeção</p>
                        <p className="mt-2 text-2xl font-semibold text-foreground">{formatLongNumber(currentProjectedMeta)}</p>
                        <p className="mt-1 text-sm text-emerald-600 dark:text-emerald-400">{paceSummary}</p>
                      </div>
                    </div>
                  </div>
                  {!hasEvolutionData ? (
                    <div className="mt-4 rounded-2xl border border-dashed border-border/70 bg-white/70 px-4 py-4 text-center text-sm text-muted-foreground dark:bg-white/5">
                      O gráfico já está pronto. Assim que você lançar dados diários, as curvas reais começam a subir aqui.
                    </div>
                  ) : null}
                </GlassPanel>
              </DashboardSectionBoundary>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <DashboardSectionBoundary title="Resumo de conteúdo">
          <GlassPanel
            index={2}
            className="bg-white/95"
            dataCy="dashboard-content-summary"
            style={
              isDark
                ? {
                    background: "linear-gradient(180deg, rgba(16,18,24,0.98), rgba(10,12,17,0.96))",
                    borderColor: "rgba(255,255,255,0.08)",
                  }
                : {
                    background: "rgba(255,255,255,0.95)",
                    borderColor: "rgba(229,231,238,0.82)",
                    boxShadow: "0 16px 44px rgba(15,23,42,0.08)",
                  }
            }
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <SectionTitle
                title="Resumo de conteúdo"
                description="Um panorama rápido do que mais performou e do que precisa de atenção na aba de conteúdo."
              />
              <Link
                to="/content"
                className="text-sm font-semibold text-[#833AB4] transition hover:text-[#6C2CA1] dark:text-[#ff9db2] dark:hover:text-[#ffc0cd]"
              >
                Ver aba conteúdo
              </Link>
            </div>
            <div className="mt-5 grid gap-5 xl:grid-cols-2">
              <div className="rounded-[1.8rem] border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(249,249,251,0.98))] p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)] dark:bg-[linear-gradient(180deg,rgba(16,18,24,0.98),rgba(10,12,17,0.96))]">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Top conteúdos</p>
                    <p className="text-xs text-muted-foreground">Os posts com melhor desempenho no recorte atual.</p>
                  </div>
                  <span className="rounded-full bg-[#833AB4]/8 px-3 py-1 text-xs font-semibold text-[#6C2CA1] dark:bg-white/5 dark:text-[#ff9db2]">
                    Melhor resultado
                  </span>
                </div>
                <div className="space-y-2.5">
                  {topPosts.length > 0 ? topPosts.map((post, index) => {
                    const member = teamMembers.find((item) => item.id === post.authorId) ?? fallbackMember;

                    return (
                      <Link
                        key={post.id}
                        to={`/post/${post.id}`}
                        className="grid grid-cols-[34px_minmax(0,1fr)_78px_82px] items-center gap-3 rounded-2xl border border-border/60 bg-white/78 px-3 py-3 transition hover:-translate-y-0.5 hover:border-[#833AB4]/16 hover:shadow-[0_12px_24px_rgba(131,58,180,0.07)] dark:border-white/8 dark:bg-white/5"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[linear-gradient(135deg,rgba(131,58,180,0.12),rgba(225,48,108,0.12),rgba(245,96,64,0.1))] text-xs font-semibold text-[#833AB4]">
                          {index + 1}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">{post.title}</p>
                          <p className="truncate text-xs text-muted-foreground">{member.name} • {post.date}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Views</p>
                          <p className="text-sm font-semibold text-foreground">{formatCompactNumber(asNumber(post.reach))}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Eng.</p>
                          <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">+{formatCompactNumber(asNumber(post.engagement))}</p>
                        </div>
                      </Link>
                    );
                  }) : (
                    <EmptyState
                      title="Nenhum conteúdo cadastrado"
                      description="Assim que você inserir conteúdos na aba de conteúdo, o resumo aparece aqui."
                    />
                  )}
                </div>
              </div>

              <div className="rounded-[1.8rem] border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(249,249,251,0.98))] p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)] dark:bg-[linear-gradient(180deg,rgba(16,18,24,0.98),rgba(10,12,17,0.96))]">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Conteúdos com baixa performance</p>
                    <p className="text-xs text-muted-foreground">Peças que pedem ajuste de gancho, CTA ou formato.</p>
                  </div>
                  <span className="rounded-full bg-[#F56040]/8 px-3 py-1 text-xs font-semibold text-[#B94A2D] dark:bg-[#251913] dark:text-[#ffab8c]">
                    Atenção
                  </span>
                </div>
                <div className="space-y-2.5">
                  {worstPosts.length > 0 ? worstPosts.map((post) => {
                    const member = teamMembers.find((item) => item.id === post.authorId) ?? fallbackMember;

                    return (
                      <Link
                        key={post.id}
                        to={`/post/${post.id}`}
                        className="grid grid-cols-[minmax(0,1fr)_78px_82px] items-center gap-3 rounded-2xl border border-[#F56040]/10 bg-[linear-gradient(135deg,rgba(255,248,250,0.92),rgba(255,245,240,0.94))] px-3 py-3 transition hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(245,96,64,0.08)] dark:border-[#F56040]/16 dark:bg-[linear-gradient(180deg,rgba(29,23,25,0.98),rgba(22,18,19,0.98))]"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">{post.title}</p>
                          <p className="truncate text-xs text-muted-foreground">{member.name} • {post.date}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Views</p>
                          <p className="text-sm font-semibold text-foreground">{formatCompactNumber(asNumber(post.reach))}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Eng.</p>
                          <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">{formatCompactNumber(asNumber(post.engagement))}</p>
                        </div>
                      </Link>
                    );
                  }) : (
                    <EmptyState
                      title="Sem conteúdos para comparar"
                      description="Quando houver volume suficiente, essa área mostra os posts com menor tração."
                    />
                  )}
                </div>
              </div>
            </div>
          </GlassPanel>
        </DashboardSectionBoundary>
          <DashboardSectionBoundary title="Comparação meta vs resultado">
          <GlassPanel
            index={4}
            className="bg-white/95"
            dataCy="dashboard-goals"
            style={
              isDark
                ? {
                    background: "linear-gradient(180deg, rgba(16,18,24,0.98), rgba(10,12,17,0.96))",
                    borderColor: "rgba(255,255,255,0.08)",
                  }
                : {
                    background: "rgba(255,255,255,0.95)",
                    borderColor: "rgba(229,231,238,0.82)",
                    boxShadow: "0 16px 44px rgba(15,23,42,0.08)",
                  }
            }
          >
            <SectionTitle
              title="Comparação meta vs resultado"
              description="Metas e resultados cadastrados pelo usuário no ciclo atual."
            />
              <div className="mt-5 space-y-5">
                {comparisonMetrics.length > 0 ? comparisonMetrics.map((metric) => {
                  const goalCardClassName = isDark
                    ? "rounded-3xl bg-[#11151d] p-5"
                    : "rounded-3xl border border-border/70 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.06)]";

                  return (
                    <div
                      key={metric.id}
                      className={goalCardClassName}
                      style={isDark ? { background: "rgba(16,18,24,0.98)" } : undefined}
                    >
                      <div className="flex flex-col gap-3">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-3">
                            <h3 className="text-base font-semibold text-foreground">{metric.label}</h3>
                            <span className="text-sm font-semibold text-[#833AB4]">{formatPercent(metric.percent, 0)}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-sm text-muted-foreground">
                            <p>Resultado<br /><span className="font-semibold text-foreground">{formatLongNumber(metric.actual)}</span></p>
                            <p>Meta<br /><span className="font-semibold text-foreground">{formatLongNumber(metric.goal)}</span></p>
                          </div>
                        </div>
                      </div>
                      <div className="mt-3">
                        <DashboardProgressBar value={metric.actual} max={metric.goal} label={metric.label} />
                      </div>
                    </div>
                  );
                }) : (
                <EmptyState
                  title="Nenhuma meta cadastrada"
                  description="Cadastre metas de visualizações, alcance, engajamento ou seguidores para ver a comparação por aqui."
                />
              )}
            </div>
          </GlassPanel>
          </DashboardSectionBoundary>
        </div>
      </div>
    </PageTransition>
  );
}
