import { useEffect, useState } from "react";
import { Bell, CheckCheck, PencilLine, Plus, Save, Settings2, X } from "lucide-react";
import { toast } from "sonner";
import { teamMembers } from "../data/mockData";
import { ActionButton, Avatar, GlassPanel, PageHeader, PageTransition, cn } from "../components/ui";

type ProfileReminder = {
  id: number;
  title: string;
  dueDate: string;
  done: boolean;
};

type ProfilePreferences = {
  notifications: boolean;
  emailSummary: boolean;
  syncCalendar: boolean;
  compactMode: boolean;
};

const colorOptions = ["#833AB4", "#E1306C", "#FCAF45", "#F56040", "#0EA5E9", "#16A34A", "#4F46E5"];

const initialProfile = {
  name: "Usuário Administrador",
  role: "Gerente de Conteúdo • Great Orgânico",
  email: "admin@great.com",
  cargo: "Gerente",
  team: "3 membros",
  avatar: "U",
};

const initialReminders: ProfileReminder[] = [
  { id: 1, title: "Aprovar posts da semana", dueDate: "29/04/2026", done: false },
  { id: 2, title: "Revisar metas mensais", dueDate: "30/04/2026", done: false },
  { id: 3, title: "Atualizar calendário de maio", dueDate: "28/04/2026", done: true },
];

const initialPreferences: ProfilePreferences = {
  notifications: true,
  emailSummary: false,
  syncCalendar: true,
  compactMode: false,
};

function ToggleRow({
  title,
  description,
  enabled,
  onToggle,
}: {
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-border/60 px-4 py-3">
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <button
        type="button"
        onClick={onToggle}
        className={cn("relative h-7 w-12 rounded-full transition", enabled ? "bg-primary" : "bg-muted")}
        aria-pressed={enabled}
      >
        <span
          className={cn(
            "absolute top-1 h-5 w-5 rounded-full bg-white shadow transition",
            enabled ? "left-6" : "left-1",
          )}
        />
      </button>
    </div>
  );
}

function readStoredColor() {
  if (typeof window === "undefined") {
    return "#833AB4";
  }

  return window.localStorage.getItem("profile-color") ?? "#833AB4";
}

export function MyProfilePage() {
  const [profile, setProfile] = useState(initialProfile);
  const [accentColor, setAccentColor] = useState(() => readStoredColor());
  const [reminders, setReminders] = useState(initialReminders);
  const [newReminder, setNewReminder] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState(initialProfile);
  const [preferences, setPreferences] = useState<ProfilePreferences>(initialPreferences);
  const [settingsForm, setSettingsForm] = useState({
    accentColor: readStoredColor(),
    ...initialPreferences,
  });

  useEffect(() => {
    window.localStorage.setItem("profile-color", accentColor);
  }, [accentColor]);

  useEffect(() => {
    if (isEditOpen) {
      setEditForm(profile);
    }
  }, [isEditOpen, profile]);

  useEffect(() => {
    if (isSettingsOpen) {
      setSettingsForm({
        accentColor,
        ...preferences,
      });
    }
  }, [accentColor, isSettingsOpen, preferences]);

  useEffect(() => {
    if (!isSettingsOpen && !isEditOpen) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsSettingsOpen(false);
        setIsEditOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSettingsOpen, isEditOpen]);

  const pendingCount = reminders.filter((item) => !item.done).length;
  const compact = preferences.compactMode;

  const accentPanelStyle = {
    background: `linear-gradient(180deg, rgba(255,255,255,0.98), ${accentColor}08)`,
    borderColor: `${accentColor}22`,
    boxShadow: `0 18px 36px ${accentColor}10`,
  };

  const handleAddReminder = () => {
    if (!newReminder.trim()) {
      toast.error("Digite um lembrete.");
      return;
    }

    setReminders((previous) => [
      {
        id: Math.max(...previous.map((item) => item.id), 0) + 1,
        title: newReminder.trim(),
        dueDate: new Intl.DateTimeFormat("pt-BR").format(new Date()),
        done: false,
      },
      ...previous,
    ]);
    setNewReminder("");
    toast.success("Lembrete adicionado.");
  };

  const handleSaveProfile = () => {
    setProfile(editForm);
    setIsEditOpen(false);
    toast.success("Perfil atualizado.");
  };

  const handleSaveSettings = () => {
    setAccentColor(settingsForm.accentColor);
    setPreferences({
      notifications: settingsForm.notifications,
      emailSummary: settingsForm.emailSummary,
      syncCalendar: settingsForm.syncCalendar,
      compactMode: settingsForm.compactMode,
    });
    setIsSettingsOpen(false);
    toast.success("Configurações salvas.");
  };

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Perfil"
        title="Meu Perfil"
        description="Gerencie suas informações, lembretes e as preferências da sua conta."
      />

      <div className={cn("grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px]", compact ? "gap-5" : "gap-6")}>
        <div className="space-y-6">
          <GlassPanel index={1} style={accentPanelStyle}>
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-5">
                <Avatar name={profile.avatar} color={accentColor} size="lg" />
                <div className="space-y-3">
                  <div>
                    <h2 className="text-3xl font-semibold tracking-tight text-foreground">{profile.name}</h2>
                    <p className="mt-1 text-base text-muted-foreground">{profile.role}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{profile.email}</p>
                  <div className="flex flex-wrap gap-2">
                    <ActionButton onClick={() => setIsEditOpen(true)}>
                      <PencilLine className="h-4 w-4" />
                      Editar Perfil
                    </ActionButton>
                    <ActionButton variant="secondary" onClick={() => setIsSettingsOpen(true)}>
                      <Settings2 className="h-4 w-4" />
                      Configurações
                    </ActionButton>
                  </div>
                </div>
              </div>

              <div className="rounded-[1.5rem] bg-white/75 px-6 py-5 text-center shadow-sm">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Usuário</p>
                <p className="mt-2 text-4xl font-semibold text-foreground">Administrador</p>
                <p className="mt-2 text-sm text-muted-foreground">Cor e preferências aplicadas</p>
              </div>
            </div>

            <div className={cn("mt-6 grid gap-4 md:grid-cols-2", compact ? "gap-3" : "gap-4")}>
              <div className="rounded-[1.5rem] bg-white/70 p-5">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-2xl" style={{ backgroundColor: `${accentColor}10`, color: accentColor }}>
                    <PencilLine className="h-4 w-4" />
                  </span>
                  Informações
                </div>
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Email:</span>
                    <span className="font-medium text-foreground">{profile.email}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Cargo:</span>
                    <span className="font-medium text-foreground">{profile.cargo}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Equipe:</span>
                    <span className="font-medium text-foreground">{profile.team}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-[1.5rem] bg-white/70 p-5">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-2xl" style={{ backgroundColor: `${accentColor}10`, color: accentColor }}>
                    <CheckCheck className="h-4 w-4" />
                  </span>
                  Atividade
                </div>
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Metas ativas:</span>
                    <span className="font-semibold text-foreground">6</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Posts este mês:</span>
                    <span className="font-semibold text-foreground">48</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Lembretes:</span>
                    <span className="font-semibold text-foreground">{pendingCount}</span>
                  </div>
                </div>
              </div>
            </div>
          </GlassPanel>

          <GlassPanel index={2}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Bell className="h-4 w-4" style={{ color: accentColor }} />
                  Lembretes
                </div>
                <p className="mt-1 text-sm text-muted-foreground">Acompanhe suas pendências e marque o que foi concluído.</p>
              </div>
              <span className="inline-flex rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: `${accentColor}16`, color: accentColor }}>
                {pendingCount} pendentes
              </span>
            </div>

            <div className="mt-5 flex gap-3">
              <input
                value={newReminder}
                onChange={(event) => setNewReminder(event.target.value)}
                placeholder="Adicionar lembrete..."
                className="min-w-0 flex-1 rounded-full border border-border/70 bg-background px-4 py-3 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
              />
              <button
                type="button"
                onClick={handleAddReminder}
                className="inline-flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg transition hover:scale-[1.02]"
                style={{ backgroundColor: accentColor }}
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <div className={cn("mt-5 space-y-3", compact ? "space-y-2" : "space-y-3")}>
              {reminders.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "rounded-2xl border px-4 py-3 transition",
                    item.done ? "opacity-60" : "bg-muted/35",
                  )}
                  style={{ borderColor: `${accentColor}18` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setReminders((previous) =>
                          previous.map((entry) =>
                            entry.id === item.id ? { ...entry, done: !entry.done } : entry,
                          ),
                        )
                      }
                      className="flex items-start gap-3 text-left"
                    >
                      <span
                        className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-md border"
                        style={{
                          borderColor: item.done ? accentColor : "rgb(var(--border) / 1)",
                          backgroundColor: item.done ? accentColor : "transparent",
                          color: "#fff",
                        }}
                      >
                        {item.done ? "✓" : ""}
                      </span>
                      <div>
                        <p className={cn("text-sm font-medium", item.done && "line-through")}>{item.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{item.dueDate}</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setReminders((previous) => previous.filter((entry) => entry.id !== item.id))
                      }
                      className="text-muted-foreground transition hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </GlassPanel>
        </div>

        <div className="space-y-6">
          <GlassPanel index={3}>
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Settings2 className="h-4 w-4" style={{ color: accentColor }} />
              Configurações rápidas
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Ajuste as preferências da conta sem sair da tela.
            </p>
            <div className="mt-5 space-y-3">
              <ToggleRow
                title="Notificações"
                description="Alertas no app e lembretes rápidos"
                enabled={preferences.notifications}
                onToggle={() => setPreferences((previous) => ({ ...previous, notifications: !previous.notifications }))}
              />
              <ToggleRow
                title="Resumo por e-mail"
                description="Receber panorama diário"
                enabled={preferences.emailSummary}
                onToggle={() => setPreferences((previous) => ({ ...previous, emailSummary: !previous.emailSummary }))}
              />
              <ToggleRow
                title="Sincronizar calendário"
                description="Sincroniza com o painel de calendário"
                enabled={preferences.syncCalendar}
                onToggle={() => setPreferences((previous) => ({ ...previous, syncCalendar: !previous.syncCalendar }))}
              />
              <ToggleRow
                title="Modo compacto"
                description="Ajusta a densidade das telas"
                enabled={preferences.compactMode}
                onToggle={() => setPreferences((previous) => ({ ...previous, compactMode: !previous.compactMode }))}
              />
            </div>
            <div className="mt-5 rounded-2xl bg-muted/35 px-4 py-3 text-xs text-muted-foreground">
              A cor do perfil continua disponível em <span className="font-semibold text-foreground">Configurações</span>.
            </div>
          </GlassPanel>

          <GlassPanel index={4}>
            <h3 className="text-sm font-semibold text-foreground">Equipe</h3>
            <div className="mt-4 space-y-3">
              {teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between rounded-2xl border border-border/60 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-semibold text-white"
                      style={{ backgroundColor: member.color }}
                    >
                      {member.name.charAt(0)}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-foreground">{member.name}</p>
                      <p className="text-xs text-muted-foreground">{member.role}</p>
                    </div>
                  </div>
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: member.color }} />
                </div>
              ))}
            </div>
          </GlassPanel>
        </div>
      </div>

      {isSettingsOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-4 backdrop-blur-sm"
          onClick={() => setIsSettingsOpen(false)}
        >
          <div
            className="w-full max-w-2xl rounded-[2rem] border border-border/60 bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.18)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Configurações</p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Preferências da conta</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground transition hover:bg-muted/80 hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 md:col-span-2">
                <span className="text-sm font-medium text-foreground">Cor do perfil</span>
                <div className="flex flex-wrap gap-3">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSettingsForm((previous) => ({ ...previous, accentColor: color }))}
                      className={cn(
                        "h-11 w-11 rounded-2xl border transition hover:scale-[1.02]",
                        settingsForm.accentColor === color ? "ring-2 ring-offset-2" : "",
                      )}
                      style={{
                        backgroundColor: color,
                        borderColor: settingsForm.accentColor === color ? color : `${color}66`,
                      }}
                    />
                  ))}
                </div>
                <div className="rounded-2xl bg-muted/35 px-4 py-3 text-sm text-muted-foreground">
                  Cor atual:{" "}
                  <span className="font-semibold" style={{ color: settingsForm.accentColor }}>
                    {settingsForm.accentColor}
                  </span>
                </div>
              </label>

              <ToggleRow
                title="Notificações"
                description="Receber alertas internos"
                enabled={settingsForm.notifications}
                onToggle={() =>
                  setSettingsForm((previous) => ({ ...previous, notifications: !previous.notifications }))
                }
              />
              <ToggleRow
                title="Resumo por e-mail"
                description="Receber resumo diário"
                enabled={settingsForm.emailSummary}
                onToggle={() =>
                  setSettingsForm((previous) => ({ ...previous, emailSummary: !previous.emailSummary }))
                }
              />
              <ToggleRow
                title="Sincronizar calendário"
                description="Integrar agenda do perfil"
                enabled={settingsForm.syncCalendar}
                onToggle={() =>
                  setSettingsForm((previous) => ({ ...previous, syncCalendar: !previous.syncCalendar }))
                }
              />
              <ToggleRow
                title="Modo compacto"
                description="Reduzir espaços da interface"
                enabled={settingsForm.compactMode}
                onToggle={() =>
                  setSettingsForm((previous) => ({ ...previous, compactMode: !previous.compactMode }))
                }
              />
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <ActionButton variant="secondary" onClick={() => setIsSettingsOpen(false)}>
                Cancelar
              </ActionButton>
              <ActionButton onClick={handleSaveSettings}>
                <Save className="h-4 w-4" />
                Salvar preferências
              </ActionButton>
            </div>
          </div>
        </div>
      ) : null}

      {isEditOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-4 backdrop-blur-sm"
          onClick={() => setIsEditOpen(false)}
        >
          <div
            className="w-full max-w-xl rounded-[2rem] border border-border/60 bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.18)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Editar Perfil</p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Ajustar dados do usuário</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground transition hover:bg-muted/80 hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 md:col-span-2">
                <span className="text-sm font-medium text-foreground">Nome</span>
                <input
                  value={editForm.name}
                  onChange={(event) => setEditForm((previous) => ({ ...previous, name: event.target.value }))}
                  className="rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                />
              </label>
              <label className="grid gap-2 md:col-span-2">
                <span className="text-sm font-medium text-foreground">Role</span>
                <input
                  value={editForm.role}
                  onChange={(event) => setEditForm((previous) => ({ ...previous, role: event.target.value }))}
                  className="rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                />
              </label>
              <label className="grid gap-2 md:col-span-2">
                <span className="text-sm font-medium text-foreground">Email</span>
                <input
                  value={editForm.email}
                  onChange={(event) => setEditForm((previous) => ({ ...previous, email: event.target.value }))}
                  className="rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                />
              </label>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <ActionButton variant="secondary" onClick={() => setIsEditOpen(false)}>
                Cancelar
              </ActionButton>
              <ActionButton onClick={handleSaveProfile}>
                <Save className="h-4 w-4" />
                Salvar
              </ActionButton>
            </div>
          </div>
        </div>
      ) : null}
    </PageTransition>
  );
}
