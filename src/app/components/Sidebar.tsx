import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { MoonStar, PanelLeft, SunMedium } from "lucide-react";
import { useTheme } from "next-themes";
import {
  Calendar,
  CheckCircle2,
  FileText,
  History,
  LayoutDashboard,
  Lightbulb,
  UserCircle2,
  Target,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { Avatar, cn } from "./ui";
import { useCurrentTeamMember } from "../data/profiles";

const navigation = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/meta-insights", label: "Meta Insights", icon: Target },
  { to: "/calendar", label: "Calendário", icon: Calendar },
  { to: "/insights", label: "Insights", icon: TrendingUp },
  { to: "/goals", label: "Metas", icon: CheckCircle2 },
  { to: "/ideas", label: "Ideias", icon: Lightbulb },
  { to: "/member/1", label: "Equipe", icon: Users },
  { to: "/history", label: "Histórico", icon: History },
  { to: "/reports", label: "Relatórios", icon: FileText },
];

export function Sidebar({ onLogout }: { onLogout?: () => void }) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const { theme, setTheme } = useTheme();
  const { member } = useCurrentTeamMember();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-40 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border/70 bg-card/90 text-foreground shadow-[var(--shadow-card)] backdrop-blur xl:hidden dark:border-white/8 dark:bg-card/96"
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
          "fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-border/60 bg-sidebar/90 p-4 backdrop-blur-xl transition-transform duration-300 xl:z-0 xl:static xl:translate-x-0 dark:border-white/8 dark:bg-sidebar/96",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="mb-6 flex items-center justify-between xl:justify-start">
          <div className="flex items-center gap-3">
            <Avatar
              name={member?.name ?? "G"}
              color={member?.color ?? "rgb(var(--primary) / 1)"}
              src={member?.avatarUrl}
              size="md"
            />
            <div>
              <p className="text-base font-semibold text-foreground">{member?.name ?? "Great Orgânico"}</p>
              <p className="text-sm text-muted-foreground">{member?.role ?? "Analytics Platform"}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-muted text-foreground xl:hidden"
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

        <div className="mb-1 rounded-3xl border border-border/60 bg-card-strong/90 p-2">
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition duration-200",
                isActive
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
              )
            }
          >
            <UserCircle2 className="h-4 w-4" />
            Meu Perfil
          </NavLink>
        </div>

        <div className="mt-1 rounded-3xl border border-border/60 bg-card-strong/90 p-4 dark:border-white/8 dark:bg-card-strong/96">
          <button
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex w-full items-center justify-between rounded-2xl bg-muted/70 px-4 py-3 text-sm font-medium text-foreground transition hover:bg-muted dark:bg-white/5 dark:hover:bg-white/10"
          >
            <span>{theme === "dark" ? "Modo claro" : "Modo escuro"}</span>
            {theme === "dark" ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
          </button>
          {onLogout ? (
            <button
              type="button"
              onClick={onLogout}
              className="mt-3 flex w-full items-center justify-center rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary transition hover:bg-primary/10"
            >
              Sair
            </button>
          ) : null}
        </div>
      </aside>
    </>
  );
}
