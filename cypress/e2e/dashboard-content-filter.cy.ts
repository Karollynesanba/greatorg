const authStorageKey = "great-organico-authenticated";
const authMemberIdKey = "great-organico-authenticated-member-id";
const postsStorageKey = "great-organico-posts";

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

describe("Conteúdo - filtro por responsável", () => {
  it("separa os posts de Hannah e Thiago", () => {
    cy.visit("/", {
      onBeforeLoad(win) {
        win.localStorage.removeItem(authStorageKey);
        win.localStorage.removeItem(authMemberIdKey);
      },
    });

    cy.contains("Entrar na plataforma").should("be.visible");
    cy.get('[data-cy="login-admin-quick-access"]').click();

    cy.get('[data-cy="content-owner-hannah"]').should("be.visible");
    cy.get('[data-cy="content-owner-thiago"]').should("be.visible");

    cy.window().then((win) => {
      const posts = readJsonArray<{ authorId: number; engagement: number }>(win, postsStorageKey);

      const hannahPosts = posts.filter((post) => post.authorId === 2);
      const thiagoPosts = posts.filter((post) => post.authorId === 3);

      const hannahEngagement = hannahPosts.reduce((sum, post) => sum + (post.engagement ?? 0), 0);
      const thiagoEngagement = thiagoPosts.reduce((sum, post) => sum + (post.engagement ?? 0), 0);

      cy.get('[data-cy="content-owner-hannah"]').click();
      cy.get('[data-cy="dashboard-metric-posts"]').should("contain", String(hannahPosts.length));
      cy.get('[data-cy="dashboard-summary-engagement"]').should("contain", new Intl.NumberFormat("pt-BR").format(hannahEngagement));
      cy.get('[data-cy="dashboard-top-posts"]').should("contain.text", "Hannah");
      cy.get('[data-cy="dashboard-top-posts"]').should("not.contain.text", "Thiago");

      cy.get('[data-cy="content-owner-thiago"]').click();
      cy.get('[data-cy="dashboard-metric-posts"]').should("contain", String(thiagoPosts.length));
      cy.get('[data-cy="dashboard-summary-engagement"]').should("contain", new Intl.NumberFormat("pt-BR").format(thiagoEngagement));
      cy.get('[data-cy="dashboard-top-posts"]').should("contain.text", "Thiago");
      cy.get('[data-cy="dashboard-top-posts"]').should("not.contain.text", "Hannah");
    });
  });
});
