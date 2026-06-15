import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useEffect, useRef } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { CalendarPage } from "./pages/Calendar";
import { DashboardPage } from "./pages/Dashboard";
import { GoalsPage } from "./pages/Goals";
import { HistoryPage } from "./pages/History";
import { ContentPage } from "./pages/Content";
import { IdeasPage } from "./pages/Ideas";
import { MetaInsightsPage } from "./pages/MetaInsights";
import { MyProfilePage } from "./pages/MyProfile";
import { LoginPage } from "./pages/Login";
import { PostDetailPage } from "./pages/PostDetail";
import { ReportsPage } from "./pages/Reports";
import { SettingsPage } from "./pages/Settings";
import { StoriesPage } from "./pages/Stories";
import { signOut, useAuthSession } from "./auth";
import { getBrazilMonthKey } from "./data/brazilDate";
import { createStorageKey } from "./data/sharedState";
import { supabase } from "./data/supabase";
import { useSupabaseSharedState } from "./data/supabaseSync";
import { ThemeModeProvider, useThemeMode } from "./theme";

export default function App() {
  const { session, ready } = useAuthSession();
  const authenticated = Boolean(session);

  useEffect(() => {
    console.info("[Init] App started", {
      authenticatedAtBoot: authenticated,
      supabaseConfigured: Boolean(supabase),
    });
  }, [authenticated]);

  if (!ready) {
    return (
      <ThemeModeProvider>
        <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,rgb(252,253,255)_0%,rgb(247,248,250)_100%)] px-6 text-slate-900">
          <div className="max-w-md rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-500">Inicializando</p>
            <h1 className="mt-3 text-2xl font-semibold">Validando acesso ao Supabase</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              A plataforma está confirmando sua sessão real antes de liberar o CRUD compartilhado.
            </p>
          </div>
        </div>
      </ThemeModeProvider>
    );
  }

  return (
    <ThemeModeProvider>
      <DndProvider backend={HTML5Backend}>
        <BrowserRouter>
          {authenticated ? (
            <AppShell
              onLogout={async () => {
                await signOut();
              }}
            />
          ) : (
            <Routes>
              <Route
                path="/login"
                element={
                  <LoginPage
                    onLogin={() => {
                      console.info("[Init] Login completed, waiting for Supabase session confirmation");
                    }}
                  />
                }
              />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          )}
        </BrowserRouter>
        <AppToaster />
      </DndProvider>
    </ThemeModeProvider>
  );
}

function AppShell({ onLogout }: { onLogout: () => void }) {
  const { isDark } = useThemeMode();

  useEffect(() => {
    console.info("[Init] App shell rendered");
  }, []);

  return (
    <div
      className="flex min-h-screen w-full overflow-x-hidden text-foreground"
      style={{
        background: isDark
          ? "radial-gradient(circle at 12% 12%, rgba(131,58,180,0.09), transparent 22%), radial-gradient(circle at 88% 8%, rgba(225,48,108,0.08), transparent 18%), linear-gradient(180deg, rgb(8,10,15) 0%, rgb(10,13,19) 100%)"
          : "linear-gradient(180deg, rgb(252,253,255) 0%, rgb(247,248,250) 100%)",
      }}
    >
      <MonthlyCycleManager />
      <Sidebar onLogout={onLogout} />
      <div className="flex min-h-screen w-full flex-col xl:pl-[304px] xl:pr-5 xl:py-5">
        <div
          className="flex min-h-screen flex-1 flex-col overflow-hidden xl:min-h-0 xl:rounded-[36px]"
          style={{
            background: isDark
              ? "linear-gradient(180deg, rgba(15,18,25,0.96) 0%, rgba(11,14,20,0.98) 100%)"
              : "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(255,255,255,0.96) 100%)",
            boxShadow: isDark ? "0 30px 90px rgba(0,0,0,0.42)" : "0 18px 50px rgba(16,24,40,0.06)",
            border: isDark ? "1px solid rgba(255,255,255,0.05)" : "1px solid rgba(255,255,255,0.9)",
          }}
        >
          <TopBar />
          <main className="relative min-h-0 flex-1 p-4 sm:p-6 xl:p-7" tabIndex={0}>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/login" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/meta-insights" element={<MetaInsightsPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/post/:id" element={<PostDetailPage />} />
              <Route path="/goals" element={<GoalsPage />} />
              <Route path="/content" element={<ContentPage />} />
              <Route path="/stories" element={<StoriesPage />} />
              <Route path="/ideas" element={<IdeasPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/profile" element={<MyProfilePage />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  );
}

function MonthlyCycleManager() {
  const [lastProcessedMonth, , hydrated] = useSupabaseSharedState<string>({
    key: createStorageKey("monthly-cycle-last-month"),
    fallback: "",
  });
  const [cypressCleanupMarker, , cypressCleanupHydrated] = useSupabaseSharedState<string>({
    key: createStorageKey("cypress-cleanup-done"),
    fallback: "",
  });
  const runningRef = useRef(false);

  useEffect(() => {
    if (!hydrated || !cypressCleanupHydrated || !supabase) {
      return;
    }

    let cancelled = false;

    const ensureMonthlyCycle = async () => {
      const currentMonthKey = getBrazilMonthKey(new Date());
      const client = supabase;

      if (!client) {
        return;
      }

      if (runningRef.current) {
        return;
      }

      runningRef.current = true;
      try {
        if (cypressCleanupMarker !== "done") {
          const { error: cleanupError } = await client.rpc("cleanup_cypress_data");
          if (cancelled) {
            return;
          }

          if (cleanupError) {
            console.error("Failed to clean Cypress data", cleanupError);
            return;
          }
        }

        if (lastProcessedMonth !== currentMonthKey) {
          const { error } = await client.rpc("archive_current_month_data", {
            target_month_key: currentMonthKey,
          });

          if (cancelled) {
            return;
          }

          if (error) {
            console.error("Failed to archive monthly data", error);
          }
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Unexpected failure archiving monthly data", error);
        }
      } finally {
        if (!cancelled) {
          runningRef.current = false;
        }
      }
    };

    void ensureMonthlyCycle();

    const handleFocus = () => {
      void ensureMonthlyCycle();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void ensureMonthlyCycle();
      }
    };

    const intervalId = window.setInterval(() => {
      void ensureMonthlyCycle();
    }, 60 * 60 * 1000);

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [cypressCleanupHydrated, cypressCleanupMarker, hydrated, lastProcessedMonth]);

  return null;
}

function AppToaster() {
  const { isDark } = useThemeMode();

  return <Toaster position="top-right" richColors theme={isDark ? "dark" : "light"} />;
}
