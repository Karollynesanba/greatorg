import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Film, PencilLine, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useAuthSession } from "../auth";
import { historyTimeline, storyLogs, type HistoryEvent, type StoryLog } from "../data/mockData";
import { useTeamProfiles } from "../data/profiles";
import { createStoryPost, deleteStoryPost, fetchStoriesDashboard, updateGoalMetric, updateStoriesMonthlyData, updateStoryPost } from "../data/storiesRepository";
import { useSupabaseSyncedListState } from "../data/supabaseSync";
import { matchesTeamScope, useTeamScope } from "../data/teamScope";
import { isCypressRecord, isDateInRange } from "../data/periodMetrics";
import {
  ActionButton,
  GlassPanel,
  EmptyState,
  MemberChip,
  PageHeader,
  PageTransition,
  ProgressBar,
  RoundedDatePicker,
  RoundedDropdown,
  RoundedTimePicker,
  cn,
} from "../components/ui";
import { useThemeMode } from "../theme";

type StoryMediaType = "video" | "photo";
type StoryStatus = "Agendado" | "Publicado" | "Rascunho";
type StoryPeriodMode = "current" | "month" | "custom";

type StoryFormState = {
  date: string;
  time: string;
  quantity: string;
  mediaType: StoryMediaType;
  status: StoryStatus;
  madeById: number;
  postedById: number;
  notes: string;
};

const defaultMonthlyGoalTotal = 168;
const defaultMonthlyGoalVideo = 105;
const defaultMonthlyGoalPhoto = 63;

function parseMetricInput(value: string, fallback: number) {
  const parsedValue = Number(String(value).replace(/[^\d]/g, ""));
  return Number.isFinite(parsedValue) ? Math.max(0, Math.round(parsedValue)) : fallback;
}

function pad(number: number) {
  return String(number).padStart(2, "0");
}

function formatMonthKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
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

function parseDateKey(value: string) {
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
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

function formatMonthYear(value: string) {
  const parsed = parseDateKey(value);
  if (!parsed) {
    return value;
  }

  const label = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(parsed);

  return label.charAt(0).toUpperCase() + label.slice(1);
}

function normalizePeriodRange(startValue: string, endValue: string, fallback: Date) {
  const start = parseDateKey(startValue);
  const end = parseDateKey(endValue);

  if (start && end) {
    return start <= end ? { start, end } : { start: end, end: start };
  }

  return {
    start: startOfMonth(fallback),
    end: endOfMonth(fallback),
  };
}

function formatLabel(type: StoryMediaType) {
  return type === "video" ? "Vídeo" : "Foto";
}

function formatStatusLabel(status: StoryStatus) {
  return status;
}

function getStoryStatus(item: StoryLog): StoryStatus {
  if (item.status) {
    return item.status;
  }

  const storyDate = new Date(`${item.date}T${item.time}:00`);
  return storyDate.getTime() > Date.now() ? "Agendado" : "Publicado";
}

function emptyForm(teamMembers: Array<{ id: number }>): StoryFormState {
  return {
    date: todayKey(),
    time: "09:00",
    quantity: "",
    mediaType: "video",
    status: "Agendado",
    madeById: teamMembers[0]?.id ?? 1,
    postedById: teamMembers[1]?.id ?? teamMembers[0]?.id ?? 1,
    notes: "",
  };
}

function getLatestMonthKey(items: Array<{ date: string }>) {
  return [...items]
    .map((item) => item.date.slice(0, 7))
    .filter(Boolean)
    .sort()
    .at(-1) ?? null;
}

export function StoriesPage() {
  const { isDark } = useThemeMode();
  const { session } = useAuthSession();
  const [teamMembers] = useTeamProfiles();
  const autoSelectedMonthRef = useRef(false);
  const [items, , , reloadItems] = useSupabaseSyncedListState<StoryLog>({
    key: "story-logs",
    table: "story_logs",
    fallback: storyLogs,
    seedOnEmpty: true,
  });
  const [, , , reloadHistoryEvents] = useSupabaseSyncedListState<HistoryEvent>({
    key: "history",
    table: "history_events",
    fallback: historyTimeline,
    seedOnEmpty: true,
  });
  const [teamScope] = useTeamScope();
  const [monthlyCurrentVideo, setMonthlyCurrentVideo] = useState(0);
  const [monthlyCurrentPhoto, setMonthlyCurrentPhoto] = useState(0);
  const [, setMonthlyGoalTotal] = useState(defaultMonthlyGoalTotal);
  const [monthlyGoalVideo, setMonthlyGoalVideo] = useState(defaultMonthlyGoalVideo);
  const [monthlyGoalPhoto, setMonthlyGoalPhoto] = useState(defaultMonthlyGoalPhoto);
  const [isEditingMonthlyGoalTotal, setIsEditingMonthlyGoalTotal] = useState(false);
  const [isEditingMonthlyGoalVideo, setIsEditingMonthlyGoalVideo] = useState(false);
  const [isEditingMonthlyGoalPhoto, setIsEditingMonthlyGoalPhoto] = useState(false);
  const [monthlyGoalTotalDraft, setMonthlyGoalTotalDraft] = useState(String(defaultMonthlyGoalTotal));
  const [monthlyCurrentVideoDraft, setMonthlyCurrentVideoDraft] = useState("0");
  const [monthlyGoalVideoDraft, setMonthlyGoalVideoDraft] = useState(String(defaultMonthlyGoalVideo));
  const [monthlyCurrentPhotoDraft, setMonthlyCurrentPhotoDraft] = useState("0");
  const [monthlyGoalPhotoDraft, setMonthlyGoalPhotoDraft] = useState(String(defaultMonthlyGoalPhoto));
  const currentMonthAnchor = useMemo(() => new Date(), []);
  const [periodMode, setPeriodMode] = useState<StoryPeriodMode>("current");
  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(currentMonthAnchor));
  const [customStartDate, setCustomStartDate] = useState(() => formatDateKey(startOfMonth(currentMonthAnchor)));
  const [customEndDate, setCustomEndDate] = useState(() => formatDateKey(endOfMonth(currentMonthAnchor)));
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingStoryId, setEditingStoryId] = useState<number | null>(null);
  const [form, setForm] = useState<StoryFormState>(() => emptyForm(teamMembers));
  const currentMonthKey = formatMonthKey(currentMonthAnchor);
  const goalMonthKey = formatMonthKey(periodMode === "month" ? monthCursor : currentMonthAnchor);
  const activeMonthLabel = formatMonthYear(formatDateKey(periodMode === "current" ? currentMonthAnchor : monthCursor));
  const customRange = useMemo(
    () => normalizePeriodRange(customStartDate, customEndDate, currentMonthAnchor),
    [currentMonthAnchor, customEndDate, customStartDate],
  );
  const customRangeLabel = `${formatDate(formatDateKey(customRange.start))} até ${formatDate(formatDateKey(customRange.end))}`;
  const summaryTitle = periodMode === "custom" ? "Meta do período" : "Meta do mês";
  const computedMonthlyGoalTotal = monthlyGoalVideo + monthlyGoalPhoto;
  const monthlyGoalTotal = computedMonthlyGoalTotal;
  const effectiveMonthlyGoals = useMemo(
    () => ({
      total: computedMonthlyGoalTotal,
      video: monthlyGoalVideo,
      photo: monthlyGoalPhoto,
    }),
    [computedMonthlyGoalTotal, monthlyGoalPhoto, monthlyGoalVideo],
  );

  const visibleItems = useMemo(
    () => {
      const currentMonthKey = formatMonthKey(currentMonthAnchor);
      const monthKey = formatMonthKey(monthCursor);
      return items.filter((item) => {
        const matchesMadeBy = matchesTeamScope(item.madeById, teamScope);
        const matchesPostedBy = matchesTeamScope(item.postedById, teamScope);
        const matchesScope = (matchesMadeBy || matchesPostedBy) && !isCypressRecord(item);

        if (!matchesScope) {
          return false;
        }

        if (periodMode === "current") {
          return item.date.startsWith(currentMonthKey);
        }

        if (periodMode === "month") {
          return item.date.startsWith(monthKey);
        }

        return isDateInRange(item.date, customRange.start, customRange.end);
      });
    },
    [customRange.end, customRange.start, currentMonthAnchor, items, monthCursor, periodMode, teamScope],
  );

  useEffect(() => {
    if (autoSelectedMonthRef.current || periodMode !== "current") {
      return;
    }

    const currentMonthKey = formatMonthKey(currentMonthAnchor);
    const scopedItems = items.filter((item) => {
      const matchesMadeBy = matchesTeamScope(item.madeById, teamScope);
      const matchesPostedBy = matchesTeamScope(item.postedById, teamScope);
      return (matchesMadeBy || matchesPostedBy) && !isCypressRecord(item);
    });

    const hasCurrentMonthItems = scopedItems.some((item) => item.date.startsWith(currentMonthKey));
    if (hasCurrentMonthItems) {
      return;
    }

    const latestMonthKey = getLatestMonthKey(scopedItems);
    if (!latestMonthKey) {
      return;
    }

    const [year, month] = latestMonthKey.split("-").map(Number);
    if (!year || !month) {
      return;
    }

    setMonthCursor(new Date(year, month - 1, 1));
    setPeriodMode("month");
    autoSelectedMonthRef.current = true;
  }, [currentMonthAnchor, items, periodMode, teamScope]);

  const stats = useMemo(() => {
    const total = monthlyCurrentVideo + monthlyCurrentPhoto;
    const video = monthlyCurrentVideo;
    const photo = monthlyCurrentPhoto;

    return {
      total,
      video,
      photo,
      remainingTotal: Math.max(effectiveMonthlyGoals.total - total, 0),
    };
  }, [effectiveMonthlyGoals.total, monthlyCurrentPhoto, monthlyCurrentVideo]);

  useEffect(() => {
    if (!session?.user.id) {
      return;
    }

    let cancelled = false;

    const loadDashboard = async () => {
      try {
        const dashboard = await fetchStoriesDashboard(session.user.id, goalMonthKey);
        if (cancelled) {
          return;
        }

        const nextVideoCurrent = dashboard.goals.video.currentValue || 0;
        const nextPhotoCurrent = dashboard.goals.photo.currentValue || 0;
        const nextVideoGoal = dashboard.goals.video.goalValue || defaultMonthlyGoalVideo;
        const nextPhotoGoal = dashboard.goals.photo.goalValue || defaultMonthlyGoalPhoto;

        setMonthlyCurrentVideo(nextVideoCurrent);
        setMonthlyCurrentPhoto(nextPhotoCurrent);
        setMonthlyCurrentVideoDraft(String(nextVideoCurrent));
        setMonthlyCurrentPhotoDraft(String(nextPhotoCurrent));
        setMonthlyGoalVideo(nextVideoGoal);
        setMonthlyGoalPhoto(nextPhotoGoal);
        setMonthlyGoalVideoDraft(String(nextVideoGoal));
        setMonthlyGoalPhotoDraft(String(nextPhotoGoal));
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load Stories dashboard", error);
        }
      }
    };

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [goalMonthKey, session?.user.id]);

  const handleStartEditingMonthlyGoalTotal = () => {
    setMonthlyGoalTotalDraft(String(monthlyGoalTotal));
    setIsEditingMonthlyGoalTotal(true);
  };

  const handleCommitMonthlyGoalTotal = async () => {
    if (!session?.user.id) {
      toast.error("Sessão inválida para salvar a meta.");
      return;
    }

    const parsedValue = Number(String(monthlyGoalTotalDraft).replace(/[^\d]/g, ""));
    const nextValue = Number.isFinite(parsedValue) ? Math.max(1, Math.round(parsedValue)) : defaultMonthlyGoalTotal;

    try {
      await updateGoalMetric(session.user.id, "total", stats.total, nextValue, goalMonthKey);
      const dashboard = await fetchStoriesDashboard(session.user.id, goalMonthKey);
      setMonthlyGoalTotal(dashboard.goals.total.goalValue || nextValue);
      setMonthlyGoalTotalDraft(String(dashboard.goals.total.goalValue || nextValue));
      setIsEditingMonthlyGoalTotal(false);
      toast.success("Meta total atualizada.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao salvar a meta total.";
      toast.error(message);
    }
  };

  const handleCancelMonthlyGoalTotalEdit = () => {
    setMonthlyGoalTotalDraft(String(monthlyGoalTotal));
    setIsEditingMonthlyGoalTotal(false);
  };

  const handleStartEditingMonthlyGoalVideo = () => {
    setMonthlyGoalVideoDraft(String(monthlyGoalVideo));
    setIsEditingMonthlyGoalVideo(true);
  };

  const handleCommitMonthlyGoalVideo = async () => {
    if (!session?.user.id) {
      toast.error("Sessao invalida para salvar a meta.");
      return;
    }

    const parsedValue = Number(String(monthlyGoalVideoDraft).replace(/[^\d]/g, ""));
    const nextValue = Number.isFinite(parsedValue) ? Math.max(1, Math.round(parsedValue)) : defaultMonthlyGoalVideo;

    try {
      await updateGoalMetric(session.user.id, "video", stats.video, nextValue, goalMonthKey);
      const dashboard = await fetchStoriesDashboard(session.user.id, goalMonthKey);
      setMonthlyGoalVideo(dashboard.goals.video.goalValue || nextValue);
      setMonthlyGoalVideoDraft(String(dashboard.goals.video.goalValue || nextValue));
      setIsEditingMonthlyGoalVideo(false);
      toast.success("Meta de video atualizada.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao salvar a meta de video.";
      toast.error(message);
    }
  };

  const handleCancelMonthlyGoalVideoEdit = () => {
    setMonthlyGoalVideoDraft(String(monthlyGoalVideo));
    setIsEditingMonthlyGoalVideo(false);
  };

  const handleStartEditingMonthlyGoalPhoto = () => {
    setMonthlyGoalPhotoDraft(String(monthlyGoalPhoto));
    setIsEditingMonthlyGoalPhoto(true);
  };

  const handleCommitMonthlyGoalPhoto = async () => {
    if (!session?.user.id) {
      toast.error("Sessao invalida para salvar a meta.");
      return;
    }

    const parsedValue = Number(String(monthlyGoalPhotoDraft).replace(/[^\d]/g, ""));
    const nextValue = Number.isFinite(parsedValue) ? Math.max(1, Math.round(parsedValue)) : defaultMonthlyGoalPhoto;

    try {
      await updateGoalMetric(session.user.id, "photo", stats.photo, nextValue, goalMonthKey);
      const dashboard = await fetchStoriesDashboard(session.user.id, goalMonthKey);
      setMonthlyGoalPhoto(dashboard.goals.photo.goalValue || nextValue);
      setMonthlyGoalPhotoDraft(String(dashboard.goals.photo.goalValue || nextValue));
      setIsEditingMonthlyGoalPhoto(false);
      toast.success("Meta de foto atualizada.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao salvar a meta de foto.";
      toast.error(message);
    }
  };

  const handleCancelMonthlyGoalPhotoEdit = () => {
    setMonthlyGoalPhotoDraft(String(monthlyGoalPhoto));
    setIsEditingMonthlyGoalPhoto(false);
  };

  const handleStartEditingVideoCard = () => {
    setMonthlyCurrentVideoDraft(String(monthlyCurrentVideo));
    setMonthlyGoalVideoDraft(String(monthlyGoalVideo));
    setIsEditingMonthlyGoalVideo(true);
  };

  const handleCommitVideoCard = async () => {
    if (!session?.user.id) {
      toast.error("Sessao invalida para salvar os dados de video.");
      return;
    }

    const nextCurrentValue = parseMetricInput(monthlyCurrentVideoDraft, monthlyCurrentVideo);
    const nextGoalValue = Math.max(1, parseMetricInput(monthlyGoalVideoDraft, monthlyGoalVideo || defaultMonthlyGoalVideo));
    const nextTotalCurrent = nextCurrentValue + monthlyCurrentPhoto;
    const nextTotalGoal = nextGoalValue + monthlyGoalPhoto;

    try {
      await updateStoriesMonthlyData(session.user.id, goalMonthKey, {
        videoCurrent: nextCurrentValue,
        videoGoal: nextGoalValue,
        photoCurrent: monthlyCurrentPhoto,
        photoGoal: monthlyGoalPhoto,
        totalCurrent: nextTotalCurrent,
        totalGoal: nextTotalGoal,
      });

      const dashboard = await fetchStoriesDashboard(session.user.id, goalMonthKey);
      const savedVideoCurrent = dashboard.goals.video.currentValue || nextCurrentValue;
      const savedVideoGoal = dashboard.goals.video.goalValue || nextGoalValue;
      const savedPhotoCurrent = dashboard.goals.photo.currentValue || monthlyCurrentPhoto;
      const savedPhotoGoal = dashboard.goals.photo.goalValue || monthlyGoalPhoto;

      setMonthlyCurrentVideo(savedVideoCurrent);
      setMonthlyGoalVideo(savedVideoGoal);
      setMonthlyCurrentPhoto(savedPhotoCurrent);
      setMonthlyGoalPhoto(savedPhotoGoal);
      setMonthlyCurrentVideoDraft(String(savedVideoCurrent));
      setMonthlyGoalVideoDraft(String(savedVideoGoal));
      setMonthlyCurrentPhotoDraft(String(savedPhotoCurrent));
      setMonthlyGoalPhotoDraft(String(savedPhotoGoal));
      setIsEditingMonthlyGoalVideo(false);
      toast.success("Video atualizado.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao salvar os dados de video.";
      toast.error(message);
    }
  };

  const handleCancelVideoCardEdit = () => {
    setMonthlyCurrentVideoDraft(String(monthlyCurrentVideo));
    setMonthlyGoalVideoDraft(String(monthlyGoalVideo));
    setIsEditingMonthlyGoalVideo(false);
  };

  const handleStartEditingPhotoCard = () => {
    setMonthlyCurrentPhotoDraft(String(monthlyCurrentPhoto));
    setMonthlyGoalPhotoDraft(String(monthlyGoalPhoto));
    setIsEditingMonthlyGoalPhoto(true);
  };

  const handleCommitPhotoCard = async () => {
    if (!session?.user.id) {
      toast.error("Sessao invalida para salvar os dados de foto.");
      return;
    }

    const nextCurrentValue = parseMetricInput(monthlyCurrentPhotoDraft, monthlyCurrentPhoto);
    const nextGoalValue = Math.max(1, parseMetricInput(monthlyGoalPhotoDraft, monthlyGoalPhoto || defaultMonthlyGoalPhoto));
    const nextTotalCurrent = monthlyCurrentVideo + nextCurrentValue;
    const nextTotalGoal = monthlyGoalVideo + nextGoalValue;

    try {
      await updateStoriesMonthlyData(session.user.id, goalMonthKey, {
        videoCurrent: monthlyCurrentVideo,
        videoGoal: monthlyGoalVideo,
        photoCurrent: nextCurrentValue,
        photoGoal: nextGoalValue,
        totalCurrent: nextTotalCurrent,
        totalGoal: nextTotalGoal,
      });

      const dashboard = await fetchStoriesDashboard(session.user.id, goalMonthKey);
      const savedVideoCurrent = dashboard.goals.video.currentValue || monthlyCurrentVideo;
      const savedVideoGoal = dashboard.goals.video.goalValue || monthlyGoalVideo;
      const savedPhotoCurrent = dashboard.goals.photo.currentValue || nextCurrentValue;
      const savedPhotoGoal = dashboard.goals.photo.goalValue || nextGoalValue;

      setMonthlyCurrentVideo(savedVideoCurrent);
      setMonthlyGoalVideo(savedVideoGoal);
      setMonthlyCurrentPhoto(savedPhotoCurrent);
      setMonthlyGoalPhoto(savedPhotoGoal);
      setMonthlyCurrentVideoDraft(String(savedVideoCurrent));
      setMonthlyGoalVideoDraft(String(savedVideoGoal));
      setMonthlyCurrentPhotoDraft(String(savedPhotoCurrent));
      setMonthlyGoalPhotoDraft(String(savedPhotoGoal));
      setIsEditingMonthlyGoalPhoto(false);
      toast.success("Foto atualizada.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao salvar os dados de foto.";
      toast.error(message);
    }
  };

  const handleCancelPhotoCardEdit = () => {
    setMonthlyCurrentPhotoDraft(String(monthlyCurrentPhoto));
    setMonthlyGoalPhotoDraft(String(monthlyGoalPhoto));
    setIsEditingMonthlyGoalPhoto(false);
  };

  void isEditingMonthlyGoalTotal;
  void handleStartEditingMonthlyGoalTotal;
  void handleCommitMonthlyGoalTotal;
  void handleCancelMonthlyGoalTotalEdit;
  void handleStartEditingMonthlyGoalVideo;
  void handleCommitMonthlyGoalVideo;
  void handleCancelMonthlyGoalVideoEdit;
  void handleStartEditingMonthlyGoalPhoto;
  void handleCommitMonthlyGoalPhoto;
  void handleCancelMonthlyGoalPhotoEdit;

  const sortedItems = useMemo(() => {
    return [...visibleItems].sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`));
  }, [visibleItems]);

  const memberContributions = useMemo(
    () =>
      teamMembers
        .filter((member) => matchesTeamScope(member.id, teamScope))
        .map((member) => {
        const memberItems = visibleItems.filter((item) => item.madeById === member.id);
        const total = memberItems.reduce((sum, item) => sum + item.quantity, 0);
        const video = memberItems.filter((item) => item.mediaType === "video").reduce((sum, item) => sum + item.quantity, 0);
        const photo = memberItems.filter((item) => item.mediaType === "photo").reduce((sum, item) => sum + item.quantity, 0);

        return { member, total, video, photo, count: memberItems.length };
        }),
    [teamMembers, teamScope, visibleItems],
  );

  const closeModal = () => {
    setIsCreateOpen(false);
    setEditingStoryId(null);
    setForm(emptyForm(teamMembers));
  };

  const openCreateModal = () => {
    setEditingStoryId(null);
    setForm(emptyForm(teamMembers));
    setIsCreateOpen(true);
  };

  const openEditModal = (story: StoryLog) => {
    setEditingStoryId(story.id);
    setForm({
      date: story.date,
      time: story.time,
      quantity: String(story.quantity),
      mediaType: story.mediaType,
      status: getStoryStatus(story),
      madeById: story.madeById,
      postedById: story.postedById,
      notes: story.notes,
    });
    setIsCreateOpen(true);
  };

  const handleSave = async () => {
    if (!session?.user.id) {
      toast.error("Sessao invalida para salvar Stories.");
      return;
    }

    const quantity = Number(form.quantity);

    if (!form.date || !form.time || !Number.isFinite(quantity) || quantity <= 0) {
      toast.error("Preencha data, hora e quantidade.");
      return;
    }

    const madeBy = teamMembers.find((member) => member.id === form.madeById);
    const postedBy = teamMembers.find((member) => member.id === form.postedById);

    if (!madeBy || !postedBy) {
      toast.error("Selecione quem fez e quem postou.");
      return;
    }

    const nextItem: StoryLog = {
      id: editingStoryId ?? Date.now(),
      date: form.date,
      time: form.time,
      quantity,
      mediaType: form.mediaType,
      status: form.status,
      madeById: madeBy.id,
      postedById: postedBy.id,
      notes: form.notes.trim(),
    };

    try {
      if (editingStoryId !== null) {
        await updateStoryPost(editingStoryId, {
          ...nextItem,
          userId: session.user.id,
          actorName: madeBy.name,
        });
      } else {
        await createStoryPost({
          ...nextItem,
          userId: session.user.id,
          actorName: madeBy.name,
        });
      }

      await reloadItems();
      await reloadHistoryEvents();
      toast.success(editingStoryId !== null ? "Story atualizado." : "Stories registrados.");
      closeModal();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao salvar o story no Supabase.";
      toast.error(message);
    }
  };

  const handleDelete = async (storyId: number) => {
    if (!session?.user.id) {
      toast.error("Sessao invalida para remover Stories.");
      return;
    }

    const removedStory = items.find((item) => item.id === storyId);
    if (!removedStory) {
      return;
    }

    try {
      await deleteStoryPost(storyId, session.user.id);
      await reloadItems();
      await reloadHistoryEvents();
      toast.success("Registro removido.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao excluir o lancamento.";
      toast.error(message);
    }
  };

  const cardClass = isDark
    ? "rounded-[1.6rem] border border-border/60 bg-background/90 p-4 shadow-[0_18px_42px_rgba(15,23,42,0.08)]"
    : "rounded-[1.6rem] border border-border/60 bg-white/96 p-4 shadow-[0_18px_42px_rgba(15,23,42,0.06)]";
  const summaryBoxClass = isDark
    ? "space-y-3 rounded-2xl border border-border/60 bg-muted/20 p-4"
    : "space-y-3 rounded-2xl border border-border/60 bg-white/96 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]";
  const modalClass = isDark
    ? "w-full max-w-4xl overflow-hidden rounded-[2rem] border border-border/60 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.22)] dark:border-white/8 dark:bg-card/98"
    : "w-full max-w-4xl overflow-hidden rounded-[2rem] border border-border/60 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.14)]";
  const previewClass = isDark
    ? "rounded-2xl border border-border/60 bg-background p-4"
    : "rounded-2xl border border-border/60 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]";
  const filterPanelClass = isDark
    ? "rounded-[2rem] border border-white/10 bg-[#111723] p-5 text-slate-100 shadow-[0_18px_48px_rgba(0,0,0,0.18)] backdrop-blur-xl"
    : "rounded-[2rem] border border-border/70 bg-card p-5 text-card-foreground shadow-[0_18px_48px_rgba(15,23,42,0.06)] backdrop-blur-xl";
  const canGoNextMonth = formatMonthKey(monthCursor) < currentMonthKey;
  const moveMonth = (amount: number) => {
    setPeriodMode("month");
    setMonthCursor((current) => {
      const next = addMonths(current, amount);
      return formatMonthKey(next) > currentMonthKey ? startOfMonth(currentMonthAnchor) : next;
    });
  };

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Conteúdo"
        title="Stories"
        description={`Meta mensal: ${effectiveMonthlyGoals.total} stories, sendo ${effectiveMonthlyGoals.video} em vídeo. Registre o que foi feito por dia.`}
        actions={
          <ActionButton onClick={openCreateModal} dataCy="stories-create-open">
            <Plus className="h-4 w-4" />
            Adicionar
          </ActionButton>
        }
      />

      <div className={cn(filterPanelClass, "relative z-30 space-y-5 p-5 sm:p-6")}>
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Período</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Todos os cards abaixo respondem ao intervalo selecionado.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-border/60 bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground">
              {periodMode === "custom" ? "Intervalo personalizado ativo" : activeMonthLabel}
            </span>
          </div>
        </div>

        <div className="relative z-40 grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)_auto] xl:items-center">
          <RoundedDropdown
            label="Período"
            value={periodMode}
            options={[
              { label: "Esse mês", value: "current" as const },
              { label: "Mês selecionado", value: "month" as const },
              { label: "Personalizado", value: "custom" as const },
            ]}
            onChange={(value) => {
              setPeriodMode(value);

              if (value === "current") {
                setMonthCursor(startOfMonth(currentMonthAnchor));
              }
            }}
          />

          <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
            <div className="flex items-center gap-3 rounded-[1.5rem] border border-border/70 bg-background px-4 py-3 shadow-sm">
              <button
                type="button"
                onClick={() => moveMonth(-1)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-card text-muted-foreground transition hover:border-primary/25 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Mês anterior"
                disabled={periodMode !== "month"}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Mês</p>
                <p className="truncate text-sm font-semibold text-foreground">{activeMonthLabel}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!canGoNextMonth) {
                    return;
                  }

                  setMonthCursor((current) => {
                    const next = addMonths(current, 1);
                    return formatMonthKey(next) > currentMonthKey ? startOfMonth(currentMonthAnchor) : next;
                  });
                }}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-card text-muted-foreground transition hover:border-primary/25 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                disabled={periodMode !== "month" || !canGoNextMonth}
                aria-label="Próximo mês"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <span className="rounded-full border border-border/60 bg-muted/35 px-3 py-1 text-xs font-semibold text-muted-foreground">
                {sortedItems.length} registros
              </span>
            </div>

            <button
              type="button"
              onClick={() => setPeriodMode("custom")}
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-[1.5rem] border px-5 py-3 text-sm font-semibold transition",
                periodMode === "custom"
                  ? "border-primary/30 bg-primary/8 text-primary shadow-sm"
                  : "border-border/70 bg-background text-foreground hover:border-primary/20 hover:shadow-sm",
              )}
            >
              Personalizado
            </button>

            <div className="hidden xl:block" />
          </div>
        </div>

        {periodMode === "custom" ? (
          <div className="grid gap-3 rounded-[1.75rem] border border-border/60 bg-muted/20 p-4 md:grid-cols-2">
            <RoundedDatePicker
              label="Data inicial"
              value={customStartDate}
              onChange={(value) => setCustomStartDate(value)}
              dataCy="stories-period-start"
            />
            <RoundedDatePicker
              label="Data final"
              value={customEndDate}
              onChange={(value) => setCustomEndDate(value)}
              dataCy="stories-period-end"
            />
            <div className="md:col-span-2 flex items-center justify-between rounded-[1.35rem] border border-border/60 bg-background px-4 py-3 text-sm text-muted-foreground">
              <span>Intervalo aplicado</span>
              <strong className="text-foreground">{customRangeLabel}</strong>
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <div className="grid gap-4 xl:grid-cols-3">
            {memberContributions.map((entry) => (
              <GlassPanel
                key={entry.member.id}
                className="overflow-hidden border border-border/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(248,250,252,0.96))] p-5 shadow-[0_16px_36px_rgba(15,23,42,0.05)]"
                style={teamScope === entry.member.id ? { borderColor: `${entry.member.color}55` } : undefined}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">{entry.member.name}</p>
                    <p className="mt-3 text-[clamp(1.8rem,2.4vw,2.3rem)] font-semibold tracking-tight text-foreground">{entry.total}</p>
                  </div>
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold text-white shadow-[0_10px_22px_rgba(15,23,42,0.12)]" style={{ backgroundColor: entry.member.color }}>
                    {entry.member.name.charAt(0)}
                  </span>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  {entry.video} vídeo(s) • {entry.photo} foto(s) • {entry.count} registro(s)
                </p>
              </GlassPanel>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <GlassPanel className="overflow-hidden border border-border/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(248,250,252,0.96))] p-5 shadow-[0_16px_36px_rgba(15,23,42,0.05)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Meta total</p>
                  <p className="mt-3 text-[clamp(1.65rem,2.4vw,2.15rem)] font-semibold tracking-tight text-foreground">
                    {stats.total} / {effectiveMonthlyGoals.total}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">Calculado automaticamente por vídeo + foto.</p>
              <ProgressBar value={stats.total} max={effectiveMonthlyGoals.total} />
            </GlassPanel>
            <GlassPanel className="overflow-hidden border border-border/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(248,250,252,0.96))] p-5 shadow-[0_16px_36px_rgba(15,23,42,0.05)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Vídeo</p>
                  <p className="mt-3 text-[clamp(1.65rem,2.4vw,2.15rem)] font-semibold tracking-tight text-foreground">
                    {stats.video} / {effectiveMonthlyGoals.video}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleStartEditingVideoCard}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-white/90 text-muted-foreground transition hover:border-primary/25 hover:bg-primary/5 hover:text-primary"
                  aria-label="Editar meta de vídeo"
                >
                  <PencilLine className="h-4 w-4" />
                </button>
              </div>
              {isEditingMonthlyGoalVideo ? (
                <div className="mt-4 grid gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3">
                  <label className="grid gap-1">
                    <span className="text-sm font-semibold text-primary">Atual</span>
                    <input
                      autoFocus
                      value={monthlyCurrentVideoDraft}
                      onChange={(event) => setMonthlyCurrentVideoDraft(event.target.value)}
                      onBlur={handleCommitVideoCard}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          handleCommitVideoCard();
                        }

                        if (event.key === "Escape") {
                          event.preventDefault();
                          handleCancelVideoCardEdit();
                        }
                      }}
                      inputMode="numeric"
                      className="w-full rounded-2xl border border-primary/15 bg-white/90 px-3 py-2 text-lg font-semibold tracking-tight text-foreground outline-none placeholder:text-muted-foreground"
                      placeholder="0"
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-sm font-semibold text-primary">Meta</span>
                    <input
                      value={monthlyGoalVideoDraft}
                      onChange={(event) => setMonthlyGoalVideoDraft(event.target.value)}
                      onBlur={handleCommitVideoCard}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          handleCommitVideoCard();
                        }

                        if (event.key === "Escape") {
                          event.preventDefault();
                          handleCancelVideoCardEdit();
                        }
                      }}
                      inputMode="numeric"
                      className="w-full rounded-2xl border border-primary/15 bg-white/90 px-3 py-2 text-lg font-semibold tracking-tight text-foreground outline-none placeholder:text-muted-foreground"
                      placeholder={String(defaultMonthlyGoalVideo)}
                    />
                  </label>
                </div>
              ) : null}
              <ProgressBar value={stats.video} max={effectiveMonthlyGoals.video} />
            </GlassPanel>
            <GlassPanel className="overflow-hidden border border-border/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(248,250,252,0.96))] p-5 shadow-[0_16px_36px_rgba(15,23,42,0.05)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Foto</p>
                  <p className="mt-3 text-[clamp(1.65rem,2.4vw,2.15rem)] font-semibold tracking-tight text-foreground">
                    {stats.photo} / {effectiveMonthlyGoals.photo}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleStartEditingPhotoCard}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-white/90 text-muted-foreground transition hover:border-primary/25 hover:bg-primary/5 hover:text-primary"
                  aria-label="Editar meta de foto"
                >
                  <PencilLine className="h-4 w-4" />
                </button>
              </div>
              {isEditingMonthlyGoalPhoto ? (
                <div className="mt-4 grid gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3">
                  <label className="grid gap-1">
                    <span className="text-sm font-semibold text-primary">Atual</span>
                    <input
                      autoFocus
                      value={monthlyCurrentPhotoDraft}
                      onChange={(event) => setMonthlyCurrentPhotoDraft(event.target.value)}
                      onBlur={handleCommitPhotoCard}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          handleCommitPhotoCard();
                        }

                        if (event.key === "Escape") {
                          event.preventDefault();
                          handleCancelPhotoCardEdit();
                        }
                      }}
                      inputMode="numeric"
                      className="w-full rounded-2xl border border-primary/15 bg-white/90 px-3 py-2 text-lg font-semibold tracking-tight text-foreground outline-none placeholder:text-muted-foreground"
                      placeholder="0"
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-sm font-semibold text-primary">Meta</span>
                    <input
                      value={monthlyGoalPhotoDraft}
                      onChange={(event) => setMonthlyGoalPhotoDraft(event.target.value)}
                      onBlur={handleCommitPhotoCard}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          handleCommitPhotoCard();
                        }

                        if (event.key === "Escape") {
                          event.preventDefault();
                          handleCancelPhotoCardEdit();
                        }
                      }}
                      inputMode="numeric"
                      className="w-full rounded-2xl border border-primary/15 bg-white/90 px-3 py-2 text-lg font-semibold tracking-tight text-foreground outline-none placeholder:text-muted-foreground"
                      placeholder={String(defaultMonthlyGoalPhoto)}
                    />
                  </label>
                </div>
              ) : null}
              <ProgressBar value={stats.photo} max={effectiveMonthlyGoals.photo} />
            </GlassPanel>
          </div>

          <GlassPanel className="overflow-hidden border border-border/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(248,250,252,0.97))] p-4 shadow-[0_18px_42px_rgba(15,23,42,0.05)] sm:p-5">
            <div className="flex flex-col gap-4 border-b border-border/60 pb-4 lg:flex-row lg:items-end lg:justify-between">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Histórico</p>
              <h2 className="text-xl font-semibold text-foreground">Lançamentos recentes</h2>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">Todos</span>
                <span className="rounded-full border border-border/60 bg-white/90 px-4 py-2 text-sm font-semibold text-foreground">Agendados</span>
                {sortedItems[0] ? (
                  <span className="rounded-full border border-border/60 bg-white/90 px-4 py-2 text-sm text-muted-foreground">
                    {formatDate(sortedItems[0].date)} - {sortedItems[0].time}
                  </span>
                ) : null}
                <span className="rounded-full border border-primary/15 bg-primary/5 px-4 py-2 text-sm font-medium text-muted-foreground">{stats.total} stories</span>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {sortedItems.length > 0 ? sortedItems.map((item) => {
                const madeBy = teamMembers.find((member) => member.id === item.madeById);
                const postedBy = teamMembers.find((member) => member.id === item.postedById);

                const status = getStoryStatus(item);

                return (
                  <div key={item.id} className={cn(cardClass, "rounded-[1.4rem] px-4 py-4")} data-cy={`stories-card-${item.id}`}>
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_88px] lg:items-center">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
                            {formatLabel(item.mediaType)}
                          </span>
                          <span className="rounded-full border border-emerald-200/80 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-600">
                            {formatStatusLabel(status)}
                          </span>
                          <span className="rounded-full border border-border/60 bg-white/90 px-4 py-2 text-sm font-medium text-muted-foreground">
                            {formatDate(item.date)} · {item.time}
                          </span>
                          <span className="rounded-full border border-primary/10 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary">
                            {item.quantity} {item.quantity === 1 ? "story" : "stories"}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{item.notes || "Sem observação"}</p>
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          data-cy={`stories-edit-${item.id}`}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-primary/15 bg-primary/5 text-primary transition hover:bg-primary/12"
                          aria-label="Editar registro"
                        >
                          <PencilLine className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          data-cy={`stories-delete-${item.id}`}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-rose-200/70 bg-rose-50 text-rose-500 transition hover:bg-rose-100"
                          aria-label="Remover registro"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-1 grid gap-3 border-t border-border/50 pt-4 sm:grid-cols-2">
                      {madeBy ? <MemberChip name={madeBy.name} role={madeBy.role} color={madeBy.color} src={madeBy.avatarUrl} /> : null}
                      {postedBy ? <MemberChip name={postedBy.name} role={postedBy.role} color={postedBy.color} src={postedBy.avatarUrl} /> : null}
                    </div>
                  </div>
                );
              }) : (
                <EmptyState
                  title="Nenhum story registrado"
                  description="Clique em Adicionar para registrar o primeiro story. Quando houver registros no Supabase, eles aparecem aqui de forma compartilhada."
                />
              )}
            </div>
          </GlassPanel>
        </div>

        <GlassPanel className="space-y-5 self-start overflow-hidden border border-border/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.995),rgba(244,248,255,0.97))] p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)] lg:sticky lg:top-6">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Film className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Resumo</p>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">{summaryTitle}</h2>
            </div>
          </div>

          <div className={cn(summaryBoxClass, "space-y-4 p-4")}>
            <div className="flex items-center justify-between gap-3 border-b border-border/50 pb-3">
              <span className="text-sm text-muted-foreground">Total</span>
              <strong className="text-base font-semibold text-foreground">
                {stats.total} / {effectiveMonthlyGoals.total}
              </strong>
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-border/50 pb-3">
              <span className="text-sm text-muted-foreground">Vídeo</span>
              <strong className="text-base font-semibold text-foreground">
                {stats.video} / {effectiveMonthlyGoals.video}
              </strong>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">Foto</span>
              <strong className="text-base font-semibold text-foreground">
                {stats.photo} / {effectiveMonthlyGoals.photo}
              </strong>
            </div>
          </div>

          <div className="rounded-[1.6rem] border border-primary/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(247,250,255,0.96))] px-5 py-4 shadow-[0_12px_30px_rgba(59,130,246,0.05)]">
            <p className="text-sm text-muted-foreground">Faltam</p>
            <p className="mt-2 text-[clamp(1.9rem,2.7vw,2.5rem)] font-semibold tracking-tight text-primary">{stats.remainingTotal} stories</p>
          </div>
        </GlassPanel>
      </div>

      {isCreateOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-md"
          onClick={closeModal}
        >
          <div
            className={modalClass}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-border/60 p-5 sm:p-6">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  {editingStoryId !== null ? "Editar registro" : "Novo registro"}
                </p>
                <h3 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                  {editingStoryId !== null ? "Editar stories do dia" : "Adicionar stories do dia"}
                </h3>
              </div>
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                {stats.remainingTotal} faltam
              </span>
            </div>

            <div className="grid gap-0 lg:grid-cols-[1fr_280px]">
              <div className="p-5 sm:p-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-foreground">Data</span>
                    <RoundedDatePicker
                      label="Data"
                      value={form.date}
                      onChange={(value) => setForm((previous) => ({ ...previous, date: value }))}
                      dataCy="stories-date"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-foreground">Hora</span>
                    <RoundedTimePicker
                      label="Hora"
                      value={form.time}
                      onChange={(value) => setForm((previous) => ({ ...previous, time: value }))}
                      dataCy="stories-time"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-foreground">Quantidade</span>
                    <input
                      type="number"
                      min="1"
                      value={form.quantity}
                      onChange={(event) => setForm((previous) => ({ ...previous, quantity: event.target.value }))}
                      data-cy="stories-quantity"
                      className="rounded-full border border-border/70 bg-background px-4 py-3 text-sm outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-foreground">Formato</span>
                    <RoundedDropdown
                      label="Formato"
                      value={form.mediaType}
                      options={[
                        { label: "Vídeo", value: "video" },
                        { label: "Foto", value: "photo" },
                      ]}
                      onChange={(value) => setForm((previous) => ({ ...previous, mediaType: value }))}
                      dataCy="stories-media-type"
                      optionDataCyPrefix="stories-media-type"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-foreground">Status</span>
                    <RoundedDropdown
                      label="Status"
                      value={form.status}
                      options={[
                        { label: "Agendado", value: "Agendado" },
                        { label: "Publicado", value: "Publicado" },
                        { label: "Rascunho", value: "Rascunho" },
                      ]}
                      onChange={(value) => setForm((previous) => ({ ...previous, status: value }))}
                      dataCy="stories-status"
                      optionDataCyPrefix="stories-status"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-foreground">Quem fez</span>
                    <RoundedDropdown
                      label="Quem fez"
                      value={form.madeById}
                      options={teamMembers.map((member) => ({
                        label: member.name,
                        value: member.id,
                        color: member.color,
                      }))}
                      onChange={(value) => setForm((previous) => ({ ...previous, madeById: value }))}
                      dataCy="stories-made-by"
                      optionDataCyPrefix="stories-made-by"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-foreground">Quem postou</span>
                    <RoundedDropdown
                      label="Quem postou"
                      value={form.postedById}
                      options={teamMembers.map((member) => ({
                        label: member.name,
                        value: member.id,
                        color: member.color,
                      }))}
                      onChange={(value) => setForm((previous) => ({ ...previous, postedById: value }))}
                      dataCy="stories-posted-by"
                      optionDataCyPrefix="stories-posted-by"
                    />
                  </label>

                  <label className="grid gap-2 md:col-span-2">
                    <span className="text-sm font-medium text-foreground">Observação</span>
                    <textarea
                      value={form.notes}
                      onChange={(event) => setForm((previous) => ({ ...previous, notes: event.target.value }))}
                      rows={4}
                      placeholder="Opcional"
                      data-cy="stories-notes"
                      className="rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                    />
                  </label>
                </div>

                <div className="mt-5 flex justify-end">
                  <ActionButton onClick={handleSave} dataCy="stories-save">
                    <Plus className="h-4 w-4" />
                    {editingStoryId !== null ? "Salvar alterações" : "Adicionar"}
                  </ActionButton>
                </div>
              </div>

              <div className="border-t border-border/60 bg-muted/20 p-5 sm:p-6 lg:border-l lg:border-t-0">
                <div className={previewClass}>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Prévia</p>
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-muted-foreground">Formato</span>
                      <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                        {form.mediaType === "video" ? "Vídeo" : "Foto"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-muted-foreground">Data</span>
                      <span className="text-sm font-medium text-foreground">{formatDate(form.date)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-muted-foreground">Hora</span>
                      <span className="text-sm font-medium text-foreground">{form.time || "--:--"}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-muted-foreground">Quantidade</span>
                      <span className="text-sm font-medium text-foreground">{form.quantity || "0"}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  data-cy="stories-close"
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-border/60 bg-background px-4 py-3 text-sm font-medium text-foreground transition hover:bg-muted/70"
                >
                  <X className="h-4 w-4" />
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </PageTransition>
  );
}
