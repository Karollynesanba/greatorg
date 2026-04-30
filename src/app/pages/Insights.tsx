import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Clock3, Lightbulb, TrendingDown, TrendingUp, Zap } from "lucide-react";
import { contentDistribution, insights } from "../data/mockData";
import { GlassPanel, PageHeader, PageTransition, SectionTitle } from "../components/ui";

const distributionNotes: Record<string, string> = {
  Reels: "Maior força para alcance e descoberta.",
  Stories: "Excelente para frequência e proximidade diária.",
  Carrossel: "Bom para salvar, revisar e educar com profundidade.",
  Feed: "Apoia posicionamento e reforço institucional.",
};

const cards = [
  {
    title: "Melhor horário",
    icon: Clock3,
    value: `${insights.bestTime.day}, ${insights.bestTime.hour}`,
    detail: `${insights.bestTime.engagement}% acima da média de engajamento`,
    color: "#E50914",
    chip: "Janela ideal",
  },
  {
    title: "Melhor tipo de conteúdo",
    icon: TrendingUp,
    value: insights.bestContent.type,
    detail: `${insights.bestContent.avgEngagement} de engajamento médio e ${insights.bestContent.avgReach} de alcance`,
    color: "#B00000",
    chip: "Formato vencedor",
  },
  {
    title: "Pior desempenho",
    icon: TrendingDown,
    value: insights.worstContent.type,
    detail: `${insights.worstContent.avgEngagement} de engajamento médio e ${insights.worstContent.avgReach} de alcance`,
    color: "#F97316",
    chip: "Atenção",
  },
  {
    title: "Tendência de crescimento",
    icon: Zap,
    value: insights.growthTrend.rate,
    detail: insights.growthTrend.prediction,
    color: "#E50914",
    chip: insights.growthTrend.direction,
  },
];

export function InsightsPage() {
  return (
    <PageTransition>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pb-8 sm:px-6 lg:px-8">
        <PageHeader
          eyebrow="INSIGHTS"
          title="Insights acionáveis para o próximo ciclo"
          description="Dados transformados em recomendações práticas para orientar conteúdos, metas e performance."
        />

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((card, index) => {
            const Icon = card.icon;

            return (
              <GlassPanel
                key={card.title}
                index={index + 1}
                className="h-full overflow-hidden border-border/60 p-6"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(250,250,250,0.94) 100%)",
                  borderColor: `${card.color}20`,
                  boxShadow: `0 16px 32px ${card.color}10`,
                }}
              >
                <div className="flex h-full flex-col justify-between gap-6">
                  <div className="space-y-4">
                    <div
                      className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border"
                      style={{
                        backgroundColor: `${card.color}10`,
                        borderColor: `${card.color}18`,
                        color: card.color,
                      }}
                    >
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="space-y-2">
                      <span className="inline-flex rounded-full bg-muted/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        {card.chip}
                      </span>
                      <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                      <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[2rem]">{card.value}</h2>
                    </div>
                  </div>

                  <p className="text-sm leading-6 text-muted-foreground">{card.detail}</p>
                </div>
              </GlassPanel>
            );
          })}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <GlassPanel index={5} className="overflow-hidden p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <SectionTitle
                title="Distribuição de conteúdo"
                description="Percentual de publicações por formato dentro do mês."
              />
              <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-muted/45 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                Mix editorial
              </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-center">
              <div className="relative flex min-h-[360px] items-center justify-center rounded-[2rem] border border-border/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(250,250,250,0.92))] p-4">
                <div className="absolute inset-4 rounded-[2rem] border border-dashed border-border/40" />
                <div className="relative h-[320px] w-full max-w-[440px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={contentDistribution}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={78}
                        outerRadius={122}
                        paddingAngle={5}
                        stroke="rgba(255,255,255,0.7)"
                        strokeWidth={2}
                      >
                        {contentDistribution.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          borderRadius: 18,
                          border: "1px solid rgb(var(--border) / 0.65)",
                          backgroundColor: "rgb(var(--card) / 0.96)",
                          boxShadow: "0 18px 48px rgba(15,23,42,0.12)",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="rounded-full border border-border/60 bg-white/92 px-5 py-3 text-center shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Volume total</p>
                      <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">100%</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                {contentDistribution.map((item) => (
                  <div
                    key={item.name}
                    className="rounded-[1.5rem] border border-border/60 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)]"
                    style={{ borderLeftColor: item.color, borderLeftWidth: 4 }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                          <p className="font-semibold text-foreground">{item.name}</p>
                        </div>
                        <p className="text-3xl font-semibold tracking-tight text-foreground">{item.value}%</p>
                      </div>
                      <span
                        className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                        style={{ backgroundColor: `${item.color}12`, color: item.color }}
                      >
                        Volume
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{distributionNotes[item.name]}</p>
                  </div>
                ))}
              </div>
            </div>
          </GlassPanel>

          <GlassPanel
            index={6}
            className="overflow-hidden border-rose-200/70 p-6"
            style={{
              background:
                "linear-gradient(180deg, rgba(253,236,236,0.98) 0%, rgba(255,255,255,0.98) 38%, rgba(255,245,245,0.96) 100%)",
              boxShadow: "0 20px 40px rgba(229,9,20,0.10)",
            }}
          >
            <SectionTitle
              title="Recomendações de alto impacto"
              description="Prioridades sugeridas a partir do comportamento recente dos conteúdos."
            />

            <div className="mt-6 space-y-3">
              {insights.recommendations.map((item, index) => (
                <div
                  key={item}
                  className="flex items-start gap-3 rounded-[1.5rem] border border-rose-100 bg-white/95 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]"
                >
                  <div
                    className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-600"
                  >
                    <Lightbulb className="h-4 w-4" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-rose-500">
                      Insight {String(index + 1).padStart(2, "0")}
                    </p>
                    <p className="text-sm leading-6 text-foreground">{item}</p>
                  </div>
                </div>
              ))}
            </div>
          </GlassPanel>
        </div>
      </div>
    </PageTransition>
  );
}
