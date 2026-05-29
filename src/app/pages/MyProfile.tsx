import { useEffect, useRef, useState } from "react";
import { PencilLine, Save, Upload, Users, X } from "lucide-react";
import { toast } from "sonner";
import { Avatar, ActionButton, GlassPanel, PageHeader, PageTransition, SectionTitle, cn } from "../components/ui";
import { updateDemoAccountPassword } from "../auth";
import { useCurrentTeamMember, useTeamProfiles, type EditableTeamMember } from "../data/profiles";
import { useThemeMode } from "../theme";

type ProfileEditForm = Omit<EditableTeamMember, "password"> & {
  password: string;
};

function omitPassword<T extends { password: string }>(profile: T) {
  const { password, ...rest } = profile;
  void password;
  return rest;
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  readOnly,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  readOnly?: boolean;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        placeholder={placeholder}
        readOnly={readOnly}
        className="rounded-2xl border border-border/70 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/10 dark:bg-white/5"
      />
    </label>
  );
}

export function MyProfilePage() {
  const { isDark } = useThemeMode();
  const { member, updateMember } = useCurrentTeamMember();
  const [profiles] = useTeamProfiles();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [editForm, setEditForm] = useState<ProfileEditForm | null>(null);

  useEffect(() => {
    if (!isEditOpen || !member) {
      return;
    }

    setEditForm({
      ...member,
      password: "",
    });
  }, [isEditOpen, member]);

  useEffect(() => {
    if (!isEditOpen) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsEditOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isEditOpen]);

  useEffect(() => {
    if (!isPreviewOpen) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsPreviewOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPreviewOpen]);

  const memberCount = profiles.length;
  const color = member?.color ?? "rgb(var(--primary) / 1)";
  const surfaceClass = isDark
    ? "rounded-2xl border border-border/60 bg-[#171c25] shadow-[0_8px_24px_rgba(15,23,42,0.12)]"
    : "rounded-2xl border border-border/60 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]";
  const surfaceMutedClass = isDark
    ? "rounded-[1.5rem] border border-border/60 bg-[#171c25] shadow-[0_10px_24px_rgba(15,23,42,0.12)]"
    : "rounded-[1.5rem] border border-border/60 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.04)]";
  if (!member) {
    return (
      <PageTransition>
        <PageHeader
          eyebrow="Perfil"
          title="Meu Perfil"
          description="Não foi possível carregar o perfil atual."
        />
      </PageTransition>
    );
  }

  const saveProfile = async () => {
    if (!editForm) {
      return;
    }

    if (!editForm.name.trim() || !editForm.email.trim() || !editForm.role.trim()) {
      toast.error("Preencha nome, login e função.");
      return;
    }

    const nextProfile = omitPassword({
      ...editForm,
      avatar: editForm.name.charAt(0).toUpperCase(),
    });

    try {
      if (editForm.password.trim()) {
        await updateDemoAccountPassword(member.userId, editForm.password.trim());
      }

      updateMember(member.id, (current) => ({
        ...current,
        ...nextProfile,
      }));

      setIsEditOpen(false);
      toast.success("Perfil atualizado em todo o app.");
    } catch {
      toast.error("Não foi possível atualizar a senha agora.");
    }
  };

  const detailItems = [
    { label: "Login", value: member.email },
    { label: "Senha", value: "" },
    { label: "Função", value: member.role },
    { label: "Especialidade", value: member.specialty },
    { label: "Cor", value: member.color },
    { label: "Equipe", value: `${memberCount} perfis` },
  ];

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Perfil"
        title="Meu Perfil"
        description="Edite login, senha, foto, cor e função. Tudo o que mudar aqui reaparece nas demais telas do sistema."
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_0.8fr]">
        <div className="space-y-6">
          <GlassPanel
            index={1}
            style={{
              background: isDark
                ? "linear-gradient(180deg, rgba(19,23,31,0.96), rgba(12,15,21,0.98))"
                : "linear-gradient(180deg, rgba(255,255,255,0.99), rgba(255,255,255,0.97))",
              border: "none",
              boxShadow: "none",
            }}
          >
            <div className="flex flex-col gap-6">
              <div className="flex items-start gap-5">
                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(true)}
                  data-cy="profile-avatar-preview"
                  className="group relative inline-flex shrink-0 cursor-zoom-in items-center justify-center rounded-3xl outline-none transition hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-primary/30"
                  aria-label="Ampliar foto de perfil"
                  title="Ampliar foto de perfil"
                >
                  <Avatar name={member.name} color={member.color} src={member.avatarUrl} size="lg" />
                </button>
                <div className="space-y-3">
                  <div>
                    <h2 data-cy="profile-name" className="text-3xl font-semibold tracking-tight text-foreground">{member.name}</h2>
                    <p className="mt-1 text-base text-muted-foreground">{member.role}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{member.specialty}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <ActionButton dataCy="profile-edit-open" onClick={() => setIsEditOpen(true)}>
                      <PencilLine className="h-4 w-4" />
                      Editar perfil
                    </ActionButton>
                    <ActionButton variant="secondary" onClick={() => fileInputRef.current?.click()}>
                      <Upload className="h-4 w-4" />
                      Trocar foto
                    </ActionButton>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={async (event) => {
                      const file = event.target.files?.[0] ?? null;
                      if (!file) {
                        return;
                      }

                      const avatarUrl = await readFileAsDataUrl(file);
                      updateMember(member.id, (current) => ({
                        ...current,
                        avatarUrl,
                        avatar: current.name.charAt(0).toUpperCase(),
                      }));
                      event.target.value = "";
                      toast.success("Foto de perfil atualizada.");
                    }}
                  />
                </div>
              </div>

            </div>

            <div className="mt-6">
              <div className="grid gap-4 md:grid-cols-2">
                {detailItems.map((item) => (
                  <div key={item.label} className={`${surfaceClass} p-4`}>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{item.label}</p>
                    <p className="mt-2 text-base font-semibold text-foreground">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </GlassPanel>

          <GlassPanel index={2}>
            <SectionTitle
              title="Resumo da conta"
              description="Informações que aparecem nas telas do sistema e nos cards da equipe."
            />
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className={`${surfaceClass} p-4`}>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">ID do perfil</p>
                <p className="mt-2 text-lg font-semibold text-foreground">{member.id}</p>
              </div>
              <div className={`${surfaceClass} p-4`}>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Avatar</p>
                <p className="mt-2 text-lg font-semibold text-foreground">{member.avatarUrl ? "Foto personalizada" : "Inicial"}</p>
              </div>
              <div className={`${surfaceClass} p-4`}>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Cor principal</p>
                <div className="mt-3 flex items-center gap-3">
                  <span className="h-8 w-8 rounded-2xl border border-border/60" style={{ backgroundColor: member.color }} />
                  <p className="text-lg font-semibold text-foreground">{member.color}</p>
                </div>
              </div>
              <div className={`${surfaceClass} p-4`}>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Função</p>
                <p className="mt-2 text-lg font-semibold text-foreground">{member.role}</p>
              </div>
            </div>
          </GlassPanel>
        </div>

        <div className="space-y-6">
          <GlassPanel index={3}>
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Users className="h-4 w-4" style={{ color }} />
              Dados do perfil
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              O login, a senha, a foto e a identidade visual deste perfil são compartilhados com as outras páginas.
            </p>

            <div className="mt-5 space-y-3">
              <div className={`${surfaceClass} p-4`}>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Login</p>
                <p className="mt-2 text-sm font-semibold text-foreground">{member.email}</p>
              </div>
              <div className={`${surfaceClass} p-4`}>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Senha</p>
                <p className="mt-2 text-sm font-semibold text-foreground"></p>
              </div>
              <div className={`${surfaceClass} p-4`}>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Especialidade</p>
                <p className="mt-2 text-sm font-semibold text-foreground">{member.specialty}</p>
              </div>
            </div>
          </GlassPanel>

          <GlassPanel index={4}>
            <h3 className="text-sm font-semibold text-foreground">Equipe</h3>
            <div className="mt-4 space-y-3">
              {profiles.map((profile) => (
                <div
                  key={profile.id}
                  className={cn(
                    "flex items-center justify-between rounded-2xl border border-border/60 px-4 py-3 transition",
                    profile.id === member.id ? "bg-primary/8" : isDark ? "bg-[#171c25]" : "bg-white",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={profile.name} color={profile.color} src={profile.avatarUrl} size="sm" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{profile.name}</p>
                      <p className="text-xs text-muted-foreground">{profile.role}</p>
                    </div>
                  </div>
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: profile.color }} />
                </div>
              ))}
            </div>
          </GlassPanel>
        </div>
      </div>

      {isEditOpen && editForm ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
          onClick={() => setIsEditOpen(false)}
        >
          <div
            className={`w-full max-w-2xl ${surfaceMutedClass} p-6`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Editar perfil</p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Alterar dados do usuário</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-muted-foreground transition hover:bg-muted/80 hover:text-foreground dark:bg-[#171c25]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Field label="Nome" value={editForm.name} onChange={(value) => setEditForm((previous) => previous ? { ...previous, name: value } : previous)} />
              </div>
              <div className="md:col-span-2">
                <Field label="Foto de perfil (URL)" value={editForm.avatarUrl} onChange={(value) => setEditForm((previous) => previous ? { ...previous, avatarUrl: value } : previous)} placeholder="Cole uma URL ou envie uma foto" />
              </div>
              <Field label="Login" value={editForm.email} onChange={() => undefined} type="email" readOnly />
              <Field label="Senha" value={editForm.password} onChange={(value) => setEditForm((previous) => previous ? { ...previous, password: value } : previous)} type="password" />
              <Field label="Função" value={editForm.role} onChange={(value) => setEditForm((previous) => previous ? { ...previous, role: value } : previous)} />
              <Field label="Especialidade" value={editForm.specialty} onChange={(value) => setEditForm((previous) => previous ? { ...previous, specialty: value } : previous)} />
              <label className="grid gap-2">
                <span className="text-sm font-medium text-foreground">Cor principal</span>
                <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-white px-4 py-3 dark:bg-white/5">
                  <input
                    type="color"
                    value={editForm.color}
                    onChange={(event) => setEditForm((previous) => previous ? { ...previous, color: event.target.value } : previous)}
                    className="h-10 w-10 rounded-xl border border-border/60 bg-transparent p-1"
                  />
                  <span className="text-sm text-muted-foreground">{editForm.color}</span>
                </div>
              </label>
              <div className={`md:col-span-2 rounded-2xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground ${isDark ? "bg-[#151b24]" : "bg-white"}`}>
                Alterações nesta tela são persistidas localmente e aparecem no perfil, no sidebar e nos cards da equipe.
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <ActionButton variant="secondary" onClick={() => setIsEditOpen(false)}>
                Cancelar
              </ActionButton>
              <ActionButton onClick={saveProfile}>
                <Save className="h-4 w-4" />
                Salvar alterações
              </ActionButton>
            </div>
          </div>
        </div>
      ) : null}

      {isPreviewOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-md"
          onClick={() => setIsPreviewOpen(false)}
        >
          <div
            className={`w-full max-w-xl overflow-hidden ${surfaceMutedClass} p-5`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Foto de perfil</p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{member.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground transition hover:bg-muted/80 hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className={`mt-5 flex items-center justify-center rounded-[1.75rem] border border-border/60 p-5 ${isDark ? "bg-[#151b24]" : "bg-white shadow-[0_10px_24px_rgba(15,23,42,0.04)]"}`}>
              {member.avatarUrl ? (
                <img
                  src={member.avatarUrl}
                  alt={member.name}
                  className="max-h-[70vh] w-full max-w-[420px] rounded-[1.5rem] object-cover shadow-[0_24px_60px_rgba(15,23,42,0.18)]"
                />
              ) : (
                <div
                  className="flex h-[420px] w-full max-w-[420px] items-center justify-center rounded-[1.5rem] text-7xl font-semibold text-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]"
                  style={{ backgroundColor: member.color }}
                >
                  {member.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </PageTransition>
  );
}
