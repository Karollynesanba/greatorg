describe("Equipes", () => {
  it("filtra o conteúdo por cada usuário do time", () => {
    cy.visit("/", {
      onBeforeLoad(win) {
        win.localStorage.clear();
      },
    });

    cy.get('[data-cy="login-admin-quick-access"]').click();

    cy.get('a[href="/content"]').click();
    cy.contains("Equipe").should("be.visible");

    cy.get('[data-cy="content-owner-all"]').click();
    cy.get('[data-cy="content-main-progress"]').should("be.visible");

    cy.get('[data-cy="content-owner-brenda"]').click();
    cy.get('[data-cy="content-main-progress"]').should("not.exist");

    cy.get('[data-cy="content-owner-hannah"]').click();
    cy.get('[data-cy="content-main-progress"]').should("not.exist");

    cy.get('[data-cy="content-owner-thiago"]').click();
    cy.get('[data-cy="content-main-progress"]').should("not.exist");
  });
});
