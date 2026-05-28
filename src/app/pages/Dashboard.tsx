import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, Eye, Rocket, Sparkles, type LucideIcon } from "lucide-react";
import { getGoalResponsibleIds } from "../data/mockData";
import { usePosts } from "../data/posts";
import { useTeamProfiles } from "../data/profiles";
import { useSupabaseSyncedListState } from "../data/supabaseSync";
import { matchesTeamScope, useTeamScope } from "../data/teamScope";
import {
  GlassPanel,
  EmptyState,
  PageHeader,
  PageTransition,
  SectionTitle,
  formatCompactNumber,
  formatLongNumber,
} from "../components/ui";
import { useThemeMode } from "../theme";
import { type Goal } from "../data/mockData";

const metricIcons = [Eye, BarChart3, Sparkles, Rocket];

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
        <strong className="text-5xl font-semibold tracking-tight text-white">{score}</strong>
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
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  change: number;
  detail: string;
  darkMode?: boolean;
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

function ContentTypePill({ type }: { type: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[#833AB4]/12 bg-[#833AB4]/6 px-3 py-1 text-xs font-semibold text-[#6C2CA1] dark:border-[#ff9db2]/18 dark:bg-white/5 dark:text-[#ff9db2]">
      {type}
    </span>
  );
}

function SoftMemberChip({ name, role }: { name: string; role?: string }) {
  return (
    <div className="inline-flex items-center gap-3 rounded-full border border-[#833AB4]/10 bg-white/70 px-3 py-2 dark:border-white/8 dark:bg-white/5">
      <span className="h-2.5 w-2.5 rounded-full bg-[linear-gradient(135deg,#833AB4,#E1306C)]" />
      <div className="space-y-0.5">
        <p className="text-sm font-medium text-foreground">{name}</p>
        {role ? <p className="text-xs text-muted-foreground">{role}</p> : null}
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { isDark } = useThemeMode();
  const [teamMembers] = useTeamProfiles();
  const [posts] = usePosts();
  const [goals] = useSupabaseSyncedListState<Goal>({ key: "goals", table: "goals", fallback: [] });
  const [teamScope] = useTeamScope();
  const chartLegend = [
    { label: "Alcance", color: "#833AB4" },
    { label: "Engajamento", color: "#E1306C" },
  ];
  const visiblePosts = posts.filter((post) => matchesTeamScope(post.authorId, teamScope));
  const visibleGoals = goals.filter((goal) => getGoalResponsibleIds(goal).some((id) => matchesTeamScope(id, teamScope)));
  const topPosts = [...visiblePosts].sort((a, b) => b.engagement - a.engagement).slice(0, 5);
  const worstPosts = [...visiblePosts].sort((a, b) => a.engagement - b.engagement).slice(0, 2);
  const dashboardGoals = visibleGoals.slice(0, 3);
  const totalReach = visiblePosts.reduce((sum, post) => sum + post.reach, 0);
  const totalEngagement = visiblePosts.reduce((sum, post) => sum + post.engagement, 0);
  const completedGoals = visibleGoals.filter((goal) => goal.current >= goal.target).length;
  const healthScore = visibleGoals.length > 0 ? Math.round((completedGoals / visibleGoals.length) * 100) : 0;
  const showOverallGoalCard = teamScope === "todos";
  const dashboardSummary = {
    healthScore,
    completedGoals,
    totalReach,
    totalEngagement,
  };
  const dashboardMetrics = [
    {
      id: "reach",
      label: "Alcance",
      value: formatLongNumber(totalReach),
      change: 0,
      highlight: visiblePosts.length > 0 ? "Dados vindos do Supabase." : "Nenhum post encontrado no recorte.",
    },
    {
      id: "engagement",
      label: "Engajamento",
      value: formatLongNumber(totalEngagement),
      change: 0,
      highlight: visiblePosts.length > 0 ? "Soma de interações dos posts filtrados." : "Nenhum post encontrado no recorte.",
    },
    {
      id: "posts",
      label: "Publicações",
      value: String(visiblePosts.length),
      change: 0,
      highlight: visiblePosts.length > 0 ? "Quantidade total de conteúdos visíveis." : "Nenhum post encontrado no recorte.",
    },
    {
      id: "goals",
      label: "Metas concluídas",
      value: `${completedGoals}/${visibleGoals.length}`,
      change: 0,
      highlight: visibleGoals.length > 0 ? "Metas concluídas dentro do recorte selecionado." : "Nenhuma meta encontrada no recorte.",
    },
  ] as const;
  const evolutionBuckets = visiblePosts.reduce<Map<string, { date: string; reach: number; engagement: number }>>(
    (acc, post) => {
      const existing = acc.get(post.date) ?? { date: post.date, reach: 0, engagement: 0 };
      acc.set(post.date, {
        date: post.date,
        reach: existing.reach + post.reach,
        engagement: existing.engagement + post.engagement,
      });
      return acc;
    },
    new Map(),
  );
  const evolutionData = Array.from(evolutionBuckets.values()).sort((a, b) => a.date.localeCompare(b.date));

  return (
    <PageTransition>
      <div style={isDark ? instagramThemeDark : instagramThemeLight} className="space-y-6">
        <PageHeader
          eyebrow="Overview"
          title="Saúde completa do Instagram da Great"
          description="Uma leitura executiva da operação criativa, com performance, metas e alertas de conteúdo em um único lugar."
        />

        <div className={showOverallGoalCard ? "grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]" : "grid gap-6 xl:grid-cols-1"}>
          {showOverallGoalCard ? (
            <GlassPanel
              className="flex flex-col items-center justify-center overflow-hidden p-6 text-white shadow-[0_28px_60px_rgba(131,58,180,0.18)]"
              index={1}
              style={{
                background: isDark
                  ? "linear-gradient(145deg, rgba(131,58,180,0.95) 0%, rgba(225,48,108,0.92) 52%, rgba(245,96,64,0.9) 100%)"
                  : "linear-gradient(145deg, #833AB4 0%, #E1306C 52%, #F56040 100%)",
                borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.10)",
              }}
            >
              <InstagramHealthScoreRing score={dashboardSummary.healthScore} />
              <div className="mt-5 grid w-full gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-2xl bg-white/12 p-4 text-center backdrop-blur dark:bg-white/7">
                  <p className="text-xs uppercase tracking-[0.16em] text-white/72">Metas concluídas</p>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    {dashboardSummary.completedGoals}/{visibleGoals.length}
                  </p>
                </div>
                <div className="rounded-2xl bg-white/12 p-4 text-center backdrop-blur dark:bg-white/7">
                  <p className="text-xs uppercase tracking-[0.16em] text-white/72">Engajamento total</p>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    {formatLongNumber(dashboardSummary.totalEngagement)}
                  </p>
                </div>
              </div>
            </GlassPanel>
          ) : null}

          <div className="grid gap-6 md:grid-cols-2">
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
                />
              );
            })}
          </div>
        </div>

        <div className="grid gap-6 2xl:grid-cols-[1.1fr_0.9fr]">
          <GlassPanel
            index={2}
            className="bg-white/95"
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
              title="Top 5 conteúdos"
              description="Os posts que mais puxaram alcance, saves e conversa nas últimas semanas."
            />
            <div className="mt-5 space-y-3">
              {topPosts.length > 0 ? topPosts.map((post, index) => {
                const member = teamMembers.find((item) => item.id === post.authorId)!;

                return (
                  <Link
                    key={post.id}
                    to={`/post/${post.id}`}
                    className="flex flex-col gap-4 rounded-3xl border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(249,249,251,0.96))] p-4 transition duration-200 hover:-translate-y-0.5 hover:border-[#833AB4]/18 hover:shadow-[0_18px_36px_rgba(131,58,180,0.07)] sm:flex-row sm:items-center sm:justify-between dark:hover:border-[#833AB4]/30 dark:hover:shadow-[0_18px_36px_rgba(0,0,0,0.25)]"
                    style={
                      isDark
                        ? {
                            background: "linear-gradient(180deg, rgba(16,18,24,0.98), rgba(10,12,17,0.96))",
                            borderColor: "rgba(255,255,255,0.08)",
                          }
                        : {
                            borderColor: "rgba(229,231,238,0.78)",
                            boxShadow: "0 14px 34px rgba(15,23,42,0.05)",
                          }
                    }
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(131,58,180,0.12),rgba(225,48,108,0.12),rgba(245,96,64,0.1))] text-sm font-semibold text-[#833AB4] ring-1 ring-[#833AB4]/10">
                        #{index + 1}
                      </div>
                      <div className="flex h-16 w-24 items-center justify-center rounded-2xl border border-[#833AB4]/10 bg-[linear-gradient(135deg,rgba(131,58,180,0.08),rgba(225,48,108,0.08),rgba(245,176,69,0.08))] text-[#833AB4]">
                        <Sparkles className="h-5 w-5" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold text-foreground sm:text-base">{post.title}</h3>
                          <ContentTypePill type={post.type} />
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground sm:text-sm">
                          <span>{member.name}</span>
                          <span>{post.date}</span>
                          <span>{formatCompactNumber(post.reach)} de alcance</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Engajamento</p>
                      <p className="mt-1 text-lg font-semibold text-foreground">{formatLongNumber(post.engagement)}</p>
                    </div>
                  </Link>
                );
              }) : (
                <EmptyState
                  title="Nenhum post cadastrado"
                  description="Assim que você inserir conteúdos na tabela `posts`, eles aparecem aqui."
                />
              )}
            </div>
          </GlassPanel>

          <GlassPanel
            index={3}
            className="bg-white/95"
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
              title="Conteúdos com baixa performance"
              description="Peças que pedem ajuste imediato de gancho, CTA ou proposta editorial."
            />
            <div className="mt-5 grid gap-4">
              {worstPosts.length > 0 ? worstPosts.map((post) => {
                const member = teamMembers.find((item) => item.id === post.authorId)!;

                return (
                  <div
                    key={post.id}
                    className="rounded-3xl border border-[#E1306C]/12 bg-[linear-gradient(135deg,rgba(255,248,250,1),rgba(255,245,240,1))] p-5 dark:border-[#E1306C]/20"
                    style={
                      isDark
                        ? {
                            background: "linear-gradient(180deg, rgba(29,23,25,0.98), rgba(22,18,19,0.98))",
                            borderColor: "rgba(225,48,108,0.18)",
                          }
                        : {
                            background: "linear-gradient(135deg, rgba(255,248,250,0.98), rgba(255,245,240,0.98))",
                            borderColor: "rgba(225,48,108,0.10)",
                          }
                    }
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-full border border-[#E1306C]/12 bg-white/70 px-3 py-1 text-xs font-semibold text-[#B34B67] dark:border-[#ff9db2]/20 dark:bg-white/5 dark:text-[#ff9db2]">
                        {post.type}
                      </span>
                      <span className="inline-flex items-center rounded-full border border-[#F56040]/14 bg-[#F56040]/8 px-3 py-1 text-xs font-semibold text-[#B94A2D] dark:border-[#ffab8c]/18 dark:bg-[#251913] dark:text-[#ffab8c]">
                        Atenção suave
                      </span>
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-foreground">{post.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{post.description}</p>
                    <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <span>{member.name}</span>
                      <span>{formatLongNumber(post.engagement)} de engajamento</span>
                      <span>{formatCompactNumber(post.reach)} de alcance</span>
                    </div>
                    <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#E1306C]/8">
                      <div className="h-full w-1/2 rounded-full bg-[linear-gradient(90deg,#E1306C_0%,#F56040_100%)]" />
                    </div>
                  </div>
                );
              }) : (
                <EmptyState
                  title="Sem conteúdo para comparar"
                  description="Quando houver posts no Supabase, esta área mostra os que precisam de atenção."
                />
              )}
            </div>
          </GlassPanel>
        </div>

        <div className="grid gap-6 2xl:grid-cols-[0.95fr_1.05fr]">
          <GlassPanel
            index={4}
            className="bg-white/95"
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
              description="As três metas mais críticas do ciclo atual."
            />
              <div className="mt-5 space-y-5">
                {dashboardGoals.length > 0 ? dashboardGoals.map((goal) => {
                  const responsibleIds = getGoalResponsibleIds(goal);
                  const member = teamMembers.find((item) => item.id === responsibleIds[0]) ?? teamMembers[0];
                  const progress = (goal.current / goal.target) * 100;
                const goalCardClassName = isDark
                  ? "rounded-3xl bg-[#11151d] p-5"
                  : "rounded-3xl border border-border/70 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.06)]";

                return (
                  <div
                    key={goal.id}
                    className={goalCardClassName}
                    style={isDark ? { background: "rgba(16,18,24,0.98)" } : undefined}
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="space-y-2">
                        <h3 className="text-base font-semibold text-foreground">{goal.name}</h3>
                        <SoftMemberChip name={member.name} role={member.role} />
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="text-sm text-muted-foreground">
                          {goal.current} / {goal.target}
                        </p>
                        <p className="text-2xl font-semibold text-foreground">{progress.toFixed(0)}%</p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <DashboardProgressBar value={goal.current} max={goal.target} />
                    </div>
                  </div>
                );
              }) : (
                <EmptyState
                  title="Nenhuma meta cadastrada"
                  description="Adicione metas no Supabase para ver a comparação por aqui."
                />
              )}
            </div>
          </GlassPanel>

          <GlassPanel
            index={5}
            className="bg-white/95"
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
              title="Evolução nos últimos 30 dias"
              description="A curva conjunta de alcance e engajamento mostra aceleração sustentável."
            />
            <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
              {chartLegend.map((item) => (
                <span key={item.label} className="inline-flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.label}
                </span>
              ))}
            </div>
            <div className="mt-4 h-[360px]">
              {evolutionData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={evolutionData} margin={{ top: 10, right: 18, left: -12, bottom: 0 }}>
                    <defs>
                      <linearGradient id="reachGradient" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#833AB4" stopOpacity={0.32} />
                        <stop offset="100%" stopColor="#833AB4" stopOpacity={0.03} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgb(var(--border) / 0.5)" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "rgb(var(--muted-foreground) / 1)", fontSize: 12 }}
                    />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: "rgb(var(--muted-foreground) / 1)", fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 18,
                        border: "1px solid rgb(var(--border) / 0.65)",
                        backgroundColor: "rgb(var(--card) / 0.98)",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="reach"
                      stroke="#833AB4"
                      fill="url(#reachGradient)"
                      strokeWidth={3}
                    />
                    <Line type="monotone" dataKey="engagement" stroke="#E1306C" strokeWidth={2.5} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState
                  title="Sem evolução registrada"
                  description="Os gráficos aparecem quando houver posts cadastrados no Supabase."
                />
              )}
            </div>
          </GlassPanel>
        </div>
      </div>
    </PageTransition>
  );
}

