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
import { goals as seedGoals, getGoalResponsibleIds, type Goal } from "../data/mockData";
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
} from "../components/ui";

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
  const [goals] = useSupabaseSyncedListState<Goal>({ key: "goals", table: "goals", fallback: seedGoals });
  const member = teamMembers.find((item) => String(item.id) === params.id) ?? teamMembers[0];
  const memberGoals = goals.filter((goal) => getGoalResponsibleIds(goal).includes(member.id));
  const overdueGoals = memberGoals.filter((goal) => getGoalStatus(goal).tone === "danger");
  const panelBackground = isDark
    ? `linear-gradient(180deg, rgba(24,24,26,0.98), ${member.color}12)`
    : `linear-gradient(180deg, rgba(255,255,255,0.99), rgba(252,252,253,0.98))`;
  const lightCardClass = "rounded-3xl border border-border/60 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]";
  const darkCardClass = "rounded-3xl border border-border/60 bg-[#171c25]";

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
    </PageTransition>
  );
}
