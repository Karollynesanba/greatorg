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
  CheckCircle2,
  Download,
  Eye,
  ChevronDown,
  FileDown,
  FileImage,
  Printer,
  Rocket,
  Sparkles,
  Share2,
  Plus,
  PencilLine,
  Trash2,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  calendarEvents,
  getGoalResponsibleIds,
  insights,
  type CalendarEvent,
  type ContentType,
  type Goal,
  type PostStatus,
} from "../data/mockData";
import { createStorageKey } from "../data/sharedState";
import { useTeamProfiles } from "../data/profiles";
import { usePosts, type Post } from "../data/posts";
import { useSupabaseSharedState, useSupabaseSyncedListState } from "../data/supabaseSync";
import { matchesTeamScope, useTeamScope } from "../data/teamScope";
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
import { useThemeMode } from "../theme";
import { createEmptyMonthlyArchive, type MonthlyArchiveSnapshot } from "../data/monthlyArchive";
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

type ReportPeriod = "7" | "30" | "custom";
type CustomPeriodMode = "month" | "range" | "past";
type SavedReport = {
  id: string;
  label: string;
  generatedAt: string;
  period: ReportPeriod;
  days?: number;
  typeFilter: ContentType | "todos";
  responsibleId: number | "todos";
  startDate: string;
  endDate: string;
  reach: number;
  engagement: number;
  postsCount: number;
};
type MetricKey = "reach" | "engagement" | "posts" | "avgEngagement";
type ReportCardItem = {
  title: string;
  metric: string;
  accent: string;
  image: string;
};
type ReportCardRow = {
  title: string;
  description: string;
  action: string;
  items: ReportCardItem[];
};
type ReportOverview = {
  badge: string;
  title: string;
  description: string;
  note: string;
};
type ReportSectionEditor = {
  scope: "overview" | "row";
  rowIndex?: number;
} | null;

const monthlyContentTarget = 120;
const finalContentStatuses = new Set<PostStatus | "Concluído" | "Finalizado">(["Aprovado", "Publicado", "Concluído", "Finalizado"]);

function isFinalContentStatus(status?: string) {
  return Boolean(status && finalContentStatuses.has(status as PostStatus | "Concluído" | "Finalizado"));
}

function getCalendarResponsibleIds(event: CalendarEvent) {
  const ids = event.responsibleIds?.length ? event.responsibleIds : [event.responsibleId];
  return Array.from(new Set(ids.filter((id) => Number.isFinite(id))));
}

function isCompletedCalendarEvent(event: CalendarEvent) {
  return event.completed || isFinalContentStatus(event.status);
}

function ReportMenuSelect<T extends string | number>({
  label,
  value,
  options,
  onChange,
  triggerDataCy,
  optionDataCyPrefix,
}: {
  label: string;
  value: T;
  options: Array<{ label: string; value: T }>;
  onChange: (next: T) => void;
  triggerDataCy: string;
  optionDataCyPrefix: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const { isDark } = useThemeMode();
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
    <div ref={rootRef} className="relative">
      <button
        type="button"
        data-cy={triggerDataCy}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 rounded-full border border-border/70 px-4 py-3 text-sm transition hover:border-primary/25 hover:shadow-sm"
        style={{ backgroundColor: isDark ? "rgb(var(--sidebar) / 1)" : "#ffffff" }}
      >
        <span className="min-w-0 truncate font-medium text-foreground">{selected?.label ?? label}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition", open && "rotate-180")} />
      </button>

      {open ? (
        <div className="absolute left-0 top-full z-50 mt-2 w-full rounded-[1.4rem] border border-border/70 bg-white p-2 shadow-[0_20px_50px_rgba(15,23,42,0.16)]">
          {options.map((option) => {
            const active = option.value === value;
            return (
              <button
                key={String(option.value)}
                type="button"
                data-cy={`${optionDataCyPrefix}-option-${String(option.value)}`}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-full px-4 py-3 text-left text-sm transition",
                  active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted",
                )}
              >
                <span className="font-medium">{option.label}</span>
                {active ? <span className="text-xs font-semibold opacity-80">Ativo</span> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function RoundedDropdown<T extends string | number>({
  label,
  value,
  options,
  onChange,
  placeholder,
}: {
  label: string;
  value: T;
  options: Array<{ label: string; value: T; color?: string }>;
  onChange: (value: T) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selected = options.find((option) => option.value === value) ?? options[0];
  const { isDark } = useThemeMode();
  const surfaceColor = isDark ? "rgb(var(--sidebar) / 1)" : "#ffffff";
  const menuColor = isDark ? "rgb(var(--background) / 1)" : "#ffffff";

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
        className="flex w-full items-center justify-between gap-3 rounded-full border border-border/70 px-5 py-3 text-left text-sm text-foreground transition hover:border-primary/25 hover:shadow-sm dark:border-white/8 dark:text-foreground"
        style={{
          backgroundColor: surfaceColor,
        }}
      >
        <span
          className="truncate font-medium"
          style={selected?.color ? { color: selected.color } : undefined}
        >
          {selected?.label ?? placeholder ?? label}
        </span>
          <span
            className={cn(
              "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition dark:border-white/8 dark:bg-[#1f2631] dark:text-slate-200",
              open && "rotate-180",
            )}
            style={{
              backgroundColor: isDark ? "rgb(var(--sidebar) / 1)" : "#ffffff",
            }}
          >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M5 7.5L10 12.5L15 7.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      {open ? (
        <div
          className="absolute left-0 top-full z-[90] mt-2 w-full overflow-hidden rounded-[1.75rem] border border-border/70 p-2 shadow-[0_24px_60px_rgba(15,23,42,0.14)] dark:border-white/8 dark:shadow-[0_24px_60px_rgba(0,0,0,0.28)]"
          style={{
            backgroundColor: menuColor,
          }}
        >
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
                    active
                      ? "bg-primary text-primary-foreground shadow-sm dark:bg-[#ff3b4e]"
                      : "text-foreground hover:bg-primary/8 dark:text-slate-200 dark:hover:bg-card/98",
                  )}
                  style={{
                    backgroundColor: active ? "rgb(var(--primary) / 1)" : surfaceColor,
                    color: active ? "rgb(var(--primary-foreground) / 1)" : "rgb(var(--foreground) / 1)",
                  }}
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

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
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

function rangeFromPeriod(period: ReportPeriod, anchorDate: Date, customDays: number) {
  const days = period === "7" ? 7 : period === "30" ? 30 : customDays;
  const safeDays = Number.isFinite(days) && days > 0 ? Math.floor(days) : 1;

  return {
    start: addDays(anchorDate, -(safeDays - 1)),
    end: new Date(anchorDate),
  };
}

function rangeFromMonth(month: number, year: number) {
  const start = new Date(year, month, 1);
  return {
    start,
    end: endOfMonth(start),
  };
}

function normalizeRange(startValue: string, endValue: string, fallback: Date) {
  const start = startValue ? parseDate(startValue) : null;
  const end = endValue ? parseDate(endValue) : null;

  if (start && end) {
    return start <= end ? { start, end } : { start: end, end: start };
  }

  return {
    start: addDays(fallback, -29),
    end: fallback,
  };
}

function resolveReportRange(params: {
  period: ReportPeriod;
  anchorDate: Date;
  customMode: CustomPeriodMode;
  customMonth: number;
  customYear: number;
  customStart: string;
  customEnd: string;
  customPastMonths: number;
}) {
  const { period, anchorDate, customMode, customMonth, customYear, customStart, customEnd, customPastMonths } = params;

  if (period === "7" || period === "30") {
    return rangeFromPeriod(period, anchorDate, 30);
  }

  if (customMode === "month") {
    return rangeFromMonth(customMonth, customYear);
  }

  if (customMode === "range") {
    return normalizeRange(customStart, customEnd, anchorDate);
  }

  const safeMonths = Math.max(1, Math.floor(customPastMonths || 1));
  const start = startOfMonth(addMonths(anchorDate, -(safeMonths - 1)));
  return { start, end: new Date(anchorDate) };
}

function formatMonthYear(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(date);
}

function describeReportPeriod(params: {
  period: ReportPeriod;
  customMode: CustomPeriodMode;
  customMonth: number;
  customYear: number;
  customStart: string;
  customEnd: string;
  customPastMonths: number;
  currentRange: { start: Date; end: Date };
}) {
  const { period, customMode, customMonth, customYear, customStart, customEnd, customPastMonths, currentRange } = params;

  if (period === "7") return "7 dias";
  if (period === "30") return "30 dias";

  if (customMode === "month") {
    return formatMonthYear(new Date(customYear, customMonth, 1));
  }

  if (customMode === "range") {
    const start = customStart ? parseDate(customStart) : currentRange.start;
    const end = customEnd ? parseDate(customEnd) : currentRange.end;
    return `${formatDateKey(start)} - ${formatDateKey(end)}`;
  }

  return `Últimos ${Math.max(1, Math.floor(customPastMonths || 1))} meses`;
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

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Não foi possível ler o arquivo."));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function drawRoundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.arcTo(x + width, y, x + width, y + height, safeRadius);
  context.arcTo(x + width, y + height, x, y + height, safeRadius);
  context.arcTo(x, y + height, x, y, safeRadius);
  context.arcTo(x, y, x + width, y, safeRadius);
  context.closePath();
}

function drawCoverCard(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement | null,
  x: number,
  y: number,
  width: number,
  height: number,
  title: string,
  subtitle: string,
  metric: string,
) {
  context.save();
  drawRoundedRect(context, x, y, width, height, 14);
  context.clip();

  context.fillStyle = "#111";
  context.fillRect(x, y, width, height);

  if (image) {
    const imageRatio = image.width / image.height;
    const cardRatio = width / height;
    let drawWidth = width;
    let drawHeight = height;
    let offsetX = x;
    let offsetY = y;

    if (imageRatio > cardRatio) {
      drawHeight = height;
      drawWidth = height * imageRatio;
      offsetX = x - (drawWidth - width) / 2;
    } else {
      drawWidth = width;
      drawHeight = width / imageRatio;
      offsetY = y - (drawHeight - height) / 2;
    }

    context.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
  }

  const overlay = context.createLinearGradient(0, y, 0, y + height);
  overlay.addColorStop(0, "rgba(0,0,0,0.12)");
  overlay.addColorStop(0.55, "rgba(0,0,0,0.18)");
  overlay.addColorStop(1, "rgba(0,0,0,0.80)");
  context.fillStyle = overlay;
  context.fillRect(x, y, width, height);

  context.strokeStyle = "rgba(255,255,255,0.08)";
  context.lineWidth = 2;
  context.strokeRect(x + 1, y + 1, width - 2, height - 2);

  context.fillStyle = "rgba(255,255,255,0.18)";
  drawRoundedRect(context, x + 14, y + 12, 88, 26, 12);
  context.fill();
  context.fillStyle = "#ffffff";
  context.font = "700 12px Inter, Arial, sans-serif";
  context.fillText("DESTAQUE", x + 28, y + 29);

  context.fillStyle = "rgba(255,255,255,0.88)";
  context.font = "700 16px Inter, Arial, sans-serif";
  context.fillText(title, x + 16, y + height - 42);
  context.fillStyle = "rgba(255,255,255,0.76)";
  context.font = "400 12px Inter, Arial, sans-serif";
  context.fillText(subtitle, x + 16, y + height - 20);

  context.fillStyle = "#ffffff";
  context.font = "700 12px Inter, Arial, sans-serif";
  context.fillText(metric, x + width - 54, y + 28);
  context.restore();
}

function DateRangePicker({
  label,
  startValue,
  endValue,
  onChange,
  dataCy,
}: {
  label: string;
  startValue: string;
  endValue: string;
  onChange: (next: { startValue: string; endValue: string }) => void;
  dataCy?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const { isDark } = useThemeMode();
  const [cursor, setCursor] = useState(
    () => (startValue ? parseDate(startValue) : null) || (endValue ? parseDate(endValue) : null) || new Date(),
  );

  useEffect(() => {
    const nextCursor = (startValue ? parseDate(startValue) : null) || (endValue ? parseDate(endValue) : null);
    if (nextCursor) {
      setCursor(nextCursor);
    }
  }, [endValue, startValue]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const startDate = startValue ? parseDate(startValue) : null;
  const endDate = endValue ? parseDate(endValue) : null;
  const resolvedStart = startDate && endDate ? (startDate <= endDate ? startDate : endDate) : startDate;
  const resolvedEnd = startDate && endDate ? (startDate <= endDate ? endDate : startDate) : endDate;
  const hasRange = Boolean(resolvedStart && resolvedEnd);
  const monthGrid = buildMonthGrid(cursor);
  const surfaceColor = isDark ? "rgb(var(--sidebar) / 1)" : "#ffffff";
  const popoverColor = isDark ? "rgb(var(--background) / 1)" : "#ffffff";
  const displayLabel = hasRange
    ? `${new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(resolvedStart!)} - ${new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(resolvedEnd!)}`
    : resolvedStart
      ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(resolvedStart)
      : "Selecionar intervalo";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        data-cy={dataCy}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 rounded-full border border-border/70 px-5 py-3 text-left text-sm text-foreground transition hover:border-primary/25 hover:shadow-sm dark:border-white/8"
        style={{ backgroundColor: surfaceColor }}
      >
        <span className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CalendarRange className="h-4 w-4" />
          </span>
          <span>
            <span className="block text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
            <span className="block font-medium text-foreground">{displayLabel}</span>
          </span>
        </span>
        <span
          className={cn(
            "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition dark:border-white/8 dark:bg-[#1f2631] dark:text-slate-200",
            open && "rotate-180",
          )}
          style={{ backgroundColor: isDark ? "rgb(var(--sidebar) / 1)" : "#ffffff" }}
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M5 7.5L10 12.5L15 7.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      {open ? (
        <div
          className="absolute left-0 top-full z-[90] mt-2 w-[340px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-[1.75rem] border border-border/70 shadow-[0_24px_60px_rgba(15,23,42,0.14)] dark:border-white/8 dark:shadow-[0_24px_60px_rgba(0,0,0,0.28)]"
          style={{ backgroundColor: popoverColor }}
        >
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-4">
            <button
              type="button"
              onClick={() => setCursor((current) => addMonths(current, -1))}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground transition hover:bg-muted/80 dark:bg-[#1a2029] dark:hover:bg-[#232a37]"
            >
              <ChevronDown className="h-4 w-4 rotate-90" />
            </button>
            <div className="text-center">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Selecionar intervalo</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{formatMonthTitle(cursor)}</p>
            </div>
            <button
              type="button"
              onClick={() => setCursor((current) => addMonths(current, 1))}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground transition hover:bg-muted/80 dark:bg-[#1a2029] dark:hover:bg-[#232a37]"
            >
              <ChevronDown className="h-4 w-4 -rotate-90" />
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
                const isStart = key === startValue;
                const isEnd = key === endValue;
                const inSelectedRange = resolvedStart && resolvedEnd ? date >= resolvedStart && date <= resolvedEnd : false;

                return (
                  <button
                    key={key}
                    type="button"
                    data-cy={`reports-custom-range-day-${key}`}
                    onClick={() => {
                      if (!startValue || (startValue && endValue)) {
                        onChange({ startValue: key, endValue: "" });
                        return;
                      }

                      const currentStart = parseDate(startValue);
                      if (date < currentStart) {
                        onChange({ startValue: key, endValue: startValue });
                        return;
                      }

                      onChange({ startValue, endValue: key });
                    }}
                    className={cn(
                      "flex h-10 items-center justify-center rounded-full text-sm transition",
                      isStart && "bg-primary text-primary-foreground shadow-lg shadow-primary/20",
                      isEnd && "bg-primary text-primary-foreground shadow-lg shadow-primary/20",
                      !isStart && !isEnd && inSelectedRange && "bg-primary/10 text-primary",
                      !isStart && !isEnd && !inSelectedRange && isCurrentMonth && "text-foreground hover:bg-muted dark:text-foreground dark:hover:bg-card/98",
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
                  onChange({
                    startValue: formatDateKey(addDays(now, -29)),
                    endValue: formatDateKey(now),
                  });
                  setCursor(now);
                  setOpen(false);
                }}
                className="rounded-full border border-border/60 bg-card px-3 py-2 text-xs font-semibold text-foreground shadow-sm transition hover:bg-muted/60 dark:border-white/8 dark:hover:bg-card/98"
              >
                Últimos 30 dias
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-border/60 bg-card px-3 py-2 text-xs font-semibold text-muted-foreground shadow-sm transition hover:text-foreground dark:border-white/8 dark:hover:bg-card/98"
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

export function ReportsPage() {
  const { isDark } = useThemeMode();
  const anchorDate = useMemo(() => new Date(), []);
  const [period, setPeriod] = useState<ReportPeriod>("30");
  const [customPeriodMode, setCustomPeriodMode] = useState<CustomPeriodMode>("month");
  const [customMonth, setCustomMonth] = useState(anchorDate.getMonth());
  const [customYear, setCustomYear] = useState(anchorDate.getFullYear());
  const [customStartDate, setCustomStartDate] = useState(formatDateKey(addDays(anchorDate, -29)));
  const [customEndDate, setCustomEndDate] = useState(formatDateKey(anchorDate));
  const [customPastMonths, setCustomPastMonths] = useState(3);
  const [typeFilter, setTypeFilter] = useState<ContentType | "todos">("todos");
  const [responsibleFilter, setResponsibleFilter] = useState<number | "todos">("todos");
  const [teamMembers] = useTeamProfiles();
  const [posts] = usePosts();
  const [calendarItems] = useSupabaseSyncedListState<CalendarEvent>({
    key: "calendar-events",
    table: "calendar_events",
    fallback: calendarEvents,
  });
  const [goals] = useSupabaseSyncedListState<Goal>({ key: "goals", table: "goals", fallback: [] });
  const [monthlyArchive] = useSupabaseSharedState<MonthlyArchiveSnapshot>({
    key: createStorageKey("monthly-archive"),
    fallback: createEmptyMonthlyArchive(),
  });
  const [teamScope] = useTeamScope();
  const [savedReports, setSavedReports] = useSupabaseSharedState<SavedReport[]>({
    key: createStorageKey("reports-history"),
    fallback: [],
  });
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>("reach");
  const [overviewDraft, setOverviewDraft] = useSupabaseSharedState<ReportOverview>({
    key: createStorageKey("reports-overview"),
    fallback: {
      badge: "Visão geral",
      title: "Resumo executivo",
      description:
        "O perfil mantém saúde alta, acelera o crescimento de alcance e encontra mais eficiência quando combina peças de autoridade, prova social e materiais prontos para publicação.",
      note: "Pré-visualização local",
    },
  });
  const [overviewForm, setOverviewForm] = useState(overviewDraft);
  const [isOverviewModalOpen, setIsOverviewModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<ReportSectionEditor>(null);
  const [sectionForm, setSectionForm] = useState<{ title: string; description: string; action: string } | null>(null);
  const [cardDraft, setCardDraft] = useState<{
    rowIndex: number;
    itemIndex: number | null;
    title: string;
    metric: string;
    accent: string;
    image: string;
    imageName: string;
  } | null>(null);
  const [reportRows, setReportRows] = useSupabaseSharedState<ReportCardRow[]>({
    key: createStorageKey("reports-rows"),
    fallback: [
      {
        title: "Capas em destaque",
        description: "Visual forte para escalar o clique no feed e nos destaques.",
        action: "Ver todas",
        items: [
          {
            title: "Dra. Alessandra",
            metric: "2,4k",
            accent: "#D10000",
            image:
              "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=80",
          },
          {
            title: "Dra. Raquel Castro",
            metric: "2,1k",
            accent: "#991B1B",
            image:
              "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=900&q=80",
          },
          {
            title: "Dra. Camila Prado",
            metric: "1,8k",
            accent: "#7F1D1D",
            image:
              "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80",
          },
          {
            title: "Dr. Felipe Souza",
            metric: "1,7k",
            accent: "#5B1414",
            image:
              "https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=900&q=80",
          },
          {
            title: "Dr. Mauro Lima",
            metric: "1,6k",
            accent: "#8B1531",
            image:
              "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80",
          },
        ],
      },
      {
        title: "20 depoimentos",
        description: "Prova social com rostos, frases curtas e leitura rápida.",
        action: "Ver todas",
        items: [
          {
            title: "Larissa M.",
            metric: "947",
            accent: "#D10000",
            image:
              "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=80",
          },
          {
            title: "Equipe Great",
            metric: "921",
            accent: "#991B1B",
            image:
              "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=900&q=80",
          },
          {
            title: "Depoimento 03",
            metric: "867",
            accent: "#991B1B",
            image:
              "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=900&q=80",
          },
          {
            title: "Depoimento 04",
            metric: "842",
            accent: "#5B1414",
            image:
              "https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?auto=format&fit=crop&w=900&q=80",
          },
          {
            title: "Depoimento 05",
            metric: "764",
            accent: "#8B1531",
            image:
              "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=80",
          },
          {
            title: "Depoimento 06",
            metric: "721",
            accent: "#D10000",
            image:
              "https://images.unsplash.com/photo-1504593811423-6dd665756598?auto=format&fit=crop&w=900&q=80",
          },
        ],
      },
      {
        title: "10 entregas de material",
        description: "Peças finais, capas, cortes e materiais prontos para publicação.",
        action: "Ver todas",
        items: [
          {
            title: "Material 01",
            metric: "1,2k",
            accent: "#991B1B",
            image:
              "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80",
          },
          {
            title: "Material 02",
            metric: "1,0k",
            accent: "#7F1D1D",
            image:
              "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80",
          },
          {
            title: "Material 03",
            metric: "987",
            accent: "#991B1B",
            image:
              "https://images.unsplash.com/photo-1554774853-719586f82d77?auto=format&fit=crop&w=900&q=80",
          },
          {
            title: "Material 04",
            metric: "947",
            accent: "#5B1414",
            image:
              "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=900&q=80",
          },
          {
            title: "Material 05",
            metric: "912",
            accent: "#8B1531",
            image:
              "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=900&q=80",
          },
          {
            title: "Material 06",
            metric: "876",
            accent: "#D10000",
            image:
              "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80",
          },
        ],
      },
    ],
  });

  const heroSurfaceClass = isDark
    ? "overflow-hidden bg-[linear-gradient(135deg,rgba(131,58,180,0.96),rgba(180,97,214,0.9),rgba(225,48,108,0.82))] text-white"
    : "overflow-hidden bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(249,250,252,0.98))] text-foreground";
  const heroStatClass = isDark
    ? "rounded-3xl bg-card/12 p-5 ring-1 ring-border/30 backdrop-blur"
    : "rounded-3xl border border-border/60 bg-card/96 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]";
  const filtersBarClass = isDark
    ? "mt-5 flex flex-col gap-4 rounded-[2rem] border border-border/60 bg-card/95 p-4 lg:flex-row lg:items-center"
    : "mt-5 flex flex-col gap-4 rounded-[2rem] border border-border/60 bg-card/98 p-4 shadow-[0_18px_42px_rgba(15,23,42,0.05)] lg:flex-row lg:items-center";
  const softSectionClass = isDark
    ? "rounded-[2rem] border border-border/60 bg-muted/35 p-5 dark:bg-card/95"
    : "rounded-[2rem] border border-border/60 bg-card/95 p-5";
  const softTileClass = isDark
    ? "rounded-2xl bg-card/80 p-4 dark:bg-background/80"
    : "rounded-2xl border border-border/50 bg-card/80 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]";
  const softCardClass = isDark
    ? "rounded-3xl border border-border/60 bg-muted/35 p-5 dark:bg-card/95"
    : "rounded-3xl border border-border/60 bg-card/95 p-5 shadow-[0_14px_32px_rgba(15,23,42,0.05)]";
  const softCardCompactClass = isDark
    ? "rounded-3xl bg-muted/35 p-5 dark:bg-card/90"
    : "rounded-3xl border border-border/60 bg-card/95 p-5 shadow-[0_14px_32px_rgba(15,23,42,0.05)]";
  const monthOptions = [
    { label: "Janeiro", value: 0, color: "#EF4444" },
    { label: "Fevereiro", value: 1, color: "#F97316" },
    { label: "Março", value: 2, color: "#F59E0B" },
    { label: "Abril", value: 3, color: "#10B981" },
    { label: "Maio", value: 4, color: "#3B82F6" },
    { label: "Junho", value: 5, color: "#8B5CF6" },
    { label: "Julho", value: 6, color: "#EC4899" },
    { label: "Agosto", value: 7, color: "#F43F5E" },
    { label: "Setembro", value: 8, color: "#14B8A6" },
    { label: "Outubro", value: 9, color: "#6366F1" },
    { label: "Novembro", value: 10, color: "#E11D48" },
    { label: "Dezembro", value: 11, color: "#0EA5E9" },
  ];
  const yearOptions = Array.from({ length: 6 }, (_, index) => {
    const year = anchorDate.getFullYear() - 2 + index;
    return { label: String(year), value: year, color: year === customYear ? "#D10000" : "#64748B" };
  });

  const currentRange = useMemo(() => {
    return resolveReportRange({
      period,
      anchorDate,
      customMode: customPeriodMode,
      customMonth,
      customYear,
      customStart: customStartDate,
      customEnd: customEndDate,
      customPastMonths,
    });
  }, [anchorDate, customEndDate, customMonth, customPastMonths, customPeriodMode, customStartDate, customYear, period]);
  const previousRange = useMemo(() => shiftRange(currentRange.start, currentRange.end), [currentRange]);
  const allPosts = useMemo(() => [...monthlyArchive.posts, ...posts], [monthlyArchive.posts, posts]);
  const allCalendarItems = useMemo(() => [...monthlyArchive.calendarEvents, ...calendarItems], [calendarItems, monthlyArchive.calendarEvents]);
  const allGoals = useMemo(() => [...monthlyArchive.goals, ...goals], [goals, monthlyArchive.goals]);

  const filteredPosts = useMemo(
    () =>
      allPosts.filter((post) => {
        const matchesDate = inRange(post.date, currentRange.start, currentRange.end);
        const matchesType = typeFilter === "todos" || post.type === typeFilter;
        const matchesResponsible =
          responsibleFilter === "todos" || post.authorId === responsibleFilter;
        const matchesScope = matchesTeamScope(post.authorId, teamScope);

        return matchesDate && matchesType && matchesResponsible && matchesScope;
      }),
    [allPosts, currentRange.end, currentRange.start, responsibleFilter, teamScope, typeFilter],
  );

  const previousPosts = useMemo(
    () =>
      allPosts.filter((post) => {
        const matchesDate = inRange(post.date, previousRange.start, previousRange.end);
        const matchesType = typeFilter === "todos" || post.type === typeFilter;
        const matchesResponsible =
          responsibleFilter === "todos" || post.authorId === responsibleFilter;
        const matchesScope = matchesTeamScope(post.authorId, teamScope);

        return matchesDate && matchesType && matchesResponsible && matchesScope;
      }),
    [allPosts, previousRange.end, previousRange.start, responsibleFilter, teamScope, typeFilter],
  );

  const filteredCalendarItems = useMemo(
    () =>
      allCalendarItems.filter((event) => {
        const responsibleIds = getCalendarResponsibleIds(event);
        const matchesDate = inRange(event.date, currentRange.start, currentRange.end);
        const matchesResponsible =
          responsibleFilter === "todos" || responsibleIds.includes(responsibleFilter);
        const matchesScope = responsibleIds.some((id) => matchesTeamScope(id, teamScope));

        return matchesDate && matchesResponsible && matchesScope;
      }),
    [allCalendarItems, currentRange.end, currentRange.start, responsibleFilter, teamScope],
  );

  const previousCalendarItems = useMemo(
    () =>
      allCalendarItems.filter((event) => {
        const responsibleIds = getCalendarResponsibleIds(event);
        const matchesDate = inRange(event.date, previousRange.start, previousRange.end);
        const matchesResponsible =
          responsibleFilter === "todos" || responsibleIds.includes(responsibleFilter);
        const matchesScope = responsibleIds.some((id) => matchesTeamScope(id, teamScope));

        return matchesDate && matchesResponsible && matchesScope;
      }),
    [allCalendarItems, previousRange.end, previousRange.start, responsibleFilter, teamScope],
  );

  const filteredGoals = useMemo(() => {
    return allGoals.filter((goal) => {
      const responsibleIds = getGoalResponsibleIds(goal);
      const matchesResponsible =
        responsibleFilter === "todos"
          ? responsibleIds.some((id) => matchesTeamScope(id, teamScope))
          : responsibleIds.includes(responsibleFilter) && responsibleIds.some((id) => matchesTeamScope(id, teamScope));
      const matchesPeriod = inRange(goal.deadline, currentRange.start, currentRange.end);

      return matchesResponsible && matchesPeriod;
    });
  }, [allGoals, currentRange.end, currentRange.start, responsibleFilter, teamScope]);

  const currentSummary = useMemo(() => {
    const reach = filteredPosts.reduce((sum, post) => sum + post.reach, 0);
    const engagement = filteredPosts.reduce((sum, post) => sum + post.engagement, 0);
    const saves = filteredPosts.reduce((sum, post) => sum + post.metrics.saves, 0);
    const shares = filteredPosts.reduce((sum, post) => sum + post.metrics.shares, 0);
    const likes = filteredPosts.reduce((sum, post) => sum + post.metrics.likes, 0);
    const comments = filteredPosts.reduce((sum, post) => sum + post.metrics.comments, 0);
    const avgEngagement = filteredPosts.length > 0 ? engagement / filteredPosts.length : 0;
    const finalizedPosts = filteredPosts.filter((post) => isFinalContentStatus(post.status)).length;
    const finalizedCalendarItems = filteredCalendarItems.filter((event) => isCompletedCalendarEvent(event)).length;
    const postsCount = finalizedPosts + finalizedCalendarItems;
    const monthlyProgress = Math.min(100, Math.round((postsCount / monthlyContentTarget) * 100));

    return { reach, engagement, saves, shares, likes, comments, avgEngagement, postsCount, finalizedPosts, finalizedCalendarItems, monthlyProgress };
  }, [filteredCalendarItems, filteredPosts]);

  const previousSummary = useMemo(() => {
    const reach = previousPosts.reduce((sum, post) => sum + post.reach, 0);
    const engagement = previousPosts.reduce((sum, post) => sum + post.engagement, 0);
    const avgEngagement = previousPosts.length > 0 ? engagement / previousPosts.length : 0;
    const finalizedPosts = previousPosts.filter((post) => isFinalContentStatus(post.status)).length;
    const finalizedCalendarItems = previousCalendarItems.filter((event) => isCompletedCalendarEvent(event)).length;
    const postsCount = finalizedPosts + finalizedCalendarItems;

    return { reach, engagement, avgEngagement, postsCount };
  }, [previousCalendarItems, previousPosts]);

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
      teamMembers
        .filter((member) => matchesTeamScope(member.id, teamScope))
        .map((member) => {
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
    [filteredGoals, filteredPosts, teamMembers, teamScope],
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
        title: "Conteúdos finalizados",
        icon: Sparkles,
        current: String(currentSummary.postsCount),
        previous: String(previousSummary.postsCount),
        delta: comparison.posts,
        detail: `Quantidade de conteúdos finalizados no período. Meta mensal: ${monthlyContentTarget}.`,
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
      label: "Conteúdos",
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
      label: `Relatório ${describeReportPeriod({
        period,
        customMode: customPeriodMode,
        customMonth,
        customYear,
        customStart: customStartDate,
        customEnd: customEndDate,
        customPastMonths,
        currentRange,
      })}`,
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
    if (snapshot.period === "custom") {
      setCustomPeriodMode("range");
      setCustomStartDate(snapshot.startDate);
      setCustomEndDate(snapshot.endDate);
    }
    setTypeFilter(snapshot.typeFilter);
    setResponsibleFilter(snapshot.responsibleId);
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
    canvas.width = 2200;
    canvas.height = 1600;
    const context = canvas.getContext("2d");

    if (!context) {
      toast.error("Não foi possível gerar a imagem.");
      return;
    }

    context.fillStyle = "#d40000";
    context.fillRect(0, 0, canvas.width, canvas.height);

    const pageMargin = 70;

    context.fillStyle = "rgba(255,255,255,0.12)";
    context.beginPath();
    context.arc(canvas.width - 240, 180, 180, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "rgba(255,255,255,0.06)";
    context.beginPath();
    context.arc(220, 260, 220, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "rgba(255,255,255,0.9)";
    context.font = "700 44px Inter, Arial, sans-serif";
    context.fillText("Relatório Great Orgânico", pageMargin, 96);
    context.font = "400 22px Inter, Arial, sans-serif";
    context.fillText(`Período: ${formatDateKey(currentRange.start)} a ${formatDateKey(currentRange.end)}`, pageMargin, 136);

    const posterRows = reportRows.slice(0, 3);
    const rowImages = await Promise.all(
      posterRows.map(async (row) => Promise.all(row.items.map(async (item) => loadImage(item.image)))),
    );

    const topRowY = 180;
    const topCardW = 220;
    const topCardH = 330;
    const topGap = 14;
    const topRowWidth = topCardW * 5 + topGap * 4;
    const topStartX = Math.round((canvas.width - topRowWidth) / 2);
    const topItems = posterRows[0]?.items.slice(0, 5) ?? [];

    topItems.forEach((item, index) => {
      drawCoverCard(
        context,
        rowImages[0]?.[index] ?? null,
        topStartX + index * (topCardW + topGap),
        topRowY,
        topCardW,
        topCardH,
        item.title,
        "Conteúdo pronto para publicação",
        item.metric,
      );
    });

    context.fillStyle = "#ffffff";
    context.font = "800 104px Inter, Arial, sans-serif";
    context.textAlign = "center";
    context.fillText("5 CAPAS", canvas.width / 2, topRowY + 220);
    context.textAlign = "left";

    const sectionConfigs = [
      {
        rowIndex: 1,
        title: "20 DEPOIMENTOS",
        y: 610,
        cardW: 182,
        cardH: 240,
        gap: 14,
        columns: 10,
      },
      {
        rowIndex: 2,
        title: "10 ENTREGAS DE MATERIAL",
        y: 1000,
        cardW: 182,
        cardH: 240,
        gap: 14,
        columns: 10,
      },
    ] as const;

    sectionConfigs.forEach((section) => {
      const row = posterRows[section.rowIndex];
      const images = rowImages[section.rowIndex] ?? [];
      if (!row) {
        return;
      }

      const sectionWidth = section.cardW * section.columns + section.gap * (section.columns - 1);
      const startX = Math.round((canvas.width - sectionWidth) / 2);

      Array.from({ length: section.columns }, (_, index) => row.items[index % row.items.length]).forEach((item, index) => {
        drawCoverCard(
          context,
          images[index % images.length] ?? null,
          startX + index * (section.cardW + section.gap),
          section.y,
          section.cardW,
          section.cardH,
          item.title,
          "Conteúdo pronto para publicação",
          item.metric,
        );
      });

      context.fillStyle = "#ffffff";
      context.font = "800 72px Inter, Arial, sans-serif";
      context.textAlign = "center";
      context.fillText(section.title, canvas.width / 2, section.y + section.cardH - 28);
      context.textAlign = "left";
    });

    context.fillStyle = "rgba(255,255,255,0.9)";
    context.font = "600 20px Inter, Arial, sans-serif";
    context.fillText(
      `Alcance ${formatLongNumber(currentSummary.reach)} • Engajamento ${formatLongNumber(currentSummary.engagement)} • Conteúdos ${currentSummary.postsCount}/${monthlyContentTarget}`,
      pageMargin,
      canvas.height - 36,
    );

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
      title: "Conteúdos finalizados",
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

  const completedGoalsCount = filteredGoals.filter((goal) => goal.current >= goal.target).length;
  const goalCompletionRate = filteredGoals.length > 0 ? completedGoalsCount / filteredGoals.length : 0;
  const healthScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        50 +
          (comparison.reach > 0 ? 12 : -4) +
          (comparison.engagement > 0 ? 12 : -4) +
          goalCompletionRate * 22 +
          Math.min(8, currentSummary.monthlyProgress * 0.08),
      ),
    ),
  );
  const displaySummary = {
    health: healthScore,
    reach: currentSummary.reach,
    engagement: currentSummary.engagement,
    posts: currentSummary.postsCount,
    avgEngagement: currentSummary.avgEngagement,
    monthlyProgress: currentSummary.monthlyProgress,
  };
  const heroSummaryCards = [
    {
      label: "Saúde total",
      value: `${displaySummary.health}`,
      delta: formatPercent(Math.max(0, comparison.engagement), 1),
      icon: Sparkles,
      tone: "good" as const,
    },
    {
      label: "Alcance total",
      value: formatLongNumber(displaySummary.reach),
      delta: formatPercent(comparison.reach, 1),
      icon: Eye,
      tone: "good" as const,
    },
    {
      label: "Engajamento",
      value: formatLongNumber(displaySummary.engagement),
      delta: formatPercent(comparison.engagement, 1),
      icon: BarChart3,
      tone: "good" as const,
    },
    {
      label: "Conteúdos finalizados",
      value: formatLongNumber(displaySummary.posts),
      delta: formatPercent(comparison.posts, 1),
      icon: Rocket,
      tone: "good" as const,
      note: `Meta de ${monthlyContentTarget} conteúdos/mês`,
    },
    {
      label: "Progresso mensal",
      value: `${displaySummary.monthlyProgress}%`,
      delta: formatPercent(comparison.posts, 1),
      icon: CheckCircle2,
      tone: "good" as const,
      note: `${formatLongNumber(displaySummary.posts)} de ${monthlyContentTarget} conteúdos`,
    },
  ];
  const bottomSummary = [
    { label: "Alcance total", value: formatLongNumber(currentSummary.reach), icon: Eye, tone: "#D10000" },
    { label: "Engajamento total", value: formatLongNumber(currentSummary.engagement), icon: BarChart3, tone: "#E11D48" },
    {
      label: "Conteúdos finalizados",
      value: formatLongNumber(currentSummary.postsCount),
      icon: Rocket,
      tone: "#2563EB",
    },
    {
      label: "Progresso mensal",
      value: `${currentSummary.monthlyProgress}%`,
      icon: CheckCircle2,
      tone: "#16A34A",
    },
  ];
  const openAddReportCard = (rowIndex: number) => {
    const accent = reportRows[rowIndex]?.items[0]?.accent ?? "#D10000";
    setCardDraft({
      rowIndex,
      itemIndex: null,
      title: "",
      metric: "",
      accent,
      image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=80",
      imageName: "",
    });
  };
  const openEditReportCard = (rowIndex: number, itemIndex: number) => {
    const target = reportRows[rowIndex]?.items[itemIndex];
    if (!target) {
      return;
    }

    setCardDraft({
      rowIndex,
      itemIndex,
      title: target.title,
      metric: target.metric,
      accent: target.accent,
      image: target.image,
      imageName: "",
    });
  };
  const saveCardDraft = () => {
    if (!cardDraft?.title.trim()) {
      toast.error("Informe o título do card.");
      return;
    }

    if (!cardDraft.image.trim()) {
      toast.error("Adicione a imagem do card.");
      return;
    }

    setReportRows((previous) =>
      previous.map((row, rowIndex) =>
        rowIndex === cardDraft.rowIndex
          ? {
              ...row,
              items:
                cardDraft.itemIndex === null
                  ? [
                      ...row.items,
                      {
                        title: cardDraft.title.trim(),
                        metric: cardDraft.metric.trim() || "0",
                        accent: cardDraft.accent.trim() || "#D10000",
                        image: cardDraft.image.trim(),
                      },
                    ]
                  : row.items.map((item, itemIndex) =>
                      itemIndex === cardDraft.itemIndex
                        ? {
                            ...item,
                            title: cardDraft.title.trim(),
                            metric: cardDraft.metric.trim() || item.metric,
                            accent: cardDraft.accent.trim() || item.accent,
                            image: cardDraft.image.trim(),
                          }
                        : item,
                    ),
            }
          : row,
      ),
    );

    setCardDraft(null);
    toast.success(cardDraft.itemIndex === null ? "Card adicionado." : "Card atualizado.");
  };
  const handleDeleteReportCard = (rowIndex: number, itemIndex: number) => {
    const target = reportRows[rowIndex]?.items[itemIndex];
    if (!target) {
      return;
    }

    const confirmed = window.confirm(`Apagar o card "${target.title}"?`);
    if (!confirmed) {
      return;
    }

    setReportRows((previous) =>
      previous.map((row, index) =>
        index === rowIndex
          ? {
              ...row,
              items: row.items.filter((_, currentIndex) => currentIndex !== itemIndex),
            }
          : row,
      ),
    );
    toast.success("Card apagado.");
  };
  const openOverviewEditor = () => {
    setOverviewForm(overviewDraft);
    setIsOverviewModalOpen(true);
  };
  const openRowSectionEditor = (rowIndex: number) => {
    const target = reportRows[rowIndex];
    if (!target) {
      return;
    }

    setEditingSection({ scope: "row", rowIndex });
    setSectionForm({
      title: target.title,
      description: target.description,
      action: target.action,
    });
  };
  const saveSectionForm = () => {
    if (!editingSection || !sectionForm) {
      return;
    }

    if (editingSection.scope === "row" && typeof editingSection.rowIndex === "number") {
      setReportRows((previous) =>
        previous.map((row, rowIndex) =>
          rowIndex === editingSection.rowIndex
            ? {
                ...row,
                title: sectionForm.title.trim() || row.title,
                description: sectionForm.description.trim() || row.description,
                action: sectionForm.action.trim() || row.action,
              }
            : row,
        ),
      );
      toast.success("Seção atualizada.");
    }

    setEditingSection(null);
    setSectionForm(null);
  };
  const restoreSectionDefaults = () => {
    if (!editingSection || typeof editingSection.rowIndex !== "number") {
      return;
    }

    const defaults = [
      {
        title: "Capas em destaque",
        description: "Visual forte para escalar o clique no feed e nos destaques.",
        action: "Ver todas",
      },
      {
        title: "20 depoimentos",
        description: "Prova social com rostos, frases curtas e leitura rápida.",
        action: "Ver todas",
      },
      {
        title: "10 entregas de material",
        description: "Peças finais, capas, cortes e materiais prontos para publicação.",
        action: "Ver todas",
      },
    ];

    const fallback = defaults[editingSection.rowIndex];
    if (!fallback) {
      return;
    }

    setReportRows((previous) =>
      previous.map((row, rowIndex) => (rowIndex === editingSection.rowIndex ? { ...row, ...fallback } : row)),
    );
    setSectionForm(fallback);
    toast.success("Título restaurado para o padrão.");
  };
  void [
    Area,
    AreaChart,
    AlertTriangle,
    CartesianGrid,
    FileDown,
    FileImage,
    Line,
    LineChart,
    ProgressBar,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
    GlassPanel,
    PageHeader,
    SectionTitle,
    FilterPill,
    contentTypeOptions,
    RoundedDropdown,
    DateRangePicker,
    savedReports,
    setSelectedMetric,
    heroSurfaceClass,
    heroStatClass,
    filtersBarClass,
    softSectionClass,
    softTileClass,
    softCardClass,
    softCardCompactClass,
    comparisonSeries,
    selectedMetricCard,
    metricCards,
    alerts,
    automaticInsights,
    handleSaveReport,
    handleRestoreReport,
    selectedMetricDetails,
    openAddReportCard,
    openEditReportCard,
    saveCardDraft,
    TrendingDown,
  ];

  return (
    <PageTransition>
      <div className="space-y-6">
        <section className="rounded-[2.4rem] border border-border/70 bg-white/96 p-6 shadow-[0_20px_55px_rgba(15,23,42,0.07)] backdrop-blur-xl">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Relatório executivo</p>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2.45rem]">Relatório executivo da Great Orgânico</h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                Acompanhe os destaques do período, compare com a janela anterior e visualize os conteúdos que mais puxaram a operação.
              </p>
            </div>

            <div className="flex flex-col gap-3 xl:items-end">
              <div className="inline-flex w-fit rounded-full border border-border/70 bg-card p-1 shadow-sm">
                {reportPeriods.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    data-cy={`reports-period-${item.value === "custom" ? "custom" : item.value}`}
                    aria-pressed={period === item.value}
                    onClick={() => setPeriod(item.value)}
                    className={cn(
                      "rounded-full px-4 py-2 text-sm font-medium transition",
                      period === item.value
                        ? "bg-primary text-primary-foreground shadow-[0_10px_20px_rgba(209,0,0,0.18)]"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {period === "custom" ? (
                <div className="w-full max-w-[560px] rounded-[1.5rem] border border-border/70 bg-white p-4 shadow-[0_18px_42px_rgba(15,23,42,0.05)]">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Personalizado
                      </p>
                      <p className="mt-1 text-sm font-medium text-foreground">
                        {describeReportPeriod({
                          period,
                          customMode: customPeriodMode,
                          customMonth,
                          customYear,
                          customStart: customStartDate,
                          customEnd: customEndDate,
                          customPastMonths,
                          currentRange,
                        })}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomPeriodMode("month");
                        setCustomMonth(anchorDate.getMonth());
                        setCustomYear(anchorDate.getFullYear());
                        setCustomStartDate(formatDateKey(addDays(anchorDate, -29)));
                        setCustomEndDate(formatDateKey(anchorDate));
                        setCustomPastMonths(3);
                      }}
                      className="rounded-full border border-border/60 bg-muted/30 px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:border-primary/30 hover:text-foreground"
                    >
                      Restaurar padrão
                    </button>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {[
                      { label: "Mês específico", value: "month" as const },
                      { label: "Intervalo", value: "range" as const },
                      { label: "Meses passados", value: "past" as const },
                    ].map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setCustomPeriodMode(item.value)}
                        data-cy={`reports-custom-mode-${item.value}`}
                        className={cn(
                          "rounded-full px-3 py-2 text-xs font-semibold transition",
                          customPeriodMode === item.value
                            ? "bg-primary text-primary-foreground shadow-[0_10px_20px_rgba(209,0,0,0.18)]"
                            : "border border-border/60 bg-white text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {customPeriodMode === "month" ? (
                      <>
                        <RoundedDropdown
                          label="Mês"
                          value={customMonth}
                          options={monthOptions}
                          onChange={(value) => setCustomMonth(Number(value))}
                          placeholder="Selecionar mês"
                        />
                        <RoundedDropdown
                          label="Ano"
                          value={customYear}
                          options={yearOptions}
                          onChange={(value) => setCustomYear(Number(value))}
                          placeholder="Selecionar ano"
                        />
                      </>
                    ) : null}

                    {customPeriodMode === "past" ? (
                      <div className="sm:col-span-2">
                        <label className="grid gap-2">
                          <span className="text-sm font-medium text-slate-700">Meses passados</span>
                          <input
                            type="number"
                            min={1}
                            max={12}
                            value={customPastMonths}
                            onChange={(event) => setCustomPastMonths(Number(event.target.value) || 1)}
                            className="rounded-[1.5rem] border border-border/70 bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                            placeholder="Ex.: 3"
                          />
                        </label>
                      </div>
                    ) : null}

                    {customPeriodMode === "range" ? (
                      <div className="sm:col-span-2">
                        <DateRangePicker
                          label="Intervalo de datas"
                          startValue={customStartDate}
                          endValue={customEndDate}
                          dataCy="reports-custom-range-trigger"
                          onChange={({ startValue, endValue }) => {
                            setCustomStartDate(startValue);
                            setCustomEndDate(endValue);
                          }}
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <ActionButton dataCy="reports-save" variant="secondary" onClick={handleSaveReport}>
                  <CheckCircle2 className="h-4 w-4" />
                  Salvar relatório
                </ActionButton>
                <ActionButton dataCy="reports-export-csv" variant="secondary" onClick={handleExportCsv}>
                  <Download className="h-4 w-4" />
                  Exportar
                </ActionButton>
                <ActionButton dataCy="reports-export-image" variant="secondary" onClick={handleExportImage}>
                  <Share2 className="h-4 w-4" />
                  Compartilhar
                </ActionButton>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[2.4rem] border border-border/70 bg-white p-6 shadow-[0_20px_55px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Filtros</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Ajuste o tipo e o responsável</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Esses filtros refinam os indicadores e os cards da página.
              </p>
            </div>
            <div className="grid w-full gap-3 lg:max-w-2xl lg:grid-cols-2">
              <ReportMenuSelect
                label="Todos os tipos"
                value={typeFilter}
                options={contentTypeOptions}
                onChange={setTypeFilter}
                triggerDataCy="reports-filter-type-trigger"
                optionDataCyPrefix="reports-filter-type"
              />
              <ReportMenuSelect
                label="Todos os responsáveis"
                value={responsibleFilter}
                options={[
                  { label: "Todos os responsáveis", value: "todos" as const },
                  ...teamMembers.map((member) => ({ label: member.name, value: member.id })),
                ]}
                onChange={setResponsibleFilter}
                triggerDataCy="reports-filter-responsible-trigger"
                optionDataCyPrefix="reports-filter-responsible"
              />
            </div>
          </div>
        </section>

        <section>
          <div className="overflow-hidden rounded-[2.6rem] border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(248,250,252,0.98))] p-6 shadow-[0_24px_65px_rgba(15,23,42,0.07)] sm:p-7">
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_520px] xl:items-stretch">
              <div className="relative overflow-hidden rounded-[2.2rem] border border-rose-200/70 bg-[radial-gradient(circle_at_top_left,rgba(227,27,75,0.18),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(255,110,140,0.12),transparent_28%),linear-gradient(180deg,rgba(255,248,249,0.99),rgba(255,239,242,0.97))] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_18px_42px_rgba(227,27,75,0.08)] sm:p-8">
                <div className="absolute right-0 top-0 h-36 w-36 rounded-full bg-primary/10 blur-3xl" />
                <div className="relative flex h-full flex-col justify-between gap-8">
                  <div className="max-w-2xl">
                    <span className="inline-flex rounded-full border border-border/60 bg-white/85 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground shadow-sm">
                      {overviewDraft.badge}
                    </span>
                    <div className="mt-5 flex items-start justify-between gap-4">
                      <div className="space-y-3">
                        <h2 className="max-w-xl text-[clamp(2rem,3vw,3rem)] font-semibold tracking-tight text-foreground">
                          {overviewDraft.title}
                        </h2>
                        <p className="max-w-2xl text-base leading-8 text-muted-foreground">
                          {overviewDraft.description}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={openOverviewEditor}
                        className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border/70 bg-white text-foreground shadow-[0_10px_22px_rgba(15,23,42,0.08)] transition hover:border-primary/25 hover:text-primary hover:shadow-md"
                        aria-label="Editar visão geral"
                      >
                        <PencilLine className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="inline-flex rounded-full bg-primary/8 px-4 py-2 text-sm font-semibold text-primary">
                      {overviewDraft.note}
                    </div>
                    <div className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-600">
                      Operação acompanhada em tempo real
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:min-w-[470px]">
                {heroSummaryCards.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className="group rounded-[1.7rem] border border-rose-200/70 bg-[linear-gradient(180deg,rgba(255,248,249,0.98),rgba(255,241,244,0.96))] p-5 shadow-[0_12px_28px_rgba(227,27,75,0.08)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(227,27,75,0.12)]"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/12 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.78)]">
                          <Icon className="h-5 w-5" />
                        </div>
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-600">
                          <TrendingUp className="h-3.5 w-3.5" />
                          {item.delta}
                        </span>
                      </div>
                      <div className="mt-7 space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">{item.label}</p>
                        <p className="text-[clamp(2rem,2.4vw,2.5rem)] font-semibold tracking-tight text-foreground">{item.value}</p>
                        {item.note ? <p className="text-sm leading-6 text-muted-foreground">{item.note}</p> : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[2.4rem] border border-border/70 bg-white p-6 shadow-[0_20px_55px_rgba(15,23,42,0.06)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Histórico salvo</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Relatórios recentes</h2>
            </div>
          </div>
          <div className="mt-5 grid gap-3">
            {savedReports.length > 0 ? (
              savedReports.slice(0, 3).map((snapshot) => (
                <div key={snapshot.id} className="flex items-center justify-between gap-4 rounded-[1.4rem] border border-border/60 bg-muted/20 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{snapshot.label}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{snapshot.generatedAt}</p>
                  </div>
                  <ActionButton
                    dataCy="reports-history-restore"
                    variant="secondary"
                    onClick={() => handleRestoreReport(snapshot)}
                  >
                    Restaurar
                  </ActionButton>
                </div>
              ))
            ) : (
              <div className="rounded-[1.4rem] border border-dashed border-border/60 bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
                Nenhum relatório salvo ainda.
              </div>
            )}
          </div>
        </section>

        <div className="space-y-6">
              {reportRows.map((row, rowIndex) => (
                <section key={row.title} className="rounded-[2.4rem] border border-border/70 bg-white p-6 shadow-[0_20px_55px_rgba(15,23,42,0.05)]">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold tracking-tight text-foreground">{row.title}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">{row.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openRowSectionEditor(rowIndex)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-white text-muted-foreground transition hover:border-primary/25 hover:text-foreground hover:shadow-sm"
                        aria-label={`Editar ${row.title}`}
                      >
                        <PencilLine className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openAddReportCard(rowIndex)}
                        className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-white px-4 py-2 text-sm font-medium text-foreground shadow-sm transition hover:border-primary/25 hover:shadow-md"
                      >
                    <Plus className="h-4 w-4" />
                    Adicionar card
                  </button>
                  <button type="button" className="text-sm font-medium text-muted-foreground transition hover:text-foreground">
                    {row.action}
                  </button>
                </div>
              </div>

              <div className="mt-5 flex gap-4 overflow-x-auto pb-1">
                {row.items.map((item, itemIndex) => (
                  <article
                    key={`${row.title}-${item.title}`}
                    className="group relative h-[170px] min-w-[250px] overflow-hidden rounded-[1.8rem] border border-border/60 bg-slate-100 shadow-[0_14px_34px_rgba(15,23,42,0.08)]"
                  >
                    <div
                      className="absolute inset-0 bg-cover bg-center transition duration-500 group-hover:scale-105"
                      style={{
                        backgroundImage: `linear-gradient(180deg, rgba(8,10,16,0.06) 0%, rgba(8,10,16,0.78) 100%), url(${item.image})`,
                      }}
                    />
                    <div
                      className="absolute inset-0 opacity-70"
                      style={{
                        background: `linear-gradient(135deg, ${item.accent}33 0%, transparent 45%, rgba(255,255,255,0.04) 100%)`,
                      }}
                    />
                    <div className="absolute left-4 right-4 top-4 flex items-center justify-between">
                      <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/90 backdrop-blur">
                        Destaque
                      </span>
                      <span className="rounded-full bg-black/20 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
                        {item.metric}
                      </span>
                    </div>
                    <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                      <p className="text-sm font-semibold leading-5">{item.title}</p>
                      <p className="mt-1 text-xs text-white/75">Conteúdo pronto para publicação</p>
                    </div>
                    <div className="absolute right-3 top-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEditReportCard(rowIndex, itemIndex)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/92 text-foreground shadow-md transition hover:bg-white hover:text-primary"
                        aria-label={`Editar ${item.title}`}
                      >
                        <PencilLine className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteReportCard(rowIndex, itemIndex)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/92 text-destructive shadow-md transition hover:bg-white"
                        aria-label={`Apagar ${item.title}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
                </section>
              ))}
            </div>

        <section className="rounded-[2.4rem] border border-border/70 bg-white p-6 shadow-[0_20px_55px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Resumo do período</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Fechamento rápido da operação</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Uma visão curta do que a equipe entregou neste recorte, com números que ajudam a tomar decisão sem sair da página.
              </p>
            </div>
            <ActionButton dataCy="reports-export-pdf" variant="secondary" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              Ver análise completa
            </ActionButton>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {bottomSummary.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="rounded-[1.6rem] border border-border/60 bg-muted/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-sm">
                      <Icon className="h-5 w-5" style={{ color: item.tone }} />
                    </div>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Agora
                    </span>
                  </div>
                  <p className="mt-4 text-sm font-medium text-foreground">{item.label}</p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{item.value}</p>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {isOverviewModalOpen ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/35 px-4 py-6 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] border border-border/70 bg-white p-6 shadow-[0_28px_80px_rgba(15,23,42,0.22)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Visão geral</p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Ajuste o texto principal</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOverviewModalOpen(false)}
                className="rounded-full border border-border/60 bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm transition hover:border-primary/25"
              >
                Fechar
              </button>
            </div>

            <div className="mt-6 grid gap-4">
              <label className="grid gap-2">
                <span className="text-sm font-medium text-foreground">Faixa superior</span>
                <input
                  value={overviewForm.badge}
                  onChange={(event) => setOverviewForm((previous) => ({ ...previous, badge: event.target.value }))}
                  className="rounded-2xl border border-border/60 bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary/30"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-medium text-foreground">Título</span>
                <input
                  value={overviewForm.title}
                  onChange={(event) => setOverviewForm((previous) => ({ ...previous, title: event.target.value }))}
                  className="rounded-2xl border border-border/60 bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary/30"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-medium text-foreground">Descrição</span>
                <textarea
                  value={overviewForm.description}
                  onChange={(event) => setOverviewForm((previous) => ({ ...previous, description: event.target.value }))}
                  rows={4}
                  className="rounded-2xl border border-border/60 bg-white px-4 py-3 text-sm leading-6 text-foreground outline-none transition focus:border-primary/30"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-medium text-foreground">Selo inferior</span>
                <input
                  value={overviewForm.note}
                  onChange={(event) => setOverviewForm((previous) => ({ ...previous, note: event.target.value }))}
                  className="rounded-2xl border border-border/60 bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary/30"
                />
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsOverviewModalOpen(false)}
                className="rounded-full border border-border/60 bg-card px-4 py-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
              >
                Cancelar
              </button>
              <ActionButton
                onClick={() => {
                  setOverviewDraft(overviewForm);
                  setIsOverviewModalOpen(false);
                  toast.success("Visão geral atualizada.");
                }}
              >
                Salvar alterações
              </ActionButton>
            </div>
          </div>
        </div>
      ) : null}

      {editingSection && sectionForm ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/35 px-4 py-6 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] border border-border/70 bg-white p-6 shadow-[0_28px_80px_rgba(15,23,42,0.22)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Seção</p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Personalize o nome e a ação</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Ajuste o texto visível do bloco sem perder o padrão da plataforma.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingSection(null);
                  setSectionForm(null);
                }}
                className="rounded-full border border-border/60 bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm transition hover:border-primary/25"
              >
                Fechar
              </button>
            </div>

            <div className="mt-6 grid gap-4">
              <label className="grid gap-2">
                <span className="text-sm font-medium text-foreground">Título da seção</span>
                <input
                  value={sectionForm.title}
                  onChange={(event) => setSectionForm((previous) => (previous ? { ...previous, title: event.target.value } : previous))}
                  className="rounded-2xl border border-border/60 bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary/30 focus:ring-4 focus:ring-primary/10"
                  placeholder="Ex.: Capas em destaque"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-medium text-foreground">Descrição</span>
                <textarea
                  value={sectionForm.description}
                  onChange={(event) =>
                    setSectionForm((previous) => (previous ? { ...previous, description: event.target.value } : previous))
                  }
                  rows={4}
                  className="rounded-2xl border border-border/60 bg-white px-4 py-3 text-sm leading-6 text-foreground outline-none transition focus:border-primary/30 focus:ring-4 focus:ring-primary/10"
                  placeholder="Explique brevemente o objetivo do bloco."
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-medium text-foreground">Texto da ação</span>
                <input
                  value={sectionForm.action}
                  onChange={(event) => setSectionForm((previous) => (previous ? { ...previous, action: event.target.value } : previous))}
                  className="rounded-2xl border border-border/60 bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary/30 focus:ring-4 focus:ring-primary/10"
                  placeholder="Ex.: Ver todas"
                />
              </label>
            </div>

            <div className="mt-6 flex flex-wrap justify-between gap-3">
              <button
                type="button"
                onClick={restoreSectionDefaults}
                className="rounded-full border border-border/60 bg-card px-4 py-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
              >
                Restaurar padrão
              </button>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setEditingSection(null);
                    setSectionForm(null);
                  }}
                  className="rounded-full border border-border/60 bg-card px-4 py-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
                >
                  Cancelar
                </button>
                <ActionButton onClick={saveSectionForm}>Salvar alterações</ActionButton>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {cardDraft ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/35 px-4 py-6 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] border border-border/70 bg-white p-6 shadow-[0_28px_80px_rgba(15,23,42,0.22)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {cardDraft.itemIndex === null ? "Adicionar card" : "Ajustar card"}
                </p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Preencha os detalhes do card</h3>
              </div>
              <button
                type="button"
                onClick={() => setCardDraft(null)}
                className="rounded-full border border-border/60 bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm transition hover:border-primary/25"
              >
                Fechar
              </button>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
              <div className="grid gap-4">
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-foreground">Título</span>
                  <input
                    value={cardDraft.title}
                    onChange={(event) => setCardDraft((previous) => (previous ? { ...previous, title: event.target.value } : previous))}
                    className="rounded-2xl border border-border/60 bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary/30"
                    placeholder="Ex.: Dra. Alessandra"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-medium text-foreground">Métrica</span>
                  <input
                    value={cardDraft.metric}
                    onChange={(event) => setCardDraft((previous) => (previous ? { ...previous, metric: event.target.value } : previous))}
                    className="rounded-2xl border border-border/60 bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary/30"
                    placeholder="Ex.: 2,4k"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-medium text-foreground">Cor de destaque</span>
                  <input
                    value={cardDraft.accent}
                    onChange={(event) => setCardDraft((previous) => (previous ? { ...previous, accent: event.target.value } : previous))}
                    className="rounded-2xl border border-border/60 bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary/30"
                    placeholder="#D10000"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-medium text-foreground">Arquivo da imagem</span>
                  <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 py-4 transition hover:border-primary/30">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (event) => {
                        const file = event.target.files?.[0];
                        if (!file) {
                          return;
                        }

                        try {
                          const nextImage = await readFileAsDataUrl(file);
                          setCardDraft((previous) =>
                            previous
                              ? {
                                  ...previous,
                                  image: nextImage,
                                  imageName: file.name,
                                }
                              : previous,
                          );
                        } catch {
                          toast.error("Não foi possível ler o arquivo selecionado.");
                        }
                      }}
                      className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-full file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary-foreground file:shadow-sm hover:file:bg-primary/95"
                    />
                    <p className="mt-3 text-xs text-muted-foreground">
                      {cardDraft.imageName ? `Arquivo selecionado: ${cardDraft.imageName}` : "Escolha uma imagem para salvar junto do card."}
                    </p>
                  </div>
                </label>
              </div>

              <div className="rounded-[1.8rem] border border-border/60 bg-muted/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Prévia</p>
                <div className="mt-4 overflow-hidden rounded-[1.4rem] border border-border/60 bg-slate-100" style={{ minHeight: 260 }}>
                  <div
                    className="h-[210px] bg-cover bg-center"
                    style={{
                      backgroundImage: `linear-gradient(180deg, rgba(8,10,16,0.06) 0%, rgba(8,10,16,0.78) 100%), url(${cardDraft.image || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=80"})`,
                    }}
                  />
                  <div className="p-4 text-white" style={{ backgroundColor: cardDraft.accent || "#D10000" }}>
                    <p className="text-sm font-semibold">{cardDraft.title || "Título do card"}</p>
                    <p className="mt-1 text-xs text-white/80">Métrica: {cardDraft.metric || "0"}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setCardDraft(null)}
                className="rounded-full border border-border/60 bg-card px-4 py-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
              >
                Cancelar
              </button>
              <ActionButton onClick={saveCardDraft}>{cardDraft.itemIndex === null ? "Adicionar card" : "Salvar card"}</ActionButton>
            </div>
          </div>
        </div>
      ) : null}
    </PageTransition>
  );
}
