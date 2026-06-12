import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { ChevronDown, Image as ImageIcon, Link2, Lightbulb, PencilLine, Plus, Upload, Video, X } from "lucide-react";
import { toast } from "sonner";
import { AnimatePresence, motion } from "motion/react";
import { ideas as seedIdeas, type Idea, type IdeaStatus } from "../data/mockData";
import { createClientNumericId } from "../data/clientIds";
import { useSupabaseIdeasState } from "../data/ideasRepository";
import { useTeamProfiles } from "../data/profiles";
import { matchesTeamScope, useTeamScope } from "../data/teamScope";
import { useThemeMode } from "../theme";
import {
  ActionButton,
  ConfirmDialog,
  DeleteIconButton,
  GlassPanel,
  EmptyState,
  MemberChip,
  PageHeader,
  PageTransition,
  RoundedDropdown,
  StatusBadge,
} from "../components/ui";

const ideaCategories = [
  "Stories em foto",
  "Stories em vídeo",
  "Reels",
  "Post",
  "Carrossel",
  "Feed",
] as const;

const ideaStatuses: IdeaStatus[] = ["Ideia", "Em produção", "Pronto"];

type IdeaCategory = (typeof ideaCategories)[number];
type IdeaMediaSource = "url" | "upload";
type IdeaMediaKind = "photo" | "video";
type IdeaFilter = "all" | IdeaStatus;

type IdeaFormState = {
  title: string;
  category: IdeaCategory;
  status: IdeaStatus;
  theme: string;
  description: string;
  script: string;
  responsibleId: number;
  mediaSource: IdeaMediaSource;
  mediaKind: IdeaMediaKind;
  mediaUrl: string;
  mediaFileName: string;
};

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function isVideoLike(url: string) {
  return /^data:video\//i.test(url) || /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(url);
}

function MemberDropdown({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [teamMembers] = useTeamProfiles();
  const selectedMember = teamMembers.find((member) => member.id === value) ?? teamMembers[0];

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
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 rounded-full border border-border/70 bg-background px-4 py-3 text-sm transition hover:border-primary/25 hover:shadow-sm dark:border-white/8 dark:bg-[#171c25] dark:text-foreground dark:hover:bg-[#1f2631]"
      >
        <span className="flex items-center gap-3 text-left">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: selectedMember.color }} />
          <span className="font-medium" style={{ color: selectedMember.color }}>
            {selectedMember.name}
          </span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div
          className="absolute left-0 top-full z-50 mt-2 w-full rounded-[1.75rem] border border-border/70 bg-background p-2 shadow-[0_24px_60px_rgba(15,23,42,0.14)] dark:border-white/8 dark:bg-[#121821] dark:shadow-[0_24px_60px_rgba(0,0,0,0.28)]"
        >
          <p className="px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Responsável
          </p>
          <div className="space-y-1">
            {teamMembers.map((member) => {
              const selected = member.id === selectedMember.id;

              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => {
                    onChange(member.id);
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-between rounded-full px-4 py-3 text-left text-sm transition hover:bg-muted dark:hover:bg-white/6"
                  style={{
                    backgroundColor: selected ? "rgb(var(--muted) / 1)" : undefined,
                    boxShadow: selected ? "inset 0 0 0 1px rgba(var(--border), 0.6)" : undefined,
                  }}
                >
                  <span className="flex items-center gap-3">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: member.color }} />
                    <span className="font-medium" style={{ color: member.color }}>
                      {member.name}
                    </span>
                  </span>
                  {selected ? <span className="text-xs font-semibold text-muted-foreground">Ativo</span> : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function IdeasPage() {
  const { isDark } = useThemeMode();
  const [teamMembers] = useTeamProfiles();
  const [items, , { createIdea, updateIdea, deleteIdea }] = useSupabaseIdeasState(seedIdeas);
  const [teamScope, setTeamScope] = useTeamScope();
  const [isSparkOpen, setIsSparkOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingIdeaId, setEditingIdeaId] = useState<number | null>(null);
  const [ideaFilter, setIdeaFilter] = useState<IdeaFilter>("all");
  const [pendingDelete, setPendingDelete] = useState<{ ideaId: number; ideaTitle: string } | null>(null);
  const sparkTimerRef = useRef<number | null>(null);
  const mediaInputRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState<IdeaFormState>({
    title: "",
    category: ideaCategories[0],
    status: "Ideia",
    theme: "",
    description: "",
    script: "",
    responsibleId: teamMembers[0].id,
    mediaSource: "url",
    mediaKind: "photo",
    mediaUrl: "",
    mediaFileName: "",
  });

  const visibleItems = useMemo(
    () =>
      items.filter((idea) => {
        const matchesScope = matchesTeamScope(idea.responsibleId, teamScope);
        const matchesStatus = ideaFilter === "all" || idea.status === ideaFilter;
        return matchesScope && matchesStatus;
      }),
    [ideaFilter, items, teamScope],
  );

  useEffect(() => {
    if (!isCreateOpen) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsCreateOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCreateOpen]);

  useEffect(() => {
    return () => {
      if (sparkTimerRef.current) {
        window.clearTimeout(sparkTimerRef.current);
      }
    };
  }, []);

  const handleOpenIdeaCreate = () => {
    if (isSparkOpen || isCreateOpen) {
      return;
    }

    setIsSparkOpen(true);
    sparkTimerRef.current = window.setTimeout(() => {
      setIsSparkOpen(false);
      setIsCreateOpen(true);
      sparkTimerRef.current = null;
    }, 950);
  };

  const openCreateModal = () => {
    setEditingIdeaId(null);
    setForm({
      title: "",
      category: ideaCategories[0],
      status: "Ideia",
      theme: "",
      description: "",
      script: "",
      responsibleId: teamMembers[0].id,
      mediaSource: "url",
      mediaKind: "photo",
      mediaUrl: "",
      mediaFileName: "",
    });
    handleOpenIdeaCreate();
  };

  const openEditIdea = (idea: Idea) => {
    setEditingIdeaId(idea.id);
    setForm({
      title: idea.title,
      category: idea.category,
      status: idea.status,
      theme: idea.theme,
      description: idea.description,
      script: idea.script ?? "",
      responsibleId: idea.responsibleId,
      mediaSource: idea.mediaUrl ? "upload" : "url",
      mediaKind: idea.mediaKind ?? (idea.mediaUrl && isVideoLike(idea.mediaUrl) ? "video" : "photo"),
      mediaUrl: idea.mediaUrl ?? "",
      mediaFileName: idea.mediaFileName ?? "",
    });
    setIsCreateOpen(true);
  };

  const closeIdeaModal = () => {
    setIsCreateOpen(false);
    setEditingIdeaId(null);
  };

  const handleSaveIdea = async () => {
    if (!form.title.trim() || !form.category.trim() || !form.theme.trim() || !form.description.trim()) {
      toast.error("Preencha título, categoria, tema e descrição.");
      return;
    }

    const nextIdea: Idea = {
      id: editingIdeaId ?? createClientNumericId(),
      title: form.title.trim(),
      category: form.category,
      theme: form.theme.trim(),
      description: form.description.trim(),
      status: form.status,
      script: form.script.trim() || undefined,
      responsibleId: form.responsibleId,
      mediaSource: form.mediaSource,
      mediaKind: form.mediaKind,
      mediaUrl: form.mediaUrl.trim() || undefined,
      mediaFileName: form.mediaFileName.trim() || undefined,
    };

    try {
      if (editingIdeaId !== null) {
        await updateIdea(nextIdea);
      } else {
        await createIdea(nextIdea);
      }
    } catch (error) {
      console.error("Failed to save idea", error);
      toast.error("Não foi possível salvar a ideia no Supabase.");
      return;
    }

    if (!matchesTeamScope(nextIdea.responsibleId, teamScope)) {
      setTeamScope(nextIdea.responsibleId);
    }

    const wasEditing = editingIdeaId !== null;
    closeIdeaModal();
    setForm({
      title: "",
      category: ideaCategories[0],
      status: "Ideia",
      theme: "",
      description: "",
      script: "",
      responsibleId: teamMembers[0].id,
      mediaSource: "url",
      mediaKind: "photo",
      mediaUrl: "",
      mediaFileName: "",
    });
    toast.success(wasEditing ? "Ideia atualizada com sucesso." : "Ideia criada com sucesso.");
  };

  const handleMediaFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      toast.error("Envie uma imagem ou vídeo.");
      event.target.value = "";
      return;
    }

    const mediaUrl = await readFileAsDataUrl(file);
    const mediaKind: IdeaMediaKind = file.type.startsWith("video/") ? "video" : "photo";

    setForm((previous) => ({
      ...previous,
      mediaSource: "upload",
      mediaKind,
      mediaUrl,
      mediaFileName: file.name,
    }));

    event.target.value = "";
    toast.success("Mídia adicionada à ideia.");
  };

  const handleDeleteIdea = async (ideaId: number) => {
    const removedIdea = items.find((idea) => idea.id === ideaId);

    if (!removedIdea) {
      return;
    }

    try {
      await deleteIdea(ideaId);
      setPendingDelete(null);
      toast.success("Ideia apagada com sucesso.", {
        action: {
          label: "Desfazer",
          onClick: () => {
            void createIdea(removedIdea).catch((error) => {
              console.error("Failed to restore idea", error);
              toast.error("Não foi possível restaurar a ideia.");
            });
          },
        },
      });
    } catch (error) {
      console.error("Failed to delete idea", error);
      toast.error("Não foi possível apagar a ideia no Supabase.");
    }
  };

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Pipeline"
        title="Banco de ideias pronto para produção"
        description="Temas, roteiros e responsáveis ficam organizados para a operação girar com mais velocidade e menos retrabalho."
        actions={
          <ActionButton onClick={openCreateModal} dataCy="idea-create-open">
            <Plus className="h-4 w-4" />
            Nova Ideia
          </ActionButton>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {[
          { label: "Todas", value: "all" as const },
          ...ideaStatuses.map((status) => ({ label: status, value: status })),
        ].map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setIdeaFilter(option.value)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              ideaFilter === option.value
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                : "border border-border/60 bg-background text-muted-foreground hover:border-primary/20 hover:text-foreground"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {visibleItems.length > 0 ? visibleItems.map((idea, index) => {
          const member = teamMembers.find((item) => item.id === idea.responsibleId)!;
          const panelBackground = isDark
            ? `linear-gradient(180deg, rgba(20,20,22,0.98), ${member.color}10)`
            : `linear-gradient(180deg, rgba(255,255,255,0.98), ${member.color}08)`;

          return (
            <GlassPanel
              key={idea.id}
              index={index + 1}
              className="group relative"
              dataCy="idea-card"
              style={{
                background: panelBackground,
                borderColor: `${member.color}22`,
                boxShadow: `0 18px 36px ${member.color}10`,
              }}
            >
              <div className="absolute right-4 top-4 z-10 flex gap-2 opacity-0 transition group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => openEditIdea(idea)}
                  data-cy={`idea-edit-button-${idea.id}`}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-background text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  aria-label="Editar ideia"
                >
                  <PencilLine className="h-4 w-4" />
                </button>
                <DeleteIconButton
                  dataCy="idea-delete-button"
                  onClick={() => setPendingDelete({ ideaId: idea.id, ideaTitle: idea.title })}
                />
              </div>
              <div className="flex items-start justify-between gap-4">
                <div
                  className="inline-flex h-12 w-12 items-center justify-center rounded-2xl"
                  data-cy="idea-card-lightbulb"
                  style={{
                    backgroundColor: `${member.color}12`,
                    color: member.color,
                  }}
                >
                  <Lightbulb className="h-5 w-5" />
                </div>
                <StatusBadge value={idea.status} />
              </div>

              <div className="mt-5">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-xl font-semibold text-foreground">{idea.title}</h2>
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                    {idea.category}
                </span>
              </div>
              <p className="mt-2 text-sm font-medium text-muted-foreground">{idea.theme}</p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{idea.description}</p>
              </div>

              {idea.mediaUrl ? (
                <div className="mt-5 overflow-hidden rounded-3xl border border-border/60 bg-background">
                  <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
                    <div className="flex items-center gap-2">
                      {idea.mediaKind === "video" || isVideoLike(idea.mediaUrl) ? (
                        <Video className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                      )}
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        {idea.mediaKind === "video" || isVideoLike(idea.mediaUrl) ? "Vídeo" : "Foto"}
                      </p>
                    </div>
                    {idea.mediaFileName ? (
                      <span className="truncate text-xs text-muted-foreground">{idea.mediaFileName}</span>
                    ) : null}
                  </div>
                  {idea.mediaKind === "video" || isVideoLike(idea.mediaUrl) ? (
                    <video src={idea.mediaUrl} controls className="h-52 w-full bg-black object-cover" />
                  ) : (
                    <img src={idea.mediaUrl} alt={idea.title} className="h-52 w-full object-cover" />
                  )}
                </div>
              ) : null}

              {idea.script ? (
                <div
                  className="mt-5 rounded-3xl p-4"
                  style={{ backgroundColor: isDark ? `${member.color}14` : `${member.color}08` }}
                >
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Roteiro</p>
                  <p className="mt-2 text-sm leading-6 text-foreground">{idea.script}</p>
                </div>
              ) : null}

              <div className="mt-6 border-t border-border/60 pt-5">
                <MemberChip name={member.name} role={member.role} color={member.color} src={member.avatarUrl} />
              </div>
            </GlassPanel>
          );
        }) : (
          <GlassPanel className="xl:col-span-2">
            <EmptyState
              title="Nenhuma ideia neste filtro"
              description="Troque o membro na visualização ou crie uma nova ideia compartilhada para aparecer aqui."
            />
          </GlassPanel>
        )}
      </div>

      <AnimatePresence>
        {isSparkOpen ? (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="flex flex-col items-center gap-4 rounded-[2.25rem] border border-rose-100/80 bg-white/96 px-10 py-8 shadow-[0_28px_80px_rgba(229,9,20,0.18)]"
              data-cy="idea-spark-lightbulb"
              initial={{ opacity: 0, scale: 0.82 }}
              animate={{
                opacity: 1,
                scale: [0.82, 1.04, 1],
                boxShadow: [
                  "0 0 0 rgba(229,9,20,0)",
                  "0 0 28px rgba(229,9,20,0.22)",
                  "0 0 40px rgba(229,9,20,0.36)",
                ],
              }}
              exit={{ opacity: 0, scale: 0.88 }}
              transition={{ duration: 0.32, ease: "easeOut" }}
            >
              <motion.div
                className="relative flex h-20 w-20 items-center justify-center rounded-full bg-rose-50 text-[#E50914]"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  boxShadow: "0 0 0 14px rgba(229,9,20,0.10), 0 0 48px rgba(229,9,20,0.32)",
                }}
              >
                <Lightbulb className="h-10 w-10" />
              </motion.div>
              <div className="text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-500">Ideia surgindo</p>
                <p className="mt-2 text-sm text-muted-foreground">Abrindo a criação rápida...</p>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {isCreateOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-4 backdrop-blur-sm"
          onClick={() => setIsCreateOpen(false)}
        >
          <div
            className="w-full max-w-2xl rounded-[2rem] border border-border/60 bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.18)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{editingIdeaId !== null ? "Editar ideia" : "Nova Ideia"}</p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                  {editingIdeaId !== null ? "Ajustar ideia existente" : "Criar ideia rápida"}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeIdeaModal}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground transition hover:bg-muted/80 hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
                <label className="grid gap-2">
                <span className="text-sm font-medium text-foreground">Título</span>
                <input
                  value={form.title}
                  onChange={(event) => setForm((previous) => ({ ...previous, title: event.target.value }))}
                  data-cy="idea-title-input"
                  className="rounded-full border border-border/70 bg-background px-4 py-3 text-sm outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-medium text-foreground">Responsável</span>
                <MemberDropdown
                  value={form.responsibleId}
                  onChange={(value) => setForm((previous) => ({ ...previous, responsibleId: value }))}
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-medium text-foreground">Categoria</span>
                <RoundedDropdown
                  label="Categoria"
                  value={form.category}
                  options={ideaCategories.map((category) => ({ label: category, value: category }))}
                  onChange={(value) => setForm((previous) => ({ ...previous, category: value }))}
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-medium text-foreground">Status</span>
                <RoundedDropdown
                  label="Status"
                  value={form.status}
                  options={ideaStatuses.map((status) => ({ label: status, value: status }))}
                  onChange={(value) => setForm((previous) => ({ ...previous, status: value }))}
                />
              </label>
                <label className="grid gap-2">
                <span className="text-sm font-medium text-foreground">Tema</span>
                <input
                  value={form.theme}
                  onChange={(event) => setForm((previous) => ({ ...previous, theme: event.target.value }))}
                  data-cy="idea-theme-input"
                  className="rounded-full border border-border/70 bg-background px-4 py-3 text-sm outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                />
              </label>
                <label className="grid gap-2 md:col-span-2">
                  <span className="text-sm font-medium text-foreground">Descrição</span>
                  <textarea
                    value={form.description}
                    onChange={(event) => setForm((previous) => ({ ...previous, description: event.target.value }))}
                    data-cy="idea-description-input"
                    rows={3}
                    className="rounded-[1.75rem] border border-border/70 bg-background px-4 py-3 text-sm outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                  />
                </label>
                <label className="grid gap-2 md:col-span-2">
                  <span className="text-sm font-medium text-foreground">Roteiro</span>
                  <textarea
                    value={form.script}
                    onChange={(event) => setForm((previous) => ({ ...previous, script: event.target.value }))}
                    data-cy="idea-script-input"
                    rows={4}
                    className="rounded-[1.75rem] border border-border/70 bg-background px-4 py-3 text-sm outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                  />
                </label>

                <div className="md:col-span-2 rounded-[1.75rem] border border-border/60 bg-muted/20 p-4">
                  <div className="flex items-center gap-2">
                    <Upload className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">Mídia da ideia</span>
                  </div>

                  <div className="mt-4 inline-flex rounded-full border border-border/60 bg-background p-1">
                    <button
                      type="button"
                      onClick={() => setForm((previous) => ({ ...previous, mediaSource: "url" }))}
                      className={`rounded-full px-3 py-2 text-xs font-semibold transition ${form.mediaSource === "url" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                    >
                      <span className="inline-flex items-center gap-2">
                        <Link2 className="h-3.5 w-3.5" />
                        URL
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm((previous) => ({ ...previous, mediaSource: "upload" }))}
                      className={`rounded-full px-3 py-2 text-xs font-semibold transition ${form.mediaSource === "upload" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                    >
                      <span className="inline-flex items-center gap-2">
                        <Upload className="h-3.5 w-3.5" />
                        Upload
                      </span>
                    </button>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label className="grid gap-2">
                      <span className="text-sm font-medium text-foreground">Tipo de mídia</span>
                      <RoundedDropdown
                        label="Tipo de mídia"
                        value={form.mediaKind}
                        options={[
                          { label: "Foto", value: "photo" },
                          { label: "Vídeo", value: "video" },
                        ]}
                        onChange={(value) => setForm((previous) => ({ ...previous, mediaKind: value }))}
                      />
                    </label>

                    {form.mediaSource === "url" ? (
                      <label className="grid gap-2">
                        <span className="text-sm font-medium text-foreground">URL da mídia</span>
                        <input
                          value={form.mediaUrl}
                          onChange={(event) => setForm((previous) => ({ ...previous, mediaUrl: event.target.value }))}
                          placeholder="https://..."
                          className="rounded-full border border-border/70 bg-background px-4 py-3 text-sm outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                        />
                      </label>
                    ) : (
                      <div className="grid gap-2">
                        <span className="text-sm font-medium text-foreground">Upload de mídia</span>
                        <input
                          ref={mediaInputRef}
                          type="file"
                          accept="image/*,video/*"
                          hidden
                          onChange={handleMediaFileChange}
                        />
                        <button
                          type="button"
                          onClick={() => mediaInputRef.current?.click()}
                          className="inline-flex items-center justify-center gap-2 rounded-full border border-border/70 bg-background px-4 py-3 text-sm font-medium text-foreground transition hover:bg-muted/70"
                        >
                          <Upload className="h-4 w-4" />
                          Selecionar arquivo
                        </button>
                        {form.mediaFileName ? (
                          <p className="text-xs text-muted-foreground">{form.mediaFileName}</p>
                        ) : null}
                      </div>
                    )}
                  </div>

                  {form.mediaUrl ? (
                    <div className="mt-4 overflow-hidden rounded-2xl border border-border/60 bg-background">
                      <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
                        {form.mediaKind === "video" || isVideoLike(form.mediaUrl) ? (
                          <Video className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        )}
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          Prévia
                        </p>
                      </div>
                      {form.mediaKind === "video" || isVideoLike(form.mediaUrl) ? (
                        <video src={form.mediaUrl} controls className="h-44 w-full bg-black object-cover" />
                      ) : (
                        <img src={form.mediaUrl} alt="Prévia da mídia" className="h-44 w-full object-cover" />
                      )}
                    </div>
                  ) : null}
                </div>
              </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <ActionButton variant="secondary" onClick={closeIdeaModal}>
                Cancelar
              </ActionButton>
              <ActionButton onClick={handleSaveIdea} dataCy="idea-save-button">
                <Plus className="h-4 w-4" />
                {editingIdeaId !== null ? "Salvar ideia" : "Criar ideia"}
              </ActionButton>
            </div>
          </div>
        </div>
      ) : null}

      {pendingDelete ? (
        <ConfirmDialog
          title="Tem certeza que deseja apagar?"
          description="Essa ação não pode ser desfeita."
          confirmLabel="Apagar"
          confirmDataCy="idea-delete-confirm"
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => { void handleDeleteIdea(pendingDelete.ideaId); }}
        />
      ) : null}
    </PageTransition>
  );
}

