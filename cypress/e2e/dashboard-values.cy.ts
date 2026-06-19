const authStorageKey = "great-organico-authenticated";
const authMemberIdKey = "great-organico-authenticated-member-id";
const teamScopeStorageKey = "great-organico-team-scope";
const postsStorageKey = "great-organico-posts";
const goalsStorageKey = "great-organico-goals";

function formatLongNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function readJsonArray<T>(win: Window, key: string): T[] {
  const raw = win.localStorage.getItem(key);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

describe("Dashboard", () => {
  it("mostra valores condizentes com os dados persistidos", () => {
    cy.visit("/", {
      onBeforeLoad(win) {
        win.localStorage.removeItem(authStorageKey);
        win.localStorage.removeItem(authMemberIdKey);
        win.localStorage.setItem(teamScopeStorageKey, JSON.stringify("todos"));
      },
    });

    cy.contains("Entrar na plataforma").should("be.visible");
    cy.get('[data-cy="login-admin-quick-access"]').click();
    cy.get('[data-cy="login-password"]').clear().type("Great2026!");
    cy.get('[data-cy="login-submit"]').click();

    cy.get('[data-cy="dashboard-summary"]').should("be.visible");
    cy.get('[data-cy="dashboard-metric-reach"]').should("be.visible");

    cy.window().then((win) => {
      const posts = readJsonArray<{ reach: number; engagement: number }>(win, postsStorageKey);
      const goals = readJsonArray<{ current: number; target: number }>(win, goalsStorageKey);

      const totalReach = posts.reduce((sum, post) => sum + (post.reach ?? 0), 0);
      const totalEngagement = posts.reduce((sum, post) => sum + (post.engagement ?? 0), 0);
      const completedGoals = goals.filter((goal) => (goal.current ?? 0) >= (goal.target ?? 0)).length;
      const goalsCount = goals.length;
      const healthScore = goalsCount > 0 ? Math.round((completedGoals / goalsCount) * 100) : 0;

      cy.get('[data-cy="dashboard-metric-reach"]').should("contain", formatLongNumber(totalReach));
      cy.get('[data-cy="dashboard-metric-engagement"]').should("contain", formatLongNumber(totalEngagement));
      cy.get('[data-cy="dashboard-metric-posts"]').should("contain", String(posts.length));
      cy.get('[data-cy="dashboard-metric-goals"]').should("contain", `${completedGoals}/${goalsCount}`);
      cy.get('[data-cy="dashboard-health-score"]').should("contain", String(healthScore));
      cy.get('[data-cy="dashboard-summary-reach"]').should("be.visible");
      cy.get('[data-cy="dashboard-summary-goals"]').should("not.exist");
      cy.get('[data-cy="dashboard-summary-engagement"]').should("not.exist");
    });
  });
});
