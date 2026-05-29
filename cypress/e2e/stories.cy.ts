const authStorageKey = "great-organico-authenticated";
const authMemberIdKey = "great-organico-authenticated-member-id";

describe("Stories", () => {
  it("abre a aba, registra um story e remove o registro", () => {
    const storyQuantity = String(50 + Math.floor(Date.now() % 50));
    const storyNotes = `Registro Cypress ${Date.now()}`;

    cy.visit("/", {
      onBeforeLoad(win) {
        win.localStorage.clear();
        win.localStorage.removeItem(authStorageKey);
        win.localStorage.removeItem(authMemberIdKey);
      },
    });

    cy.contains("Entrar na plataforma").should("be.visible");
    cy.get('[data-cy="login-admin-quick-access"]').click();

    cy.get('[data-cy="nav-stories"]').should("be.visible").click();
    cy.url().should("include", "/stories");
    cy.contains("Stories").should("be.visible");
    cy.contains("Meta mensal: 168 stories").should("be.visible");

    cy.get('[data-cy="stories-create-open"]').click();
    cy.contains("Adicionar stories do dia").should("be.visible");
    cy.get('[data-cy="stories-quantity"]').clear().type(storyQuantity);
    cy.get('[data-cy="stories-notes"]').clear().type(storyNotes);
    cy.get('[data-cy="stories-save"]').click();

    cy.contains('[data-cy^="stories-card-"]', storyNotes)
      .should("be.visible")
      .within(() => {
        cy.contains(storyQuantity).should("be.visible");
        cy.get('[data-cy^="stories-delete-"]').click();
      });

    cy.contains(storyNotes).should("not.exist");
  });
});
