import { NavLink } from "react-router-dom";
import {
  MoonStar,
  Search,
  SunMedium,
} from "lucide-react";
import { Avatar } from "./ui";
import { useCurrentTeamMember } from "../data/profiles";
import { useThemeMode } from "../theme";

export function TopBar() {
  const { member } = useCurrentTeamMember();
  const { isDark, setTheme } = useThemeMode();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-sidebar/90 backdrop-blur-xl dark:border-white/8">
      <div className="mx-auto flex w-full max-w-[1600px] items-center justify-end gap-2 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex shrink-0 items-center gap-2">
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
