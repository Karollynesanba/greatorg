const authMemberIdKey = "great-organico-authenticated-member-id";
const authStorageKey = "great-organico-authenticated";

describe("Calendário - atribuição de tarefas", () => {
  it("cria uma atividade e mostra o responsável e o adicionador corretos", () => {
    const title = `Revisar roteiro ${Date.now()}`;
    const description = "Ajustar o roteiro antes da publicação.";
    const memberName = "Hannah";

    cy.visit("/calendar", {
      onBeforeLoad(win) {
        win.localStorage.clear();
        win.localStorage.setItem(authStorageKey, "true");
        win.localStorage.setItem(authMemberIdKey, "2");
      },
    });

    cy.get('[data-cy="calendar-open-create"]').should("be.visible").click();
    cy.contains("Criar atividade rápida").should("be.visible");

    cy.get('[data-cy="calendar-create-title"]').clear().type(title);
    cy.get('[data-cy="calendar-create-description"]').clear().type(description);
    cy.get('[data-cy="calendar-create-submit"]').click();

    cy.contains("Agenda").should("be.visible");
    cy.contains(title).should("be.visible");
    cy.contains(description).should("be.visible");
    cy.get('[data-cy="calendar-selected-responsibles"]').should("contain.text", memberName);
    cy.get('[data-cy="calendar-selected-added-by"]').should("contain.text", memberName);

    cy.get('[data-cy="calendar-selected-close"]').click();
    cy.get('[data-cy="calendar-side-agenda"]').should("be.visible");
    cy.get('[data-cy="calendar-side-agenda"]').within(() => {
      cy.contains(title).should("be.visible");
    });
  });
});
