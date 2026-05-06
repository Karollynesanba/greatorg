import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Plus, Lightbulb, X } from "lucide-react";
import { toast } from "sonner";
import { AnimatePresence, motion } from "motion/react";
import { ideas } from "../data/mockData";
import { useTeamProfiles } from "../data/profiles";
import { useSupabaseSyncedListState } from "../data/supabaseSync";
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

type IdeaCategory = (typeof ideaCategories)[number];

type IdeaFormState = {
  title: string;
  category: IdeaCategory;
  theme: string;
  description: string;
  script: string;
  responsibleId: number;
};

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
        className="flex w-full items-center justify-between gap-3 rounded-full border border-border/70 bg-background px-4 py-3 text-sm transition hover:border-primary/25 hover:shadow-sm"
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
          className="absolute left-0 top-full z-50 mt-2 w-full rounded-[1.75rem] border border-border/70 bg-background p-2 shadow-[0_24px_60px_rgba(15,23,42,0.14)] dark:border-border/60 dark:bg-card dark:shadow-[0_24px_60px_rgba(0,0,0,0.28)]"
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
                  className="flex w-full items-center justify-between rounded-full px-4 py-3 text-left text-sm transition hover:bg-muted"
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
  const [items, setItems] = useSupabaseSyncedListState({ key: "ideas", table: "ideas", fallback: ideas });
  const [teamScope] = useTeamScope();
  const [isSparkOpen, setIsSparkOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ ideaId: number; ideaTitle: string } | null>(null);
  const sparkTimerRef = useRef<number | null>(null);
  const [form, setForm] = useState<IdeaFormState>({
    title: "",
    category: ideaCategories[0],
    theme: "",
    description: "",
    script: "",
    responsibleId: teamMembers[0].id,
  });

  const visibleItems = useMemo(
    () => items.filter((idea) => matchesTeamScope(idea.responsibleId, teamScope)),
    [items, teamScope],
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

  const handleCreateIdea = () => {
    if (!form.title.trim() || !form.category.trim() || !form.theme.trim() || !form.description.trim()) {
      toast.error("Preencha título, categoria, tema e descrição.");
      return;
    }

    setItems((previous) => [
      {
        id: Math.max(...previous.map((idea) => idea.id), 0) + 1,
        title: form.title.trim(),
        category: form.category,
        theme: form.theme.trim(),
        description: form.description.trim(),
        status: "Ideia",
        script: form.script.trim() || undefined,
        responsibleId: form.responsibleId,
      },
      ...previous,
    ]);

    setIsCreateOpen(false);
    setForm({
      title: "",
      category: ideaCategories[0],
      theme: "",
      description: "",
      script: "",
      responsibleId: teamMembers[0].id,
    });
    toast.success("Ideia criada com sucesso.");
  };

  const handleDeleteIdea = (ideaId: number) => {
    const removedIdea = items.find((idea) => idea.id === ideaId);

    if (!removedIdea) {
      return;
    }

    setItems((previous) => previous.filter((idea) => idea.id !== ideaId));
    setPendingDelete(null);
    toast.success("Ideia apagada com sucesso.", {
      action: {
        label: "Desfazer",
        onClick: () => {
          setItems((previous) => {
            if (previous.some((idea) => idea.id === removedIdea.id)) {
              return previous;
            }

            return [removedIdea, ...previous];
          });
        },
      },
    });
  };

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Pipeline"
        title="Banco de ideias pronto para produção"
        description="Temas, roteiros e responsáveis ficam organizados para a operação girar com mais velocidade e menos retrabalho."
        actions={
          <ActionButton onClick={handleOpenIdeaCreate}>
            <Plus className="h-4 w-4" />
            Nova Ideia
          </ActionButton>
        }
      />

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
              style={{
                background: panelBackground,
                borderColor: `${member.color}22`,
                boxShadow: `0 18px 36px ${member.color}10`,
              }}
            >
              <div className="absolute right-4 top-4 z-10 opacity-0 transition group-hover:opacity-100">
                <DeleteIconButton onClick={() => setPendingDelete({ ideaId: idea.id, ideaTitle: idea.title })} />
              </div>
              <div className="flex items-start justify-between gap-4">
                <div
                  className="inline-flex h-12 w-12 items-center justify-center rounded-2xl"
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
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Nova Ideia</p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Criar ideia rápida</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
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
                <span className="text-sm font-medium text-foreground">Tema</span>
                <input
                  value={form.theme}
                  onChange={(event) => setForm((previous) => ({ ...previous, theme: event.target.value }))}
                  className="rounded-full border border-border/70 bg-background px-4 py-3 text-sm outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                />
              </label>
              <label className="grid gap-2 md:col-span-2">
                <span className="text-sm font-medium text-foreground">Descrição</span>
                <textarea
                  value={form.description}
                  onChange={(event) => setForm((previous) => ({ ...previous, description: event.target.value }))}
                  rows={3}
                  className="rounded-[1.75rem] border border-border/70 bg-background px-4 py-3 text-sm outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                />
              </label>
              <label className="grid gap-2 md:col-span-2">
                <span className="text-sm font-medium text-foreground">Roteiro</span>
                <textarea
                  value={form.script}
                  onChange={(event) => setForm((previous) => ({ ...previous, script: event.target.value }))}
                  rows={4}
                  className="rounded-[1.75rem] border border-border/70 bg-background px-4 py-3 text-sm outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                />
              </label>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <ActionButton variant="secondary" onClick={() => setIsCreateOpen(false)}>
                Cancelar
              </ActionButton>
              <ActionButton onClick={handleCreateIdea}>
                <Plus className="h-4 w-4" />
                Criar ideia
              </ActionButton>
            </div>
          </div>
        </div>
      ) : null}

      {pendingDelete ? (
        <ConfirmDialog
          title="Tem certeza que deseja apagar?"
          description="Essa ação não pode ser desfeita."
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => handleDeleteIdea(pendingDelete.ideaId)}
        />
      ) : null}
    </PageTransition>
  );
}
