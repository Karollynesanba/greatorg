import { ChevronDown, MoonStar, SunMedium } from "lucide-react";
import { NavLink } from "react-router-dom";
import { Avatar, cn } from "./ui";
import { useCurrentTeamMember } from "../data/profiles";
import { useThemeMode } from "../theme";

export function TopBar() {
  const { member } = useCurrentTeamMember();
  const { isDark, setTheme } = useThemeMode();

  return (
    <header className="sticky top-0 z-40 bg-transparent print:hidden">
      <div className="flex w-full items-center justify-end gap-3 px-4 pb-2 pt-4 sm:px-6 xl:px-7">
        <div className="flex shrink-0 items-center gap-2.5">
          <button
            type="button"
            aria-label={isDark ? "Trocar para modo claro" : "Trocar para modo escuro"}
            title={isDark ? "Modo claro" : "Modo escuro"}
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className={cn(
              "inline-flex h-12 w-12 items-center justify-center rounded-full backdrop-blur-xl transition",
              isDark
                ? "border border-white/6 bg-white/5 text-white shadow-[0_10px_25px_rgba(0,0,0,0.18)] hover:bg-white/10"
                : "border border-black/5 bg-white text-slate-700 shadow-[0_10px_25px_rgba(15,23,42,0.06)] hover:bg-slate-50",
            )}
          >
            {isDark ? <SunMedium className="h-[18px] w-[18px]" /> : <MoonStar className="h-[18px] w-[18px]" />}
          </button>

          <NavLink
            to="/profile"
            aria-label="Meu Perfil"
            title="Meu Perfil"
            className={cn(
              "inline-flex items-center gap-3 rounded-full px-2.5 py-2 backdrop-blur-xl transition",
              isDark
                ? "border border-white/6 bg-white/5 text-white shadow-[0_10px_25px_rgba(0,0,0,0.18)] hover:bg-white/8"
                : "border border-black/5 bg-white text-slate-900 shadow-[0_10px_25px_rgba(15,23,42,0.08)] hover:bg-slate-50",
            )}
          >
            <Avatar
              name={member?.name ?? "G"}
              color={member?.color ?? "rgb(var(--primary) / 1)"}
              src={member?.avatarUrl}
              size="sm"
            />
            <div className="hidden min-w-0 lg:block">
              <p className={cn("truncate text-sm font-semibold", isDark ? "text-white" : "text-slate-900")}>
                {member?.name ?? "Meu perfil"}
              </p>
              <p className={cn("truncate text-xs", isDark ? "text-white/65" : "text-slate-500")}>
                {member?.role ?? "Abrir perfil"}
              </p>
            </div>
            <ChevronDown className={cn("mr-1 h-4 w-4", isDark ? "text-white/75" : "text-slate-500")} />
          </NavLink>
        </div>
      </div>
    </header>
  );
}
