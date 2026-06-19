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

describe("Conteudo - filtro por responsavel", () => {
  it("abre a aba de conteudo e filtra os cards por pessoa", () => {
    cy.visit("/", {
      onBeforeLoad(win) {
        win.localStorage.removeItem(authStorageKey);
        win.localStorage.removeItem(authMemberIdKey);
      },
    });

    cy.contains("Entrar na plataforma").should("be.visible");
    cy.get('[data-cy="login-admin-quick-access"]').click();
    cy.get('[data-cy="login-password"]').clear().type("Great2026!");
    cy.get('[data-cy="login-submit"]').click();

    cy.get('[data-cy="nav-content"]').should("be.visible").click();
    cy.url().should("include", "/content");
    cy.get('[data-cy="content-page-shell"]').should("be.visible");

    cy.window().then((win) => {
      const posts = readJsonArray<{ authorId: number; engagement: number }>(win, postsStorageKey);
      const format = new Intl.NumberFormat("pt-BR");

      const hannahPosts = posts.filter((post) => post.authorId === 2);
      const thiagoPosts = posts.filter((post) => post.authorId === 3);

      const hannahEngagement = hannahPosts.reduce((sum, post) => sum + (post.engagement ?? 0), 0);
      const thiagoEngagement = thiagoPosts.reduce((sum, post) => sum + (post.engagement ?? 0), 0);

      cy.get('[data-cy="content-owner-hannah"]').should("be.visible").click();
      cy.get('[data-cy="content-main-progress"]').should("contain.text", "Hannah");
      cy.get('[data-cy="content-metric-published"]').should("contain.text", String(hannahPosts.length));
      cy.get('[data-cy="content-metric-engagement"]').should("contain.text", format.format(hannahEngagement));

      cy.get('[data-cy="content-owner-thiago"]').click();
      cy.get('[data-cy="content-main-progress"]').should("contain.text", "Thiago");
      cy.get('[data-cy="content-metric-published"]').should("contain.text", String(thiagoPosts.length));
      cy.get('[data-cy="content-metric-engagement"]').should("contain.text", format.format(thiagoEngagement));
    });
  });
});
