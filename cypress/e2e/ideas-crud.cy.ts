const authStorageKey = "great-organico-authenticated";
const authMemberIdKey = "great-organico-authenticated-member-id";

describe("Ideias", () => {
  it("adiciona uma nova ideia, mostra a lâmpada e apaga a ideia criada", () => {
    const suffix = Date.now();
    const ideaTitle = `Ideia Cypress ${suffix}`;

    cy.visit("/", {
      onBeforeLoad(win) {
        win.localStorage.clear();
        win.localStorage.removeItem(authStorageKey);
        win.localStorage.removeItem(authMemberIdKey);
      },
    });

    cy.contains("Entrar na plataforma").should("be.visible");
    cy.get('[data-cy="login-admin-quick-access"]').click();

    cy.get("aside").contains("Ideias").click();
    cy.contains("Banco de ideias pronto para produção").should("be.visible");

    cy.get('[data-cy="idea-create-open"]').click();
    cy.get('[data-cy="idea-spark-lightbulb"]', { timeout: 2500 }).should("be.visible");

    cy.get('[data-cy="idea-title-input"]').clear().type(ideaTitle);
    cy.get('[data-cy="idea-theme-input"]').clear().type("Nova rotina de conteúdo");
    cy.get('[data-cy="idea-description-input"]').clear().type("Ideia criada via Cypress");
    cy.get('[data-cy="idea-script-input"]').clear().type("Gancho, desenvolvimento e CTA.");
    cy.get('[data-cy="idea-save-button"]').click();

    cy.contains('[data-cy="idea-card"]', ideaTitle).should("be.visible");
    cy.contains('[data-cy="idea-card"]', ideaTitle)
      .find('[data-cy="idea-card-lightbulb"]')
      .should("be.visible");

    cy.contains('[data-cy="idea-card"]', ideaTitle)
      .find('[data-cy="idea-delete-button"]')
      .click();

    cy.get('[data-cy="idea-delete-confirm"]').click();
    cy.contains('[data-cy="idea-card"]', ideaTitle).should("not.exist");
  });
});
