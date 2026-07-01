import { seedLegacySession } from "../support/session";

describe("Conteudo - filtro por responsavel", () => {
  it("abre a aba de conteudo e filtra os cards por pessoa", () => {
    cy.visit("/content", {
      onBeforeLoad(win) {
        seedLegacySession(win, 1);
      },
    });

    cy.url().should("include", "/content");
    cy.get('[data-cy="content-page-shell"]').should("be.visible");

    cy.get('[data-cy="content-owner-hannah"]').should("be.visible").click();
    cy.get('[data-cy="content-main-progress"]').should("contain.text", "Hannah");
    cy.get('[data-cy="content-metric-published"]').should("be.visible");
    cy.get('[data-cy="content-metric-testimonials"]').should("be.visible").and("contain.text", "Depoimentos");

    cy.get('[data-cy="content-owner-thiago"]').click();
    cy.get('[data-cy="content-main-progress"]').should("contain.text", "Thiago");
    cy.get('[data-cy="content-metric-published"]').should("be.visible");
    cy.get('[data-cy="content-metric-testimonials"]').should("be.visible").and("contain.text", "Depoimentos");
  });
});
