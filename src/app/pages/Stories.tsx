import { useMemo, useState } from "react";
import { Film, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { storyLogs, type StoryLog } from "../data/mockData";
import { useTeamProfiles } from "../data/profiles";
import { useSupabaseSyncedListState } from "../data/supabaseSync";
import { ActionButton, GlassPanel, MemberChip, PageHeader, PageTransition, ProgressBar } from "../components/ui";

type StoryMediaType = "video" | "photo";

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

function todayKey() {
  const now = new Date();
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

function formatLabel(type: StoryMediaType) {
  return type === "video" ? "Vídeo" : "Foto";
}

function emptyForm(teamMembers: Array<{ id: number }>): StoryFormState {
  return {
    date: todayKey(),
    time: "09:00",
    quantity: "",
    mediaType: "video",
    madeById: teamMembers[0]?.id ?? 1,
    postedById: teamMembers[1]?.id ?? teamMembers[0]?.id ?? 1,
    notes: "",
  };
}

export function StoriesPage() {
  const [teamMembers] = useTeamProfiles();
  const [items, setItems] = useSupabaseSyncedListState<StoryLog>({
    key: "story-logs",
    table: "story_logs",
    fallback: storyLogs,
  });
  const [form, setForm] = useState<StoryFormState>(() => emptyForm(teamMembers));

  const stats = useMemo(() => {
    const total = items.reduce((sum, item) => sum + item.quantity, 0);
    const video = items.filter((item) => item.mediaType === "video").reduce((sum, item) => sum + item.quantity, 0);
    const photo = items.filter((item) => item.mediaType === "photo").reduce((sum, item) => sum + item.quantity, 0);

    return {
      total,
      video,
      photo,
      remainingTotal: Math.max(monthlyGoals.total - total, 0),
      remainingVideo: Math.max(monthlyGoals.video - video, 0),
      remainingPhoto: Math.max(monthlyGoals.photo - photo, 0),
    };
  }, [items]);

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const left = `${b.date}T${b.time}`;
      const right = `${a.date}T${a.time}`;
      return left.localeCompare(right);
    });
  }, [items]);

  const handleSave = () => {
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
      id: Math.max(...items.map((item) => item.id), 0) + 1,
      date: form.date,
      time: form.time,
      quantity,
      mediaType: form.mediaType,
      madeById: madeBy.id,
      postedById: postedBy.id,
      notes: form.notes.trim(),
    };

    setItems((previous) => [nextItem, ...previous]);
    setForm(emptyForm(teamMembers));
    toast.success("Stories registrados.");
  };

  const handleDelete = (storyId: number) => {
    setItems((previous) => previous.filter((item) => item.id !== storyId));
    toast.success("Registro removido.");
  };

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Conteúdo"
        title="Stories"
        description="Meta mensal: 168 stories, sendo 105 em vídeo. Registre o que foi feito por dia."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <GlassPanel className="p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Meta total</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">{stats.total} / {monthlyGoals.total}</p>
              <ProgressBar value={stats.total} max={monthlyGoals.total} />
            </GlassPanel>
            <GlassPanel className="p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Vídeo</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">{stats.video} / {monthlyGoals.video}</p>
              <ProgressBar value={stats.video} max={monthlyGoals.video} />
            </GlassPanel>
            <GlassPanel className="p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Foto</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">{stats.photo} / {monthlyGoals.photo}</p>
              <ProgressBar value={stats.photo} max={monthlyGoals.photo} />
            </GlassPanel>
          </div>

          <GlassPanel className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Novo registro</p>
                <h2 className="text-xl font-semibold text-foreground">Adicionar stories do dia</h2>
              </div>
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                {stats.remainingTotal} faltam
              </span>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-medium text-foreground">Data</span>
                <input
                  type="date"
                  value={form.date}
                  onChange={(event) => setForm((previous) => ({ ...previous, date: event.target.value }))}
                  className="rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-medium text-foreground">Hora</span>
                <input
                  type="time"
                  value={form.time}
                  onChange={(event) => setForm((previous) => ({ ...previous, time: event.target.value }))}
                  className="rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-medium text-foreground">Quantidade</span>
                <input
                  type="number"
                  min="1"
                  value={form.quantity}
                  onChange={(event) => setForm((previous) => ({ ...previous, quantity: event.target.value }))}
                  className="rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-medium text-foreground">Formato</span>
                <select
                  value={form.mediaType}
                  onChange={(event) =>
                    setForm((previous) => ({ ...previous, mediaType: event.target.value as StoryMediaType }))
                  }
                  className="rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                >
                  <option value="video">Vídeo</option>
                  <option value="photo">Foto</option>
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-medium text-foreground">Quem fez</span>
                <select
                  value={form.madeById}
                  onChange={(event) => setForm((previous) => ({ ...previous, madeById: Number(event.target.value) }))}
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
                <span className="text-sm font-medium text-foreground">Quem postou</span>
                <select
                  value={form.postedById}
                  onChange={(event) => setForm((previous) => ({ ...previous, postedById: Number(event.target.value) }))}
                  className="rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                >
                  {teamMembers.map((member) => (
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
                  rows={3}
                  placeholder="Opcional"
                  className="rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                />
              </label>
            </div>

            <div className="flex justify-end">
              <ActionButton onClick={handleSave}>
                <Plus className="h-4 w-4" />
                Adicionar
              </ActionButton>
            </div>
          </GlassPanel>

          <GlassPanel className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Histórico</p>
              <h2 className="text-xl font-semibold text-foreground">Lançamentos recentes</h2>
            </div>

            <div className="space-y-3">
              {sortedItems.map((item) => {
                const madeBy = teamMembers.find((member) => member.id === item.madeById);
                const postedBy = teamMembers.find((member) => member.id === item.postedById);
                return (
                  <div key={item.id} className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                            {formatLabel(item.mediaType)}
                          </span>
                          <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                            {formatDate(item.date)} · {item.time}
                          </span>
                          <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                            {item.quantity} stories
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{item.notes || "Sem observação"}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        aria-label="Remover registro"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {madeBy ? <MemberChip name={madeBy.name} role={madeBy.role} color={madeBy.color} src={madeBy.avatarUrl} /> : null}
                      {postedBy ? <MemberChip name={postedBy.name} role={postedBy.role} color={postedBy.color} src={postedBy.avatarUrl} /> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassPanel>
        </div>

        <GlassPanel className="space-y-4 self-start">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Film className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Resumo</p>
              <h2 className="text-xl font-semibold text-foreground">Meta do mês</h2>
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-border/60 bg-muted/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">Total</span>
              <strong className="text-sm text-foreground">{stats.total} / {monthlyGoals.total}</strong>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">Vídeo</span>
              <strong className="text-sm text-foreground">{stats.video} / {monthlyGoals.video}</strong>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">Foto</span>
              <strong className="text-sm text-foreground">{stats.photo} / {monthlyGoals.photo}</strong>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-background p-4">
            <p className="text-sm text-muted-foreground">Faltam</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{stats.remainingTotal} stories</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {stats.remainingVideo} em vídeo e {stats.remainingPhoto} em foto
            </p>
          </div>
        </GlassPanel>
      </div>
    </PageTransition>
  );
}
