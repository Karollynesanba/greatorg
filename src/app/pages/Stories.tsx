import { useMemo, useState } from "react";
import { Film, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { storyLogs, type StoryLog } from "../data/mockData";
import { useTeamProfiles } from "../data/profiles";
import { useSupabaseSyncedListState } from "../data/supabaseSync";
import { matchesTeamScope, useTeamScope } from "../data/teamScope";
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
} from "../components/ui";

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
  const [teamScope] = useTeamScope();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState<StoryFormState>(() => emptyForm(teamMembers));

  const visibleItems = useMemo(
    () =>
      items.filter((item) => {
        const matchesMadeBy = matchesTeamScope(item.madeById, teamScope);
        const matchesPostedBy = matchesTeamScope(item.postedById, teamScope);
        return matchesMadeBy || matchesPostedBy;
      }),
    [items, teamScope],
  );

  const stats = useMemo(() => {
    const total = visibleItems.reduce((sum, item) => sum + item.quantity, 0);
    const video = visibleItems.filter((item) => item.mediaType === "video").reduce((sum, item) => sum + item.quantity, 0);
    const photo = visibleItems.filter((item) => item.mediaType === "photo").reduce((sum, item) => sum + item.quantity, 0);

    return {
      total,
      video,
      photo,
      remainingTotal: Math.max(monthlyGoals.total - total, 0),
    };
  }, [visibleItems]);

  const sortedItems = useMemo(() => {
    return [...visibleItems].sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`));
  }, [visibleItems]);

  const memberContributions = useMemo(
    () =>
      teamMembers
        .filter((member) => matchesTeamScope(member.id, teamScope))
        .map((member) => {
        const memberItems = items.filter((item) => item.madeById === member.id);
        const total = memberItems.reduce((sum, item) => sum + item.quantity, 0);
        const video = memberItems.filter((item) => item.mediaType === "video").reduce((sum, item) => sum + item.quantity, 0);
        const photo = memberItems.filter((item) => item.mediaType === "photo").reduce((sum, item) => sum + item.quantity, 0);

        return { member, total, video, photo, count: memberItems.length };
        }),
    [items, teamMembers, teamScope],
  );

  const closeModal = () => {
    setIsCreateOpen(false);
    setForm(emptyForm(teamMembers));
  };

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
    toast.success("Stories registrados.");
    closeModal();
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
        actions={
          <ActionButton onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Adicionar
          </ActionButton>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-3">
            {memberContributions.map((entry) => (
              <GlassPanel key={entry.member.id} className="p-4" style={teamScope === entry.member.id ? { borderColor: `${entry.member.color}55` } : undefined}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{entry.member.name}</p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">{entry.total}</p>
                  </div>
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-semibold text-white" style={{ backgroundColor: entry.member.color }}>
                    {entry.member.name.charAt(0)}
                  </span>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  {entry.video} vídeo(s) • {entry.photo} foto(s) • {entry.count} registro(s)
                </p>
              </GlassPanel>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <GlassPanel className="p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Meta total</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">
                {stats.total} / {monthlyGoals.total}
              </p>
              <ProgressBar value={stats.total} max={monthlyGoals.total} />
            </GlassPanel>
            <GlassPanel className="p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Vídeo</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">
                {stats.video} / {monthlyGoals.video}
              </p>
              <ProgressBar value={stats.video} max={monthlyGoals.video} />
            </GlassPanel>
            <GlassPanel className="p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Foto</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">
                {stats.photo} / {monthlyGoals.photo}
              </p>
              <ProgressBar value={stats.photo} max={monthlyGoals.photo} />
            </GlassPanel>
          </div>

          <GlassPanel className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Histórico</p>
              <h2 className="text-xl font-semibold text-foreground">Lançamentos recentes</h2>
            </div>

            <div className="space-y-3">
              {sortedItems.length > 0 ? sortedItems.map((item) => {
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
              }) : (
                <EmptyState
                  title="Nenhum story registrado"
                  description="Quando houver registros no Supabase, eles aparecem aqui de forma compartilhada."
                />
              )}
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
              <strong className="text-sm text-foreground">
                {stats.total} / {monthlyGoals.total}
              </strong>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">Vídeo</span>
              <strong className="text-sm text-foreground">
                {stats.video} / {monthlyGoals.video}
              </strong>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">Foto</span>
              <strong className="text-sm text-foreground">
                {stats.photo} / {monthlyGoals.photo}
              </strong>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-background p-4">
            <p className="text-sm text-muted-foreground">Faltam</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{stats.remainingTotal} stories</p>
          </div>
        </GlassPanel>
      </div>

      {isCreateOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-md"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-4xl overflow-hidden rounded-[2rem] border border-border/60 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.22)] dark:border-white/8 dark:bg-card/98"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-border/60 p-5 sm:p-6">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Novo registro</p>
                <h3 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">Adicionar stories do dia</h3>
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
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-foreground">Hora</span>
                    <RoundedTimePicker
                      label="Hora"
                      value={form.time}
                      onChange={(value) => setForm((previous) => ({ ...previous, time: value }))}
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-foreground">Quantidade</span>
                    <input
                      type="number"
                      min="1"
                      value={form.quantity}
                      onChange={(event) => setForm((previous) => ({ ...previous, quantity: event.target.value }))}
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
                    />
                  </label>

                  <label className="grid gap-2 md:col-span-2">
                    <span className="text-sm font-medium text-foreground">Observação</span>
                    <textarea
                      value={form.notes}
                      onChange={(event) => setForm((previous) => ({ ...previous, notes: event.target.value }))}
                      rows={4}
                      placeholder="Opcional"
                      className="rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                    />
                  </label>
                </div>

                <div className="mt-5 flex justify-end">
                  <ActionButton onClick={handleSave}>
                    <Plus className="h-4 w-4" />
                    Adicionar
                  </ActionButton>
                </div>
              </div>

              <div className="border-t border-border/60 bg-muted/20 p-5 sm:p-6 lg:border-l lg:border-t-0">
                <div className="rounded-2xl border border-border/60 bg-background p-4">
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
