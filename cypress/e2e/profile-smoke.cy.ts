import { seedLegacySession } from "../support/session";

describe("Perfil - smoke test", () => {
  it("carrega o meu perfil e abre o editor", () => {
    cy.visit("/profile", {
      onBeforeLoad(win) {
        seedLegacySession(win, 1);
      },
    });

    cy.contains("Meu Perfil").should("be.visible");
    cy.get('[data-cy="profile-name"]').should("contain.text", "Brenda");
    cy.get('[data-cy="profile-avatar-preview"]').should("be.visible");
    cy.get('[data-cy="profile-edit-open"]').should("be.visible").click();
    cy.contains("Alterar dados do usuário").should("be.visible");
    cy.contains("Cancelar").click();
  });
});
