import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  ArrowLeft,
  Download,
  Eye,
  FileImage,
  FileText,
  MoveDown,
  MoveUp,
  Plus,
  Printer,
  Trash2,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { goals as seedGoals, type ContentType, type Goal } from "../data/mockData";
import { createStorageKey, useSharedState } from "../data/sharedState";
import { useTeamProfiles } from "../data/profiles";
import { usePosts, type Post } from "../data/posts";
import { useSupabaseSyncedListState } from "../data/supabaseSync";
import { matchesTeamScope, useTeamScope } from "../data/teamScope";
import {
  ActionButton,
  GlassPanel,
  PageHeader,
  PageTransition,
  ProgressBar,
  SectionTitle,
  cn,
  formatLongNumber,
  formatPercent,
} from "../components/ui";
import { getGoalResponsibleIds } from "../data/mockData";

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

const reportPages = [
  { id: "cover", label: "Capa" },
  { id: "summary", label: "Resumo" },
  { id: "content", label: "Conteúdo" },
  { id: "notes", label: "Anotações" },
] as const;

const pageLabels: Record<(typeof reportPages)[number]["id"], string> = {
  cover: "Capa",
  summary: "Resumo",
  content: "Conteúdo",
  notes: "Anotações",
};

type ReportPeriod = (typeof reportPeriods)[number]["value"];
type ReportPageId = (typeof reportPages)[number]["id"];
type ManualBlockKind = "note" | "feedback" | "image" | "link";

type ManualBlock = {
  id: string;
  pageId: ReportPageId;
  order: number;
  kind: ManualBlockKind;
  title: string;
  content: string;
  imageUrl: string;
  imageUrls: string[];
  imageCaptions: string[];
  linkLabel: string;
  linkUrl: string;
  score: number;
};

type PreviewState = {
  period: ReportPeriod;
  typeFilter: ContentType | "todos";
  responsibleFilter: number | "todos";
  customStartDate: string;
  customEndDate: string;
  selectedPage: ReportPageId;
  sections: {
    metrics: boolean;
    comparison: boolean;
    topPosts: boolean;
    goals: boolean;
    members: boolean;
    insights: boolean;
  };
};

type MetricCard = {
  label: string;
  value: string;
  helper: string;
  delta: number;
  icon: LucideIcon;
};

function parseDate(value: string) {
  return new Date(`${value}T12:00:00`);
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateLabel(value: string) {
  const date = new Date(`${value}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return "Selecionar data";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  next.setHours(12, 0, 0, 0);
  return next;
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

function shiftRange(start: Date, end: Date) {
  const days = diffDays(start, end) + 1;
  return {
    start: addDays(start, -days),
    end: addDays(end, -days),
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

function createDefaultPreviewState(anchorDate: Date): PreviewState {
  return {
    period: "30",
    typeFilter: "todos",
    responsibleFilter: "todos",
    customStartDate: formatDateKey(addDays(anchorDate, -29)),
    customEndDate: formatDateKey(anchorDate),
    selectedPage: "cover",
    sections: {
      metrics: true,
      comparison: true,
      topPosts: true,
      goals: true,
      members: true,
      insights: true,
    },
  };
}

function emptyManualBlock(pageId: ReportPageId): ManualBlock {
  return {
    id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    pageId,
    order: 0,
    kind: "note",
    title: "",
    content: "",
    imageUrl: "",
    imageUrls: [],
    imageCaptions: [],
    linkLabel: "",
    linkUrl: "",
    score: 5,
  };
}

function getManualBlockImageEntries(
  block: Pick<ManualBlock, "imageUrl" | "imageUrls" | "imageCaptions">,
) {
  const urls = (block.imageUrls ?? []).filter(Boolean);
  const captions = block.imageCaptions ?? [];

  if (urls.length > 0) {
    return urls.map((url, index) => ({
      url,
      caption: captions[index] ?? "",
    }));
  }

  return block.imageUrl
    ? [
        {
          url: block.imageUrl,
          caption: "",
        },
      ]
    : [];
}

function moveArrayItem<T>(items: T[], fromIndex: number, toIndex: number) {
  const next = [...items];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

function normalizeManualBlock(block: ManualBlock) {
  if (block.kind !== "image") {
    return block;
  }

  const entries = getManualBlockImageEntries(block);
  return {
    ...block,
    imageUrls: entries.map((entry) => entry.url),
    imageCaptions: entries.map((entry) => entry.caption ?? ""),
    imageUrl: entries[0]?.url ?? "",
  };
}

function normalizeBlocks(blocks: ManualBlock[]) {
  return reportPages.flatMap(({ id }) =>
    blocks
      .filter((block) => block.pageId === id)
      .sort((a, b) => a.order - b.order)
      .map((block, index) => ({ ...block, order: index })),
  );
}

function SectionToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "flex items-center justify-between rounded-2xl border px-3 py-2.5 text-left text-sm transition",
        checked ? "border-primary/25 bg-primary/5 text-foreground" : "border-border/60 bg-background/60 text-muted-foreground hover:bg-muted/60",
      )}
    >
      <span>{label}</span>
      <span className={cn("inline-flex h-5 w-5 items-center justify-center rounded-full border text-[11px]", checked ? "border-primary bg-primary text-primary-foreground" : "border-border/60 bg-white")}>
        ✓
      </span>
    </button>
  );
}

function ManualBlockCard({
  block,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  onPageChange,
  canMoveUp,
  canMoveDown,
  pageOptions,
}: {
  block: ManualBlock;
  onChange: (patch: Partial<ManualBlock>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onPageChange: (pageId: ReportPageId) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  pageOptions: ReadonlyArray<{ id: ReportPageId; label: string }>;
}) {
  const isNote = block.kind === "note";
  const isFeedback = block.kind === "feedback";
  const isImage = block.kind === "image";
  const isLink = block.kind === "link";
  const imageEntries = getManualBlockImageEntries(block);
  const [newImageCaption, setNewImageCaption] = useState("");
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  const commitImageEntries = (entries: Array<{ url: string; caption: string }>) => {
    onChange({
      imageUrls: entries.map((entry) => entry.url),
      imageCaptions: entries.map((entry) => entry.caption),
      imageUrl: entries[0]?.url ?? "",
    });
  };

  const reorderImageEntries = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) {
      return;
    }

    const nextEntries = moveArrayItem(imageEntries, fromIndex, toIndex);
    commitImageEntries(nextEntries);
  };

  return (
    <div className="rounded-3xl border border-border/60 bg-white/95 p-4 shadow-[0_14px_28px_rgba(15,23,42,0.05)] dark:bg-card/95">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Pré-visualização</p>
          <h4 className="mt-1 text-sm font-semibold text-foreground">Bloco manual</h4>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={!canMoveUp}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-white text-muted-foreground transition disabled:cursor-not-allowed disabled:opacity-40 dark:bg-card"
          >
            <MoveUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={!canMoveDown}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-white text-muted-foreground transition disabled:cursor-not-allowed disabled:opacity-40 dark:bg-card"
          >
            <MoveDown className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-rose-200 bg-white text-rose-500 transition hover:bg-rose-50 dark:border-[#ff8da5]/20 dark:bg-[#1d171a] dark:text-[#ff8da5]"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        <label className="grid gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Página</span>
          <select
            value={block.pageId}
            onChange={(event) => onPageChange(event.target.value as ReportPageId)}
            className="rounded-2xl border border-border/70 bg-background px-3 py-2 text-sm outline-none"
          >
            {pageOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Tipo</span>
          <select
            value={block.kind}
            onChange={(event) => onChange({ kind: event.target.value as ManualBlockKind })}
            className="rounded-2xl border border-border/70 bg-background px-3 py-2 text-sm outline-none"
          >
            <option value="note">Texto</option>
            <option value="feedback">Feedback</option>
            <option value="image">Imagem</option>
            <option value="link">URL</option>
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Título</span>
          <input
            value={block.title}
            onChange={(event) => onChange({ title: event.target.value })}
            className="rounded-2xl border border-border/70 bg-background px-3 py-2 text-sm outline-none"
            placeholder="Ex.: Observação da direção"
          />
        </label>

        {isImage ? (
          <div className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Nova imagem</span>
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <input
                value={block.imageUrl}
                onChange={(event) => onChange({ imageUrl: event.target.value })}
                className="min-w-0 rounded-2xl border border-border/70 bg-background px-3 py-2 text-sm outline-none"
                placeholder="URL da imagem"
              />
              <input
                value={newImageCaption}
                onChange={(event) => setNewImageCaption(event.target.value)}
                className="min-w-0 rounded-2xl border border-border/70 bg-background px-3 py-2 text-sm outline-none"
                placeholder="Legenda do item"
              />
              <button
                type="button"
                onClick={() => {
                  const nextUrl = block.imageUrl.trim();
                  if (!nextUrl) {
                    return;
                  }

                  const nextEntries = [...imageEntries, { url: nextUrl, caption: newImageCaption.trim() }];
                  commitImageEntries(nextEntries);
                  onChange({ imageUrl: "" });
                  setNewImageCaption("");
                }}
                className="rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
              >
                Adicionar
              </button>
            </div>
            <div className="grid gap-2">
              {imageEntries.length > 0 ? (
                imageEntries.map((entry, index) => (
                  <div
                    key={`${entry.url}-${index}`}
                    draggable
                    onDragStart={() => setDraggingIndex(index)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      if (draggingIndex === null) {
                        return;
                      }
                      reorderImageEntries(draggingIndex, index);
                      setDraggingIndex(null);
                    }}
                    onDragEnd={() => setDraggingIndex(null)}
                    className="flex items-start gap-3 rounded-2xl border border-border/60 bg-background/70 p-2"
                  >
                    <button
                      type="button"
                      className="mt-2 inline-flex h-8 w-8 shrink-0 cursor-grab items-center justify-center rounded-full border border-border/60 bg-white text-muted-foreground transition active:cursor-grabbing dark:bg-card"
                      title="Arraste para reordenar"
                    >
                      <MoveDown className="h-4 w-4 rotate-45" />
                    </button>
                    <img src={entry.url} alt={block.title || `Imagem ${index + 1}`} className="h-16 w-24 shrink-0 rounded-xl object-cover" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs font-medium text-foreground">Imagem {index + 1}</p>
                        <button
                          type="button"
                          onClick={() =>
                            commitImageEntries(imageEntries.filter((_, currentIndex) => currentIndex !== index))
                          }
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-white text-muted-foreground transition hover:bg-muted dark:bg-card"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <input
                        value={entry.caption}
                        onChange={(event) => {
                          const nextEntries = imageEntries.map((current, currentIndex) =>
                            currentIndex === index ? { ...current, caption: event.target.value } : current,
                          );
                          commitImageEntries(nextEntries);
                        }}
                        className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-xs outline-none"
                        placeholder="Legenda da imagem"
                      />
                      <p className="truncate text-xs text-muted-foreground">{entry.url}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">Adicione uma ou mais imagens para este bloco.</p>
              )}
            </div>
          </div>
        ) : null}

        {isLink ? (
          <>
            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">URL</span>
              <input
                value={block.linkUrl}
                onChange={(event) => onChange({ linkUrl: event.target.value })}
                className="rounded-2xl border border-border/70 bg-background px-3 py-2 text-sm outline-none"
                placeholder="https://..."
              />
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Rótulo</span>
              <input
                value={block.linkLabel}
                onChange={(event) => onChange({ linkLabel: event.target.value })}
                className="rounded-2xl border border-border/70 bg-background px-3 py-2 text-sm outline-none"
                placeholder="Abrir referência"
              />
            </label>
          </>
        ) : null}

        {isFeedback ? (
          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Nota</span>
            <select
              value={block.score}
              onChange={(event) => onChange({ score: Number(event.target.value) })}
              className="rounded-2xl border border-border/70 bg-background px-3 py-2 text-sm outline-none"
            >
              {[5, 4, 3, 2, 1].map((score) => (
                <option key={score} value={score}>
                  {score} / 5
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="grid gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {isImage ? "Legenda" : isLink ? "Descrição" : "Conteúdo"}
          </span>
          <textarea
            value={block.content}
            onChange={(event) => onChange({ content: event.target.value })}
            rows={isImage || isFeedback ? 3 : 4}
            className="rounded-2xl border border-border/70 bg-background px-3 py-2 text-sm outline-none"
            placeholder={isFeedback ? "Feedback manual do relatório" : "Digite o conteúdo aqui"}
          />
        </label>
      </div>

      <div className="mt-4 rounded-2xl border border-border/60 bg-background/60 p-3">
        {isImage ? (
          imageEntries.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {imageEntries.map((entry, index) => (
                <figure key={`${entry.url}-${index}`} className="break-inside-avoid rounded-2xl border border-border/60 bg-white p-2">
                  <img
                    src={entry.url}
                    alt={block.title ? `${block.title} ${index + 1}` : `Imagem ${index + 1}`}
                    className="h-36 w-full rounded-xl object-cover"
                  />
                  {entry.caption ? (
                    <figcaption className="mt-2 px-1 text-xs leading-5 text-muted-foreground">{entry.caption}</figcaption>
                  ) : null}
                </figure>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma imagem adicionada ainda.</p>
          )
        ) : null}
        {isLink && block.linkUrl ? (
          <a href={block.linkUrl} target="_blank" rel="noreferrer" className="block rounded-2xl border border-border/60 bg-white px-3 py-3 text-sm text-primary">
            {block.linkLabel || block.linkUrl}
          </a>
        ) : null}
        {isFeedback ? (
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary font-semibold">
              {block.score}
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">Feedback manual</p>
              <p className="text-xs text-muted-foreground">Essa nota vai junto do relatório exportado.</p>
            </div>
          </div>
        ) : null}
        {isNote ? (
          <p className="text-sm leading-6 text-muted-foreground">{block.content || "Texto livre para comentários, validações ou observações."}</p>
        ) : null}
      </div>
    </div>
  );
}

function ReportPageFrame({
  title,
  subtitle,
  children,
  className,
  pageNumber,
  totalPages,
  generatedAt,
  sectionLabel,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  className?: string;
  pageNumber: number;
  totalPages: number;
  generatedAt: string;
  sectionLabel?: string;
}) {
  return (
    <section
      className={cn(
        "break-after-page mx-auto w-full max-w-[840px] rounded-[2.25rem] border border-[#e8e1d7] bg-[#fffdf8] p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] dark:border-white/8 dark:bg-[#0f1115] dark:shadow-[0_20px_60px_rgba(0,0,0,0.28)] print-report-page print:break-after-page print:max-w-none print:border-0 print:bg-white print:p-0 print:shadow-none",
        className,
      )}
    >
      <div className="mb-6 flex items-start justify-between gap-4 border-b border-black/5 pb-5 dark:border-white/8">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Relatório</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{subtitle}</p>
          <div className="mt-3 inline-flex items-center rounded-full border border-black/5 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground shadow-sm dark:border-white/8 dark:bg-white/5 dark:text-white/70">
            {sectionLabel ?? title}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="rounded-full border border-black/5 bg-white px-3 py-1 text-xs font-semibold text-muted-foreground shadow-sm dark:border-white/8 dark:bg-white/5 dark:text-white/70">
            PDF preview
          </div>
          <div className="text-right text-[11px] leading-4 text-muted-foreground dark:text-white/55 print:text-neutral-500">
            <p>Gerado em {generatedAt}</p>
            <p>Página {pageNumber} de {totalPages}</p>
          </div>
        </div>
      </div>
      {children}
      <div className="mt-6 flex items-center justify-between border-t border-black/5 pt-3 text-[11px] text-muted-foreground dark:border-white/8 dark:text-white/55 print:text-neutral-500">
        <span>Great Orgânico</span>
        <span>{sectionLabel ?? title}</span>
        <span>Página {pageNumber} de {totalPages}</span>
      </div>
    </section>
  );
}

export function ReportPreviewPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const anchorDate = useMemo(() => new Date("2026-04-30T12:00:00"), []);
  const [teamMembers] = useTeamProfiles();
  const [posts] = usePosts();
  const [goals] = useSupabaseSyncedListState<Goal>({ key: "goals", table: "goals", fallback: seedGoals });
  const [teamScope] = useTeamScope();
  const [state, setState] = useSharedState<PreviewState>(createStorageKey("report-preview-state"), createDefaultPreviewState(anchorDate));
  const [manualBlocks, setManualBlocks] = useSharedState<ManualBlock[]>(createStorageKey("report-preview-blocks"), []);
  const [draft, setDraft] = useState<ManualBlock>(emptyManualBlock(state.selectedPage));
  const [imageCaptionDraft, setImageCaptionDraft] = useState("");
  const appliedQueryRef = useRef(false);
  const generatedAtLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date()),
    [],
  );
  const totalReportPages = 4;

  useEffect(() => {
    if (!manualBlocks.some((block) => block.kind === "image" && (block.imageUrls?.length ?? 0) === 0 && Boolean(block.imageUrl))) {
      return;
    }

    setManualBlocks((previous) => normalizeBlocks(previous.map(normalizeManualBlock)));
  }, [manualBlocks, setManualBlocks]);

  useEffect(() => {
    if (appliedQueryRef.current) {
      return;
    }

    const hasQuery = query.has("period") || query.has("type") || query.has("responsible") || query.has("start") || query.has("end");
    if (!hasQuery) {
      appliedQueryRef.current = true;
      return;
    }

    appliedQueryRef.current = true;
    setState((previous) => ({
      ...previous,
      period: (query.get("period") as ReportPeriod | null) ?? previous.period,
      typeFilter: (query.get("type") as ContentType | "todos" | null) ?? previous.typeFilter,
      responsibleFilter:
        query.get("responsible") === "todos"
          ? "todos"
          : query.get("responsible")
            ? Number(query.get("responsible"))
            : previous.responsibleFilter,
      customStartDate: query.get("start") ?? previous.customStartDate,
      customEndDate: query.get("end") ?? previous.customEndDate,
    }));
  }, [query, setState, appliedQueryRef]);

  const currentRange = useMemo(() => {
    if (state.period === "custom") {
      const start = state.customStartDate ? parseDate(state.customStartDate) : addDays(anchorDate, -29);
      const end = state.customEndDate ? parseDate(state.customEndDate) : start;
      return start <= end ? { start, end } : { start: end, end: start };
    }

    return rangeFromPeriod(state.period, anchorDate, 30);
  }, [anchorDate, state.customEndDate, state.customStartDate, state.period]);

  const previousRange = useMemo(() => shiftRange(currentRange.start, currentRange.end), [currentRange]);

  const filteredPosts = useMemo(
    () =>
      posts.filter((post) => {
        const matchesDate = inRange(post.date, currentRange.start, currentRange.end);
        const matchesType = state.typeFilter === "todos" || post.type === state.typeFilter;
        const matchesResponsible = state.responsibleFilter === "todos" || post.authorId === state.responsibleFilter;
        const matchesScope = matchesTeamScope(post.authorId, teamScope);
        return matchesDate && matchesType && matchesResponsible && matchesScope;
      }),
    [currentRange.end, currentRange.start, posts, state.responsibleFilter, state.typeFilter, teamScope],
  );

  const previousPosts = useMemo(
    () =>
      posts.filter((post) => {
        const matchesDate = inRange(post.date, previousRange.start, previousRange.end);
        const matchesType = state.typeFilter === "todos" || post.type === state.typeFilter;
        const matchesResponsible = state.responsibleFilter === "todos" || post.authorId === state.responsibleFilter;
        const matchesScope = matchesTeamScope(post.authorId, teamScope);
        return matchesDate && matchesType && matchesResponsible && matchesScope;
      }),
    [posts, previousRange.end, previousRange.start, state.responsibleFilter, state.typeFilter, teamScope],
  );

  const filteredGoals = useMemo(() => {
    const byResponsible = goals.filter((goal) => {
      if (state.responsibleFilter === "todos") {
        return getGoalResponsibleIds(goal).some((id) => matchesTeamScope(id, teamScope));
      }

      return getGoalResponsibleIds(goal).includes(state.responsibleFilter) && getGoalResponsibleIds(goal).some((id) => matchesTeamScope(id, teamScope));
    });

    return byResponsible.filter((goal) => inRange(goal.deadline, currentRange.start, currentRange.end));
  }, [currentRange.end, currentRange.start, goals, state.responsibleFilter, teamScope]);

  const currentSummary = useMemo(() => {
    const reach = filteredPosts.reduce((sum, post) => sum + post.reach, 0);
    const engagement = filteredPosts.reduce((sum, post) => sum + post.engagement, 0);
    const postsCount = filteredPosts.length;
    const avgEngagement = postsCount > 0 ? engagement / postsCount : 0;
    return { reach, engagement, postsCount, avgEngagement };
  }, [filteredPosts]);

  const previousSummary = useMemo(() => {
    const reach = previousPosts.reduce((sum, post) => sum + post.reach, 0);
    const engagement = previousPosts.reduce((sum, post) => sum + post.engagement, 0);
    const postsCount = previousPosts.length;
    const avgEngagement = postsCount > 0 ? engagement / postsCount : 0;
    return { reach, engagement, postsCount, avgEngagement };
  }, [previousPosts]);

  const comparisonSeries = useMemo(() => {
    const periodDays = diffDays(currentRange.start, currentRange.end) + 1;
    const currentBuckets = groupPostsByDate(filteredPosts);
    const previousBuckets = groupPostsByDate(previousPosts);

    return Array.from({ length: periodDays }, (_, index) => {
      const currentDate = addDays(currentRange.start, index);
      const previousDate = addDays(previousRange.start, index);
      return {
        label: new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(currentDate),
        currentReach: currentBuckets.get(formatDateKey(currentDate))?.reach ?? 0,
        previousReach: previousBuckets.get(formatDateKey(previousDate))?.reach ?? 0,
      };
    });
  }, [currentRange.end, currentRange.start, filteredPosts, previousPosts, previousRange.end, previousRange.start]);

  const topPosts = useMemo(() => [...filteredPosts].sort((a, b) => b.engagement - a.engagement).slice(0, 5), [filteredPosts]);

  const memberPerformance = useMemo(
    () =>
      teamMembers
        .filter((member) => matchesTeamScope(member.id, teamScope))
        .map((member) => {
          const memberPosts = filteredPosts.filter((post) => post.authorId === member.id);
          const memberGoals = filteredGoals.filter((goal) => getGoalResponsibleIds(goal).includes(member.id));
          const engagement = memberPosts.reduce((sum, post) => sum + post.engagement, 0);
          const reach = memberPosts.reduce((sum, post) => sum + post.reach, 0);
          return {
            member,
            posts: memberPosts.length,
            engagement,
            reach,
            goals: memberGoals.length,
          };
        })
        .sort((a, b) => b.engagement - a.engagement),
    [filteredGoals, filteredPosts, teamMembers, teamScope],
  );

  const goalProgress = useMemo(() => {
    const completed = filteredGoals.filter((goal) => goal.current >= goal.target).length;
    return {
      total: filteredGoals.length,
      completed,
      percent: filteredGoals.length > 0 ? Math.round((completed / filteredGoals.length) * 100) : 0,
    };
  }, [filteredGoals]);

  const coverScopeLabel = useMemo(() => {
    if (state.responsibleFilter === "todos") {
      return "Toda a equipe";
    }

    return teamMembers.find((member) => member.id === state.responsibleFilter)?.name ?? "Responsável";
  }, [state.responsibleFilter, teamMembers]);

  const coverPeriodLabel = useMemo(() => {
    const formatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
    return `${formatter.format(currentRange.start)} até ${formatter.format(currentRange.end)}`;
  }, [currentRange.end, currentRange.start]);

  const reportState = state;
  const reportBlocks = useMemo(
    () => manualBlocks.filter((block) => block.pageId === reportState.selectedPage).sort((a, b) => a.order - b.order),
    [manualBlocks, reportState.selectedPage],
  );
  const summaryCards: MetricCard[] = [
    { label: "Alcance", value: formatLongNumber(currentSummary.reach), helper: "Somatório do período filtrado", delta: 0, icon: Eye },
    { label: "Engajamento", value: formatLongNumber(currentSummary.engagement), helper: "Interações acumuladas", delta: 0, icon: Sparkles },
    { label: "Posts", value: String(currentSummary.postsCount), helper: "Conteúdos no recorte", delta: 0, icon: FileText },
    { label: "Engajamento médio", value: formatPercent(currentSummary.avgEngagement, 2), helper: "Eficiência por peça", delta: 0, icon: Sparkles },
  ];

  const pageTitle = pageLabels[reportState.selectedPage];
  const pageSubtitle =
    reportState.selectedPage === "cover"
      ? "Capa e resumo executivo"
      : reportState.selectedPage === "summary"
        ? "Comparativos e estatísticas"
        : reportState.selectedPage === "content"
          ? "Conteúdo, metas e responsáveis"
          : "Anotações, feedback e anexos manuais";

  const blockCountForSelectedPage = manualBlocks.filter((block) => block.pageId === reportState.selectedPage).length;
  void previousSummary;
  void reportBlocks;
  void pageSubtitle;

  const addManualBlock = () => {
    const nextBlock: ManualBlock = {
      ...draft,
      ...normalizeManualBlock(draft),
      id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      pageId: reportState.selectedPage,
      order: manualBlocks.filter((block) => block.pageId === reportState.selectedPage).length,
    };

    setManualBlocks((previous) => normalizeBlocks([...previous, nextBlock]));
    setDraft(emptyManualBlock(reportState.selectedPage));
    setImageCaptionDraft("");
    toast.success("Bloco adicionado ao relatório.");
  };

  const updateBlock = (blockId: string, patch: Partial<ManualBlock>) => {
    setManualBlocks((previous) =>
      normalizeBlocks(
        previous.map((block) => (block.id === blockId ? { ...block, ...patch } : block)),
      ),
    );
  };

  const removeBlock = (blockId: string) => {
    setManualBlocks((previous) => normalizeBlocks(previous.filter((block) => block.id !== blockId)));
  };

  const moveBlock = (blockId: string, direction: -1 | 1) => {
    setManualBlocks((previous) => {
      const pageBlocks = previous.filter((block) => block.pageId === reportState.selectedPage).sort((a, b) => a.order - b.order);
      const currentIndex = pageBlocks.findIndex((block) => block.id === blockId);
      const nextIndex = currentIndex + direction;

      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= pageBlocks.length) {
        return previous;
      }

      const swapped = [...pageBlocks];
      [swapped[currentIndex], swapped[nextIndex]] = [swapped[nextIndex], swapped[currentIndex]];

      const next = previous.map((block) => {
        const match = swapped.find((item) => item.id === block.id);
        return match ? { ...block, order: match.order } : block;
      });

      return normalizeBlocks(next);
    });
  };

  const changeBlockPage = (blockId: string, nextPage: ReportPageId) => {
    setManualBlocks((previous) =>
      normalizeBlocks(
        previous.map((block) =>
          block.id === blockId
            ? {
                ...block,
                pageId: nextPage,
                order: previous.filter((item) => item.pageId === nextPage).length,
              }
            : block,
        ),
      ),
    );
  };

  const exportPdf = () => window.print();

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Reports"
        title="Pré-visualização do relatório"
        description="Monte o PDF com período, fotos, URLs, feedback manual e blocos que podem ser reordenados antes da exportação."
        actions={
          <div className="flex flex-wrap gap-2">
            <ActionButton variant="secondary" onClick={() => navigate("/reports")}>
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </ActionButton>
            <ActionButton variant="secondary" onClick={() => setManualBlocks((previous) => normalizeBlocks(previous))}>
              <FileImage className="h-4 w-4" />
              Organizar blocos
            </ActionButton>
            <ActionButton onClick={exportPdf}>
              <Printer className="h-4 w-4" />
              PDF
            </ActionButton>
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-6 print:hidden">
          <GlassPanel className="space-y-4 p-5">
            <SectionTitle title="Recorte aplicado" description="Os filtros ficam na tela principal. Aqui você monta e exporta." />
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                {reportState.period === "custom"
                  ? "Personalizado"
                  : reportPeriods.find((item) => item.value === reportState.period)?.label}
              </span>
              <span className="rounded-full bg-muted/60 px-3 py-1 text-xs font-semibold text-muted-foreground">
                {contentTypeOptions.find((item) => item.value === reportState.typeFilter)?.label}
              </span>
              <span className="rounded-full bg-muted/60 px-3 py-1 text-xs font-semibold text-muted-foreground">
                {reportState.responsibleFilter === "todos"
                  ? "Todos os responsáveis"
                  : teamMembers.find((member) => member.id === reportState.responsibleFilter)?.name ?? "Respons�vel"}
              </span>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              {reportState.period === "custom"
                ? `${formatDateLabel(reportState.customStartDate)} at� ${formatDateLabel(reportState.customEndDate)}`
                : `${formatDateLabel(currentRange.start.toISOString().slice(0, 10))} at� ${formatDateLabel(
                    currentRange.end.toISOString().slice(0, 10),
                  )}`}
            </p>
            <ActionButton variant="secondary" onClick={() => navigate("/reports")}>
              <ArrowLeft className="h-4 w-4" />
              Editar filtros
            </ActionButton>
          </GlassPanel>

          <GlassPanel className="space-y-4 p-5">
            <SectionTitle title="O que entra no PDF" description="Você liga e desliga os blocos automáticos da página." />
            <div className="grid gap-2">
              <SectionToggle
                label="Métricas"
                checked={reportState.sections.metrics}
                onChange={(checked) => setState((previous) => ({ ...previous, sections: { ...previous.sections, metrics: checked } }))}
              />
              <SectionToggle
                label="Comparação"
                checked={reportState.sections.comparison}
                onChange={(checked) => setState((previous) => ({ ...previous, sections: { ...previous.sections, comparison: checked } }))}
              />
              <SectionToggle
                label="Top conteúdos"
                checked={reportState.sections.topPosts}
                onChange={(checked) => setState((previous) => ({ ...previous, sections: { ...previous.sections, topPosts: checked } }))}
              />
              <SectionToggle
                label="Metas"
                checked={reportState.sections.goals}
                onChange={(checked) => setState((previous) => ({ ...previous, sections: { ...previous.sections, goals: checked } }))}
              />
              <SectionToggle
                label="Pessoas"
                checked={reportState.sections.members}
                onChange={(checked) => setState((previous) => ({ ...previous, sections: { ...previous.sections, members: checked } }))}
              />
              <SectionToggle
                label="Insights"
                checked={reportState.sections.insights}
                onChange={(checked) => setState((previous) => ({ ...previous, sections: { ...previous.sections, insights: checked } }))}
              />
            </div>
          </GlassPanel>

          <GlassPanel className="space-y-4 p-5">
            <SectionTitle title="Adicionar bloco" description="Texto, feedback, imagem ou URL manual." />
            <div className="grid gap-3">
              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Página</span>
                <select
                  value={draft.pageId}
                  onChange={(event) => setDraft((previous) => ({ ...previous, pageId: event.target.value as ReportPageId }))}
                  className="rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm outline-none"
                >
                  {reportPages.map((page) => (
                    <option key={page.id} value={page.id}>
                      {page.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Tipo</span>
                  <select
                    value={draft.kind}
                    onChange={(event) => {
                      const nextKind = event.target.value as ManualBlockKind;
                      setDraft((previous) => ({ ...previous, kind: nextKind }));
                      if (nextKind !== "image") {
                        setImageCaptionDraft("");
                      }
                    }}
                    className="rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm outline-none"
                  >
                  <option value="note">Texto</option>
                  <option value="feedback">Feedback</option>
                  <option value="image">Imagem</option>
                  <option value="link">URL</option>
                </select>
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Título</span>
                <input
                  value={draft.title}
                  onChange={(event) => setDraft((previous) => ({ ...previous, title: event.target.value }))}
                  className="rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm outline-none"
                />
              </label>
              {draft.kind === "image" ? (
                <div className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Nova imagem</span>
                  <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                    <input
                      value={draft.imageUrl}
                      onChange={(event) => setDraft((previous) => ({ ...previous, imageUrl: event.target.value }))}
                      className="min-w-0 rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm outline-none"
                      placeholder="https://..."
                    />
                    <button
                      type="button"
                      onClick={() => setImageCaptionDraft("")}
                      className="rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm font-semibold text-muted-foreground transition hover:bg-muted/60"
                    >
                      Limpar legenda
                    </button>
                  </div>
                  <input
                    value={imageCaptionDraft}
                    onChange={(event) => setImageCaptionDraft(event.target.value)}
                    className="rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm outline-none"
                    placeholder="Legenda do item"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const nextUrl = draft.imageUrl.trim();
                      if (!nextUrl) {
                        return;
                      }

                      setDraft((previous) => ({
                        ...previous,
                        imageUrls: Array.from(new Set([...(previous.imageUrls ?? []), nextUrl])),
                        imageCaptions: [...(previous.imageCaptions ?? []), imageCaptionDraft.trim()],
                        imageUrl: "",
                      }));
                      setImageCaptionDraft("");
                    }}
                    className="rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
                  >
                    Adicionar
                  </button>
                  <div className="grid gap-2">
                    {(draft.imageUrls ?? []).length > 0 ? (
                      (draft.imageUrls ?? []).map((url, index) => (
                        <div key={`${url}-${index}`} className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background/70 p-2">
                          <img src={url} alt={`Imagem ${index + 1}`} className="h-16 w-24 rounded-xl object-cover" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium text-foreground">Imagem {index + 1}</p>
                            <p className="truncate text-xs text-muted-foreground">{url}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setDraft((previous) => ({
                                ...previous,
                                imageUrls: (previous.imageUrls ?? []).filter((_, currentIndex) => currentIndex !== index),
                                imageCaptions: (previous.imageCaptions ?? []).filter((_, currentIndex) => currentIndex !== index),
                              }))
                            }
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-white text-muted-foreground transition hover:bg-muted dark:bg-card"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground">Adicione uma ou mais imagens antes de salvar o bloco.</p>
                    )}
                  </div>
                </div>
              ) : null}
              {draft.kind === "link" ? (
                <>
                  <label className="grid gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">URL</span>
                    <input
                      value={draft.linkUrl}
                      onChange={(event) => setDraft((previous) => ({ ...previous, linkUrl: event.target.value }))}
                      className="rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm outline-none"
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Rótulo</span>
                    <input
                      value={draft.linkLabel}
                      onChange={(event) => setDraft((previous) => ({ ...previous, linkLabel: event.target.value }))}
                      className="rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm outline-none"
                    />
                  </label>
                </>
              ) : null}
              {draft.kind === "feedback" ? (
                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Nota</span>
                  <select
                    value={draft.score}
                    onChange={(event) => setDraft((previous) => ({ ...previous, score: Number(event.target.value) }))}
                    className="rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm outline-none"
                  >
                    {[5, 4, 3, 2, 1].map((score) => (
                      <option key={score} value={score}>
                        {score} / 5
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Conteúdo</span>
                <textarea
                  value={draft.content}
                  onChange={(event) => setDraft((previous) => ({ ...previous, content: event.target.value }))}
                  rows={4}
                  className="rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm outline-none"
                />
              </label>
              <ActionButton onClick={addManualBlock}>
                <Plus className="h-4 w-4" />
                Adicionar bloco
              </ActionButton>
            </div>
          </GlassPanel>

          <GlassPanel className="space-y-4 p-5">
            <SectionTitle title="Blocos da página" description={`Blocos em ${pageTitle}. Você pode mover, editar ou apagar.`} />
            <div className="flex items-center justify-between rounded-2xl bg-muted/35 px-4 py-3 text-sm">
              <span>{pageLabels[reportState.selectedPage]}</span>
              <span className="text-muted-foreground">{blockCountForSelectedPage} bloco{blockCountForSelectedPage !== 1 ? "s" : ""}</span>
            </div>
            <div className="grid gap-2">
              {reportPages.map((page) => (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => setState((previous) => ({ ...previous, selectedPage: page.id }))}
                  className={cn(
                    "flex items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition",
                    reportState.selectedPage === page.id
                      ? "border-primary/25 bg-primary/5 text-foreground"
                      : "border-border/60 bg-background/50 text-muted-foreground hover:bg-muted/60",
                  )}
                >
                  <span>{page.label}</span>
                  <span>{manualBlocks.filter((block) => block.pageId === page.id).length}</span>
                </button>
              ))}
            </div>
          </GlassPanel>
        </aside>

        <div className="space-y-6">
          <GlassPanel className="overflow-hidden p-0 print:hidden">
            <div className="flex items-center justify-between gap-3 border-b border-border/60 p-4">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Pré-visualização</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Página atual: <span className="font-semibold text-foreground">{pageLabels[reportState.selectedPage]}</span>
                </p>
                <div className="mt-2 inline-flex items-center rounded-full border border-border/60 bg-background px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {pageLabels[reportState.selectedPage]}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ActionButton variant="secondary" onClick={() => setState(createDefaultPreviewState(anchorDate))}>
                  Resetar
                </ActionButton>
                <ActionButton variant="secondary" onClick={() => window.print()}>
                  <Download className="h-4 w-4" />
                  Exportar PDF
                </ActionButton>
              </div>
            </div>
            <div className="print-report-scroll max-h-[calc(100vh-260px)] overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(209,0,0,0.05),transparent_34%),linear-gradient(180deg,rgba(244,240,235,0.9),rgba(248,250,252,0.85))] px-4 py-8 dark:bg-black print:max-h-none print:bg-none print:px-0 print:py-0">
              <div className="space-y-10 print:space-y-0">
                <ReportPageFrame
                  title="Capa"
                  subtitle="Resumo executivo e filtro do período."
                  className="print-report-cover"
                  pageNumber={1}
                  totalPages={totalReportPages}
                  generatedAt={generatedAtLabel}
                  sectionLabel="Resumo executivo"
                >
                  <div className="rounded-[2rem] bg-[linear-gradient(135deg,#D10000,#FF5A5F_58%,#F56040)] p-8 text-white shadow-[0_20px_40px_rgba(209,0,0,0.2)]">
                    <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/78">
                      <span className="rounded-full bg-white/10 px-3 py-1">Great Orgânico</span>
                      <span className="rounded-full bg-white/10 px-3 py-1">{coverScopeLabel}</span>
                      <span className="rounded-full bg-white/10 px-3 py-1">{coverPeriodLabel}</span>
                    </div>
                    <h3 className="mt-6 text-3xl font-semibold tracking-tight">Relatório executivo da operação</h3>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-white/86">
                      Este arquivo pode ser editado manualmente, reorganizado por página e exportado como PDF.
                    </p>
                    {reportState.sections.metrics ? (
                      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        {summaryCards.map((card) => (
                          <div key={card.label} className="rounded-3xl bg-white/12 p-4 backdrop-blur">
                            <div className="flex items-center justify-between gap-3">
                              <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-white/15">
                                <card.icon className="h-4 w-4" />
                              </span>
                              <span className="text-[11px] uppercase tracking-[0.16em] text-white/72">{card.label}</span>
                            </div>
                            <p className="mt-4 text-2xl font-semibold">{card.value}</p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    <div className="mt-6 rounded-[1.5rem] border border-white/15 bg-white/10 p-4 backdrop-blur">
                      <div className="grid gap-2 text-sm text-white/88 sm:grid-cols-2">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.16em] text-white/60">Escopo</p>
                          <p className="mt-1 font-semibold">{coverScopeLabel}</p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.16em] text-white/60">Período</p>
                          <p className="mt-1 font-semibold">{coverPeriodLabel}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  {manualBlocks
                    .filter((block) => block.pageId === "cover")
                    .sort((a, b) => a.order - b.order)
                    .map((block) => (
                      <div key={block.id} className="mt-4">
                        <ManualBlockCard
                          block={block}
                          onChange={(patch) => updateBlock(block.id, patch)}
                          onRemove={() => removeBlock(block.id)}
                          onMoveUp={() => moveBlock(block.id, -1)}
                          onMoveDown={() => moveBlock(block.id, 1)}
                          onPageChange={(pageId) => changeBlockPage(block.id, pageId)}
                          canMoveUp={block.order > 0}
                          canMoveDown={block.order < manualBlocks.filter((item) => item.pageId === "cover").length - 1}
                          pageOptions={reportPages}
                        />
                      </div>
                    ))}
                </ReportPageFrame>

                <ReportPageFrame
                  title="Resumo"
                  subtitle="Comparação e gráficos do período filtrado."
                  className="print-report-summary"
                  pageNumber={2}
                  totalPages={totalReportPages}
                  generatedAt={generatedAtLabel}
                  sectionLabel="Análise comparativa"
                >
                  {reportState.sections.comparison ? (
                    <div className="h-[300px] rounded-[1.8rem] border border-[#ece7de] bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={comparisonSeries} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                          <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Line type="monotone" dataKey="currentReach" stroke="#D10000" strokeWidth={3} dot={false} />
                          <Line type="monotone" dataKey="previousReach" stroke="#94A3B8" strokeWidth={2} strokeDasharray="6 6" dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : null}

                  {reportState.sections.insights ? (
                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                      <div className="rounded-[2rem] border border-[#ece7de] bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Saúde da seleção</p>
                        <p className="mt-2 text-3xl font-semibold text-foreground">{goalProgress.percent}%</p>
                        <p className="mt-2 text-sm text-muted-foreground">Meta concluída dentro do recorte atual.</p>
                      </div>
                      <div className="rounded-[2rem] border border-[#ece7de] bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Engajamento médio</p>
                        <p className="mt-2 text-3xl font-semibold text-foreground">{formatPercent(currentSummary.avgEngagement, 2)}</p>
                        <p className="mt-2 text-sm text-muted-foreground">Média das peças filtradas no período.</p>
                      </div>
                    </div>
                  ) : null}

                  {manualBlocks
                    .filter((block) => block.pageId === "summary")
                    .sort((a, b) => a.order - b.order)
                    .map((block) => (
                      <div key={block.id} className="mt-4">
                        <ManualBlockCard
                          block={block}
                          onChange={(patch) => updateBlock(block.id, patch)}
                          onRemove={() => removeBlock(block.id)}
                          onMoveUp={() => moveBlock(block.id, -1)}
                          onMoveDown={() => moveBlock(block.id, 1)}
                          onPageChange={(pageId) => changeBlockPage(block.id, pageId)}
                          canMoveUp={block.order > 0}
                          canMoveDown={block.order < manualBlocks.filter((item) => item.pageId === "summary").length - 1}
                          pageOptions={reportPages}
                        />
                      </div>
                    ))}
                </ReportPageFrame>

                <ReportPageFrame
                  title="Conteúdo"
                  subtitle="Posts, responsáveis e metas da operação."
                  className="print-report-content"
                  pageNumber={3}
                  totalPages={totalReportPages}
                  generatedAt={generatedAtLabel}
                  sectionLabel="Conteúdo e responsáveis"
                >
                  {reportState.sections.topPosts ? (
                    <div className="grid gap-3">
                      {topPosts.map((post, index) => {
                        const member = teamMembers.find((item) => item.id === post.authorId)!;
                        return (
                          <div key={post.id} className="rounded-3xl border border-[#ece7de] bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">#{index + 1}</span>
                                  <span className="rounded-full bg-muted/60 px-3 py-1 text-xs font-semibold text-muted-foreground">{post.type}</span>
                                </div>
                                <h4 className="mt-3 text-base font-semibold text-foreground">{post.title}</h4>
                                <p className="mt-1 text-sm text-muted-foreground">{member.name}</p>
                              </div>
                              <span className="rounded-full bg-muted/60 px-3 py-1 text-xs font-semibold text-muted-foreground">
                                {formatLongNumber(post.engagement)} eng.
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}

                  {reportState.sections.members ? (
                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                      {memberPerformance.map((entry) => (
                        <div key={entry.member.id} className="rounded-[2rem] border border-[#ece7de] bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold text-foreground">{entry.member.name}</p>
                              <p className="text-xs text-muted-foreground">{entry.member.role}</p>
                            </div>
                            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{entry.goals} metas</span>
                          </div>
                          <div className="mt-4 space-y-3">
                            <ProgressBar value={entry.posts} max={Math.max(memberPerformance[0]?.posts ?? 1, 1)} label="Posts" />
                            <ProgressBar value={entry.engagement} max={Math.max(memberPerformance[0]?.engagement ?? 1, 1)} label="Engajamento" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {manualBlocks
                    .filter((block) => block.pageId === "content")
                    .sort((a, b) => a.order - b.order)
                    .map((block) => (
                      <div key={block.id} className="mt-4">
                        <ManualBlockCard
                          block={block}
                          onChange={(patch) => updateBlock(block.id, patch)}
                          onRemove={() => removeBlock(block.id)}
                          onMoveUp={() => moveBlock(block.id, -1)}
                          onMoveDown={() => moveBlock(block.id, 1)}
                          onPageChange={(pageId) => changeBlockPage(block.id, pageId)}
                          canMoveUp={block.order > 0}
                          canMoveDown={block.order < manualBlocks.filter((item) => item.pageId === "content").length - 1}
                          pageOptions={reportPages}
                        />
                      </div>
                    ))}
                </ReportPageFrame>

                <ReportPageFrame
                  title="Anotações"
                  subtitle="Feedback manual, fotos e URLs adicionais."
                  className="print-report-notes"
                  pageNumber={4}
                  totalPages={totalReportPages}
                  generatedAt={generatedAtLabel}
                  sectionLabel="Anotações e anexos"
                >
                  <div className="grid gap-4">
                    {manualBlocks.filter((block) => block.pageId === "notes").length > 0 ? (
                      manualBlocks
                        .filter((block) => block.pageId === "notes")
                        .sort((a, b) => a.order - b.order)
                        .map((block) => (
                          <ManualBlockCard
                            key={block.id}
                            block={block}
                            onChange={(patch) => updateBlock(block.id, patch)}
                            onRemove={() => removeBlock(block.id)}
                            onMoveUp={() => moveBlock(block.id, -1)}
                            onMoveDown={() => moveBlock(block.id, 1)}
                            onPageChange={(pageId) => changeBlockPage(block.id, pageId)}
                            canMoveUp={block.order > 0}
                            canMoveDown={block.order < manualBlocks.filter((item) => item.pageId === "notes").length - 1}
                            pageOptions={reportPages}
                          />
                        ))
                    ) : (
                      <div className="rounded-[2rem] border border-dashed border-[#d9d0c4] bg-[#faf8f4] p-6 text-sm text-muted-foreground">
                        Nenhum bloco manual nesta página. Use o painel lateral para adicionar texto, feedback, imagem ou URL.
                      </div>
                    )}
                  </div>
                </ReportPageFrame>
              </div>
            </div>
          </GlassPanel>
        </div>
      </div>
    </PageTransition>
  );
}


