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
import { getGoalResponsibleIds, type Goal } from "../data/mockData";
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

export function MemberProfilePage() {
  const navigate = useNavigate();
  const params = useParams();
  const { isDark } = useThemeMode();
  const [teamMembers] = useTeamProfiles();
  const [goals] = useSupabaseSyncedListState<Goal>({ key: "goals", table: "goals", fallback: [] });
  const member = teamMembers.find((item) => String(item.id) === params.id) ?? teamMembers[0];
  const memberGoals = goals.filter((goal) => getGoalResponsibleIds(goal).includes(member.id));
  const panelBackground = isDark
    ? `linear-gradient(180deg, rgba(24,24,26,0.98), ${member.color}12)`
    : `linear-gradient(180deg, rgba(255,255,255,0.98), ${member.color}08)`;

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Team"
        title="Performance individual do time criativo"
        description="Visualize especialidades, produção recente e evolução de qualidade para cada membro da operação."
        actions={
          <div className="flex flex-wrap gap-2">
            {teamMembers.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(`/member/${item.id}`)}
                className="rounded-full px-4 py-2 text-sm font-medium transition"
                style={{
                  backgroundColor: item.id === member.id ? `${item.color}18` : "rgb(var(--muted) / 1)",
                  color: item.id === member.id ? item.color : "rgb(var(--muted-foreground) / 1)",
                  boxShadow: item.id === member.id ? `0 12px 24px ${item.color}18` : "none",
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
            style={{ backgroundColor: isDark ? `${member.color}14` : `${member.color}08` }}
          >
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Performance Score</p>
            <p className="mt-2 text-5xl font-semibold text-foreground">{member.stats.performance}</p>
          </div>
        </div>

        <div className="mt-6">
          <DetailGrid
            items={[
              { label: "Posts Criados", value: String(member.stats.postsCreated) },
              { label: "Engajamento Médio", value: `${member.stats.avgEngagement}%` },
              { label: "Metas Completadas", value: String(member.stats.goalsCompleted) },
              { label: "Pontualidade", value: `${member.stats.punctuality}%` },
            ]}
          />
        </div>
      </GlassPanel>

      <div className="grid gap-6 2xl:grid-cols-2">
        <GlassPanel index={2} style={{ background: panelBackground, borderColor: `${member.color}18` }}>
          <SectionTitle
            title="Performance geral"
            description="Leitura de capacidade criativa, execução e consistência."
          />
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
          <SectionTitle
            title="Posts por mês"
            description="Volume recente de entregas por ciclo."
          />
          <div className="mt-6 h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={member.monthlyPosts} margin={{ top: 10, right: 12, left: -16, bottom: 0 }}>
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "rgb(var(--muted-foreground) / 1)", fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: "rgb(var(--muted-foreground) / 1)", fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="posts" radius={[12, 12, 4, 4]} fill={member.color} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassPanel>
      </div>

      <GlassPanel index={4}>
        <SectionTitle
          title="Metas atribuídas"
          description="Panorama das metas sob responsabilidade deste membro."
        />
          <div className="mt-5 grid gap-4">
            {memberGoals.map((goal) => (
            <div
              key={goal.id}
              className="rounded-3xl p-5"
              style={{ backgroundColor: isDark ? `${member.color}12` : `${member.color}08` }}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{goal.name}</h3>
                  <p className="text-sm text-muted-foreground">Prazo: {goal.deadline}</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Atual {goal.current} / Meta {goal.target}
                </p>
              </div>
              <div className="mt-4">
                <MemberProgressBar value={goal.current} max={goal.target} color={member.color} />
              </div>
            </div>
          ))}
        </div>
      </GlassPanel>
    </PageTransition>
  );
}
