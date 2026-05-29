const authStorageKey = "great-organico-authenticated";
const authMemberIdKey = "great-organico-authenticated-member-id";

describe("Conteúdo - progresso por responsável", () => {
  it("mostra Brenda e alterna entre metas e stories", () => {
    cy.visit("/", {
      onBeforeLoad(win) {
        win.localStorage.removeItem(authStorageKey);
        win.localStorage.removeItem(authMemberIdKey);
      },
    });

    cy.contains("Entrar na plataforma").should("be.visible");
    cy.get('[data-cy="login-admin-quick-access"]').click();

    cy.get('a[href="/content"]').click();

    cy.get('[data-cy="content-owner-all"]').should("be.visible");
    cy.get('[data-cy="content-owner-brenda"]').should("be.visible");
    cy.get('[data-cy="content-owner-hannah"]').should("be.visible");
    cy.get('[data-cy="content-owner-thiago"]').should("be.visible");

    cy.get('[data-cy="content-owner-all"]').click();
    cy.get('[data-cy="content-main-progress"]').should("be.visible");

    cy.get('[data-cy="content-owner-brenda"]').click();
    cy.get('[data-cy="content-main-progress"]').should("not.exist");

    cy.get('[data-cy="content-owner-thiago"]').click();
    cy.get('[data-cy="content-main-progress"]').should("not.exist");
  });
});
