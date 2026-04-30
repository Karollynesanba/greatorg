import { useEffect, useState } from "react";
import { Calendar, Plus, Target, X } from "lucide-react";
import { toast } from "sonner";
import { goals, teamMembers } from "../data/mockData";
import { createStorageKey, useSharedState } from "../data/sharedState";
import {
  ActionButton,
  ConfirmDialog,
  DeleteIconButton,
  GlassPanel,
  MemberChip,
  PageHeader,
  PageTransition,
} from "../components/ui";

function GoalProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const progress = max === 0 ? 0 : (value / max) * 100;

  return (
    <div className="h-3 overflow-hidden rounded-full bg-muted/70">
      <div
        className="h-full rounded-full transition-[width] duration-700 ease-out"
        style={{
          width: `${Math.min(progress, 100)}%`,
          background: `linear-gradient(90deg, ${color} 0%, ${color}CC 100%)`,
        }}
      />
    </div>
  );
}

export function GoalsPage() {
  const [items, setItems] = useSharedState(createStorageKey("goals"), goals);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ goalId: number; goalName: string } | null>(null);
  const [form, setForm] = useState({
    name: "",
    category: "Alcance",
    description: "",
    target: "",
    current: "",
    period: "Mês",
    deadline: "",
    responsibleId: teamMembers[0].id,
  });

  useEffect(() => {
    if (!isCreateOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsCreateOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCreateOpen]);

  const handleCreateGoal = () => {
    const target = Number(form.target);
    const current = Number(form.current);

    if (!form.name.trim() || !form.description.trim() || !form.deadline.trim() || Number.isNaN(target) || Number.isNaN(current)) {
      toast.error("Preencha nome, descrição, data, meta e atual.");
      return;
    }

    setItems((previous) => [
      {
        id: Math.max(...previous.map((goal) => goal.id), 0) + 1,
        name: form.name.trim(),
        category: form.category,
        responsibleId: form.responsibleId,
        target,
        current,
        period: form.period,
        deadline: form.deadline,
        description: form.description.trim(),
      },
      ...previous,
    ]);

    setIsCreateOpen(false);
    setForm({
      name: "",
      category: "Alcance",
      description: "",
      target: "",
      current: "",
      period: "Mês",
      deadline: "",
      responsibleId: teamMembers[0].id,
    });
    toast.success("Meta criada com sucesso.");
  };

  const handleDeleteGoal = (goalId: number) => {
    const removedGoal = items.find((goal) => goal.id === goalId);

    if (!removedGoal) {
      return;
    }

    setItems((previous) => previous.filter((goal) => goal.id !== goalId));
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
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pb-8 sm:px-6 lg:px-8">
        <PageHeader
          eyebrow="Execution"
          title="Metas vivas e conectadas ao time"
          description="Cada meta reúne responsável, contexto, progresso e o status operacional para a Great agir antes do resultado final."
          actions={
            <ActionButton onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Nova Meta
            </ActionButton>
          }
        />

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {items.map((goal, index) => {
            const member = teamMembers.find((item) => item.id === goal.responsibleId)!;
            const progress = (goal.current / goal.target) * 100;
            const remaining = Math.max(goal.target - goal.current, 0);
            const statusText = progress >= 100 ? "Meta atingida" : `Faltam ${remaining.toFixed(goal.target > 100 ? 0 : 1)} para concluir`;

            return (
              <GlassPanel
                key={goal.id}
              index={index + 1}
                className="group relative h-full overflow-hidden p-5"
                style={{
                  background: "linear-gradient(180deg, rgba(255,255,255,0.99), rgba(250,250,250,0.96))",
                  borderColor: `${member.color}22`,
                  boxShadow: `0 14px 28px ${member.color}0d`,
                  borderLeftWidth: "4px",
                  borderLeftColor: member.color,
                }}
              >
                <div className="absolute right-4 top-4 z-10 opacity-0 transition group-hover:opacity-100">
                  <DeleteIconButton onClick={() => setPendingDelete({ goalId: goal.id, goalName: goal.name })} />
                </div>
                <div className="flex h-full flex-col gap-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <div
                        className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border"
                        style={{
                          backgroundColor: `${member.color}10`,
                          borderColor: `${member.color}22`,
                          color: member.color,
                        }}
                      >
                        <Target className="h-5 w-5" />
                      </div>

                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">{goal.name}</h2>
                          <span
                            className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]"
                            style={{
                              backgroundColor: `${member.color}12`,
                              color: member.color,
                            }}
                          >
                            {goal.category}
                          </span>
                        </div>
                      </div>
                    </div>

                    <MemberChip name={member.name} role={member.role} color={member.color} />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-2xl border border-border/60 bg-muted/30 px-3 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Meta</p>
                      <p className="mt-2 text-base font-semibold tracking-tight text-foreground">{goal.target}</p>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-muted/30 px-3 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Atual</p>
                      <p className="mt-2 text-base font-semibold tracking-tight text-foreground">{goal.current}</p>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-muted/30 px-3 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Progresso</p>
                      <p className="mt-2 text-base font-semibold tracking-tight text-foreground">{progress.toFixed(0)}%</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <GoalProgressBar value={goal.current} max={goal.target} color={member.color} />
                    <div className="flex items-center justify-between gap-3">
                      <span
                        className="rounded-full px-3 py-1 text-xs font-semibold"
                        style={{
                          backgroundColor: progress >= 100 ? `${member.color}12` : `${member.color}08`,
                          color: member.color,
                        }}
                      >
                        {statusText}
                      </span>
                      <span className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>{goal.period}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </GlassPanel>
            );
          })}
        </div>

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
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Nova Meta</p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Criar meta rápida</h3>
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
                  <span className="text-sm font-medium text-foreground">Nome</span>
                  <input
                    value={form.name}
                    onChange={(event) => setForm((previous) => ({ ...previous, name: event.target.value }))}
                    className="rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-foreground">Responsável</span>
                  <select
                    value={form.responsibleId}
                    onChange={(event) =>
                      setForm((previous) => ({ ...previous, responsibleId: Number(event.target.value) }))
                    }
                    className="rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                  >
                    {teamMembers.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-foreground">Categoria</span>
                  <input
                    value={form.category}
                    onChange={(event) => setForm((previous) => ({ ...previous, category: event.target.value }))}
                    className="rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-foreground">Prazo</span>
                  <input
                    value={form.deadline}
                    onChange={(event) => setForm((previous) => ({ ...previous, deadline: event.target.value }))}
                    placeholder="2026-05-15"
                    className="rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-foreground">Meta</span>
                  <input
                    value={form.target}
                    onChange={(event) => setForm((previous) => ({ ...previous, target: event.target.value }))}
                    className="rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-foreground">Atual</span>
                  <input
                    value={form.current}
                    onChange={(event) => setForm((previous) => ({ ...previous, current: event.target.value }))}
                    className="rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                  />
                </label>
                <label className="grid gap-2 md:col-span-2">
                  <span className="text-sm font-medium text-foreground">Descrição</span>
                  <textarea
                    value={form.description}
                    onChange={(event) => setForm((previous) => ({ ...previous, description: event.target.value }))}
                    rows={4}
                    className="rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                  />
                </label>
              </div>

              <div className="mt-6 flex flex-wrap justify-end gap-3">
                <ActionButton variant="secondary" onClick={() => setIsCreateOpen(false)}>
                  Cancelar
                </ActionButton>
                <ActionButton onClick={handleCreateGoal}>
                  <Plus className="h-4 w-4" />
                  Criar meta
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
            onConfirm={() => handleDeleteGoal(pendingDelete.goalId)}
          />
        ) : null}
      </div>
    </PageTransition>
  );
}
