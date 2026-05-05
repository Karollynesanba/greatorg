import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, ChartColumnBig, Eye, EyeOff, LockKeyhole, Mail, PieChart, Shield } from "lucide-react";
import { toast } from "sonner";
import { cn } from "../components/ui";
import { signInAsMember } from "../auth";
import { useTeamProfiles } from "../data/profiles";

function Feature({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof CalendarDays;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white shadow-[0_16px_40px_rgba(229,9,20,0.22)]">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mt-5 text-[18px] font-medium leading-6 text-foreground">{title}</h3>
      <p className="mt-2 max-w-[180px] text-[14px] leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}

function GreatOrganicoMark({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex items-center justify-center rounded-full bg-primary font-bold text-white shadow-[0_18px_50px_rgba(229,9,20,0.24)]",
        className,
      )}
    >
      <span className="translate-y-[-0.03em] text-[2.7rem] leading-none">G</span>
    </div>
  );
}

export function LoginPage({ onLogin }: { onLogin?: () => void }) {
  const navigate = useNavigate();
  const [profiles] = useTeamProfiles();
  const [email, setEmail] = useState("brendarayssa2706@gmail.com");
  const [password, setPassword] = useState("Great2026!");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const signInMember = (memberId: number) => {
    signInAsMember(memberId);
    onLogin?.();
    navigate("/dashboard", { replace: true });
  };

  const quickAccessMembers = profiles.slice(0, 3);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    const matchedMember = profiles.find(
      (member) => member.email.toLowerCase() === email.trim().toLowerCase() && member.password === password,
    );

    if (!matchedMember) {
      toast.error("Email ou senha inválidos.");
      setLoading(false);
      return;
    }

    signInMember(matchedMember.id);
    setLoading(false);
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[#fbf7f6]">
      <div className="grid min-h-screen lg:grid-cols-[1.02fr_0.98fr]">
        <section className="relative overflow-hidden bg-[#fcf9f8] px-8 py-8 xl:px-12">
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(229,9,20,0.03),transparent_28%),radial-gradient(circle_at_72%_24%,rgba(229,9,20,0.02),transparent_22%)]" />
          </div>

          <div className="relative flex h-full flex-col">
            <div className="flex items-center gap-4">
              <GreatOrganicoMark className="h-[88px] w-[88px]" />
              <div>
                <p className="text-[3.2rem] font-semibold leading-none tracking-tight text-foreground">Great</p>
                <p className="mt-2 pl-0.5 text-[0.92rem] font-semibold uppercase tracking-[0.5em] text-primary">Orgânico</p>
              </div>
            </div>

            <div className="flex flex-1 flex-col justify-center pb-10 pt-14">
              <div className="max-w-2xl">
                <h1 className="mt-5 max-w-xl text-[3.8rem] font-semibold leading-[0.94] tracking-tight text-foreground xl:text-[4.1rem]">
                  Gestão estratégica
                  <br />
                  do <span className="text-primary">orgânico.</span>
                </h1>
                <p className="mt-6 max-w-xl text-[1.1rem] leading-[1.42] text-[#5d6168]">
                  Organize conteúdos, acompanhe metas e analise resultados em um só lugar.
                </p>
              </div>

              <div className="mt-14 grid max-w-[920px] grid-cols-2 gap-x-12 gap-y-10 xl:grid-cols-4">
                <Feature icon={CalendarDays} title="Planejamento de conteúdo" description="Estruture e organize suas ideias." />
                <Feature icon={CalendarDays} title="Calendário editorial" description="Visualize e gerencie suas publicações." />
                <Feature icon={ChartColumnBig} title="Metas e performance" description="Acompanhe resultados e alcance objetivos." />
                <Feature icon={PieChart} title="Relatórios e insights" description="Analise dados e tome decisões melhores." />
              </div>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-gradient-to-br from-[#e50914] via-[#cf0812] to-[#b00000] px-8 py-10 text-white xl:px-12">
          <div className="absolute inset-0">
            <div className="absolute left-[-13rem] top-[-8rem] h-[42rem] w-[42rem] rounded-full bg-white/10 blur-3xl" />
            <div className="absolute left-[-18rem] top-[3.8rem] h-[44rem] w-[44rem] rounded-full border border-white/12" />
            <div className="absolute left-[-16rem] top-[5.4rem] h-[40rem] w-[40rem] rounded-full bg-gradient-to-br from-white/8 to-transparent" />
            <div className="absolute left-[-10rem] top-0 h-full w-[16rem] rounded-r-[10rem] bg-gradient-to-b from-white/10 via-transparent to-transparent" />
            <div className="absolute right-0 top-0 h-[12rem] w-[18rem] rounded-bl-[180px] bg-white/12" />
            <div className="absolute right-10 top-7 grid grid-cols-10 gap-1.5 opacity-40">
              {Array.from({ length: 50 }).map((_, index) => (
                <span key={index} className="h-1 w-1 rounded-full bg-white/70" />
              ))}
            </div>
          </div>

          <div className="relative flex h-full flex-col justify-between">
            <div className="flex flex-1 items-center justify-center">
              <div className="relative">
                <div className="absolute -left-[12rem] top-[4rem] h-[38rem] w-[38rem] rounded-full border border-white/12" />
                <form
                  onSubmit={handleSubmit}
                  className="relative w-full max-w-[560px] rounded-t-[2.3rem] rounded-b-[1.15rem] bg-white px-12 py-12 text-foreground shadow-[0_42px_100px_rgba(0,0,0,0.26)]"
                >
                  <h2 className="text-[2rem] font-semibold tracking-tight text-foreground">Entrar na plataforma</h2>
                  <p className="mt-2 text-[1rem] text-[#7a7f87]">Acesse o painel Great Orgânico</p>

                  <div className="mt-6 rounded-[1.5rem] border border-[#ececec] bg-[#fafafa] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8b8f96]">Acesso rápido</p>
                        <p className="mt-1 text-sm text-[#5f6470]">Escolha um perfil e entre com um clique.</p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#7a7f87] shadow-sm">
                        {quickAccessMembers.length} contas
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      {quickAccessMembers.map((member) => (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => {
                            setEmail(member.email);
                            setPassword(member.password);
                            signInMember(member.id);
                          }}
                          className="flex flex-col items-start gap-3 rounded-2xl border border-[#e5e7eb] bg-white px-4 py-4 text-left shadow-[0_2px_8px_rgba(15,23,42,0.03)] transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_12px_30px_rgba(15,23,42,0.08)]"
                        >
                          <span
                            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl text-base font-semibold text-white"
                            style={{ backgroundColor: member.color }}
                          >
                            {member.name.charAt(0)}
                          </span>
                          <span>
                            <span className="block text-sm font-semibold text-foreground">{member.name}</span>
                            <span className="block text-xs text-[#7a7f87]">{member.role}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-8 space-y-6">
                    <label className="grid gap-2">
                      <span className="text-sm font-medium text-foreground">Email</span>
                      <div className="flex items-center gap-3 rounded-2xl border border-[#e5e7eb] bg-white px-4 py-4 shadow-[0_2px_8px_rgba(15,23,42,0.03)]">
                        <Mail className="h-4 w-4 text-[#9ca3af]" />
                        <input
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          type="email"
                          placeholder="seu@email.com"
                          className="w-full bg-transparent text-sm outline-none placeholder:text-[#9ca3af]"
                        />
                      </div>
                    </label>

                    <label className="grid gap-2">
                      <span className="text-sm font-medium text-foreground">Senha</span>
                      <div className="flex items-center gap-3 rounded-2xl border border-[#e5e7eb] bg-white px-4 py-4 shadow-[0_2px_8px_rgba(15,23,42,0.03)]">
                        <LockKeyhole className="h-4 w-4 text-[#9ca3af]" />
                        <input
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••••"
                          className="w-full bg-transparent text-sm outline-none placeholder:text-[#9ca3af]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((previous) => !previous)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#9ca3af] transition hover:bg-muted hover:text-foreground"
                          aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </label>

                    <div className="flex items-center justify-between text-sm">
                      <label className="flex items-center gap-2 text-[#7a7f87]">
                        <input type="checkbox" className="rounded border-[#d1d5db]" defaultChecked />
                        Lembrar-me
                      </label>
                      <button type="button" className="font-medium text-primary hover:underline">
                        Esqueceu a senha?
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className={cn(
                      "mt-8 inline-flex h-14 w-full items-center justify-center rounded-full bg-gradient-to-r from-[#d60b18] to-[#e52325] text-lg font-semibold text-white shadow-[0_18px_40px_rgba(220,20,25,0.38)] transition hover:brightness-105",
                      loading && "opacity-80",
                    )}
                  >
                    Entrar
                  </button>

                  <div className="mt-8 border-t border-[#e8e8e8] pt-6 text-center text-sm text-[#7a7f87]">
                    Não tem uma conta? <span className="font-medium text-primary">Solicitar acesso</span>
                  </div>
                </form>
              </div>
            </div>

            <div className="mt-8 flex justify-center gap-12 px-2 text-sm text-white/90">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5" />
                <span>Ambiente seguro e confiável</span>
              </div>
              <div className="flex items-center gap-3">
                <LockKeyhole className="h-5 w-5" />
                <span>Seus dados protegidos</span>
              </div>
              <div className="flex items-center gap-3">
                <ClockIcon />
                <span>Informações em tempo real</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function ClockIcon() {
  return (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/75 text-[10px] font-bold leading-none">
      o
    </span>
  );
}
