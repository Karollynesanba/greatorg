import { seedLegacySession } from "../support/session";

const persistenceEnabled = Cypress.env("SUPABASE_PERSISTENCE") === true;

describe("Relatorios persistencia", () => {
  (persistenceEnabled ? it : it.skip)("persiste edicao, criacao e exclusao apos recarregar", () => {
    const runId = Date.now();
    const temporaryNote = `Persistencia E2E ${runId}`;
    const temporaryCardTitle = `Card temporario ${runId}`;
    let originalNote = "";

    cy.on("window:confirm", () => true);

    cy.visit("/reports", {
      onBeforeLoad(win) {
        seedLegacySession(win, 1);
      },
    });

    cy.get('[data-cy="reports-overview-edit"]').click();
    cy.get('[data-cy="reports-overview-note"]')
      .invoke("val")
      .then((value) => {
        originalNote = String(value ?? "");
      });
    cy.get('[data-cy="reports-overview-note"]').clear().type(temporaryNote);
    cy.get('[data-cy="reports-overview-save"]').click();
    cy.contains(temporaryNote).should("exist");

    cy.reload();
    cy.contains(temporaryNote).should("exist");

    cy.get('[data-cy="reports-row-1-add-card"]').click();
    cy.get('[data-cy="reports-card-title"]').type(temporaryCardTitle);
    cy.get('[data-cy="reports-card-metric"]').clear().type("999");
    cy.get('[data-cy="reports-card-save"]').click();
    cy.contains(temporaryCardTitle).should("exist");

    cy.reload();
    cy.contains(temporaryCardTitle).should("exist");

    cy.get(`[aria-label="Apagar ${temporaryCardTitle}"]`).click();
    cy.contains(temporaryCardTitle).should("not.exist");

    cy.reload();
    cy.contains(temporaryCardTitle).should("not.exist");

    cy.get('[data-cy="reports-overview-edit"]').click();
    cy.get('[data-cy="reports-overview-note"]').clear().type(originalNote);
    cy.get('[data-cy="reports-overview-save"]').click();

    cy.reload();
    cy.then(() => {
      if (originalNote.trim()) {
        cy.contains(originalNote).should("exist");
      }
    });
  });
});
