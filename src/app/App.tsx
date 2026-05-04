import { ThemeProvider, useTheme } from "next-themes";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { Sidebar } from "./components/Sidebar";
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
import { isAuthenticated, signOut } from "./auth";

export default function App() {
  const [authenticated, setAuthenticated] = useState(() => isAuthenticated());

  useEffect(() => {
    setAuthenticated(isAuthenticated());
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <DndProvider backend={HTML5Backend}>
        <BrowserRouter>
          {authenticated ? (
            <div className="flex min-h-screen w-full bg-background text-foreground dark:bg-[radial-gradient(circle_at_top_left,rgba(225,48,108,0.14),transparent_24%),radial-gradient(circle_at_top_right,rgba(131,58,180,0.16),transparent_28%),linear-gradient(180deg,rgba(8,10,14,1)_0%,rgba(11,14,20,1)_100%)]">
              <Sidebar
                onLogout={() => {
                  signOut();
                  setAuthenticated(false);
                }}
              />
              <main className="relative z-10 min-h-screen flex-1 overflow-y-auto p-4 sm:p-6 xl:p-7">
                <div className="min-h-[calc(100vh-2rem)] overflow-hidden rounded-[28px] border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(247,248,251,0.96))] shadow-[0_10px_30px_rgba(15,23,42,0.05)] sm:min-h-[calc(100vh-3rem)] xl:min-h-[calc(100vh-3.5rem)] dark:border-white/6 dark:bg-[linear-gradient(180deg,rgba(15,18,24,0.96),rgba(9,11,16,0.98))] dark:shadow-[0_28px_80px_rgba(0,0,0,0.35)]">
                  <Routes>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/login" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/meta-insights" element={<MetaInsightsPage />} />
                    <Route path="/calendar" element={<CalendarPage />} />
                    <Route path="/post/:id" element={<PostDetailPage />} />
                    <Route path="/insights" element={<InsightsPage />} />
                    <Route path="/goals" element={<GoalsPage />} />
                    <Route path="/ideas" element={<IdeasPage />} />
                    <Route path="/member/:id" element={<MemberProfilePage />} />
                    <Route path="/history" element={<HistoryPage />} />
                    <Route path="/reports" element={<ReportsPage />} />
                    <Route path="/profile" element={<MyProfilePage />} />
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </div>
              </main>
            </div>
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
          <AppToaster />
        </BrowserRouter>
      </DndProvider>
    </ThemeProvider>
  );
}

function AppToaster() {
  const { resolvedTheme } = useTheme();

  return <Toaster position="top-right" richColors theme={resolvedTheme === "dark" ? "dark" : "light"} />;
}
