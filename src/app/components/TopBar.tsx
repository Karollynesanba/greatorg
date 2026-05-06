import { NavLink } from "react-router-dom";
import {
  Calendar,
  Camera,
  CheckCircle2,
  FileText,
  History,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  MoonStar,
  Target,
  TrendingUp,
  Users,
  Search,
  SunMedium,
} from "lucide-react";
import { Avatar, cn } from "./ui";
import { useCurrentTeamMember } from "../data/profiles";
import { useThemeMode } from "../theme";

const navigation = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/meta-insights", label: "Meta Insights", icon: Target },
  { to: "/calendar", label: "Calendário", icon: Calendar },
  { to: "/insights", label: "Insights", icon: TrendingUp },
  { to: "/goals", label: "Metas", icon: CheckCircle2 },
  { to: "/stories", label: "Stories", icon: Camera },
  { to: "/ideas", label: "Ideias", icon: Lightbulb },
  { to: "/member/1", label: "Equipe", icon: Users },
  { to: "/history", label: "Histórico", icon: History },
  { to: "/reports", label: "Relatórios", icon: FileText },
];

export function TopBar({ onLogout }: { onLogout?: () => void }) {
  const { isDark, setTheme } = useThemeMode();
  const { member } = useCurrentTeamMember();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-sidebar/90 backdrop-blur-xl dark:border-white/8">
      <div className="mx-auto grid w-full max-w-[1600px] gap-3 px-4 py-3 sm:px-6 lg:px-8 xl:grid-cols-[auto,1fr,auto] xl:items-center">
        <NavLink to="/dashboard" className="flex min-w-0 items-center gap-3 rounded-full px-1 py-1 transition hover:bg-background/40">
          <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-background/80">
            <img
              src="/great-logo.png"
              alt="Great Orgânico"
              className="h-full w-full object-contain p-1.5"
            />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Great Orgânico</p>
            <p className="truncate text-sm text-muted-foreground">Plataforma operacional</p>
          </div>
        </NavLink>

        <nav className="flex items-center gap-2 overflow-x-auto pb-1 xl:justify-center xl:pb-0">
          {navigation.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition duration-200",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : "text-muted-foreground hover:bg-background/50 hover:text-foreground",
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2 xl:justify-end">
          <button
            type="button"
            className="hidden shrink-0 items-center gap-2 rounded-full border border-dashed border-border/60 bg-background/20 px-4 py-2 text-sm font-medium text-muted-foreground transition hover:border-primary/25 hover:bg-background/50 hover:text-foreground xl:inline-flex"
          >
            <Search className="h-4 w-4" />
            Tap to search
          </button>

          <button
            type="button"
            aria-label={isDark ? "Trocar para modo claro" : "Trocar para modo escuro"}
            title={isDark ? "Modo claro" : "Modo escuro"}
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-background/70 text-foreground transition hover:border-primary/30 hover:bg-card"
          >
            {isDark ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
          </button>

          {onLogout ? (
            <button
              type="button"
              onClick={onLogout}
              className="hidden items-center gap-2 rounded-full border border-border/60 bg-background/70 px-4 py-2 text-sm font-medium text-foreground transition hover:border-primary/30 hover:bg-card sm:inline-flex"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          ) : null}

          <NavLink
            to="/profile"
            aria-label="Meu Perfil"
            title="Meu Perfil"
            className="inline-flex items-center gap-3 rounded-full border border-border/60 bg-background/80 px-2.5 py-1.5 transition hover:border-primary/30 hover:bg-card"
          >
            <Avatar
              name={member?.name ?? "G"}
              color={member?.color ?? "rgb(var(--primary) / 1)"}
              src={member?.avatarUrl}
              size="sm"
            />
            <div className="hidden min-w-0 lg:block">
              <p className="truncate text-sm font-semibold text-foreground">{member?.name ?? "Meu perfil"}</p>
              <p className="truncate text-xs text-muted-foreground">{member?.role ?? "Abrir perfil"}</p>
            </div>
          </NavLink>
        </div>
      </div>
    </header>
  );
}
