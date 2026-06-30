import { seedLegacySession } from "../support/session";

describe("Relatorios", () => {
  it("salva relatorio, exporta e alterna filtros de periodo", () => {
    cy.visit("/reports", {
      onBeforeLoad(win) {
        seedLegacySession(win, 1);
      },
    });

    cy.window().then((win) => {
      cy.stub(win, "print").as("printWindow");
    });

    cy.url().should("include", "/reports");
    cy.get('[data-cy="reports-save"]').should("be.visible").click();
    cy.get('[data-cy="reports-history-restore"]').should("be.visible");

    cy.get('[data-cy="reports-export-image"]').click();
    cy.url().should("include", "/reports");

    cy.get('[data-cy="reports-export-pdf"]').click();
    cy.get("@printWindow").should("have.been.calledOnce");

    cy.get('[data-cy="reports-period-7"]').click();
    cy.get('[data-cy="reports-period-7"]').should("have.attr", "aria-pressed", "true");
    cy.get('[data-cy="reports-period-30"]').click();
    cy.get('[data-cy="reports-period-30"]').should("have.attr", "aria-pressed", "true");
    cy.get('[data-cy="reports-period-custom"]').click();
    cy.get('[data-cy="reports-period-custom"]').should("have.attr", "aria-pressed", "true");

    cy.get('[data-cy="reports-filter-type-trigger"]').click();
    cy.get('[data-cy="reports-filter-type-option-Reels"]').click();
    cy.get('[data-cy="reports-filter-type-trigger"]').should("contain.text", "Reels");

    cy.get('[data-cy="reports-filter-responsible-trigger"]').click();
    cy.get('[data-cy="reports-filter-responsible-option-1"]').click();
    cy.get('[data-cy="reports-filter-responsible-trigger"]').should("contain.text", "Brenda");
  });
});
