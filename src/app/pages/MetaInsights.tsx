import { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import { apiStatus, goals, metaPeriods, teamMembers } from "../data/mockData";
import { createStorageKey, useSharedState } from "../data/sharedState";
import {
  ActionButton,
  Avatar,
  ConfirmDialog,
  DeleteIconButton,
  FilterPill,
  GlassPanel,
  PageHeader,
  PageTransition,
  ProgressBar,
  SectionTitle,
} from "../components/ui";

type GoalImages = Record<number, string[]>;

export function MetaInsightsPage() {
  const [period, setPeriod] = useState<(typeof metaPeriods)[number]>("Mês");
  const [items, setItems] = useSharedState(createStorageKey("meta-goals"), goals);
  const [goalImages, setGoalImages] = useSharedState<GoalImages>(createStorageKey("goal-images"), {});
  const [activeGoalId, setActiveGoalId] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ goalId: number; goalName: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activeGoal = useMemo(
    () => items.find((goal) => goal.id === activeGoalId) ?? null,
    [activeGoalId, items],
  );

  useEffect(() => {
    if (activeGoalId === null) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveGoalId(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeGoalId]);

  const handlePickImages = (goalId: number) => {
    setActiveGoalId(goalId);
    fileInputRef.current?.click();
  };

  const handleImageUpload = (files: FileList | null) => {
    if (!files || activeGoalId === null) {
      return;
    }

    const selectedFiles = Array.from(files).slice(0, 6);

    Promise.all(
      selectedFiles.map(
        (file) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
          }),
      ),
    )
      .then((images) => {
        setGoalImages((previous) => ({
          ...previous,
          [activeGoalId]: [...(previous[activeGoalId] ?? []), ...images].slice(0, 6),
        }));
        toast.success("Imagens da meta salvas.");
      })
      .catch(() => toast.error("Não foi possível carregar as imagens."));
  };

  const handleRemoveImage = (goalId: number, imageIndex: number) => {
    setGoalImages((previous) => ({
      ...previous,
      [goalId]: (previous[goalId] ?? []).filter((_, index) => index !== imageIndex),
    }));
  };

  const handleDeleteGoal = (goalId: number) => {
    const removedGoal = items.find((goal) => goal.id === goalId);

    if (!removedGoal) {
      return;
    }

    setItems((previous) => previous.filter((goal) => goal.id !== goalId));
    setActiveGoalId((current) => (current === goalId ? null : current));
    setPendingDelete(null);
    toast.success("Meta apagada com sucesso.", {
      action: {
        label: "Desfazer",
        onClick: () => {
          setItems((previous) => {
            if (previous.some((goal) => goal.id === removedGoal.id)) {
              return previous;
            }

            return [removedGoal, ...previous];
          });
        },
      },
    });
  };

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Goals"
        title="Meta Insights conectados à operação"
        description="Compare objetivo e resultado real para cada iniciativa e registre imagens do que foi entregue dentro de cada meta."
        actions={
          <div className="flex flex-wrap gap-2">
            {metaPeriods.map((item) => (
              <FilterPill key={item} label={item} active={period === item} onClick={() => setPeriod(item)} />
            ))}
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-2">
        {items.map((goal, index) => {
          const member = teamMembers.find((item) => item.id === goal.responsibleId)!;
          const progress = (goal.current / goal.target) * 100;
          const healthy = progress >= 100;
          const caution = progress >= 70 && progress < 100;
          const cardTint = `linear-gradient(180deg, rgba(255,255,255,0.98), ${member.color}08)`;
          const images = goalImages[goal.id] ?? [];

          return (
            <GlassPanel
              key={goal.id}
              index={index + 1}
              className="group relative"
              style={{
                background: cardTint,
                borderColor: `${member.color}22`,
                boxShadow: `0 18px 36px ${member.color}10`,
              }}
            >
              <div className="absolute right-4 top-4 z-10 opacity-0 transition group-hover:opacity-100">
                <DeleteIconButton onClick={() => setPendingDelete({ goalId: goal.id, goalName: goal.name })} />
              </div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{goal.category}</p>
                  <h2 className="mt-2 text-xl font-semibold text-foreground">{goal.name}</h2>
                </div>
                <Avatar name={member.name} color={member.color} />
              </div>

              <div className="mt-6 flex items-center gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{member.name}</p>
                  <p className="text-xs text-muted-foreground">{member.role}</p>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-muted/55 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Meta definida</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{goal.target}</p>
                </div>
                <div className="rounded-2xl bg-muted/55 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Resultado real</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{goal.current}</p>
                </div>
              </div>

              <div className="mt-6">
                <ProgressBar value={goal.current} max={goal.target} label={`${progress.toFixed(0)}% da meta`} />
              </div>

              <div
                className="mt-5 rounded-2xl px-4 py-3 text-sm font-medium"
                style={{
                  backgroundColor: healthy
                    ? `${member.color}18`
                    : caution
                      ? `${member.color}12`
                      : `${member.color}1E`,
                  color: member.color,
                }}
              >
                {healthy
                  ? "Meta superada. Vale replicar este padrão nas próximas semanas."
                  : caution
                    ? "Meta em bom ritmo, mas ainda exige ajustes finos para fechar acima do esperado."
                    : "Alerta: performance abaixo de 70%. Priorize revisão de formato, CTA ou distribuição."}
              </div>

              <div className="mt-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-foreground">Imagens da meta</p>
                  <button
                    type="button"
                    onClick={() => handlePickImages(goal.id)}
                    className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-white px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-muted"
                  >
                    <ImagePlus className="h-3.5 w-3.5" />
                    Adicionar imagem
                  </button>
                </div>

                {images.length > 0 ? (
                  <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
                    {images.map((image, imageIndex) => (
                      <div
                        key={`${goal.id}-${imageIndex}`}
                        className="group relative overflow-hidden rounded-2xl border border-border/60 bg-muted/30"
                      >
                        <img
                          src={image}
                          alt={`Meta ${goal.name} imagem ${imageIndex + 1}`}
                          className="h-28 w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(goal.id, imageIndex)}
                          className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white opacity-0 transition group-hover:opacity-100"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3 rounded-2xl border border-dashed border-border/60 bg-muted/25 p-4 text-sm text-muted-foreground">
                    Adicione imagens para registrar visualmente o que foi entregue dentro desta meta.
                  </div>
                )}
              </div>
            </GlassPanel>
          );
        })}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(event) => {
          handleImageUpload(event.target.files);
          event.target.value = "";
        }}
      />

      {activeGoal ? (
        <div className="sr-only" aria-live="polite">
          Meta ativa: {activeGoal.name}
        </div>
      ) : null}

      {pendingDelete ? (
        <ConfirmDialog
          title="Tem certeza que deseja apagar?"
          description="Essa ação não pode ser desfeita."
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => handleDeleteGoal(pendingDelete.goalId)}
        />
      ) : null}

      <GlassPanel index={7}>
        <SectionTitle
          title="Status da API Meta"
          description={`Visão do conector simulado para o período: ${period}.`}
          action={
            <ActionButton
              variant="secondary"
              onClick={() => toast.success("Dados mockados atualizados com sucesso.")}
            >
              <RefreshCw className="h-4 w-4" />
              Atualizar dados
            </ActionButton>
          }
        />
        <div className="mt-5 flex flex-col gap-4 rounded-3xl bg-muted/45 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <span className="relative inline-flex h-4 w-4">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
              <span className="relative inline-flex h-4 w-4 rounded-full bg-success" />
            </span>
            <div>
              <p className="text-base font-semibold text-foreground">
                {apiStatus.connected ? "Conectado" : "Desconectado"}
              </p>
              <p className="text-sm text-muted-foreground">Última atualização: {apiStatus.lastUpdated}</p>
            </div>
          </div>
          <p className="max-w-xl text-sm leading-6 text-muted-foreground">
            A integração está simulando a sincronização do Instagram Insights via token da Meta para demonstrar o fluxo final do produto.
          </p>
        </div>
      </GlassPanel>
    </PageTransition>
  );
}
