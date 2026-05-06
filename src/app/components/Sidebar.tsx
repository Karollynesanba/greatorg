import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Calendar,
  Camera,
  CheckCircle2,
  FileText,
  History,
  LayoutDashboard,
  Lightbulb,
  MoonStar,
  PanelLeft,
  SunMedium,
  Target,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { cn } from "./ui";
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

export function Sidebar({ onLogout }: { onLogout?: () => void }) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const { isDark, setTheme } = useThemeMode();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-40 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border/70 bg-card/90 text-foreground shadow-[var(--shadow-card)] backdrop-blur xl:hidden"
      >
        <PanelLeft className="h-5 w-5" />
      </button>

      {open ? (
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm xl:hidden"
          aria-label="Fechar menu"
        />
      ) : null}

      <aside
        className={cn(
          "fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-border/60 bg-sidebar/90 p-4 backdrop-blur-xl transition-transform duration-300 xl:z-0 xl:static xl:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="mb-5 flex items-center gap-3 rounded-[1.75rem] border border-border/60 bg-background/80 px-3 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.05)] dark:border-white/8 dark:bg-card/80">
          <div className="inline-flex h-12 w-12 items-center justify-center overflow-hidden rounded-[1.25rem] bg-background">
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
        </div>

        <div className="mb-6 flex items-center justify-end xl:hidden">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-muted text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-1">
          {navigation.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition duration-200",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-1 rounded-3xl border border-border/60 bg-card-strong/90 p-3 shadow-[0_12px_30px_rgba(15,23,42,0.04)] dark:border-white/8 dark:bg-card-strong/96 dark:shadow-[0_12px_30px_rgba(0,0,0,0.24)]">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTheme(isDark ? "light" : "dark")}
              aria-label={isDark ? "Trocar para modo claro" : "Trocar para modo escuro"}
              title={isDark ? "Modo claro" : "Modo escuro"}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border/50 bg-muted/35 text-foreground transition hover:bg-muted/50 dark:border-white/5 dark:bg-white/5 dark:hover:bg-white/10"
            >
              {isDark ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
            </button>
            {onLogout ? (
              <button
                type="button"
                onClick={onLogout}
                className="flex flex-1 items-center justify-center rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary transition hover:bg-primary/10"
              >
                Sair
              </button>
            ) : null}
          </div>
        </div>
      </aside>
    </>
  );
}
