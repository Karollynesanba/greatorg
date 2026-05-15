import { Component, Suspense, lazy, type ErrorInfo, type ReactNode } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { useAuthSession, signOut } from "./auth";
import { ThemeModeProvider, useThemeMode } from "./theme";

const CalendarPage = lazy(() => import("./pages/Calendar").then((module) => ({ default: module.CalendarPage })));
const DashboardPage = lazy(() => import("./pages/Dashboard").then((module) => ({ default: module.DashboardPage })));
const GoalsPage = lazy(() => import("./pages/Goals").then((module) => ({ default: module.GoalsPage })));
const HistoryPage = lazy(() => import("./pages/History").then((module) => ({ default: module.HistoryPage })));
const IdeasPage = lazy(() => import("./pages/Ideas").then((module) => ({ default: module.IdeasPage })));
const MemberProfilePage = lazy(() => import("./pages/MemberProfile").then((module) => ({ default: module.MemberProfilePage })));
const MetaInsightsPage = lazy(() => import("./pages/MetaInsights").then((module) => ({ default: module.MetaInsightsPage })));
const MyProfilePage = lazy(() => import("./pages/MyProfile").then((module) => ({ default: module.MyProfilePage })));
const LoginPage = lazy(() => import("./pages/Login").then((module) => ({ default: module.LoginPage })));
const PostDetailPage = lazy(() => import("./pages/PostDetail").then((module) => ({ default: module.PostDetailPage })));
const ReportPreviewPage = lazy(() => import("./pages/ReportPreview").then((module) => ({ default: module.ReportPreviewPage })));
const ReportsPage = lazy(() => import("./pages/Reports").then((module) => ({ default: module.ReportsPage })));
const SettingsPage = lazy(() => import("./pages/Settings").then((module) => ({ default: module.SettingsPage })));
const StoriesPage = lazy(() => import("./pages/Stories").then((module) => ({ default: module.StoriesPage })));
const TeamPage = lazy(() => import("./pages/Team").then((module) => ({ default: module.TeamPage })));

export default function App() {
  return (
    <ThemeModeProvider>
      <DndProvider backend={HTML5Backend}>
        <BrowserRouter>
          <AppErrorBoundary>
            <AppRouter />
          </AppErrorBoundary>
        </BrowserRouter>
        <AppToaster />
      </DndProvider>
    </ThemeModeProvider>
  );
}

type AppErrorBoundaryState = {
  error: Error | null;
};

class AppErrorBoundary extends Component<{ children: ReactNode }, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled application error", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
          <div className="max-w-xl space-y-4 rounded-3xl border border-border/70 bg-card p-8 text-card-foreground shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Erro de carregamento</p>
            <h1 className="text-2xl font-semibold tracking-tight">A página travou antes de renderizar</h1>
            <p className="text-sm leading-6 text-muted-foreground">
              Isso normalmente acontece quando algum dado antigo ou um erro de runtime impede o painel de montar.
              Recarregue a página e, se continuar, me mande esta tela para eu pegar o erro exato.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-white"
            >
              Recarregar
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function AppRouter() {
  const { session, ready } = useAuthSession();

  if (!ready) {
    return <RouteLoading />;
  }

  if (!session) {
    return (
      <Suspense fallback={<RouteLoading />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    );
  }

  return <AppShell />;
}

function AppShell() {
  const { isDark } = useThemeMode();

  return (
    <div
      className="flex min-h-screen w-full overflow-x-hidden text-foreground"
      style={{
        background: isDark
          ? "radial-gradient(circle at 12% 12%, rgba(131,58,180,0.09), transparent 22%), radial-gradient(circle at 88% 8%, rgba(225,48,108,0.08), transparent 18%), linear-gradient(180deg, rgb(8,10,15) 0%, rgb(10,13,19) 100%)"
          : "linear-gradient(180deg, rgb(252,253,255) 0%, rgb(247,248,250) 100%)",
      }}
    >
      <Sidebar
        onLogout={() => {
          void signOut();
        }}
      />
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
            <Suspense fallback={<RouteLoading />}>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/login" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/meta-insights" element={<MetaInsightsPage />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/post/:id" element={<PostDetailPage />} />
                <Route path="/goals" element={<GoalsPage />} />
                <Route path="/stories" element={<StoriesPage />} />
                <Route path="/ideas" element={<IdeasPage />} />
                <Route path="/team" element={<TeamPage />} />
                <Route path="/member/:id" element={<MemberProfilePage />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/reports/preview" element={<ReportPreviewPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/profile" element={<MyProfilePage />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Suspense>
          </main>
        </div>
      </div>
    </div>
  );
}

function RouteLoading() {
  return <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">Carregando...</div>;
}

function AppToaster() {
  const { isDark } = useThemeMode();

  return <Toaster position="top-right" richColors theme={isDark ? "dark" : "light"} />;
}
