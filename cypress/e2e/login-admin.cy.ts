describe("Login e perfil", () => {
  it("autentica com email e senha e permite abrir o perfil autenticado", () => {
    cy.visit("/", {
      onBeforeLoad(win) {
        win.localStorage.clear();
      },
    });

    cy.contains("Entrar na plataforma").should("be.visible");
    cy.get('[data-cy="login-email"]').clear().type("brendarayssa2706@gmail.com");
    cy.get('[data-cy="login-password"]').clear().type("Great2026!");
    cy.get('[data-cy="login-submit"]').click();

    cy.url().should("include", "/dashboard");
    cy.get('[data-cy="dashboard-summary"]').should("be.visible");

    cy.get('[aria-label="Meu Perfil"]').click();
    cy.contains("Meu Perfil").should("be.visible");
    cy.get('[data-cy="profile-name"]').should("contain.text", "Brenda");
    cy.get('[data-cy="profile-edit-open"]').click();
    cy.contains("Alterar dados do usuário").should("be.visible");
    cy.contains("Cancelar").click();
  });
});
