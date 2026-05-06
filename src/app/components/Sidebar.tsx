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
  LogOut,
  PanelLeft,
  Settings,
  Target,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { cn } from "./ui";

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
          "fixed left-0 top-0 z-40 flex h-screen w-[280px] flex-col border-r border-border/60 bg-sidebar/90 px-5 py-6 backdrop-blur-xl transition-transform duration-300 xl:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="mb-10 flex items-center px-1 pt-1">
          <div className="inline-flex h-16 w-[210px] items-center justify-start overflow-hidden">
            <img
              src="/great-logo.svg"
              alt="Great Orgânico"
              className="h-full w-full object-contain object-left"
            />
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

        <nav className="flex-1 space-y-2">
          {navigation.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-4 rounded-full px-5 py-3.5 text-[15px] font-medium transition duration-200",
                  isActive
                    ? "bg-[#d90404] text-white shadow-[0_14px_28px_rgba(217,4,4,0.22)]"
                    : "text-slate-700 hover:bg-black/5 hover:text-slate-900 dark:text-muted-foreground dark:hover:bg-white/6 dark:hover:text-foreground",
                )
              }
            >
              <Icon className="h-4.5 w-4.5 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-8 border-t border-border/60 pt-6 dark:border-white/10">
          <div className="space-y-2">
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-4 rounded-xl px-2 py-3 text-[15px] font-medium transition",
                  isActive
                    ? "text-foreground"
                    : "text-slate-700 hover:text-slate-900 dark:text-muted-foreground dark:hover:text-foreground",
                )
              }
            >
              <Settings className="h-4 w-4 shrink-0" />
              Configurações
            </NavLink>

            {onLogout ? (
              <button
                type="button"
                onClick={onLogout}
                className="flex w-full items-center gap-4 rounded-xl px-2 py-3 text-[15px] font-medium text-slate-700 transition hover:text-slate-900 dark:text-muted-foreground dark:hover:text-foreground"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                Sair
              </button>
            ) : null}
          </div>
        </div>
      </aside>
    </>
  );
}
