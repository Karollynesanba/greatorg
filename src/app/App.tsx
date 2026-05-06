import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { CalendarPage } from "./pages/Calendar";
import { DashboardPage } from "./pages/Dashboard";
import { GoalsPage } from "./pages/Goals";
import { HistoryPage } from "./pages/History";
import { IdeasPage } from "./pages/Ideas";
import { InsightsPage } from "./pages/Insights";
import { MemberProfilePage } from "./pages/MemberProfile";
import { MetaInsightsPage } from "./pages/MetaInsights";
import { MyProfilePage } from "./pages/MyProfile";
import { LoginPage } from "./pages/Login";
import { PostDetailPage } from "./pages/PostDetail";
import { ReportsPage } from "./pages/Reports";
import { SettingsPage } from "./pages/Settings";
import { StoriesPage } from "./pages/Stories";
import { isAuthenticated, signOut } from "./auth";
import { ThemeModeProvider, useThemeMode } from "./theme";

export default function App() {
  const [authenticated, setAuthenticated] = useState(() => isAuthenticated());

  useEffect(() => {
    setAuthenticated(isAuthenticated());
  }, []);

  return (
    <ThemeModeProvider>
      <DndProvider backend={HTML5Backend}>
        <BrowserRouter>
          {authenticated ? (
            <AppShell
              onLogout={() => {
                signOut();
                setAuthenticated(false);
              }}
            />
          ) : (
            <Routes>
              <Route
                path="/login"
                element={
                  <LoginPage
                    onLogin={() => {
                      setAuthenticated(true);
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

  return (
    <div
      className="flex h-screen w-full overflow-hidden text-foreground"
      style={{
        background: isDark
          ? "radial-gradient(circle at top left, rgba(225,48,108,0.14), transparent 24%), radial-gradient(circle at top right, rgba(131,58,180,0.16), transparent 28%), linear-gradient(180deg, rgba(8,10,14,1) 0%, rgba(11,14,20,1) 100%)"
          : "linear-gradient(180deg, rgb(246,247,250) 0%, rgb(241,243,247) 100%)",
      }}
    >
      <Sidebar onLogout={onLogout} />
      <div className="flex min-h-0 flex-1 flex-col xl:ml-64">
        <TopBar />
        <main className="relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-hidden p-4 sm:p-6 xl:p-7" tabIndex={0}>
          <div
            className="min-h-full overflow-visible rounded-[28px] border"
            style={{
              background: isDark
                ? "linear-gradient(180deg, rgba(15,18,24,0.96), rgba(9,11,16,0.98))"
                : "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(249,250,252,0.98))",
              borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgb(229 231 238 / 1)",
              boxShadow: isDark ? "0 28px 80px rgba(0,0,0,0.35)" : "0 10px 30px rgba(15,23,42,0.05)",
            }}
          >
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/login" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/meta-insights" element={<MetaInsightsPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/post/:id" element={<PostDetailPage />} />
              <Route path="/insights" element={<InsightsPage />} />
              <Route path="/goals" element={<GoalsPage />} />
              <Route path="/stories" element={<StoriesPage />} />
              <Route path="/ideas" element={<IdeasPage />} />
              <Route path="/member/:id" element={<MemberProfilePage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/profile" element={<MyProfilePage />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}

function AppToaster() {
  const { isDark } = useThemeMode();

  return <Toaster position="top-right" richColors theme={isDark ? "dark" : "light"} />;
}
