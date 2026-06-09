import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, Eye, RefreshCw, Sparkles, Target, Users } from "lucide-react";
import { toast } from "sonner";
import {
  emptyMetaInsightsPayload,
  metaPeriodDays,
  metaPeriods,
  type MetaInsightsPayload,
  type MetaPeriod,
} from "../data/metaInsights";
import { useSupabaseSharedState } from "../data/supabaseSync";
import {
  ActionButton,
  EmptyState,
  GlassPanel,
  MetricStat,
  PageHeader,
  PageTransition,
  ProgressBar,
  SectionTitle,
  formatCompactNumber,
  formatPercent,
  cn,
} from "../components/ui";
import { useMetaConfig } from "../data/metaConfig";
import { useThemeMode } from "../theme";

type LoadStatus = "loading" | "ready" | "error";

function formatDateTime(value: string) {
  if (!value) {
    return "Sem atualização";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatChartLabel(value: string) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(`${value}T12:00:00`));
}

function percentChange(current?: number, previous?: number) {
  if (!current) {
    return 0;
  }

  if (!previous) {
    return current > 0 ? 100 : 0;
  }

  return ((current - previous) / previous) * 100;
}

function sortDescending(items: { label: string; value: number }[]) {
  return [...items].sort((left, right) => right.value - left.value);
}

function LoadingState() {
  return (
    <div className="grid gap-6">
      <GlassPanel className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-5 w-40 rounded-full bg-muted" />
          <div className="h-10 w-3/4 rounded-2xl bg-muted/80" />
          <div className="h-5 w-full rounded-2xl bg-muted/70" />
        </div>
      </GlassPanel>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <GlassPanel key={index} className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-muted/80" />
              <div className="h-4 w-24 rounded-full bg-muted" />
              <div className="h-8 w-32 rounded-full bg-muted/70" />
              <div className="h-4 w-20 rounded-full bg-muted" />
            </div>
          </GlassPanel>
        ))}
      </div>

      <GlassPanel className="h-[420px] p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-5 w-48 rounded-full bg-muted" />
          <div className="h-[320px] rounded-[2rem] bg-muted/60" />
        </div>
      </GlassPanel>
    </div>
  );
}

export function MetaInsightsPage() {
  const { isDark } = useThemeMode();
  const [metaConfig] = useMetaConfig();
  const [cachedPayload, setCachedPayload, cachedReady] = useSupabaseSharedState<MetaInsightsPayload>({
    key: "meta-insights-latest",
    fallback: emptyMetaInsightsPayload,
  });
  const [period, setPeriod] = useState<MetaPeriod>("Mês");
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<MetaInsightsPayload>(emptyMetaInsightsPayload);

  useEffect(() => {
    if (!cachedReady) {
      return;
    }

    setData(cachedPayload);
  }, [cachedPayload, cachedReady]);

  const loadMetaInsights = useCallback(async () => {
    const days = metaPeriodDays[period];
    const params = new URLSearchParams({ days: String(days) });

    if (metaConfig.pageId.trim()) {
      params.set("pageId", metaConfig.pageId.trim());
    }

    if (metaConfig.instagramUserId.trim()) {
      params.set("igUserId", metaConfig.instagramUserId.trim());
    }

    setStatus("loading");
    setError(null);

    try {
      const response = await fetch(`/api/meta-insights?${params.toString()}`, {
        cache: "no-store",
      });

      const payload = (await response.json()) as MetaInsightsPayload & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Não foi possível carregar os insights da Meta.");
      }

      setData(payload);
      setCachedPayload(payload);
      setStatus("ready");
    } catch (error_) {
      const message = error_ instanceof Error ? error_.message : "Falha ao conectar com a Meta.";
      const hasCachedSnapshot =
        cachedPayload.connected ||
        cachedPayload.trend.length > 0 ||
        cachedPayload.media.length > 0 ||
        cachedPayload.updatedAt.length > 0;

      if (hasCachedSnapshot) {
        setData(cachedPayload);
        setStatus("ready");
        setError(null);
        toast.warning(message);
        return;
      }

      setStatus("error");
      setError(message);
      toast.error(message);
    }
  }, [cachedPayload, metaConfig.instagramUserId, metaConfig.pageId, period, setCachedPayload]);

  useEffect(() => {
    void loadMetaInsights();
  }, [loadMetaInsights]);

  const trendChartData = useMemo(
    () =>
      data.trend.map((item) => ({
        label: formatChartLabel(item.date),
        reach: item.reach,
        views: item.views,
        profileViews: item.profileViews,
      })),
    [data.trend],
  );

  const latest = data.trend.at(-1);
  const previous = data.trend.at(-2);
  const rangeLabel = `Últimos ${data.rangeDays} dias`;

  const summaryCards = [
    {
      icon: Target,
      label: "Alcance",
      value: formatCompactNumber(data.summary.reach),
      change: percentChange(latest?.reach, previous?.reach),
      detail: `${rangeLabel} de alcance total`,
    },
    {
      icon: Eye,
      label: "Views",
      value: formatCompactNumber(data.summary.views),
      change: percentChange(latest?.views, previous?.views),
      detail: "Visualizações da conta no período",
    },
    {
      icon: BarChart3,
      label: "Perfil",
      value: formatCompactNumber(data.summary.profileViews),
      change: percentChange(latest?.profileViews, previous?.profileViews),
      detail: "Visitas ao perfil",
    },
    {
      icon: Users,
      label: "Seguidores",
      value: formatCompactNumber(data.summary.followers),
      change: percentChange(latest?.followers, previous?.followers),
      detail: "Seguidores atuais da conta",
    },
  ];

  const engagementRate = formatPercent(data.summary.engagementRate, 1);
  const topCountries = sortDescending(data.audience.countries).slice(0, 5);
  const topCities = sortDescending(data.audience.cities).slice(0, 5);
  const topGenderAge = sortDescending(data.audience.genderAge).slice(0, 5);
  const recentMedia = data.media.slice(0, 6);
  const chartColors = isDark
    ? {
        reach: "#FF5252",
        views: "#E1306C",
        profileViews: "#FCAF45",
      }
    : {
        reach: "#D10000",
        views: "#E1306C",
        profileViews: "#F59E0B",
      };

  const hasData = status === "ready" && data.connected;
  const shellClass = isDark
    ? "space-y-5 p-6"
    : "space-y-5 p-6 bg-[linear-gradient(180deg,rgba(245,247,255,0.98),rgba(255,255,255,0.98))] border border-indigo-100/90 shadow-[0_18px_48px_rgba(79,70,229,0.06)]";
  const softPanelClass = isDark
    ? "grid gap-3 rounded-[1.75rem] bg-muted/35 p-5 text-sm text-muted-foreground"
    : "grid gap-3 rounded-[1.75rem] border border-indigo-100/80 bg-white/96 p-5 text-sm text-muted-foreground shadow-[0_12px_28px_rgba(79,70,229,0.05)]";
  const statGridClass = isDark
    ? "grid gap-3 rounded-[1.75rem] bg-muted/35 p-4 sm:grid-cols-2 lg:w-[420px]"
    : "grid gap-3 rounded-[1.75rem] border border-indigo-100/80 bg-white/96 p-4 sm:grid-cols-2 lg:w-[420px] shadow-[0_12px_28px_rgba(79,70,229,0.05)]";
  const summaryTileClass = isDark
    ? "rounded-2xl bg-muted/45 p-4"
    : "rounded-2xl border border-indigo-100/80 bg-white p-4 shadow-[0_10px_24px_rgba(79,70,229,0.04)]";
  const mediaTileClass = isDark
    ? "rounded-2xl bg-muted/45 p-3"
    : "rounded-2xl border border-amber-100/80 bg-white p-3 shadow-[0_10px_24px_rgba(79,70,229,0.04)]";

  return (
    <PageTransition>
      <PageHeader
        eyebrow="META INSIGHTS"
        title="Insights reais do Instagram"
        description="Conectamos a conta profissional do Instagram via token da Meta e exibimos aqui os dados reais de alcance, views, perfil, audiência e conteúdos recentes."
        actions={
          <div className="flex flex-wrap gap-2">
            {metaPeriods.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setPeriod(item)}
                data-cy={
                  item === "Dia"
                    ? "meta-period-day"
                    : item === "Semana"
                      ? "meta-period-week"
                      : "meta-period-month"
                }
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition duration-200",
                  period === item
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                )}
              >
                {item}
              </button>
            ))}
            <ActionButton variant="secondary" onClick={() => void loadMetaInsights()}>
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </ActionButton>
          </div>
        }
      />

      {status === "loading" ? <LoadingState /> : null}

      {status === "error" ? (
        <GlassPanel className={shellClass} dataCy="meta-summary-shell">
          <div className="flex items-start gap-4">
            <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">Não consegui conectar na Meta</h2>
              <p className="text-sm leading-6 text-muted-foreground">{error}</p>
            </div>
          </div>

          <div className={softPanelClass}>
            <p>Confira se estas variáveis estão configuradas no ambiente:</p>
            <ul className="space-y-1">
              <li>
                <code>META_IG_ACCESS_TOKEN</code>
              </li>
              <li>
                <code>META_GRAPH_API_VERSION</code>
              </li>
              <li>
                <code>META_IG_PAGE_ID</code> ou <code>META_IG_USER_ID</code> se necessário
              </li>
            </ul>
            <p>Também é preciso que a conta Instagram seja Business ou Creator e esteja vinculada a uma Página do Facebook.</p>
            <p>
              Se você já souber os IDs corretos, preencha em <strong>Configurações</strong> para forçar a consulta da
              Página certa.
            </p>
          </div>
        </GlassPanel>
      ) : null}

      {hasData ? (
        <div className="space-y-6">
          <GlassPanel className={shellClass} dataCy="meta-summary-shell">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-success/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-success">
                  <span className="h-2 w-2 rounded-full bg-success" />
                  Conectado
                </div>
                <div className="space-y-1">
                  <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                    {data.source.pageName || "Conta Meta"}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {data.source.instagramUsername ? `@${data.source.instagramUsername}` : "Conta profissional vinculada"}
                    {data.source.pageId ? ` • Página ${data.source.pageId}` : ""}
                  </p>
                </div>
                <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                  Os números abaixo vêm diretamente da API oficial do Instagram Graph e refletem o recorte de{" "}
                  <span data-cy="meta-range-label">{rangeLabel.toLowerCase()}</span>.
                </p>
              </div>

              <div className={statGridClass}>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Atualizado em</p>
                <p className="mt-1 text-sm font-medium text-foreground">{formatDateTime(data.updatedAt)}</p>
              </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Taxa de engajamento</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{engagementRate}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Posts analisados</p>
                <p className="mt-1 text-sm font-medium text-foreground">{formatCompactNumber(data.summary.mediaCount)}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Interações totais</p>
                <p className="mt-1 text-sm font-medium text-foreground">{formatCompactNumber(data.summary.totalInteractions)}</p>
                </div>
              </div>
            </div>

            {data.notes.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {data.notes.map((note) => (
                  <span
                    key={note}
                    className="inline-flex rounded-full bg-muted/60 px-3 py-1 text-xs font-medium text-muted-foreground"
                  >
                    {note}
                  </span>
                ))}
              </div>
            ) : null}
          </GlassPanel>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((item) => (
              <MetricStat
                key={item.label}
                icon={item.icon}
                label={item.label}
                value={item.value}
                change={item.change}
                detail={item.detail}
              />
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
            <GlassPanel className={isDark ? "h-[420px] p-6" : "h-[420px] p-6 bg-white/96 border border-border/60 shadow-[0_18px_48px_rgba(15,23,42,0.06)]"} dataCy="meta-chart-shell">
              <SectionTitle
                title="Evolução do período"
                description="Acompanhamento diário de alcance, views e visitas ao perfil."
              />
              <div className="mt-6 h-[330px]">
                {trendChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendChartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="4 4" stroke="rgb(var(--border) / 0.45)" />
                      <XAxis dataKey="label" stroke="rgb(var(--muted-foreground) / 0.8)" fontSize={12} />
                      <YAxis stroke="rgb(var(--muted-foreground) / 0.8)" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: 18,
                          border: "1px solid rgb(var(--border) / 0.6)",
                          background: isDark ? "rgba(15,18,24,0.96)" : "rgba(255,255,255,0.96)",
                          boxShadow: isDark ? "0 24px 60px rgba(0,0,0,0.25)" : "0 24px 60px rgba(15,23,42,0.14)",
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="reach"
                        name="Alcance"
                        stroke={chartColors.reach}
                        strokeWidth={3}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="views"
                        name="Views"
                        stroke={chartColors.views}
                        strokeWidth={3}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="profileViews"
                        name="Perfil"
                        stroke={chartColors.profileViews}
                        strokeWidth={3}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState title="Sem série histórica" description="Ainda não há dados suficientes para montar o gráfico deste período." />
                )}
              </div>
            </GlassPanel>

            <GlassPanel className={shellClass} dataCy="meta-summary-details">
              <SectionTitle
                title="Resumo da conta"
                description="Últimas leituras agregadas pela Meta."
              />
              <div className="grid gap-3">
                {[
                  { label: "Contas engajadas", value: data.summary.accountsEngaged },
                  { label: "Seguidores", value: data.summary.followers },
                  { label: "Views", value: data.summary.views },
                  { label: "Alcance", value: data.summary.reach },
                ].map((item) => (
                  <div key={item.label} className={summaryTileClass}>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{item.label}</p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">{formatCompactNumber(item.value)}</p>
                  </div>
                ))}
              </div>
            </GlassPanel>
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <GlassPanel className={shellClass} dataCy="meta-audience-countries">
              <SectionTitle title="Países" description="Principais regiões da audiência." />
              <div className="space-y-3">
                {topCountries.length > 0 ? (
                  topCountries.map((item) => (
                    <div key={item.label} className="space-y-2">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="font-medium text-foreground">{item.label}</span>
                        <span className="text-muted-foreground">{formatCompactNumber(item.value)}</span>
                      </div>
                      <ProgressBar value={item.value} max={topCountries[0]?.value || 1} />
                    </div>
                  ))
                ) : (
                  <EmptyState title="Sem audiência disponível" description="A API ainda não retornou dados de país." />
                )}
              </div>
            </GlassPanel>

            <GlassPanel className={shellClass} dataCy="meta-audience-cities">
              <SectionTitle title="Cidades" description="Top localidades da audiência." />
              <div className="space-y-3">
                {topCities.length > 0 ? (
                  topCities.map((item) => (
                    <div key={item.label} className="space-y-2">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="font-medium text-foreground">{item.label}</span>
                        <span className="text-muted-foreground">{formatCompactNumber(item.value)}</span>
                      </div>
                      <ProgressBar value={item.value} max={topCities[0]?.value || 1} />
                    </div>
                  ))
                ) : (
                  <EmptyState title="Sem audiência disponível" description="A API ainda não retornou dados de cidade." />
                )}
              </div>
            </GlassPanel>

            <GlassPanel className={shellClass} dataCy="meta-audience-demographics">
              <SectionTitle title="Faixa etária / gênero" description="Distribuição resumida da audiência." />
              <div className="space-y-3">
                {topGenderAge.length > 0 ? (
                  topGenderAge.map((item) => (
                    <div key={item.label} className="space-y-2">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="font-medium text-foreground">{item.label}</span>
                        <span className="text-muted-foreground">{formatCompactNumber(item.value)}</span>
                      </div>
                      <ProgressBar value={item.value} max={topGenderAge[0]?.value || 1} />
                    </div>
                  ))
                ) : (
                  <EmptyState title="Sem audiência disponível" description="A API ainda não retornou dados demográficos." />
                )}
              </div>
            </GlassPanel>
          </div>

          <GlassPanel className={shellClass} dataCy="meta-media-shell">
            <SectionTitle
              title="Conteúdos recentes"
              description="Os posts mais recentes com engajamento e alcance extraídos da conta."
            />

            {recentMedia.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {recentMedia.map((item) => (
                  <a
                    key={item.id}
                    href={item.permalink}
                    target="_blank"
                    rel="noreferrer"
                    data-cy="meta-media-card"
                    className={cn(
                      "group overflow-hidden rounded-[1.75rem] border border-border/60 transition hover:-translate-y-1 hover:shadow-[0_24px_50px_rgba(15,23,42,0.14)]",
                      isDark ? "bg-background/90" : "bg-white/96 shadow-[0_14px_32px_rgba(15,23,42,0.05)]",
                    )}
                    style={{ borderRadius: "2.25rem" }}
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-muted/50">
                      {item.thumbnailUrl ? (
                        <img
                          src={item.thumbnailUrl}
                          alt={item.caption}
                          data-cy="meta-media-image"
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                          Sem prévia
                        </div>
                      )}
                      <div className="absolute left-4 top-4 rounded-full bg-black/55 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white backdrop-blur">
                        {item.mediaType}
                      </div>
                    </div>

                    <div className="space-y-4 p-5">
                      <p className="line-clamp-3 text-sm leading-6 text-foreground">{item.caption}</p>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className={mediaTileClass}>
                          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Likes</p>
                          <p className="mt-2 font-semibold text-foreground">{formatCompactNumber(item.likeCount)}</p>
                        </div>
                        <div className={mediaTileClass}>
                          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Comentários</p>
                          <p className="mt-2 font-semibold text-foreground">{formatCompactNumber(item.commentsCount)}</p>
                        </div>
                        <div className={mediaTileClass}>
                          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Views</p>
                          <p className="mt-2 font-semibold text-foreground">{formatCompactNumber(item.views)}</p>
                        </div>
                        <div className={mediaTileClass}>
                          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Alcance</p>
                          <p className="mt-2 font-semibold text-foreground">{formatCompactNumber(item.reach)}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                        <span>{formatDateTime(item.timestamp)}</span>
                        <span>{formatCompactNumber(item.engagement)} engajamentos</span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <EmptyState
                title="Nenhum conteúdo recente"
                description="Quando a API retornar os posts da conta, eles aparecerão aqui com métricas e links para o Instagram."
              />
            )}
          </GlassPanel>
        </div>
      ) : null}
    </PageTransition>
  );
}
