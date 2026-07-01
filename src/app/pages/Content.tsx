import { useMemo, useState, type ChangeEvent } from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  ImagePlus,
  Pencil,
  Plus,
  Rocket,
  Sparkles,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  calendarEvents,
  getGoalResponsibleIds,
  storyLogs,
  type CalendarEvent,
  type ContentType,
  type Goal,
  type Post,
  type PostStatus,
  type StoryLog,
} from "../data/mockData";
import { usePosts } from "../data/posts";
import { getCurrentMonthKey, useMonthlyPerformanceSnapshot } from "../data/monthlyPerformance";
import { useTeamProfiles } from "../data/profiles";
import { useSupabaseSyncedListState } from "../data/supabaseSync";
import { matchesTeamScope, useTeamScope } from "../data/teamScope";
import {
  ActionButton,
  Avatar,
  ConfirmDialog,
  GlassPanel,
  PageHeader,
  PageTransition,
  ProgressBar,
  RoundedDatePicker,
  RoundedDropdown,
  SectionTitle,
  TypeBadge,
  cn,
  formatLongNumber,
  formatPercent,
} from "../components/ui";

type OwnerFilter = "all" | 1 | 2 | 3;
type ContentEditorMode = "create" | "edit";

type MetricCard = {
  id: string;
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  delta: number;
  onEdit?: () => void;
  dataCy?: string;
};

type ContentDraft = {
  title: string;
  description: string;
  type: ContentType;
  status: PostStatus;
  authorId: number;
  date: string;
  thumbnail: string;
  thumbnailName: string;
  reach: string;
  engagement: string;
};

type ProgressSummary = {
  label: string;
  score: number;
  detail: string;
  subtitle: string;
};

type MonthlyMetricsDraft = {
  views: string;
  reach: string;
  socialSellingViews: string;
  socialSellingCount: string;
  testimonialsCount: string;
};

const storyGoalTarget = 168;
const currentMonthPostStatuses = new Set<PostStatus>(["Aprovado", "Publicado"]);
const statusPalette: Record<string, { bg: string; text: string; border: string }> = {
  Agendado: { bg: "#fff7ed", text: "#f97316", border: "#fdba74" },
  "Em produção": { bg: "#eff6ff", text: "#2563eb", border: "#93c5fd" },
  Aprovado: { bg: "#f0fdf4", text: "#16a34a", border: "#86efac" },
  Publicado: { bg: "#fff1f2", text: "#e11d48", border: "#fda4af" },
};

function todayKey() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function formatDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value || "Sem data";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function emptyDraft(authorId: number): ContentDraft {
  return {
    title: "",
    description: "",
    type: "Reels",
    status: "Agendado",
    authorId,
    date: todayKey(),
    thumbnail: "",
    thumbnailName: "",
    reach: "",
    engagement: "",
  };
}

function StatusChip({ value }: { value: string }) {
  const tone = statusPalette[value] ?? { bg: "#f8fafc", text: "#475569", border: "#cbd5e1" };

  return (
    <span
      className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold"
      style={{
        backgroundColor: tone.bg,
        color: tone.text,
        borderColor: tone.border,
      }}
    >
      {value}
    </span>
  );
}

function defaultThumbnail(type: ContentType) {
  switch (type) {
    case "Stories":
      return "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80";
    case "Carrossel":
      return "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1200&q=80";
    case "Feed":
      return "https://images.unsplash.com/photo-1524850011238-e3d235c7d4c6?auto=format&fit=crop&w=1200&q=80";
    default:
      return "https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=1200&q=80";
  }
}

function isImageDataUrl(value: string) {
  return value.startsWith("data:image/");
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Falha ao ler o arquivo."));
    reader.readAsDataURL(file);
  });
}

function buildPostFromDraft(draft: ContentDraft, existing?: Post): Post {
  const reach = Math.max(0, Math.round(Number(draft.reach) || 0));
  const engagement = Math.max(0, Math.round(Number(draft.engagement) || 0));
  const authorId = draft.authorId;
  const title = draft.title.trim() || "Novo conteúdo";
  const description = draft.description.trim() || "Descrição do conteúdo";
  const thumbnail = draft.thumbnail.trim() || existing?.thumbnail || defaultThumbnail(draft.type);
  const approvalName = existing?.approval.approvedBy ?? "Equipe";

  return {
    id: existing?.id ?? 1,
    title,
    description,
    type: draft.type,
    authorId,
    engagement,
    reach,
    date: draft.date,
    thumbnail,
    status: draft.status,
    metrics: {
      likes: Math.max(0, Math.round(engagement * 0.42)),
      comments: Math.max(0, Math.round(engagement * 0.18)),
      saves: Math.max(0, Math.round(engagement * 0.16)),
      shares: Math.max(0, Math.round(engagement * 0.12)),
    },
    checklist: existing?.checklist ?? [],
    comments: existing?.comments ?? [],
    files: existing?.files ?? [],
    script:
      existing?.script ?? {
        hook: "",
        development: "",
        solution: "",
        cta: "",
      },
    approval:
      existing?.approval ?? {
        approvedBy: approvalName,
        date: draft.date,
      },
  };
}

function computeGoalProgress(goals: Goal[]) {
  const totalTargets = goals.reduce((sum, goal) => sum + Math.max(goal.target, 0), 0);
  const totalCurrent = goals.reduce(
    (sum, goal) => sum + Math.min(Math.max(goal.current, 0), Math.max(goal.target, 0)),
    0,
  );
  const completed = goals.filter((goal) => goal.current >= goal.target).length;
  const percent = totalTargets > 0 ? Math.round((totalCurrent / totalTargets) * 100) : 0;

  return {
    percent,
    completed,
    total: goals.length,
    current: totalCurrent,
    target: totalTargets,
  };
}

function computeStoryProgress(stories: StoryLog[]) {
  const total = stories.reduce((sum, story) => sum + Math.max(story.quantity, 0), 0);
  const percent = storyGoalTarget > 0 ? Math.min(100, Math.round((total / storyGoalTarget) * 100)) : 0;

  return {
    percent,
    total,
    target: storyGoalTarget,
  };
}

function getCalendarResponsibleIds(event: CalendarEvent) {
  const ids = event.responsibleIds?.length ? event.responsibleIds : [event.responsibleId];
  return Array.from(new Set(ids.filter((id) => Number.isFinite(id))));
}

function isCurrentMonthDate(value: string) {
  return value.startsWith(todayKey().slice(0, 7));
}

function isCompletedCalendarEvent(event: CalendarEvent) {
  const tasks = event.tasks ?? [];
  const allTasksDone = tasks.length > 0 && tasks.every((task) => task.done);

  return event.completed || currentMonthPostStatuses.has(event.status) || allTasksDone;
}

function getCalendarEventUnitCount(event: CalendarEvent) {
  return Math.max(event.tasks?.length ?? 0, 1);
}

function isSocialSellingPost(post: Pick<Post, "title" | "description">) {
  const haystack = `${post.title} ${post.description}`.toLocaleLowerCase("pt-BR");
  return haystack.includes("social selling");
}

function getCalendarCompletedUnits(event: CalendarEvent) {
  if (!isCompletedCalendarEvent(event)) {
    return 0;
  }

  return getCalendarEventUnitCount(event);
}

function getCalendarCreditedMemberId(event: CalendarEvent) {
  if (typeof event.completedById === "number") {
    return event.completedById;
  }

  const responsibleIds = getCalendarResponsibleIds(event);
  return responsibleIds.length === 1 ? responsibleIds[0] : null;
}

function computeCalendarProgress(events: CalendarEvent[], memberId?: number) {
  const scopedEvents =
    typeof memberId === "number"
      ? events.filter((event) => getCalendarResponsibleIds(event).includes(memberId))
      : events;
  const total = scopedEvents.reduce((sum, event) => sum + getCalendarEventUnitCount(event), 0);
  const completed = scopedEvents.reduce((sum, event) => {
    if (typeof memberId === "number") {
      return getCalendarCreditedMemberId(event) === memberId ? sum + getCalendarCompletedUnits(event) : sum;
    }

    return sum + getCalendarCompletedUnits(event);
  }, 0);
  const percent = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;

  return {
    percent,
    total,
    completed,
  };
}

function isStoryMember(memberId: number) {
  return memberId === 1;
}

function MetricTile({
  icon: Icon,
  label,
  value,
  detail,
  delta,
  onEdit,
  dataCy,
}: MetricCard) {
  return (
    <div
      className="rounded-[1.6rem] border border-slate-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(250,250,252,0.98))] p-5 shadow-[0_12px_26px_rgba(15,23,42,0.04)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_30px_rgba(15,23,42,0.05)]"
      data-cy={dataCy}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(225,29,72,0.08),rgba(248,113,113,0.1),rgba(251,113,133,0.08))] text-rose-600 ring-1 ring-rose-100">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold",
              delta >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600",
            )}
          >
            {delta >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {formatPercent(delta, 0)}
          </span>
          {onEdit ? (
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-rose-200 hover:text-rose-600"
              aria-label={`Editar ${label}`}
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </div>
      <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-[1.9rem] font-semibold tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{detail}</p>
    </div>
  );
}

function MonthlyMetricsModal({
  draft,
  onChange,
  onClose,
  onSave,
}: {
  draft: MonthlyMetricsDraft;
  onChange: (next: MonthlyMetricsDraft) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-2xl overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.18)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5 sm:px-8">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Métricas do mês</p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Social selling e totais compartilhados</h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">Os valores salvos aqui ficam disponíveis para toda a equipe nas telas que usam os totais do mês.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-800"
          >
            <span className="text-lg leading-none">×</span>
          </button>
        </div>

        <div className="grid gap-4 px-6 py-6 sm:grid-cols-2 sm:px-8">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-800">Visualizações do mês</span>
            <input
              value={draft.views}
              onChange={(event) => onChange({ ...draft, views: event.target.value })}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
              inputMode="numeric"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-800">Alcance do mês</span>
            <input
              value={draft.reach}
              onChange={(event) => onChange({ ...draft, reach: event.target.value })}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
              inputMode="numeric"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-800">Visualizações de social selling</span>
            <input
              value={draft.socialSellingViews}
              onChange={(event) => onChange({ ...draft, socialSellingViews: event.target.value })}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
              inputMode="numeric"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-800">Quantidade de social selling</span>
            <input
              value={draft.socialSellingCount}
              onChange={(event) => onChange({ ...draft, socialSellingCount: event.target.value })}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
              inputMode="numeric"
            />
          </label>
          <label className="grid gap-2 sm:col-span-2">
            <span className="text-sm font-medium text-slate-800">Quantidade de depoimentos</span>
            <input
              value={draft.testimonialsCount}
              onChange={(event) => onChange({ ...draft, testimonialsCount: event.target.value })}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
              inputMode="numeric"
            />
          </label>
        </div>

        <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 px-6 py-5 sm:px-8">
          <ActionButton variant="secondary" onClick={onClose}>
            Cancelar
          </ActionButton>
          <ActionButton onClick={onSave}>
            <Rocket className="h-4 w-4" />
            Salvar métricas
          </ActionButton>
        </div>
      </div>
    </div>
  );
}

function ContentEditorModal({
  mode,
  draft,
  onChange,
  onClose,
  onSave,
  teamMembers,
}: {
  mode: ContentEditorMode;
  draft: ContentDraft;
  onChange: (next: ContentDraft) => void;
  onClose: () => void;
  onSave: () => void;
  teamMembers: Array<{ id: number; name: string; role: string }>;
}) {
  const title = mode === "create" ? "Adicionar card" : "Ajustar card";
  const subtitle = "Edite os dados do conteúdo e salve para atualizar a plataforma inteira.";
  const authorOptions = teamMembers.map((member) => ({
    label: `${member.name} - ${member.role}`,
    value: member.id,
    color: member.id === 1 ? "#e11d48" : member.id === 2 ? "#f43f5e" : "#fb7185",
  }));
  const typeOptions = [
    { label: "Reels", value: "Reels" as const, color: "#e11d48" },
    { label: "Stories", value: "Stories" as const, color: "#f43f5e" },
    { label: "Carrossel", value: "Carrossel" as const, color: "#fb7185" },
    { label: "Feed", value: "Feed" as const, color: "#ef4444" },
  ];
  const statusOptions = [
    { label: "Agendado", value: "Agendado" as const, color: "#fb7185" },
    { label: "Em produção", value: "Em produção" as PostStatus, color: "#ef4444" },
    { label: "Aprovado", value: "Aprovado" as const, color: "#f43f5e" },
    { label: "Publicado", value: "Publicado" as const, color: "#e11d48" },
  ];
  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Envie um arquivo de imagem.");
      event.target.value = "";
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      onChange({ ...draft, thumbnail: dataUrl, thumbnailName: file.name });
    } catch {
      toast.error("Não foi possível carregar a imagem.");
    } finally {
      event.target.value = "";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-4xl overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.18)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5 sm:px-8">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Conteúdo</p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{title}</h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-800"
          >
            <span className="text-lg leading-none">×</span>
          </button>
        </div>

        <div className="grid gap-6 px-6 py-6 sm:px-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 md:col-span-2">
              <span className="text-sm font-medium text-slate-800">Título</span>
              <input
                value={draft.title}
                onChange={(event) => onChange({ ...draft, title: event.target.value })}
                data-cy="content-create-title"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
                placeholder="Ex.: Antes e depois da landing page"
              />
            </label>

            <label className="grid gap-2 md:col-span-2">
              <span className="text-sm font-medium text-slate-800">Descrição</span>
              <textarea
                value={draft.description}
                onChange={(event) => onChange({ ...draft, description: event.target.value })}
                data-cy="content-create-description"
                rows={4}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
                placeholder="Explique o conteúdo, contexto e o objetivo..."
              />
            </label>

            <RoundedDropdown
              label="Tipo"
              value={draft.type}
              options={typeOptions}
              onChange={(value) => onChange({ ...draft, type: value })}
              dataCy="content-create-type"
              optionDataCyPrefix="content-create-type"
              placeholder="Selecionar tipo"
            />

            <RoundedDropdown
              label="Status"
              value={draft.status}
              options={statusOptions}
              onChange={(value) => onChange({ ...draft, status: value })}
              dataCy="content-create-status"
              optionDataCyPrefix="content-create-status"
              placeholder="Selecionar status"
            />

            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-800">Responsável</span>
              <RoundedDropdown
                label="Responsável"
                value={draft.authorId}
                options={authorOptions}
                onChange={(value) => onChange({ ...draft, authorId: Number(value) })}
                dataCy="content-create-author"
                optionDataCyPrefix="content-create-author"
                placeholder="Selecionar responsável"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-800">Data</span>
              <RoundedDatePicker
                label="Data"
                value={draft.date}
                onChange={(value) => onChange({ ...draft, date: value })}
              />
            </label>

            <div className="grid gap-2 md:col-span-2">
              <span className="text-sm font-medium text-slate-800">Arquivo da capa</span>
              <label className="group flex cursor-pointer flex-col gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500 transition hover:border-rose-300 hover:bg-rose-50/60">
                <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">
                      {draft.thumbnailName || "Clique para enviar uma imagem"}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Formatos aceitos: PNG, JPG, JPEG e WEBP. A imagem fica salva junto do card.
                    </p>
                  </div>
                  <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600 transition group-hover:scale-105">
                    <ImagePlus className="h-5 w-5" />
                  </div>
                </div>
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {draft.thumbnail ? (
                  <button
                    type="button"
                    onClick={() => onChange({ ...draft, thumbnail: "", thumbnailName: "" })}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-rose-200 hover:text-rose-600"
                  >
                    Remover arquivo
                  </button>
                ) : null}
                {draft.thumbnailName ? (
                  <span className="rounded-full bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                    {draft.thumbnailName}
                  </span>
                ) : null}
              </div>
            </div>

            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-800">Visualizações</span>
              <input
                value={draft.reach}
                onChange={(event) => onChange({ ...draft, reach: event.target.value })}
                data-cy="content-create-reach"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
                placeholder="235000"
                inputMode="numeric"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-800">Engajamento</span>
              <input
                value={draft.engagement}
                onChange={(event) => onChange({ ...draft, engagement: event.target.value })}
                data-cy="content-create-engagement"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
                placeholder="19600"
                inputMode="numeric"
              />
            </label>
          </div>

          <div className="space-y-4">
            <div className="rounded-[1.5rem] border border-slate-200 bg-gradient-to-br from-rose-50 to-red-50 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-600">Ação</p>
              <h4 className="mt-2 text-xl font-semibold text-slate-950">Conteúdo editável</h4>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                As alterações feitas aqui são salvas no mesmo conjunto compartilhado do Supabase.
              </p>
              <div className="mt-5 rounded-[1.2rem] border border-white/70 bg-white/80 p-4 shadow-sm">
                <p className="text-sm font-medium text-slate-700">Resumo do card</p>
                <div className="mt-3 space-y-2 text-sm text-slate-600">
                  <div className="flex items-center justify-between gap-4">
                    <span>Tipo</span>
                    <strong className="text-slate-900">{draft.type}</strong>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span>Status</span>
                    <strong className="text-slate-900">{draft.status}</strong>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span>Responsável</span>
                    <strong className="text-slate-900">
                      {teamMembers.find((member) => member.id === draft.authorId)?.name ?? "Equipe"}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center gap-3">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
                  <ImagePlus className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-950">Prévia</p>
                  <p className="text-sm text-slate-500">Como o card ficará na lista</p>
                </div>
              </div>
              <div className="mt-4 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-[0_12px_24px_rgba(15,23,42,0.05)]">
                <div className="aspect-[16/10] bg-gradient-to-br from-rose-100 via-red-100 to-rose-200">
                  {draft.thumbnail ? (
                    <img src={draft.thumbnail} alt={draft.title || "Prévia"} className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="space-y-2 p-4">
                  <div className="flex items-center gap-2">
                    <TypeBadge value={draft.type} />
                    <StatusChip value={draft.status as string} />
                  </div>
                  <p className="text-sm font-semibold text-slate-950">{draft.title || "Novo conteúdo"}</p>
                  <p className="text-xs leading-5 text-slate-500">{draft.description || "Descrição do conteúdo"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 px-6 py-5 sm:px-8">
          <ActionButton variant="secondary" onClick={onClose} dataCy="content-create-cancel">
            Cancelar
          </ActionButton>
          <ActionButton onClick={onSave} dataCy="content-create-submit">
            <Plus className="h-4 w-4" />
            {mode === "create" ? "Adicionar card" : "Salvar alterações"}
          </ActionButton>
        </div>
      </div>
    </div>
  );
}

export function ContentPage() {
  const [teamMembers] = useTeamProfiles();
  const [posts, setPosts] = usePosts();
  const [monthlyPerformance, setMonthlyPerformance] = useMonthlyPerformanceSnapshot();
  const [goals] = useSupabaseSyncedListState<Goal>({ key: "goals", table: "goals", fallback: [] });
  const [stories] = useSupabaseSyncedListState<StoryLog>({ key: "story-logs", table: "story_logs", fallback: storyLogs });
  const [calendarItems] = useSupabaseSyncedListState<CalendarEvent>({
    key: "calendar-events",
    table: "calendar_events",
    fallback: calendarEvents,
  });
  const [teamScope] = useTeamScope();
  const [ownerFilter, setOwnerFilter] = useState<OwnerFilter>("all");
  const [hoveredPostId, setHoveredPostId] = useState<number | null>(null);
  const [editorMode, setEditorMode] = useState<ContentEditorMode>("create");
  const [editorOpen, setEditorOpen] = useState(false);
  const [monthlyMetricsOpen, setMonthlyMetricsOpen] = useState(false);
  const [editingPostId, setEditingPostId] = useState<number | null>(null);
  const [draft, setDraft] = useState<ContentDraft>(() => emptyDraft(teamMembers[0]?.id ?? 1));
  const [monthlyMetricsDraft, setMonthlyMetricsDraft] = useState<MonthlyMetricsDraft>({
    views: "",
    reach: "",
    socialSellingViews: "",
    socialSellingCount: "",
    testimonialsCount: "",
  });
  const [postToDelete, setPostToDelete] = useState<Post | null>(null);
  const currentMonthKey = getCurrentMonthKey();
  const useSharedMonthlyTotals = ownerFilter === "all" && teamScope === "todos" && monthlyPerformance.monthKey === currentMonthKey;

  const visiblePosts = useMemo(
    () =>
      posts.filter((post) => {
        const matchesScope = matchesTeamScope(post.authorId, teamScope);
        const matchesOwner = ownerFilter === "all" || post.authorId === ownerFilter;
        return matchesScope && matchesOwner && isCurrentMonthDate(post.date);
      }),
    [ownerFilter, posts, teamScope],
  );

  const visibleGoals = useMemo(
    () =>
      goals.filter((goal) => {
        const responsibleIds = getGoalResponsibleIds(goal);
        const matchesScope = responsibleIds.some((id) => matchesTeamScope(id, teamScope));
        const matchesOwner = ownerFilter === "all" || responsibleIds.includes(ownerFilter);
        return matchesScope && matchesOwner && isCurrentMonthDate(goal.deadline);
      }),
    [goals, ownerFilter, teamScope],
  );

  const visibleStories = useMemo(
    () =>
      stories.filter((story) => {
        const matchesScope = matchesTeamScope(story.madeById, teamScope) || matchesTeamScope(story.postedById, teamScope);
        const matchesOwner = ownerFilter === "all" || story.madeById === ownerFilter || story.postedById === ownerFilter;
        return matchesScope && matchesOwner && isCurrentMonthDate(story.date);
      }),
    [ownerFilter, stories, teamScope],
  );

  const visibleCalendarItems = useMemo(
    () =>
      calendarItems.filter((event) => {
        const responsibleIds = getCalendarResponsibleIds(event);
        const matchesScope = responsibleIds.some((id) => matchesTeamScope(id, teamScope));
        const matchesOwner = ownerFilter === "all" || responsibleIds.includes(ownerFilter);
        return matchesScope && matchesOwner && isCurrentMonthDate(event.date);
      }),
    [calendarItems, ownerFilter, teamScope],
  );

  const topPosts = useMemo(
    () => [...visiblePosts].sort((a, b) => b.reach - a.reach || b.engagement - a.engagement).slice(0, 5),
    [visiblePosts],
  );
  const lowPosts = useMemo(
    () => [...visiblePosts].sort((a, b) => a.engagement - b.engagement).slice(0, 3),
    [visiblePosts],
  );

  const totalReach = visiblePosts.reduce((sum, post) => sum + post.reach, 0);
  const socialSellingPosts = useMemo(() => visiblePosts.filter((post) => isSocialSellingPost(post)), [visiblePosts]);
  const socialSellingReach = useSharedMonthlyTotals
    ? monthlyPerformance.socialSellingViews
    : socialSellingPosts.reduce((sum, post) => sum + post.reach, 0);
  const socialSellingCount = useSharedMonthlyTotals ? monthlyPerformance.socialSellingCount : socialSellingPosts.length;
  const testimonialCountFromCalendar = useMemo(
    () => visibleCalendarItems.filter((event) => event.visualization === "Depoimento").length,
    [visibleCalendarItems],
  );
  const testimonialCount = useSharedMonthlyTotals ? monthlyPerformance.testimonialsCount : testimonialCountFromCalendar;
  const displayedMonthViews = useSharedMonthlyTotals ? monthlyPerformance.views : totalReach;
  const completedCalendarUnits = visibleCalendarItems.reduce((sum, event) => sum + getCalendarCompletedUnits(event), 0);
  const overallGoalProgress = computeGoalProgress(visibleGoals);
  const overallStoryProgress = computeStoryProgress(visibleStories);
  const previewPost = topPosts.find((post) => post.id === hoveredPostId) ?? topPosts[0] ?? visiblePosts[0] ?? null;

  const selectedMember = ownerFilter === "all" ? null : teamMembers.find((member) => member.id === ownerFilter) ?? null;
  const selectedMembers = useMemo(
    () => teamMembers.filter((member) => member.id === 1 || member.id === 2 || member.id === 3),
    [teamMembers],
  );

  const selectedStoryProgress = computeStoryProgress(
    selectedMember
      ? visibleStories.filter((story) => story.madeById === selectedMember.id || story.postedById === selectedMember.id)
      : visibleStories,
  );
  const selectedCalendarProgress = computeCalendarProgress(visibleCalendarItems, selectedMember?.id);

  const progressEntries = selectedMembers.map((member) => {
    if (member.id === 1) {
      const brendaStories = computeStoryProgress(
        visibleStories.filter((story) => story.madeById === 1 || story.postedById === 1),
      );
      const brendaCompletedUnits = computeCalendarProgress(visibleCalendarItems, 1).completed;

      return {
        member,
        score: Math.min(
          100,
          Math.round(((brendaStories.total + brendaCompletedUnits) / storyGoalTarget) * 100),
        ),
      };
    }

    const memberProgress = computeCalendarProgress(visibleCalendarItems, member.id);
    return { member, score: memberProgress.percent };
  });
  const groupProgressScore =
    progressEntries.length > 0 ? Math.round(progressEntries.reduce((sum, entry) => sum + entry.score, 0) / progressEntries.length) : 0;

  const mainProgress: ProgressSummary =
    selectedMember && isStoryMember(selectedMember.id)
      ? {
          label: "Progresso em stories",
          score: Math.min(
            100,
            Math.round(((selectedStoryProgress.total + selectedCalendarProgress.completed) / storyGoalTarget) * 100),
          ),
          detail:
            selectedStoryProgress.total > 0 || selectedCalendarProgress.completed > 0
              ? `${formatLongNumber(selectedStoryProgress.total)} stories e ${formatLongNumber(selectedCalendarProgress.completed)} atividades concluídas`
            : "Nenhum story ou atividade concluída neste mês",
          subtitle: "Brenda acompanha o avanço deste mês com stories registrados e atividades concluídas.",
        }
      : selectedMember
        ? {
            label: "Pontuação em conteúdo",
            score: selectedCalendarProgress.percent,
            detail:
              selectedCalendarProgress.total > 0
                ? `${formatLongNumber(selectedCalendarProgress.completed)} de ${formatLongNumber(selectedCalendarProgress.total)} atividades concluídas`
                : "Nenhuma atividade encontrada neste mês",
            subtitle: `A pontuação de ${selectedMember.name} sobe quando os posts do calendário são concluídos.`,
          }
        : {
            label: "Progresso geral do grupo",
            score: groupProgressScore,
            detail: `${progressEntries.length} pessoas na média do mês atual`,
            subtitle: "Média entre Brenda, Hannah e Thiago, considerando stories e atividades concluídas.",
          };

  const memberCards = selectedMembers.map((member) => {
    const memberPosts = visiblePosts.filter((post) => post.authorId === member.id);
    const memberGoals = visibleGoals.filter((goal) => getGoalResponsibleIds(goal).includes(member.id));
    const memberStories = visibleStories.filter((story) => story.madeById === member.id || story.postedById === member.id);
    const storyProgress = computeStoryProgress(memberStories);
    const isBrenda = member.id === 1;
    const calendarProgress = computeCalendarProgress(visibleCalendarItems, member.id);
    const progressPercent = isBrenda
      ? Math.min(100, Math.round(((storyProgress.total + calendarProgress.completed) / storyGoalTarget) * 100))
      : calendarProgress.percent;
    const progressLabel = isBrenda ? "Stories" : "Atividades";
    const progressDetail = isBrenda
      ? `${formatLongNumber(storyProgress.total)} stories e ${formatLongNumber(calendarProgress.completed)} atividades concluídas`
      : `${formatLongNumber(calendarProgress.completed)} de ${formatLongNumber(calendarProgress.total)} atividades concluídas`;

    return {
      member,
      posts: memberPosts,
      goals: memberGoals,
      progressPercent,
      progressLabel,
      progressDetail,
      reach: memberPosts.reduce((sum, post) => sum + post.reach, 0),
      engagement: memberPosts.reduce((sum, post) => sum + post.engagement, 0),
    };
  });

  const openCreateEditor = () => {
    const fallbackAuthorId = ownerFilter === "all" ? teamMembers[0]?.id ?? 1 : ownerFilter;
    setEditorMode("create");
    setEditingPostId(null);
    setDraft(emptyDraft(fallbackAuthorId));
    setEditorOpen(true);
  };

  const openMonthlyMetricsEditor = () => {
    setMonthlyMetricsDraft({
      views: String(monthlyPerformance.views),
      reach: String(monthlyPerformance.reach),
      socialSellingViews: String(monthlyPerformance.socialSellingViews),
      socialSellingCount: String(monthlyPerformance.socialSellingCount),
      testimonialsCount: String(monthlyPerformance.testimonialsCount ?? 0),
    });
    setMonthlyMetricsOpen(true);
  };

  const openEditEditor = (post: Post) => {
    setEditorMode("edit");
    setEditingPostId(post.id);
    setDraft({
      title: post.title,
      description: post.description,
      type: post.type,
      status: post.status,
      authorId: post.authorId,
      date: post.date,
      thumbnail: post.thumbnail,
      thumbnailName: isImageDataUrl(post.thumbnail) ? "Imagem salva no card" : "",
      reach: String(post.reach),
      engagement: String(post.engagement),
    });
    setEditorOpen(true);
  };

  const handleSaveEditor = () => {
    if (!draft.title.trim()) {
      toast.error("Adicione um título para o card.");
      return;
    }

    const author = teamMembers.find((member) => member.id === draft.authorId);
    if (!author) {
      toast.error("Selecione um responsável válido.");
      return;
    }

    const current = editingPostId !== null ? posts.find((post) => post.id === editingPostId) ?? null : null;
    const nextPost = buildPostFromDraft(draft, current ?? undefined);

    if (editorMode === "create") {
      nextPost.id = Math.max(...posts.map((post) => post.id), 0) + 1;
      setPosts((currentPosts) => [nextPost, ...currentPosts]);
      toast.success("Card adicionado.");
    } else if (editingPostId !== null) {
      nextPost.id = editingPostId;
      setPosts((currentPosts) => currentPosts.map((post) => (post.id === editingPostId ? nextPost : post)));
      toast.success("Card atualizado.");
    }

    setEditorOpen(false);
    setEditingPostId(null);
    setDraft(emptyDraft(teamMembers[0]?.id ?? 1));
  };

  const handleDeletePost = (post: Post) => {
    setPostToDelete(post);
  };

  const confirmDeletePost = () => {
    if (!postToDelete) {
      return;
    }

    setPosts((currentPosts) => currentPosts.filter((post) => post.id !== postToDelete.id));
    toast.success("Card removido.");
    setPostToDelete(null);
  };

  const handleSaveMonthlyMetrics = () => {
    const toNumber = (value: string) => {
      const parsed = Number(String(value).replace(/[^\d]/g, ""));
      return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
    };

    setMonthlyPerformance({
      monthKey: currentMonthKey,
      views: toNumber(monthlyMetricsDraft.views),
      reach: toNumber(monthlyMetricsDraft.reach),
      socialSellingViews: toNumber(monthlyMetricsDraft.socialSellingViews),
      socialSellingCount: toNumber(monthlyMetricsDraft.socialSellingCount),
      testimonialsCount: toNumber(monthlyMetricsDraft.testimonialsCount),
      updatedAt: new Date().toISOString(),
    });
    setMonthlyMetricsOpen(false);
    toast.success("Métricas mensais compartilhadas atualizadas.");
  };

  const metricCards: MetricCard[] = [
    {
      id: "completed-activities",
      label: "Atividades concluídas",
      value: formatLongNumber(completedCalendarUnits),
      detail: "Posts do calendário finalizados pela equipe neste mês.",
      icon: Sparkles,
      delta: 0,
      onEdit: openCreateEditor,
      dataCy: "content-metric-completed",
    },
    {
      id: "testimonials",
      label: "Depoimentos",
      value: formatLongNumber(testimonialCount),
      detail:
        useSharedMonthlyTotals
          ? `${formatLongNumber(testimonialCount)} depoimentos salvos no total compartilhado do mês.`
          : testimonialCount > 0
            ? `${formatLongNumber(testimonialCount)} depoimentos encontrados no calendário para este filtro.`
            : "Nenhum depoimento encontrado para este filtro no mês atual.",
      icon: Users,
      delta: 0,
      onEdit: useSharedMonthlyTotals ? openMonthlyMetricsEditor : undefined,
      dataCy: "content-metric-testimonials",
    },
    {
      id: "published",
      label: "Conteúdos publicados",
      value: String(visiblePosts.length),
      detail: "Quantidade total de conteúdos visíveis.",
      icon: FileText,
      delta: 0,
      onEdit: openCreateEditor,
      dataCy: "content-metric-published",
    },
    {
      id: "goals",
      label: "Metas concluídas",
      value: `${overallGoalProgress.completed}/${overallGoalProgress.total || 0}`,
      detail: "Metas concluídas no período selecionado.",
      icon: Target,
      delta: 0,
      onEdit: openCreateEditor,
      dataCy: "content-metric-goals",
    },
    ...(ownerFilter === "all"
      ? [
          {
            id: "social-selling",
            label: "Social Selling",
            value: formatLongNumber(socialSellingReach),
            detail:
              socialSellingCount > 0
                ? `${formatLongNumber(socialSellingCount)} conteúdos de social selling neste mês.`
                : "Nenhum conteúdo de social selling encontrado neste mês.",
            icon: Rocket,
            delta: 0,
            onEdit: openMonthlyMetricsEditor,
            dataCy: "content-metric-social-selling",
          } satisfies MetricCard,
        ]
      : []),
  ];

  return (
    <PageTransition>
      <PageHeader
        title="Conteúdo"
        description="Uma leitura mais clara do que está performando, do que precisa de atenção e do ritmo criativo da equipe."
        actions={
          <ActionButton onClick={openCreateEditor} dataCy="content-create-open">
            <Plus className="h-4 w-4" />
            Adicionar card
          </ActionButton>
        }
      />

      <div className="space-y-6" data-cy="content-page-shell">
        <div className="flex flex-wrap gap-3 rounded-[1.7rem] border border-slate-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(249,250,252,0.98))] p-3.5 shadow-[0_12px_26px_rgba(15,23,42,0.04)]">
          {[
            { id: "all" as const, label: "Todos", color: "#e11d48" },
            { id: 1 as const, label: "Brenda", color: "#e11d48" },
            { id: 2 as const, label: "Hannah", color: "#f43f5e" },
            { id: 3 as const, label: "Thiago", color: "#fb7185" },
          ].map((item) => {
            const active = ownerFilter === item.id;
            return (
              <button
                key={String(item.id)}
                type="button"
                onClick={() => setOwnerFilter(item.id)}
                data-cy={`content-owner-${String(item.id) === "all" ? "all" : item.label.toLowerCase()}`}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition duration-200",
                  active
                    ? "border-transparent bg-rose-600 text-white shadow-[0_14px_30px_rgba(225,29,72,0.22)]"
                    : "border-slate-200/80 bg-white text-slate-700 hover:border-rose-200 hover:text-rose-600",
                )}
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="grid gap-6 2xl:grid-cols-[1.04fr_0.96fr]">
          <GlassPanel
            className="overflow-hidden border-slate-200/80 bg-white p-0 shadow-[0_20px_48px_rgba(15,23,42,0.05)]"
            index={0}
            dataCy="content-main-progress"
            style={{ borderRadius: "2.5rem" }}
          >
            <div className="grid min-h-[500px] gap-0 lg:grid-cols-[0.76fr_1.24fr]">
              <div className="flex flex-col justify-between bg-[linear-gradient(180deg,#E30613_0%,#C40010_100%)] p-6 text-white sm:p-7">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 rounded-full bg-white/14 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/88">
                      <Sparkles className="h-3.5 w-3.5" />
                      Pontuação de desempenho
                    </div>
                    <h2 className="max-w-[220px] text-[1.9rem] font-semibold leading-tight tracking-tight">{mainProgress.label}</h2>
                    <p className="max-w-md text-sm leading-6 text-white/80">{mainProgress.subtitle}</p>
                  </div>
                  <button
                    type="button"
                    onClick={openCreateEditor}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/16 text-white transition hover:bg-white/22"
                    title="Adicionar card"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex flex-1 items-center justify-center py-5">
                  <div className="relative flex h-[188px] w-[188px] items-center justify-center">
                    <svg viewBox="0 0 180 180" className="-rotate-90 h-[188px] w-[188px]">
                      <circle cx="90" cy="90" r="74" fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="12" />
                      <circle
                        cx="90"
                        cy="90"
                        r="74"
                        fill="none"
                        stroke="rgba(255,255,255,0.95)"
                        strokeLinecap="round"
                        strokeWidth="12"
                        strokeDasharray={2 * Math.PI * 74}
                        strokeDashoffset={(2 * Math.PI * 74) - (mainProgress.score / 100) * (2 * Math.PI * 74)}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/75">Excelente</p>
                      <p className="mt-1 text-[3rem] font-semibold tracking-tight">{mainProgress.score}</p>
                      <p className="text-sm text-white/80">de 100 pontos</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3">
                  <div className="rounded-[1.4rem] bg-white/14 p-4 backdrop-blur">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-white/78">Metas concluídas</p>
                    <p className="mt-2 text-[2rem] font-semibold text-white">
                      {`${overallGoalProgress.completed}/${overallGoalProgress.total}`}
                    </p>
                  </div>
                  <div className="rounded-[1.4rem] bg-white/14 p-4 backdrop-blur">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-white/78">Atividades concluídas</p>
                    <p className="mt-2 text-[2rem] font-semibold text-white">{formatLongNumber(completedCalendarUnits)}</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 p-5 sm:p-6">
                <div className="grid gap-4 md:grid-cols-2">
                  {metricCards.map((metric) => (
                    <MetricTile key={metric.id} {...metric} />
                  ))}
                </div>

                <div className="rounded-[1.9rem] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(249,249,251,0.98))] p-5 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-500">Retrospectiva visual</p>
                      <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                        {previewPost?.title ?? "Sem conteúdo no recorte"}
                      </h3>
                      <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                        {previewPost?.description ?? "Passe o mouse nos cards para abrir a capa em destaque."}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => (previewPost ? openEditEditor(previewPost) : openCreateEditor())}
                        data-cy="content-preview-edit"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-rose-200 hover:text-rose-600"
                        aria-label={previewPost ? `Editar ${previewPost.title}` : "Adicionar conteúdo"}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 overflow-hidden rounded-[1.9rem] border border-slate-200/80 bg-slate-950">
                    <div className="relative aspect-[16/10]">
                      {previewPost?.thumbnail ? (
                        <img src={previewPost.thumbnail} alt={previewPost.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-gradient-to-br from-rose-700 via-red-600 to-rose-500 text-white">
                          <div className="text-center">
                            <Sparkles className="mx-auto h-10 w-10 opacity-80" />
                            <p className="mt-3 text-sm font-medium">Adicione uma capa para este card</p>
                          </div>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/35 to-transparent" />
                      <div className="absolute left-0 right-0 bottom-0 p-5 text-white">
                        <div className="flex flex-wrap gap-2">
                          <TypeBadge value={previewPost?.type ?? "Reels"} />
                          <StatusChip value={previewPost?.status ? String(previewPost.status) : "Agendado"} />
                        </div>
                        <h4 className="mt-3 text-2xl font-semibold tracking-tight">{previewPost?.title ?? "Novo conteúdo"}</h4>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-white/80">
                          {previewPost?.description ?? "Conteúdo pronto para editar, publicar ou remover."}
                        </p>
                      </div>
                      <div className="absolute right-4 top-4 flex gap-2">
                      <button
                        type="button"
                        onClick={() => (previewPost ? openEditEditor(previewPost) : openCreateEditor())}
                        data-cy="content-preview-top-edit"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-lg shadow-black/10 transition hover:bg-white"
                      >
                          <Pencil className="h-4 w-4" />
                        </button>
                        {previewPost ? (
                          <button
                            type="button"
                            onClick={() => handleDeletePost(previewPost)}
                            data-cy="content-preview-delete"
                            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-rose-600 shadow-lg shadow-black/10 transition hover:bg-white"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </GlassPanel>

          <div className="space-y-6">
            <GlassPanel className="border-slate-200/80 bg-white shadow-[0_16px_38px_rgba(15,23,42,0.05)]" index={1}>
              <SectionTitle
                title="Conteúdos com baixa performance"
                description="Revisite ou otimize esses conteúdos para melhorar os resultados."
              />
              <div className="mt-5 space-y-3">
                {lowPosts.length > 0 ? (
                  lowPosts.map((post) => (
                    <div key={post.id} className="rounded-[1.6rem] border border-rose-200/70 bg-[linear-gradient(180deg,rgba(255,248,250,0.96),rgba(255,245,240,0.94))] p-4 shadow-[0_10px_24px_rgba(244,63,94,0.05)]">
                      <div className="flex flex-wrap items-center gap-2">
                        <TypeBadge value={post.type} />
                        <span className="rounded-full border border-rose-200/80 bg-white px-3 py-1 text-xs font-semibold text-rose-600">
                          Atenção suave
                        </span>
                      </div>
                      <div className="mt-4 flex items-start justify-between gap-4">
                        <div className="space-y-2">
                          <h3 className="text-base font-semibold text-slate-950">{post.title}</h3>
                          <p className="max-w-md text-sm leading-6 text-slate-500">{post.description}</p>
                          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                            <span>{teamMembers.find((member) => member.id === post.authorId)?.name}</span>
                            <span>{formatLongNumber(post.engagement)} de engajamento</span>
                            <span>{formatLongNumber(post.reach)} de visualizações</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => openEditEditor(post)}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-rose-200 hover:text-rose-600"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePost(post)}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-rose-600 transition hover:border-rose-200 hover:text-rose-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-3xl border border-dashed border-rose-200 bg-rose-50/40 p-6 text-sm text-slate-500">
                    Nenhum conteúdo de baixa performance encontrado.
                  </div>
                )}
              </div>
            </GlassPanel>

            <GlassPanel
              className="overflow-hidden border-slate-200/80 bg-white p-0 shadow-[0_16px_38px_rgba(15,23,42,0.05)]"
              index={2}
              style={{ borderRadius: "2.5rem" }}
            >
              <div className="relative aspect-[4/3]">
                {previewPost?.thumbnail ? (
                  <img src={previewPost.thumbnail} alt={previewPost.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white">
                    <div className="text-center">
                      <Rocket className="mx-auto h-10 w-10 opacity-80" />
                      <p className="mt-3 text-sm font-medium">Adicione conteúdo para visualizar aqui</p>
                    </div>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent" />
                <div className="absolute left-5 right-5 bottom-5">
                  <div className="flex flex-wrap gap-2">
                    <StatusChip value={previewPost?.status ? String(previewPost.status) : "Agendado"} />
                    <TypeBadge value={previewPost?.type ?? "Reels"} />
                  </div>
                  <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white">
                    {previewPost?.title ?? "Retrospectiva visual"}
                  </h3>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-white/80">
                    {previewPost?.description ?? "Passe o mouse nos cards para ver a capa em destaque."}
                  </p>
                </div>
              </div>
            </GlassPanel>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <GlassPanel className="border-slate-200/80 bg-white shadow-[0_16px_38px_rgba(15,23,42,0.05)]" index={3}>
            <SectionTitle title="Top 5 conteúdos" description="Os conteúdos mais populares, com base em visualizações." />
            <div className="mt-5 space-y-3">
              {topPosts.length > 0 ? (
                topPosts.map((post, index) => {
                  const member = teamMembers.find((item) => item.id === post.authorId);
                  return (
                    <div
                      key={post.id}
                      onMouseEnter={() => setHoveredPostId(post.id)}
                      onMouseLeave={() => setHoveredPostId(null)}
                      className="flex flex-col gap-4 rounded-[1.7rem] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(249,249,251,0.98))] p-4 transition duration-200 hover:-translate-y-0.5 hover:border-rose-200 hover:shadow-[0_14px_26px_rgba(244,63,94,0.06)] sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-sm font-semibold text-rose-600 ring-1 ring-rose-200/70">
                          #{index + 1}
                        </div>
                        <div className="h-16 w-24 overflow-hidden rounded-2xl bg-gradient-to-br from-rose-100 via-red-100 to-rose-200">
                          {post.thumbnail ? (
                            <img src={post.thumbnail} alt={post.title} className="h-full w-full object-cover" />
                          ) : null}
                        </div>
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link to={`/post/${post.id}`} className="text-sm font-semibold text-slate-950 transition hover:text-rose-600 sm:text-base">
                              {post.title}
                            </Link>
                            <TypeBadge value={post.type} />
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 sm:text-sm">
                            <span>{member?.name}</span>
                            <span>{formatDate(post.date)}</span>
                            <span>{formatLongNumber(post.reach)} de visualizações</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Engajamento</p>
                          <p className="mt-1 text-lg font-semibold text-slate-950">{formatLongNumber(post.engagement)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => openEditEditor(post)}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-rose-200 hover:text-rose-600"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePost(post)}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-rose-600 transition hover:border-rose-200 hover:text-rose-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-3xl border border-dashed border-rose-200 bg-rose-50/40 p-6 text-sm text-slate-500">
                  Nenhum conteúdo encontrado para este filtro.
                </div>
              )}
            </div>
          </GlassPanel>

          <GlassPanel className="border-slate-200/80 bg-white shadow-[0_16px_38px_rgba(15,23,42,0.05)]" index={4}>
            <SectionTitle title="Equipe" description="Leitura por responsável para Brenda, Hannah e Thiago." />
            <div className="mt-5 space-y-4">
              {memberCards.map((entry) => (
                <div key={entry.member.id} className="rounded-[1.8rem] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(250,250,252,0.98),rgba(245,246,249,0.98))] p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar name={entry.member.name} color={entry.member.color} size="md" />
                      <div>
                        <p className="text-base font-semibold text-slate-950">{entry.member.name}</p>
                        <p className="text-sm text-slate-500">
                          {entry.member.role} • {entry.member.specialty}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-right text-sm">
                      <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-[0_4px_12px_rgba(15,23,42,0.03)]">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Posts</p>
                        <p className="mt-1 font-semibold text-slate-950">{entry.posts.length}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-[0_4px_12px_rgba(15,23,42,0.03)]">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Visualizações</p>
                        <p className="mt-1 font-semibold text-slate-950">{formatLongNumber(entry.reach)}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-[0_4px_12px_rgba(15,23,42,0.03)]">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">{entry.progressLabel}</p>
                        <p className="mt-1 font-semibold text-slate-950">{entry.progressPercent}%</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    {entry.posts.slice(0, 3).map((post) => (
                      <button
                        key={post.id}
                        type="button"
                        onMouseEnter={() => setHoveredPostId(post.id)}
                        onFocus={() => setHoveredPostId(post.id)}
                        onMouseLeave={() => setHoveredPostId(null)}
                        onClick={() => openEditEditor(post)}
                        className="group overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white text-left shadow-[0_10px_24px_rgba(15,23,42,0.05)] transition duration-300 hover:-translate-y-1 hover:border-rose-200 hover:shadow-[0_18px_34px_rgba(15,23,42,0.08)]"
                      >
                        <div className="relative aspect-[16/10] overflow-hidden">
                          {post.thumbnail ? (
                            <img
                              src={post.thumbnail}
                              alt={post.title}
                              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center bg-gradient-to-br from-rose-100 via-red-100 to-rose-200">
                              <Sparkles className="h-5 w-5 text-rose-600" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/10 to-transparent" />
                          <div className="absolute left-3 top-3 rounded-full bg-white/92 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-700">
                            {post.type}
                          </div>
                          <div className="absolute bottom-3 right-3 rounded-full bg-white/92 px-3 py-1 text-xs font-semibold text-slate-900">
                            {formatLongNumber(post.reach)}
                          </div>
                        </div>
                        <div className="space-y-2 p-3">
                          <p className="truncate text-sm font-semibold text-slate-950">{post.title}</p>
                          <p className="line-clamp-2 text-xs leading-5 text-slate-500">{post.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="mt-4">
                    <ProgressBar
                      value={entry.progressPercent}
                      max={100}
                      label={entry.member.id === 1 ? "Progresso em stories" : "Pontuação em conteúdo"}
                    />
                    <p className="mt-2 text-xs text-slate-500">{entry.progressDetail}</p>
                  </div>
                </div>
              ))}
            </div>
          </GlassPanel>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <GlassPanel className="border-slate-200/80 bg-white shadow-[0_16px_38px_rgba(15,23,42,0.05)]" index={5}>
            <SectionTitle title="Resumo do período" description="Leitura rápida do que foi feito." />
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
                <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Visualizações totais</p>
                <p className="mt-2 text-xl font-semibold text-slate-950">{formatLongNumber(displayedMonthViews)}</p>
              </div>
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
                <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Depoimentos</p>
                <p className="mt-2 text-xl font-semibold text-slate-950">{formatLongNumber(testimonialCount)}</p>
              </div>
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
                <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Publicações</p>
                <p className="mt-2 text-xl font-semibold text-slate-950">{visiblePosts.length}</p>
              </div>
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
                <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Metas concluídas</p>
                <p className="mt-2 text-xl font-semibold text-slate-950">
                  {overallGoalProgress.completed}/{overallGoalProgress.total || 0}
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
              <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Stories no recorte</p>
              <p className="mt-2 text-xl font-semibold text-slate-950">
                {formatLongNumber(overallStoryProgress.total)} / {formatLongNumber(storyGoalTarget)}
              </p>
              <p className="mt-1 text-sm text-slate-500">Brenda usa esse bloco como referência de progresso editorial.</p>
            </div>
          </GlassPanel>

        </div>
      </div>

      {editorOpen ? (
        <ContentEditorModal
          mode={editorMode}
          draft={draft}
          onChange={setDraft}
          onClose={() => {
            setEditorOpen(false);
            setEditingPostId(null);
            setDraft(emptyDraft(teamMembers[0]?.id ?? 1));
          }}
          onSave={handleSaveEditor}
          teamMembers={teamMembers}
        />
      ) : null}

      {monthlyMetricsOpen ? (
        <MonthlyMetricsModal
          draft={monthlyMetricsDraft}
          onChange={setMonthlyMetricsDraft}
          onClose={() => setMonthlyMetricsOpen(false)}
          onSave={handleSaveMonthlyMetrics}
        />
      ) : null}

      {postToDelete ? (
        <ConfirmDialog
          title="Apagar card?"
          description="O conteúdo será removido da lista e deixará de aparecer para todos os usuários conectados no mesmo projeto."
          confirmLabel="Apagar"
          confirmDataCy="content-delete-confirm"
          cancelDataCy="content-delete-cancel"
          onCancel={() => setPostToDelete(null)}
          onConfirm={confirmDeletePost}
        />
      ) : null}
    </PageTransition>
  );
}





