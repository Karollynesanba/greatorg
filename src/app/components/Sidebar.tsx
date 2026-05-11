import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Calendar,
  Camera,
  CheckCircle2,
  ClipboardList,
  FileText,
  History,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  PanelLeft,
  Settings,
  Target,
  Users,
  X,
} from "lucide-react";
import { cn } from "./ui";
import { useThemeMode } from "../theme";

const navigation = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/meta-insights", label: "Meta Insights", icon: Target },
  { to: "/calendar", label: "CalendÃ¡rio", icon: Calendar },
  { to: "/goals", label: "Metas", icon: CheckCircle2 },
  { to: "/stories", label: "Stories", icon: Camera },
  { to: "/ideas", label: "Ideias", icon: Lightbulb },
  { to: "/team", label: "Equipe", icon: Users },
  { to: "/history", label: "HistÃ³rico", icon: History },
  { to: "/reports", label: "RelatÃ³rios", icon: FileText },
  { to: "/checklist", label: "Checklist", icon: ClipboardList },
];

export function Sidebar({ onLogout }: { onLogout?: () => void }) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const { isDark } = useThemeMode();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "fixed left-4 top-4 z-40 inline-flex h-11 w-11 items-center justify-center rounded-2xl backdrop-blur-xl xl:hidden",
          isDark
            ? "border border-white/8 bg-white/5 text-foreground shadow-[0_10px_30px_rgba(0,0,0,0.18)]"
            : "border border-black/5 bg-white text-foreground shadow-[0_12px_32px_rgba(15,23,42,0.08)]",
        )}
      >
        <PanelLeft className="h-5 w-5" />
      </button>

      {open ? (
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-black/45 backdrop-blur-sm xl:hidden"
          aria-label="Fechar menu"
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[300px] -translate-x-full flex-col px-5 py-6 transition-transform duration-300 xl:left-0 xl:top-0 xl:bottom-0 xl:flex xl:w-[286px] xl:translate-x-0 xl:rounded-none",
          "bg-transparent shadow-none backdrop-blur-0 border-r-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="mb-10 flex items-center px-1 pt-1">
          <div className="flex items-center gap-3">
            <img
              src="/logo-great.png"
              alt="Great Orgânico"
              className="h-12 w-12 shrink-0 object-contain"
            />

            <div className="flex min-w-0 flex-col justify-center leading-none">
              <span className={cn("text-[22px] font-black tracking-[0.18em]", isDark ? "text-white" : "text-black")}>GREAT</span>
              <span className={cn("mt-1 text-[13px] font-semibold tracking-[0.22em]", isDark ? "text-white/78" : "text-slate-600")}>
                ORGÂNICO
              </span>
            </div>
          </div>
        </div>

        <div className="mb-6 flex items-center justify-end xl:hidden">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className={cn(
              "inline-flex h-10 w-10 items-center justify-center rounded-2xl",
              isDark ? "border border-white/8 bg-white/6 text-foreground" : "border border-black/5 bg-white text-foreground",
            )}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-2.5">
          {navigation.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex h-12 w-full items-center gap-4 rounded-full border px-4 text-[15px] font-medium transition duration-200",
                  isActive
                    ? "border-primary bg-primary text-white shadow-[0_18px_40px_rgba(229,20,20,0.28)]"
                    : isDark
                      ? "border-transparent text-slate-300/90 hover:bg-primary/10 hover:text-white"
                      : "border-transparent text-slate-600 hover:bg-primary/8 hover:text-primary",
                )
              }
            >
              <Icon className="h-[17px] w-[17px] shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto space-y-3 pb-2 pt-10">
          <div className="space-y-3">
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-4 rounded-full border px-4 py-3 text-[15px] font-medium transition",
                  isActive
                    ? "border-primary bg-primary text-white shadow-[0_18px_40px_rgba(229,20,20,0.28)]"
                    : isDark
                      ? "border-transparent text-slate-300/90 hover:bg-primary/10 hover:text-white"
                      : "border-transparent text-slate-600 hover:bg-primary/8 hover:text-primary",
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
                className={cn(
                  "flex w-full items-center gap-4 rounded-full border px-4 py-3 text-[15px] font-medium transition",
                  isDark
                    ? "border-transparent text-slate-300/90 hover:bg-primary/10 hover:text-white"
                    : "border-transparent text-slate-600 hover:bg-primary/8 hover:text-primary",
                )}
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
