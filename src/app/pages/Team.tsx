import { useEffect, useMemo, useState } from "react";
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
import { RefreshCw } from "lucide-react";
import { useAuthSession } from "../auth";
import { useTeamProfiles } from "../data/profiles";
import { useThemeMode } from "../theme";
import { Avatar, DetailGrid, GlassPanel, IconActionButton, PageHeader, PageTransition, SectionTitle } from "../components/ui";

export function TeamPage() {
  const { isDark } = useThemeMode();
  const [teamMembers, , refreshTeamData] = useTeamProfiles();
  const { session } = useAuthSession();
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const currentMember = useMemo(
    () => teamMembers.find((member) => member.userId === session?.user.id) ?? null,
    [session?.user.id, teamMembers],
  );

  useEffect(() => {
    const selectedExists = selectedMemberId === null ? false : teamMembers.some((member) => member.id === selectedMemberId);

    if (selectedMemberId === null || !selectedExists) {
      setSelectedMemberId(currentMember?.id ?? teamMembers[0]?.id ?? null);
    }
  }, [currentMember?.id, selectedMemberId, teamMembers]);

  const selectedMember = useMemo(
    () => teamMembers.find((member) => member.id === selectedMemberId) ?? teamMembers[0] ?? null,
    [selectedMemberId, teamMembers],
  );

  const panelBackground = isDark
    ? `linear-gradient(180deg, rgba(24,24,26,0.98), ${selectedMember?.color ?? "#8b5cf6"}12)`
    : `linear-gradient(180deg, rgba(255,255,255,0.99), rgba(252,252,253,0.98))`;

  const handleRefresh = async () => {
    setIsRefreshing(true);

    try {
      await refreshTeamData();
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!selectedMember) {
    return (
      <PageTransition>
        <PageHeader
          eyebrow="Equipe"
          title="Performance individual do time criativo"
          description="Nenhum membro encontrado para exibir."
        />
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div
        className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pb-8 sm:px-6 lg:px-8"
        style={
          isDark
            ? { background: "linear-gradient(180deg, rgba(15,18,25,0.94), rgba(11,14,20,0.98))" }
            : { background: "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(246,252,245,0.96))" }
        }
      >
        <PageHeader
          eyebrow="Equipe"
          title="Performance individual do time criativo"
          description="Visualize especialidades, produção recente e evolução de qualidade para cada membro da operação."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <IconActionButton
                icon={RefreshCw}
                label="Atualizar dados"
                title="Atualizar dados"
                onClick={() => {
                  void handleRefresh();
                }}
                className={isRefreshing ? "animate-spin" : undefined}
              />
              {teamMembers.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedMemberId(item.id)}
                  className="rounded-full px-4 py-2 text-sm font-medium transition focus:outline-none focus-visible:outline-none"
                  style={{
                    backgroundColor: item.id === selectedMember.id ? `${item.color}18` : "rgb(var(--muted) / 1)",
                    color: item.id === selectedMember.id ? item.color : "rgb(var(--muted-foreground) / 1)",
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
            borderColor: `${selectedMember.color}22`,
            boxShadow: `0 18px 36px ${selectedMember.color}10`,
          }}
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-5">
              <Avatar name={selectedMember.name} color={selectedMember.color} src={selectedMember.avatarUrl} size="lg" />
              <div className="space-y-2">
                <h2 className="text-3xl font-semibold tracking-tight text-foreground">{selectedMember.name}</h2>
                <p className="text-base text-muted-foreground">{selectedMember.role}</p>
                <p className="text-sm text-muted-foreground">{selectedMember.specialty}</p>
              </div>
            </div>

            <div
              className="rounded-3xl px-6 py-5 text-center"
              style={{ backgroundColor: isDark ? `${selectedMember.color}14` : "rgba(255,255,255,0.98)" }}
            >
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Performance Score</p>
              <p className="mt-2 text-5xl font-semibold text-foreground">{selectedMember.stats.performance}</p>
            </div>
          </div>

          <div className="mt-6">
            <DetailGrid
              items={[
                { label: "Posts Criados", value: String(selectedMember.stats.postsCreated) },
                { label: "Visualizacoes do mes", value: new Intl.NumberFormat("pt-BR").format(selectedMember.stats.monthlyViews ?? 0) },
                { label: "Engajamento Medio", value: `${selectedMember.stats.avgEngagement}%` },
                { label: "Metas Completadas", value: String(selectedMember.stats.goalsCompleted) },
                { label: "Pontualidade", value: `${selectedMember.stats.punctuality}%` },
              ]}
            />
          </div>
        </GlassPanel>

        <div className="grid gap-6 2xl:grid-cols-2">
          <GlassPanel
            index={2}
            style={{
              background: panelBackground,
              borderColor: `${selectedMember.color}18`,
            }}
          >
            <SectionTitle title="Performance geral" description="Leitura de capacidade criativa, execução e consistência." />
            <div className="mt-6 h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={selectedMember.radar}>
                  <PolarGrid stroke="rgb(var(--border) / 0.5)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: "rgb(var(--muted-foreground) / 1)", fontSize: 12 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} tickLine={false} axisLine={false} />
                  <Radar dataKey="value" stroke={selectedMember.color} fill={selectedMember.color} fillOpacity={0.32} strokeWidth={2} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </GlassPanel>

          <GlassPanel
            index={3}
            style={{
              background: panelBackground,
              borderColor: `${selectedMember.color}18`,
            }}
          >
            <SectionTitle title="Posts por mês" description="Volume recente de entregas por ciclo." />
            <div className="mt-6 h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={selectedMember.monthlyPosts} margin={{ top: 10, right: 12, left: -16, bottom: 0 }}>
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "rgb(var(--muted-foreground) / 1)", fontSize: 12 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "rgb(var(--muted-foreground) / 1)", fontSize: 12 }}
                  />
                  <Tooltip />
                  <Bar dataKey="posts" radius={[12, 12, 4, 4]} fill={selectedMember.color} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </GlassPanel>
        </div>
      </div>
    </PageTransition>
  );
}
