import { seedLegacySession } from "../support/session";

describe("Calendário - modal de novo post", () => {
  it("abre o formulário de criação pelo botão principal", () => {
    cy.visit("/calendar", {
      onBeforeLoad(win) {
        seedLegacySession(win, 1);
      },
    });

    cy.get('[data-cy="calendar-open-create"]').should("be.visible").click();
    cy.contains("Criar atividade rápida").should("be.visible");
    cy.get('[data-cy="calendar-activities-section"]').should("be.visible");
    cy.get('[data-cy="calendar-activities-progress"]').should("contain.text", "0 de 0 atividades concluídas");
    cy.get('[data-cy="calendar-activity-label"]').should("be.visible");
    cy.get('[data-cy="calendar-activity-note"]').should("be.visible");
    cy.get('[data-cy="calendar-activity-add"]').should("be.visible");
    cy.get('[data-cy="calendar-activity-mark-all"]').should("be.visible");
    cy.get('[data-cy="calendar-create-title"]').should("be.visible");
    cy.get('[data-cy="calendar-create-description"]').should("be.visible");
    cy.get('[data-cy="calendar-create-submit"]').should("be.visible");

    cy.contains("Fechar").click();
    cy.contains("Criar atividade rápida").should("not.exist");
  });
});
