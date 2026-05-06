import { useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  BarChart3,
  CalendarRange,
  Download,
  Eye,
  FileDown,
  FileImage,
  Printer,
  Rocket,
  Sparkles,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  getGoalResponsibleIds,
  insights,
  type ContentType,
  type Goal,
} from "../data/mockData";
import { createStorageKey, useSharedState } from "../data/sharedState";
import { useTeamProfiles } from "../data/profiles";
import { usePosts, type Post } from "../data/posts";
import { useSupabaseSyncedListState } from "../data/supabaseSync";
import {
  ActionButton,
  GlassPanel,
  PageHeader,
  PageTransition,
  ProgressBar,
  SectionTitle,
  FilterPill,
  cn,
  formatLongNumber,
  formatPercent,
} from "../components/ui";
const reportPeriods = [
  { label: "7 dias", value: "7" as const },
  { label: "30 dias", value: "30" as const },
  { label: "Personalizado", value: "custom" as const },
];
const contentTypeOptions: Array<{ label: string; value: ContentType | "todos" }> = [
  { label: "Todos os tipos", value: "todos" },
  { label: "Reels", value: "Reels" },
  { label: "Stories", value: "Stories" },
  { label: "Carrossel", value: "Carrossel" },
  { label: "Feed", value: "Feed" },
];

type ReportPeriod = (typeof reportPeriods)[number]["value"];
type SavedReport = {
  id: string;
  label: string;
  generatedAt: string;
  period: ReportPeriod;
  typeFilter: ContentType | "todos";
  responsibleId: number | "todos";
  startDate: string;
  endDate: string;
  reach: number;
  engagement: number;
  postsCount: number;
};
type MetricKey = "reach" | "engagement" | "posts" | "avgEngagement";

function RoundedDropdown<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ label: string; value: T; color?: string }>;
  onChange: (value: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selected = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  return (
    <div ref={rootRef} className="relative z-[80]">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 rounded-full border border-border/70 bg-background px-5 py-3 text-left text-sm transition hover:border-primary/25 hover:shadow-sm"
      >
        <span
          className="truncate font-medium"
          style={selected?.color ? { color: selected.color } : undefined}
        >
          {selected?.label ?? label}
        </span>
        <span
          className={cn(
            "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border/60 bg-muted/40 text-muted-foreground transition",
            open && "rotate-180",
          )}
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M5 7.5L10 12.5L15 7.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      {open ? (
        <div className="absolute left-0 top-full z-[90] mt-2 w-full overflow-hidden rounded-[1.75rem] border border-border/70 bg-white p-2 shadow-[0_24px_60px_rgba(15,23,42,0.14)]">
          <div className="space-y-1">
            {options.map((option) => {
              const active = option.value === value;

              return (
                <button
                  key={String(option.value)}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-full px-4 py-3 text-left text-sm transition",
                    active ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-muted/70",
                  )}
                >
                  <span
                    className="font-medium"
                    style={
                      !active && option.color
                        ? { color: option.color }
                        : undefined
                    }
                  >
                    {option.label}
                  </span>
                  {active ? <span className="text-xs font-semibold opacity-80">Ativo</span> : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function parseDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

function formatDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, amount: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + amount);
  return nextDate;
}

function diffDays(start: Date, end: Date) {
  const startTime = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const endTime = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.max(0, Math.round((endTime - startTime) / 86400000));
}

function rangeFromPeriod(period: ReportPeriod, anchorDate: Date, customRange: { start: string; end: string }) {
  if (period === "custom") {
    return {
      start: parseDate(customRange.start),
      end: parseDate(customRange.end),
    };
  }

  const days = period === "7" ? 7 : 30;
  return {
    start: addDays(anchorDate, -(days - 1)),
    end: new Date(anchorDate),
  };
}

function shiftRange(start: Date, end: Date) {
  const days = diffDays(start, end) + 1;
  return {
    start: addDays(start, -days),
    end: addDays(start, -1),
  };
}

function inRange(value: string, start: Date, end: Date) {
  const date = parseDate(value);
  return date >= start && date <= end;
}

function groupPostsByDate(items: Array<Pick<Post, "date" | "reach" | "engagement">>) {
  const buckets = new Map<string, { reach: number; engagement: number }>();

  items.forEach((item) => {
    const existing = buckets.get(item.date) ?? { reach: 0, engagement: 0 };
    buckets.set(item.date, {
      reach: existing.reach + item.reach,
      engagement: existing.engagement + item.engagement,
    });
  });

  return buckets;
}

function downloadText(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function ReportsPage() {
  const anchorDate = useMemo(() => new Date("2026-04-30T12:00:00"), []);
  const [period, setPeriod] = useState<ReportPeriod>("30");
  const [typeFilter, setTypeFilter] = useState<ContentType | "todos">("todos");
  const [responsibleFilter, setResponsibleFilter] = useState<number | "todos">("todos");
  const [customRange, setCustomRange] = useState({ start: "2026-04-01", end: "2026-04-30" });
  const [teamMembers] = useTeamProfiles();
  const [posts] = usePosts();
  const [goals] = useSupabaseSyncedListState<Goal>({ key: "goals", table: "goals", fallback: [] });
  const [savedReports, setSavedReports] = useSharedState<SavedReport[]>(createStorageKey("reports-history"), []);
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>("reach");

  useEffect(() => {
    setSavedReports([]);
  }, [setSavedReports]);

  const currentRange = useMemo(
    () => rangeFromPeriod(period, anchorDate, customRange),
    [anchorDate, customRange, period],
  );
  const previousRange = useMemo(() => shiftRange(currentRange.start, currentRange.end), [currentRange]);

  const filteredPosts = useMemo(
    () =>
      posts.filter((post) => {
        const matchesDate = inRange(post.date, currentRange.start, currentRange.end);
        const matchesType = typeFilter === "todos" || post.type === typeFilter;
        const matchesResponsible =
          responsibleFilter === "todos" || post.authorId === responsibleFilter;

        return matchesDate && matchesType && matchesResponsible;
      }),
    [currentRange.end, currentRange.start, responsibleFilter, typeFilter],
  );

  const previousPosts = useMemo(
    () =>
      posts.filter((post) => {
        const matchesDate = inRange(post.date, previousRange.start, previousRange.end);
        const matchesType = typeFilter === "todos" || post.type === typeFilter;
        const matchesResponsible =
          responsibleFilter === "todos" || post.authorId === responsibleFilter;

        return matchesDate && matchesType && matchesResponsible;
      }),
    [previousRange.end, previousRange.start, responsibleFilter, typeFilter],
  );

  const filteredGoals = useMemo(() => {
    const byResponsible = goals.filter((goal) => {
      if (responsibleFilter === "todos") {
        return true;
      }

      return getGoalResponsibleIds(goal).includes(responsibleFilter);
    });
    const inPeriod = byResponsible.filter((goal) => inRange(goal.deadline, currentRange.start, currentRange.end));

    return inPeriod.length > 0 ? inPeriod : byResponsible;
  }, [currentRange.end, currentRange.start, responsibleFilter]);

  const currentSummary = useMemo(() => {
    const reach = filteredPosts.reduce((sum, post) => sum + post.reach, 0);
    const engagement = filteredPosts.reduce((sum, post) => sum + post.engagement, 0);
    const saves = filteredPosts.reduce((sum, post) => sum + post.metrics.saves, 0);
    const shares = filteredPosts.reduce((sum, post) => sum + post.metrics.shares, 0);
    const likes = filteredPosts.reduce((sum, post) => sum + post.metrics.likes, 0);
    const comments = filteredPosts.reduce((sum, post) => sum + post.metrics.comments, 0);
    const avgEngagement = filteredPosts.length > 0 ? engagement / filteredPosts.length : 0;

    return { reach, engagement, saves, shares, likes, comments, avgEngagement, postsCount: filteredPosts.length };
  }, [filteredPosts]);

  const previousSummary = useMemo(() => {
    const reach = previousPosts.reduce((sum, post) => sum + post.reach, 0);
    const engagement = previousPosts.reduce((sum, post) => sum + post.engagement, 0);
    const avgEngagement = previousPosts.length > 0 ? engagement / previousPosts.length : 0;

    return { reach, engagement, avgEngagement, postsCount: previousPosts.length };
  }, [previousPosts]);

  const comparison = {
    reach:
      previousSummary.reach === 0
        ? currentSummary.reach > 0
          ? 100
          : 0
        : ((currentSummary.reach - previousSummary.reach) / previousSummary.reach) * 100,
    engagement:
      previousSummary.engagement === 0
        ? currentSummary.engagement > 0
          ? 100
          : 0
        : ((currentSummary.engagement - previousSummary.engagement) / previousSummary.engagement) * 100,
    posts:
      previousSummary.postsCount === 0
        ? currentSummary.postsCount > 0
          ? 100
          : 0
        : ((currentSummary.postsCount - previousSummary.postsCount) / previousSummary.postsCount) * 100,
    avgEngagement:
      previousSummary.avgEngagement === 0
        ? currentSummary.avgEngagement > 0
          ? 100
          : 0
        : ((currentSummary.avgEngagement - previousSummary.avgEngagement) / previousSummary.avgEngagement) * 100,
  };

  const periodDays = diffDays(currentRange.start, currentRange.end) + 1;
  const currentBuckets = groupPostsByDate(filteredPosts);
  const previousBuckets = groupPostsByDate(previousPosts);
  const comparisonSeries = Array.from({ length: periodDays }, (_, index) => {
    const currentDate = addDays(currentRange.start, index);
    const previousDate = addDays(previousRange.start, index);

    return {
      label: new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(currentDate),
      currentReach: currentBuckets.get(formatDateKey(currentDate))?.reach ?? 0,
      previousReach: previousBuckets.get(formatDateKey(previousDate))?.reach ?? 0,
    };
  });

  const typePerformance = useMemo(() => {
    const entries = (["Reels", "Stories", "Carrossel", "Feed"] as ContentType[]).map((type) => {
      const items = filteredPosts.filter((post) => post.type === type);
      const engagement = items.reduce((sum, post) => sum + post.engagement, 0);
      const reach = items.reduce((sum, post) => sum + post.reach, 0);
      return {
        type,
        count: items.length,
        engagement,
        reach,
        avgEngagement: items.length > 0 ? engagement / items.length : 0,
      };
    });

    return entries.sort((a, b) => b.avgEngagement - a.avgEngagement);
  }, [filteredPosts]);

  const memberPerformance = useMemo(
    () =>
      teamMembers.map((member) => {
        const memberPosts = filteredPosts.filter((post) => post.authorId === member.id);
        const memberGoals = filteredGoals.filter((goal) => getGoalResponsibleIds(goal).includes(member.id));
        const engagement = memberPosts.reduce((sum, post) => sum + post.engagement, 0);
        const reach = memberPosts.reduce((sum, post) => sum + post.reach, 0);
        const completionRate =
          memberGoals.length > 0
            ? memberGoals.filter((goal) => goal.current >= goal.target).length / memberGoals.length
            : 0;

        return {
          member,
          posts: memberPosts.length,
          engagement,
          reach,
          completionRate,
        };
      }).sort((a, b) => b.engagement - a.engagement),
    [filteredGoals, filteredPosts],
  );

  const selectedMetricCard = useMemo(() => {
    const cards = {
      reach: {
        title: "Alcance",
        icon: Eye,
        current: formatLongNumber(currentSummary.reach),
        previous: formatLongNumber(previousSummary.reach),
        delta: comparison.reach,
        detail: "Volume alcançado pelos conteúdos no período filtrado.",
      },
      engagement: {
        title: "Engajamento",
        icon: BarChart3,
        current: formatLongNumber(currentSummary.engagement),
        previous: formatLongNumber(previousSummary.engagement),
        delta: comparison.engagement,
        detail: "Soma de interações principais no recorte atual.",
      },
      posts: {
        title: "Publicações",
        icon: Sparkles,
        current: String(currentSummary.postsCount),
        previous: String(previousSummary.postsCount),
        delta: comparison.posts,
        detail: "Quantidade de peças publicadas no período.",
      },
      avgEngagement: {
        title: "Engajamento médio",
        icon: Rocket,
        current: formatPercent(currentSummary.avgEngagement, 2),
        previous: formatPercent(previousSummary.avgEngagement, 2),
        delta: comparison.avgEngagement,
        detail: "Média por peça para leitura de eficiência.",
      },
    } satisfies Record<MetricKey, { title: string; icon: LucideIcon; current: string; previous: string; delta: number; detail: string }>;

    return cards[selectedMetric];
  }, [comparison.avgEngagement, comparison.engagement, comparison.posts, comparison.reach, currentSummary.avgEngagement, currentSummary.engagement, currentSummary.postsCount, currentSummary.reach, previousSummary.avgEngagement, previousSummary.engagement, previousSummary.postsCount, previousSummary.reach, selectedMetric]);

  const metricCards = [
    {
      key: "reach" as const,
      label: "Alcance",
      value: formatLongNumber(currentSummary.reach),
      delta: comparison.reach,
      icon: Eye,
      helper: `${formatLongNumber(previousSummary.reach)} no período anterior`,
    },
    {
      key: "engagement" as const,
      label: "Engajamento",
      value: formatLongNumber(currentSummary.engagement),
      delta: comparison.engagement,
      icon: BarChart3,
      helper: `${formatLongNumber(previousSummary.engagement)} no período anterior`,
    },
    {
      key: "posts" as const,
      label: "Publicações",
      value: String(currentSummary.postsCount),
      delta: comparison.posts,
      icon: Sparkles,
      helper: `${previousSummary.postsCount} no período anterior`,
    },
    {
      key: "avgEngagement" as const,
      label: "Engajamento médio",
      value: formatPercent(currentSummary.avgEngagement, 2),
      delta: comparison.avgEngagement,
      icon: Rocket,
      helper: `${formatPercent(previousSummary.avgEngagement, 2)} no período anterior`,
    },
  ] as const;

  const alerts = useMemo(() => {
    const items: Array<{ title: string; description: string; tone: "danger" | "warning" }> = [];

    if (comparison.engagement < 0) {
      items.push({
        title: "Queda de engajamento",
        description: "O volume de interações caiu em relação ao período anterior. Vale revisar os ganchos iniciais.",
        tone: "danger",
      });
    }

    if (filteredGoals.some((goal) => goal.current < goal.target && new Date(goal.deadline) <= addDays(currentRange.end, 7))) {
      items.push({
        title: "Meta atrasada",
        description: "Há metas com prazo curto e ainda abaixo do alvo. Acompanhe responsáveis e bloqueios.",
        tone: "warning",
      });
    }

    if (filteredPosts.some((post) => post.engagement < 1500 || post.reach < 10000)) {
      items.push({
        title: "Conteúdo com baixa performance",
        description: "Algumas peças estão abaixo do patamar saudável de alcance e engajamento.",
        tone: "warning",
      });
    }

    if (items.length === 0) {
      items.push({
        title: "Tudo em ordem",
        description: "O recorte atual não mostra alertas críticos.",
        tone: "warning",
      });
    }

    return items;
  }, [comparison.engagement, currentRange.end, filteredGoals, filteredPosts]);

  const automaticInsights = useMemo(() => {
    const bestType = typePerformance[0];
    const topResponsible = memberPerformance[0];

    return [
      {
        title: "Melhor horário",
        value: `${insights.bestTime.day}, ${insights.bestTime.hour}`,
        detail: `${insights.bestTime.engagement}% acima da média`,
      },
      {
        title: "Melhor tipo de conteúdo",
        value: bestType ? bestType.type : insights.bestContent.type,
        detail: bestType
          ? `${formatPercent(bestType.avgEngagement, 2)} de engajamento médio`
          : insights.bestContent.avgEngagement,
      },
      {
        title: "Tendência de crescimento",
        value: comparison.reach >= 0 ? "Alta" : "Queda",
        detail: comparison.reach >= 0 ? "A operação está ganhando tração." : "O momento pede ajuste de pauta.",
      },
      {
        title: "Responsável em destaque",
        value: topResponsible ? topResponsible.member.name : teamMembers[0].name,
        detail: topResponsible
          ? `${formatLongNumber(topResponsible.engagement)} interações no recorte`
          : "Sem dados suficientes para calcular.",
      },
    ];
  }, [comparison.reach, memberPerformance, typePerformance]);

  const handleSaveReport = () => {
    const snapshot: SavedReport = {
      id: `${Date.now()}`,
      label: `Relatório ${period === "custom" ? "personalizado" : reportPeriods.find((item) => item.value === period)?.label ?? period}`,
      generatedAt: new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date()),
      period,
      typeFilter,
      responsibleId: responsibleFilter,
      startDate: formatDateKey(currentRange.start),
      endDate: formatDateKey(currentRange.end),
      reach: currentSummary.reach,
      engagement: currentSummary.engagement,
      postsCount: currentSummary.postsCount,
    };

    setSavedReports((previous) => [snapshot, ...previous].slice(0, 8));
    toast.success("Relatório salvo no histórico.");
  };

  const handleRestoreReport = (snapshot: SavedReport) => {
    setPeriod(snapshot.period);
    setTypeFilter(snapshot.typeFilter);
    setResponsibleFilter(snapshot.responsibleId);
    setCustomRange({ start: snapshot.startDate, end: snapshot.endDate });
    toast.success("Relatório antigo carregado.");
  };

  const handleExportCsv = () => {
    const rows = [
      ["Data", "Título", "Tipo", "Responsável", "Alcance", "Engajamento", "Likes", "Comentários", "Salvos", "Compartilhamentos"],
      ...filteredPosts.map((post) => {
        const member = teamMembers.find((item) => item.id === post.authorId)!;
        return [
          post.date,
          post.title,
          post.type,
          member.name,
          String(post.reach),
          String(post.engagement),
          String(post.metrics.likes),
          String(post.metrics.comments),
          String(post.metrics.saves),
          String(post.metrics.shares),
        ];
      }),
    ];

    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    downloadText(`relatorio-${formatDateKey(currentRange.start)}-${formatDateKey(currentRange.end)}.csv`, csv, "text/csv;charset=utf-8");
    toast.success("CSV exportado com sucesso.");
  };

  const handleExportImage = async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1400;
    canvas.height = 900;
    const context = canvas.getContext("2d");

    if (!context) {
      toast.error("Não foi possível gerar a imagem.");
      return;
    }

    context.fillStyle = "#0b0f17";
    context.fillRect(0, 0, canvas.width, canvas.height);

    const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, "#D10000");
    gradient.addColorStop(1, "#FF7A59");
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, 220);

    context.fillStyle = "rgba(255,255,255,0.95)";
    context.font = "700 46px Inter, Arial, sans-serif";
    context.fillText("Relatório Great Orgânico", 70, 90);
    context.font = "400 22px Inter, Arial, sans-serif";
    context.fillText(`Período: ${formatDateKey(currentRange.start)} a ${formatDateKey(currentRange.end)}`, 70, 136);

    const summaryBlocks = [
      { label: "Alcance", value: formatLongNumber(currentSummary.reach) },
      { label: "Engajamento", value: formatLongNumber(currentSummary.engagement) },
      { label: "Publicações", value: String(currentSummary.postsCount) },
      { label: "Engajamento médio", value: formatPercent(currentSummary.avgEngagement, 2) },
    ];

    summaryBlocks.forEach((block, index) => {
      const x = 70 + (index % 2) * 310;
      const y = 260 + Math.floor(index / 2) * 130;
      context.fillStyle = "rgba(255,255,255,0.08)";
      context.fillRect(x, y, 280, 94);
      context.fillStyle = "rgba(255,255,255,0.8)";
      context.font = "500 18px Inter, Arial, sans-serif";
      context.fillText(block.label, x + 20, y + 34);
      context.fillStyle = "#ffffff";
      context.font = "700 30px Inter, Arial, sans-serif";
      context.fillText(block.value, x + 20, y + 70);
    });

    context.fillStyle = "#ffffff";
    context.font = "700 24px Inter, Arial, sans-serif";
    context.fillText("Top conteúdos", 760, 272);
    context.font = "400 18px Inter, Arial, sans-serif";
    filteredPosts.slice(0, 5).forEach((post, index) => {
      context.fillText(`${index + 1}. ${post.title}`, 760, 320 + index * 42);
    });

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));

    if (!blob) {
      toast.error("Não foi possível gerar a imagem.");
      return;
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio-${formatDateKey(currentRange.start)}-${formatDateKey(currentRange.end)}.png`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Imagem exportada com sucesso.");
  };

  const selectedMetricDetails = {
    reach: {
      title: "Alcance total",
      description: "Abrindo o volume total de exposição do recorte.",
      breakdown: [
        { label: "Atual", value: formatLongNumber(currentSummary.reach) },
        { label: "Anterior", value: formatLongNumber(previousSummary.reach) },
        { label: "Variação", value: formatPercent(comparison.reach, 1) },
      ],
    },
    engagement: {
      title: "Engajamento total",
      description: "Somatório de curtidas, comentários, salvos e compartilhamentos.",
      breakdown: [
        { label: "Atual", value: formatLongNumber(currentSummary.engagement) },
        { label: "Anterior", value: formatLongNumber(previousSummary.engagement) },
        { label: "Variação", value: formatPercent(comparison.engagement, 1) },
      ],
    },
    posts: {
      title: "Quantidade de publicações",
      description: "Leitura rápida do volume entregue pela operação.",
      breakdown: [
        { label: "Atual", value: String(currentSummary.postsCount) },
        { label: "Anterior", value: String(previousSummary.postsCount) },
        { label: "Variação", value: formatPercent(comparison.posts, 1) },
      ],
    },
    avgEngagement: {
      title: "Engajamento médio",
      description: "Eficiência média por peça dentro do recorte.",
      breakdown: [
        { label: "Atual", value: formatPercent(currentSummary.avgEngagement, 2) },
        { label: "Anterior", value: formatPercent(previousSummary.avgEngagement, 2) },
        { label: "Variação", value: formatPercent(comparison.avgEngagement, 1) },
      ],
    },
  } as const;

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Report"
        title="Relatório executivo da Great Orgânico"
        description="Filtre o período, compare com a janela anterior, desça para os detalhes e salve versões antigas sem sair da tela."
        actions={
          <div className="flex flex-wrap gap-2">
            <ActionButton variant="secondary" onClick={handleSaveReport}>
              <FileDown className="h-4 w-4" />
              Salvar relatório
            </ActionButton>
            <ActionButton variant="secondary" onClick={handleExportCsv}>
              <Download className="h-4 w-4" />
              CSV
            </ActionButton>
            <ActionButton variant="secondary" onClick={handleExportImage}>
              <FileImage className="h-4 w-4" />
              Imagem
            </ActionButton>
            <ActionButton onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              PDF
            </ActionButton>
          </div>
        }
      />

      <GlassPanel
        index={1}
        className="overflow-hidden bg-[linear-gradient(135deg,rgba(131,58,180,0.96),rgba(180,97,214,0.9),rgba(225,48,108,0.82))] text-white"
      >
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="inline-flex rounded-full bg-white/14 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/82 ring-1 ring-white/10">
              Visão geral
            </p>
            <h2 className="mt-3 text-2xl font-semibold">Resumo executivo</h2>
            <p className="mt-2 text-sm leading-6 text-white/88">
              O perfil mantém saúde alta, acelera crescimento de alcance e encontra melhor eficiência quando combina reels educativos com repertório prático de operação.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[420px]">
            {[
              { label: "Saúde do Instagram", value: String(87) },
              { label: "Alcance total", value: formatLongNumber(currentSummary.reach) },
              { label: "Engajamento", value: formatLongNumber(currentSummary.engagement) },
              { label: "Publicações", value: String(currentSummary.postsCount) },
            ].map((item) => (
              <div key={item.label} className="rounded-3xl bg-white/12 p-5 ring-1 ring-white/10 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.16em] text-white/74">{item.label}</p>
                <p className="mt-3 text-3xl font-semibold">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </GlassPanel>

      <GlassPanel index={2} className="relative z-[70] overflow-visible">
        <SectionTitle
          title="Filtros"
          description="Período, tipo de conteúdo e responsável alteram toda a leitura."
        />
        <div className="mt-5 flex flex-col gap-4 rounded-[2rem] border border-border/60 bg-card/95 p-4 lg:flex-row lg:items-center">
          <div className="flex flex-wrap gap-2">
            {reportPeriods.map((item) => (
              <FilterPill key={item.value} label={item.label} active={period === item.value} onClick={() => setPeriod(item.value)} />
            ))}
          </div>

          <div className="grid flex-1 gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr]">
            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Tipo de conteúdo</span>
              <RoundedDropdown
                label="Tipo de conteúdo"
                value={typeFilter}
                options={contentTypeOptions}
                onChange={(value) => setTypeFilter(value as ContentType | "todos")}
              />
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Responsável</span>
              <RoundedDropdown
                label="Responsável"
                value={responsibleFilter}
                options={[
                  { label: "Todos os responsáveis", value: "todos" as const },
                  ...teamMembers.map((member) => ({ label: member.name, value: member.id, color: member.color })),
                ]}
                onChange={(value) => setResponsibleFilter(value)}
              />
            </label>

            {period === "custom" ? (
              <div className="grid gap-3 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Início</span>
                  <input
                    type="date"
                    value={customRange.start}
                    onChange={(event) => setCustomRange((previous) => ({ ...previous, start: event.target.value }))}
                    className="rounded-full border border-border/70 bg-background px-5 py-3 text-sm outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Fim</span>
                  <input
                    type="date"
                    value={customRange.end}
                    onChange={(event) => setCustomRange((previous) => ({ ...previous, end: event.target.value }))}
                    className="rounded-full border border-border/70 bg-background px-5 py-3 text-sm outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                  />
                </label>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                <CalendarRange className="h-4 w-4" />
                <span>
                  {new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(currentRange.start)} -{" "}
                  {new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(currentRange.end)}
                </span>
              </div>
            )}
          </div>
        </div>
      </GlassPanel>

      <div className="relative z-0 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((metric, index) => {
          const Icon = metric.icon;
          const active = selectedMetric === metric.key;

          return (
            <button
              key={metric.key}
              type="button"
              onClick={() => setSelectedMetric(metric.key)}
              className="text-left"
            >
              <GlassPanel
                index={index + 3}
                className={`relative z-0 h-full overflow-hidden transition ${active ? "ring-2 ring-primary/25" : ""}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                      metric.delta >= 0 ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                    }`}
                  >
                    {metric.delta >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                    {formatPercent(metric.delta, 1)}
                  </span>
                </div>
                <div className="mt-5 space-y-2">
                  <p className="text-sm text-muted-foreground">{metric.label}</p>
                  <p className="text-3xl font-semibold tracking-tight text-foreground">{metric.value}</p>
                  <p className="text-sm text-muted-foreground">{metric.helper}</p>
                </div>
              </GlassPanel>
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <GlassPanel index={7} className="overflow-hidden p-6">
          <SectionTitle title="Comparação" description="Olhando o período atual ao lado do período anterior." />
          <div className="mt-6 h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={comparisonSeries} margin={{ top: 10, right: 10, left: -14, bottom: 0 }}>
                <CartesianGrid stroke="rgb(var(--border) / 0.5)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "rgb(var(--muted-foreground) / 1)", fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: "rgb(var(--muted-foreground) / 1)", fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="currentReach" stroke="#D10000" strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="previousReach" stroke="#94A3B8" strokeWidth={2} strokeDasharray="6 6" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassPanel>

        <GlassPanel index={8}>
          <SectionTitle title="Drill-down" description="Clique em uma métrica para abrir a leitura detalhada." />
          <div className="mt-6 rounded-[2rem] border border-border/60 bg-muted/35 p-5 dark:bg-card/95">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{selectedMetricDetails[selectedMetric].title}</p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{selectedMetricCard.current}</h3>
              </div>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                {selectedMetricCard.previous} anterior
              </span>
            </div>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">{selectedMetricCard.detail}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {selectedMetricDetails[selectedMetric].breakdown.map((item) => (
                <div key={item.label} className="rounded-2xl bg-white/80 p-4 dark:bg-background/80">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{item.label}</p>
                  <p className="mt-2 text-base font-semibold text-foreground">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </GlassPanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <GlassPanel index={9}>
          <SectionTitle title="Metas" description="Valor atual / meta / restante." />
          <div className="mt-5 space-y-4">
            {filteredGoals.map((goal) => {
              const remaining = Math.max(goal.target - goal.current, 0);
              const responsibleIds = getGoalResponsibleIds(goal);
              const member = teamMembers.find((item) => item.id === responsibleIds[0]) ?? teamMembers[0];

              return (
                <div
                  key={goal.id}
                  className="rounded-3xl border border-border/60 bg-muted/35 p-5 dark:bg-card/95"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">{goal.name}</p>
                      <p className="text-xs text-muted-foreground">{goal.category}</p>
                    </div>
                    <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: `${member.color}12`, color: member.color }}>
                      {member.name}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                    <div className="rounded-2xl bg-white/80 p-3 dark:bg-background/80">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Atual</p>
                      <p className="mt-2 font-semibold text-foreground">{formatLongNumber(goal.current)}</p>
                    </div>
                    <div className="rounded-2xl bg-white/80 p-3 dark:bg-background/80">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Meta</p>
                      <p className="mt-2 font-semibold text-foreground">{formatLongNumber(goal.target)}</p>
                    </div>
                    <div className="rounded-2xl bg-white/80 p-3 dark:bg-background/80">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Restante</p>
                      <p className="mt-2 font-semibold text-foreground">{formatLongNumber(remaining)}</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <ProgressBar value={goal.current} max={goal.target} label={goal.period} />
                  </div>
                </div>
              );
            })}
          </div>
        </GlassPanel>

        <GlassPanel index={10}>
          <SectionTitle title="Alertas" description="Sinais para agir antes do próximo ciclo." />
          <div className="mt-5 space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.title}
                className="flex items-start gap-3 rounded-3xl border border-border/60 bg-muted/30 p-4 dark:bg-card/95"
              >
                <div
                  className={`mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-2xl ${
                    alert.tone === "danger" ? "bg-destructive/15 text-destructive" : "bg-warning/20 text-warning"
                  }`}
                >
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{alert.title}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{alert.description}</p>
                </div>
              </div>
            ))}
          </div>
        </GlassPanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
        <GlassPanel index={11}>
          <SectionTitle title="Insights automáticos" description="Leituras geradas com base no recorte filtrado." />
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {automaticInsights.map((item) => (
              <div key={item.title} className="rounded-3xl bg-muted/35 p-5 dark:bg-card/90">
                <p className="text-sm text-muted-foreground">{item.title}</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{item.value}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.detail}</p>
              </div>
            ))}
          </div>
        </GlassPanel>

        <GlassPanel index={12}>
          <SectionTitle title="Relatório por responsável" description="Desempenho individual e comparação entre usuários." />
          <div className="mt-5 space-y-4">
            {memberPerformance.map((entry) => (
              <div key={entry.member.id} className="rounded-3xl border border-border/60 bg-muted/35 p-5 dark:bg-card/95">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-foreground">{entry.member.name}</p>
                    <p className="text-sm text-muted-foreground">{entry.member.role}</p>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <p>{formatLongNumber(entry.reach)} alcance</p>
                    <p>{formatLongNumber(entry.engagement)} engajamento</p>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-white/80 p-4 dark:bg-background/80">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Publicações</p>
                    <p className="mt-2 text-xl font-semibold text-foreground">{entry.posts}</p>
                  </div>
                  <div className="rounded-2xl bg-white/80 p-4 dark:bg-background/80">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Engajamento</p>
                    <p className="mt-2 text-xl font-semibold text-foreground">{formatLongNumber(entry.engagement)}</p>
                  </div>
                  <div className="rounded-2xl bg-white/80 p-4 dark:bg-background/80">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Concluído</p>
                    <p className="mt-2 text-xl font-semibold text-foreground">{formatPercent(entry.completionRate * 100, 0)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlassPanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <GlassPanel index={13}>
          <SectionTitle title="Histórico" description="Relatórios salvos por período." />
          <div className="mt-5 space-y-3">
            {savedReports.length > 0 ? (
              savedReports.map((snapshot) => (
                <div
                  key={snapshot.id}
                  className="flex flex-col gap-4 rounded-3xl border border-border/60 bg-muted/30 p-4 md:flex-row md:items-center md:justify-between dark:bg-card/95"
                >
                  <div>
                    <p className="font-medium text-foreground">{snapshot.label}</p>
                    <p className="text-sm text-muted-foreground">
                      {snapshot.generatedAt} • {snapshot.startDate} até {snapshot.endDate}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {snapshot.reach} alcance • {snapshot.engagement} engajamento • {snapshot.postsCount} posts
                    </p>
                  </div>
                  <ActionButton variant="secondary" onClick={() => handleRestoreReport(snapshot)}>
                    <FileDown className="h-4 w-4" />
                    Abrir
                  </ActionButton>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum relatório salvo ainda.</p>
            )}
          </div>
        </GlassPanel>

        <GlassPanel index={14}>
          <SectionTitle title="Resumo das decisões" description="O que o recorte atual está sugerindo." />
          <div className="mt-5 space-y-3">
            <div className="rounded-3xl bg-muted/35 p-5 dark:bg-card/90">
              <p className="text-sm text-muted-foreground">Melhor horário</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {insights.bestTime.day}, {insights.bestTime.hour}
              </p>
            </div>
            <div className="rounded-3xl bg-muted/35 p-5 dark:bg-card/90">
              <p className="text-sm text-muted-foreground">Melhor conteúdo</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{automaticInsights[1].value}</p>
            </div>
            <div className="rounded-3xl bg-muted/35 p-5 dark:bg-card/90">
              <p className="text-sm text-muted-foreground">Tendência</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {comparison.reach >= 0 ? "Crescimento consistente" : "Pressão de queda"}
              </p>
            </div>
          </div>
        </GlassPanel>
      </div>

      <GlassPanel index={15}>
        <SectionTitle title="Evolução de alcance" description="Comparação entre período atual e anterior." />
        <div className="mt-6 h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={comparisonSeries} margin={{ top: 10, right: 10, left: -14, bottom: 0 }}>
              <defs>
                <linearGradient id="reportReach" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#D10000" stopOpacity={0.36} />
                  <stop offset="100%" stopColor="#D10000" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgb(var(--border) / 0.5)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "rgb(var(--muted-foreground) / 1)", fontSize: 12 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fill: "rgb(var(--muted-foreground) / 1)", fontSize: 12 }} />
              <Tooltip />
              <Area type="monotone" dataKey="currentReach" stroke="#D10000" strokeWidth={3} fill="url(#reportReach)" />
              <Area type="monotone" dataKey="previousReach" stroke="#94A3B8" strokeWidth={2} fill="transparent" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </GlassPanel>
    </PageTransition>
  );
}
