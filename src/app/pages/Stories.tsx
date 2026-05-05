import { useEffect, useMemo, useState } from "react";
import { Camera, Clock3, Film, Plus, Sparkles, Users, X } from "lucide-react";
import { toast } from "sonner";
import { storyLogs, type StoryLog } from "../data/mockData";
import { useTeamProfiles } from "../data/profiles";
import { useSupabaseSyncedListState } from "../data/supabaseSync";
import { useThemeMode } from "../theme";
import {
  ActionButton,
  ConfirmDialog,
  DeleteIconButton,
  FilterPill,
  GlassPanel,
  MemberChip,
  PageHeader,
  PageTransition,
  ProgressBar,
  cn,
} from "../components/ui";

type StoryMediaType = "video" | "photo";
type StoryFilter = "all" | StoryMediaType;

type StoryFormState = {
  date: string;
  time: string;
  quantity: string;
  mediaType: StoryMediaType;
  madeById: number;
  postedById: number;
  notes: string;
};

const monthlyGoals = {
  total: 168,
  video: 105,
  photo: 63,
};

function pad(number: number) {
  return String(number).padStart(2, "0");
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatDisplayDate(value: string) {
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

function formatDisplayDateTime(date: string, time: string) {
  return `${formatDisplayDate(date)} · ${time || "--:--"}`;
}

function createInitialStoryForm(teamMembers: Array<{ id: number }>) {
  const today = formatDateKey(new Date());

  return {
    date: today,
    time: "09:00",
    quantity: "",
    mediaType: "video" as StoryMediaType,
    madeById: teamMembers[0]?.id ?? 1,
    postedById: teamMembers[1]?.id ?? teamMembers[0]?.id ?? 1,
    notes: "",
  };
}

function formatTypeLabel(value: StoryMediaType) {
  return value === "video" ? "Vídeo" : "Foto";
}

function formatTypeDescription(value: StoryMediaType) {
  return value === "video" ? "Stories em vídeo" : "Stories com foto";
}

function StoryTypeBadge({ value }: { value: StoryMediaType }) {
  const colors = {
    video: "#8B5CF6",
    photo: "#FF9500",
  } as const;

  const color = colors[value];

  return (
    <span
      className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
      style={{
        backgroundColor: `${color}18`,
        color,
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {formatTypeLabel(value)}
    </span>
  );
}

export function StoriesPage() {
  const { isDark } = useThemeMode();
  const [teamMembers] = useTeamProfiles();
  const [items, setItems] = useSupabaseSyncedListState<StoryLog>({
    key: "story-logs",
    table: "story_logs",
    fallback: storyLogs,
  });
  const [filter, setFilter] = useState<StoryFilter>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ storyId: number; storyLabel: string } | null>(null);
  const [form, setForm] = useState<StoryFormState>(() => createInitialStoryForm(teamMembers));

  const teamCards = teamMembers;

  useEffect(() => {
    if (!isCreateOpen) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeModal();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCreateOpen]);

  useEffect(() => {
    if (isCreateOpen) {
      return;
    }

    setForm(createInitialStoryForm(teamCards));
  }, [isCreateOpen, teamCards]);

  const orderedItems = useMemo(() => {
    return [...items].sort((left, right) => {
      const leftStamp = `${left.date}T${left.time || "00:00"}`;
      const rightStamp = `${right.date}T${right.time || "00:00"}`;
      return rightStamp.localeCompare(leftStamp);
    });
  }, [items]);

  const filteredItems = useMemo(() => {
    if (filter === "all") {
      return orderedItems;
    }

    return orderedItems.filter((item) => item.mediaType === filter);
  }, [filter, orderedItems]);

  const stats = useMemo(() => {
    const totalStories = items.reduce((sum, item) => sum + item.quantity, 0);
    const videoStories = items.filter((item) => item.mediaType === "video").reduce((sum, item) => sum + item.quantity, 0);
    const photoStories = items.filter((item) => item.mediaType === "photo").reduce((sum, item) => sum + item.quantity, 0);
    const daysLogged = new Set(items.map((item) => item.date)).size;
    const remainingTotal = Math.max(monthlyGoals.total - totalStories, 0);
    const remainingVideo = Math.max(monthlyGoals.video - videoStories, 0);

    return {
      totalStories,
      videoStories,
      photoStories,
      daysLogged,
      remainingTotal,
      remainingVideo,
      totalProgress: (totalStories / monthlyGoals.total) * 100,
      videoProgress: (videoStories / monthlyGoals.video) * 100,
      photoProgress: (photoStories / monthlyGoals.photo) * 100,
    };
  }, [items]);

  const handleOpenCreate = () => {
    setForm(createInitialStoryForm(teamCards));
    setIsCreateOpen(true);
  };

  const closeModal = () => {
    setIsCreateOpen(false);
  };

  const handleSaveStory = () => {
    const quantity = Number(form.quantity);

    if (
      !form.date ||
      !form.time ||
      !Number.isFinite(quantity) ||
      quantity <= 0 ||
      !form.notes.trim()
    ) {
      toast.error("Preencha data, hora, quantidade e descrição.");
      return;
    }

    const madeBy = teamCards.find((member) => member.id === form.madeById);
    const postedBy = teamCards.find((member) => member.id === form.postedById);

    if (!madeBy || !postedBy) {
      toast.error("Escolha quem fez e quem postou.");
      return;
    }

    const nextStory: StoryLog = {
      id: Math.max(...items.map((item) => item.id), 0) + 1,
      date: form.date,
      time: form.time,
      quantity,
      mediaType: form.mediaType,
      madeById: madeBy.id,
      postedById: postedBy.id,
      notes: form.notes.trim(),
    };

    setItems((previous) => [nextStory, ...previous]);
    toast.success("Stories registrados com sucesso.");
    closeModal();
  };

  const handleDeleteStory = (storyId: number) => {
    const removedStory = items.find((item) => item.id === storyId);

    if (!removedStory) {
      return;
    }

    setItems((previous) => previous.filter((item) => item.id !== storyId));
    setPendingDelete(null);
    toast.success("Registro apagado com sucesso.", {
      action: {
        label: "Desfazer",
        onClick: () => {
          setItems((previous) => {
            if (previous.some((item) => item.id === removedStory.id)) {
              return previous;
            }

            return [removedStory, ...previous];
          });
        },
      },
    });
  };

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Conteúdo"
        title="Stories do mês"
        description="Controle a meta mensal de 168 stories, sendo 105 em vídeo, e registre por dia quantos foram feitos, por quem e em qual formato."
        actions={
          <ActionButton onClick={handleOpenCreate}>
            <Plus className="h-4 w-4" />
            Novo lançamento
          </ActionButton>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.06fr_0.94fr]">
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <GlassPanel className="space-y-3">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Meta do mês</p>
                <h3 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">{monthlyGoals.total}</h3>
                <p className="mt-1 text-sm text-muted-foreground">Stories totais</p>
              </div>
            </GlassPanel>

            <GlassPanel className="space-y-3">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-500">
                <Film className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vídeo</p>
                <h3 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">{monthlyGoals.video}</h3>
                <p className="mt-1 text-sm text-muted-foreground">Stories em vídeo</p>
              </div>
            </GlassPanel>

            <GlassPanel className="space-y-3">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500">
                <Camera className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Foto</p>
                <h3 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">{monthlyGoals.photo}</h3>
                <p className="mt-1 text-sm text-muted-foreground">Stories com foto</p>
              </div>
            </GlassPanel>

            <GlassPanel className="space-y-3">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Dias lançados</p>
                <h3 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">{stats.daysLogged}</h3>
                <p className="mt-1 text-sm text-muted-foreground">Datas com registro</p>
              </div>
            </GlassPanel>
          </div>

          <GlassPanel className="space-y-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Acompanhamento</p>
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">Meta mensal em andamento</h2>
                <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                  O painel mostra o volume total, o recorte em vídeo e foto e quanto ainda falta para bater a meta
                  do mês.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <FilterPill label="Todos" active={filter === "all"} onClick={() => setFilter("all")} />
                <FilterPill label="Vídeo" active={filter === "video"} onClick={() => setFilter("video")} />
                <FilterPill label="Foto" active={filter === "photo"} onClick={() => setFilter("photo")} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-[1.8rem] border border-border/60 bg-muted/30 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">Stories feitos</p>
                  <span className="text-sm font-semibold text-foreground">{stats.totalStories}</span>
                </div>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{stats.remainingTotal}</p>
                <p className="mt-1 text-sm text-muted-foreground">faltam para bater a meta total</p>
              </div>
              <div className="rounded-[1.8rem] border border-border/60 bg-muted/30 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">Vídeo feito</p>
                  <span className="text-sm font-semibold text-foreground">{stats.videoStories}</span>
                </div>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{stats.remainingVideo}</p>
                <p className="mt-1 text-sm text-muted-foreground">faltam para a meta em vídeo</p>
              </div>
              <div className="rounded-[1.8rem] border border-border/60 bg-muted/30 p-4 sm:col-span-2 xl:col-span-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">Média por dia</p>
                  <span className="text-sm font-semibold text-foreground">{stats.daysLogged || 0}</span>
                </div>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
                  {stats.daysLogged > 0 ? (stats.totalStories / stats.daysLogged).toFixed(1) : "0"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">stories por data registrada</p>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              <div className="rounded-[1.8rem] border border-border/60 bg-muted/20 p-4">
                <ProgressBar value={stats.totalStories} max={monthlyGoals.total} label="Meta total" />
                <p className="mt-3 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  {stats.totalStories} de {monthlyGoals.total}
                </p>
              </div>
              <div className="rounded-[1.8rem] border border-border/60 bg-muted/20 p-4">
                <ProgressBar value={stats.videoStories} max={monthlyGoals.video} label="Meta vídeo" />
                <p className="mt-3 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  {stats.videoStories} de {monthlyGoals.video}
                </p>
              </div>
              <div className="rounded-[1.8rem] border border-border/60 bg-muted/20 p-4">
                <ProgressBar value={stats.photoStories} max={monthlyGoals.photo} label="Meta foto" />
                <p className="mt-3 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  {stats.photoStories} de {monthlyGoals.photo}
                </p>
              </div>
            </div>
          </GlassPanel>

          <GlassPanel className="space-y-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Registros</p>
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">Lançamentos por dia</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Registre cada dia com quantidade, formato, horário e responsáveis.
              </p>
            </div>

            <div className="space-y-4">
              {filteredItems.map((item) => {
                const madeBy = teamCards.find((member) => member.id === item.madeById);
                const postedBy = teamCards.find((member) => member.id === item.postedById);
                const accent = madeBy?.color ?? "#E50914";

                return (
                  <div
                    key={item.id}
                    className="group relative overflow-hidden rounded-[2rem] border border-border/60 bg-background p-5 shadow-[var(--shadow-card)] dark:bg-card/90"
                    style={{
                      borderLeftWidth: "4px",
                      borderLeftColor: accent,
                      boxShadow: `0 18px 36px ${accent}10`,
                    }}
                  >
                    <div className="absolute right-4 top-4 z-10 opacity-0 transition group-hover:opacity-100">
                      <DeleteIconButton onClick={() => setPendingDelete({ storyId: item.id, storyLabel: formatDisplayDate(item.date) })} />
                    </div>

                    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <StoryTypeBadge value={item.mediaType} />
                          <span
                            className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
                            style={{ backgroundColor: `${accent}10`, color: accent }}
                          >
                            Dia {formatDisplayDate(item.date)}
                          </span>
                          <span className="inline-flex items-center gap-2 rounded-full bg-muted/50 px-3 py-1 text-xs font-semibold text-muted-foreground">
                            <Clock3 className="h-3.5 w-3.5" />
                            {item.time}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-xl font-semibold tracking-tight text-foreground">
                            {item.quantity} stories registrados
                          </h3>
                          <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                            {formatTypeDescription(item.mediaType)}
                          </span>
                        </div>

                        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{item.notes}</p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[420px] xl:max-w-[520px]">
                        <div className="rounded-[1.6rem] border border-border/60 bg-muted/25 p-4">
                          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Quem fez</p>
                          {madeBy ? (
                            <div className="mt-3">
                              <MemberChip name={madeBy.name} role={madeBy.role} color={madeBy.color} src={madeBy.avatarUrl} />
                            </div>
                          ) : null}
                        </div>
                        <div className="rounded-[1.6rem] border border-border/60 bg-muted/25 p-4">
                          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Quem postou</p>
                          {postedBy ? (
                            <div className="mt-3">
                              <MemberChip name={postedBy.name} role={postedBy.role} color={postedBy.color} src={postedBy.avatarUrl} />
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredItems.length === 0 ? (
                <div className="rounded-[2rem] border border-dashed border-border bg-muted/30 p-10 text-center text-sm text-muted-foreground">
                  Nenhum registro encontrado para este filtro.
                </div>
              ) : null}
            </div>
          </GlassPanel>
        </div>

        <div className="space-y-6">
          <GlassPanel className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Resumo</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">Distribuição do mês</h2>
              </div>
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
            </div>

            <div className="rounded-[2rem] border border-border/60 bg-muted/25 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">Meta total</span>
                <span className="text-sm font-semibold text-foreground">{stats.totalProgress.toFixed(0)}%</span>
              </div>
              <div className="mt-3">
                <ProgressBar value={stats.totalStories} max={monthlyGoals.total} />
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Você já registrou {stats.totalStories} stories e ainda faltam {stats.remainingTotal} para alcançar a
                meta mensal.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.6rem] border border-border/60 bg-muted/25 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Vídeo</p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{stats.videoStories}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {stats.videoProgress.toFixed(0)}% da meta de {monthlyGoals.video}
                </p>
              </div>
              <div className="rounded-[1.6rem] border border-border/60 bg-muted/25 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Foto</p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{stats.photoStories}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {stats.photoProgress.toFixed(0)}% da meta de {monthlyGoals.photo}
                </p>
              </div>
            </div>

            <div className="rounded-[1.6rem] border border-dashed border-border/60 bg-background/70 p-4 text-sm leading-6 text-muted-foreground dark:bg-white/5">
              Dica: registre o volume logo depois do post e use o campo de quem fez e quem postou para separar
              produção de publicação sem perder o histórico.
            </div>

            <ActionButton className="w-full justify-center" onClick={handleOpenCreate}>
              <Plus className="h-4 w-4" />
              Registrar stories
            </ActionButton>
          </GlassPanel>

          <GlassPanel className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-500">
                <Film className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Meta mensal</p>
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">168 stories organizados</h2>
              </div>
            </div>

            <div className="space-y-3 rounded-[2rem] border border-border/60 bg-muted/25 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">Stories em vídeo</span>
                <span className="font-semibold text-foreground">{monthlyGoals.video}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">Stories com foto</span>
                <span className="font-semibold text-foreground">{monthlyGoals.photo}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">Registros lançados</span>
                <span className="font-semibold text-foreground">{items.length}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">Dias com movimento</span>
                <span className="font-semibold text-foreground">{stats.daysLogged}</span>
              </div>
            </div>
          </GlassPanel>
        </div>
      </div>

      {isCreateOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-md"
          onClick={closeModal}
        >
          <div
            className={cn(
              "w-full max-w-4xl overflow-hidden rounded-[2.5rem] border border-border/60 bg-white shadow-[0_34px_110px_rgba(15,23,42,0.24)]",
              isDark ? "dark:border-white/8 dark:bg-card/98" : "",
            )}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
              <div className="p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Novo Story</p>
                    <h3 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">Registrar stories do dia</h3>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                      Registre o volume do dia, o formato, o horário, quem produziu e quem publicou.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground transition hover:bg-muted/80 hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-foreground">Data</span>
                    <input
                      type="date"
                      value={form.date}
                      onChange={(event) => setForm((previous) => ({ ...previous, date: event.target.value }))}
                      className="rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/10 dark:bg-white/5"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-foreground">Hora</span>
                    <input
                      type="time"
                      value={form.time}
                      onChange={(event) => setForm((previous) => ({ ...previous, time: event.target.value }))}
                      className="rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/10 dark:bg-white/5"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-foreground">Quantidade</span>
                    <input
                      value={form.quantity}
                      onChange={(event) => setForm((previous) => ({ ...previous, quantity: event.target.value }))}
                      inputMode="numeric"
                      placeholder="Ex.: 12"
                      className="rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/10 dark:bg-white/5"
                    />
                  </label>

                  <div className="grid gap-2">
                    <span className="text-sm font-medium text-foreground">Formato</span>
                    <div className="grid grid-cols-2 gap-2 rounded-[1.5rem] border border-border/70 bg-muted/20 p-2">
                      {(["video", "photo"] as const).map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setForm((previous) => ({ ...previous, mediaType: value }))}
                          className={cn(
                            "rounded-2xl px-4 py-3 text-sm font-semibold transition",
                            form.mediaType === value
                              ? value === "video"
                                ? "bg-violet-500 text-white shadow-lg shadow-violet-500/20"
                                : "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                              : "bg-background text-muted-foreground hover:text-foreground dark:bg-white/5",
                          )}
                        >
                          {formatTypeLabel(value)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-foreground">Quem fez</span>
                    <select
                      value={form.madeById}
                      onChange={(event) =>
                        setForm((previous) => ({ ...previous, madeById: Number(event.target.value) }))
                      }
                      className="rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/10 dark:bg-white/5"
                    >
                      {teamCards.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-foreground">Quem postou</span>
                    <select
                      value={form.postedById}
                      onChange={(event) =>
                        setForm((previous) => ({ ...previous, postedById: Number(event.target.value) }))
                      }
                      className="rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/10 dark:bg-white/5"
                    >
                      {teamCards.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-2 md:col-span-2">
                    <span className="text-sm font-medium text-foreground">Observação</span>
                    <textarea
                      value={form.notes}
                      onChange={(event) => setForm((previous) => ({ ...previous, notes: event.target.value }))}
                      rows={4}
                      placeholder="Ex.: bastidor do evento, chamada de enquete, sequência com CTA..."
                      className="rounded-[1.6rem] border border-border/70 bg-background px-4 py-3 text-sm outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/10 dark:bg-white/5"
                    />
                  </label>
                </div>
              </div>

              <div className="border-t border-border/60 bg-gradient-to-b from-primary/5 to-transparent p-5 sm:p-6 lg:border-l lg:border-t-0">
                <div className="rounded-[2rem] border border-border/60 bg-white p-4 shadow-sm dark:bg-card/90">
                  <div className="flex items-center gap-3">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Pré-visualização</p>
                      <p className="mt-1 text-lg font-semibold text-foreground">
                        {form.quantity ? `${form.quantity} stories` : "Seu novo lançamento"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3 rounded-[1.8rem] bg-muted/35 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-muted-foreground">Formato</span>
                      <StoryTypeBadge value={form.mediaType} />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-muted-foreground">Data e hora</span>
                      <span className="text-sm font-semibold text-foreground">
                        {form.date ? formatDisplayDateTime(form.date, form.time) : "Sem data"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-muted-foreground">Quem fez</span>
                      <span className="text-sm font-semibold text-foreground">
                        {teamCards.find((member) => member.id === form.madeById)?.name ?? "Sem nome"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-muted-foreground">Quem postou</span>
                      <span className="text-sm font-semibold text-foreground">
                        {teamCards.find((member) => member.id === form.postedById)?.name ?? "Sem nome"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[1.6rem] border border-border/60 bg-muted/20 p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Quantidade</p>
                      <p className="mt-2 text-lg font-semibold text-foreground">{form.quantity || "0"}</p>
                    </div>
                    <div className="rounded-[1.6rem] border border-border/60 bg-muted/20 p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Meta do mês</p>
                      <p className="mt-2 text-lg font-semibold text-foreground">{monthlyGoals.total}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 rounded-[1.6rem] border border-dashed border-border/60 bg-background/70 p-4 text-sm leading-6 text-muted-foreground dark:bg-white/5">
                  Use esse registro para acompanhar produção e publicação sem perder a contagem diária. Se quiser,
                  também dá para separar por campanha ou destacando os stories de vídeo.
                </div>

                <div className="mt-5 flex flex-wrap justify-end gap-3">
                  <ActionButton variant="secondary" onClick={closeModal}>
                    Cancelar
                  </ActionButton>
                  <ActionButton onClick={handleSaveStory}>
                    <Plus className="h-4 w-4" />
                    Registrar
                  </ActionButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {pendingDelete ? (
        <ConfirmDialog
          title="Tem certeza que deseja apagar?"
          description={`O registro de stories do dia ${pendingDelete.storyLabel} será removido e não poderá ser desfeito.`}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => handleDeleteStory(pendingDelete.storyId)}
        />
      ) : null}
    </PageTransition>
  );
}
