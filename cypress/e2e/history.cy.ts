import { authStorageKey } from "../../src/app/auth";

describe("Histórico", () => {
  it("alterna entre timeline e tabela, e permite clicar nos filtros", () => {
    const historyStorageKey = "history";
    const historySeed = [
      {
        id: 101,
        type: "post",
        title: "Reels de lançamento",
        description: "Publicação de abertura da campanha da semana.",
        authorId: 1,
        date: "08/05/2026",
        result: "8,2k impressões",
        metrics: "1,4k interações",
      },
      {
        id: 102,
        type: "goal",
        title: "Meta semanal aprovada",
        description: "Meta de engajamento validada pela equipe.",
        authorId: 2,
        date: "07/05/2026",
        result: "Meta concluída",
        metrics: "106% da meta",
      },
      {
        id: 103,
        type: "schedule",
        title: "Post agendado",
        description: "Postagem do calendário enviada para aprovação.",
        authorId: 3,
        date: "06/05/2026",
        result: "Agendamento confirmado",
        metrics: "09:00",
      },
    ];

    cy.visit("/", {
      onBeforeLoad(win) {
        win.localStorage.clear();
        win.localStorage.setItem(authStorageKey, "true");
        win.localStorage.setItem(historyStorageKey, JSON.stringify(historySeed));
      },
    });

    cy.get('a[href="/history"]').click();
    cy.url().should("include", "/history");

    cy.contains("Reels de lançamento").should("be.visible");
    cy.contains("Meta semanal aprovada").should("be.visible");
    cy.contains("Post agendado").should("be.visible");
    cy.get("table").should("not.exist");

    cy.get('[data-cy="history-view-tabela"]').click();
    cy.get("table").should("be.visible");
    cy.get("table tbody tr").should("have.length", 3);

    cy.get('[data-cy="history-filter-person-trigger"]').click();
    cy.get('[data-cy="history-filter-person-option-2"]').click();

    cy.get('[data-cy="history-filter-type-trigger"]').click();
    cy.get('[data-cy="history-filter-type-option-goal"]').click();

    cy.contains("Meta semanal aprovada").should("be.visible");
    cy.contains("Reels de lançamento").should("not.exist");
    cy.contains("Post agendado").should("not.exist");
    cy.get("table tbody tr").should("have.length", 1);

    cy.get('[data-cy="history-delete-table-102"]').click();
    cy.get('[data-cy="history-delete-cancel"]').click();
    cy.get("table tbody tr").should("have.length", 1);

    cy.get('[data-cy="history-view-timeline"]').click();
    cy.contains("Meta semanal aprovada").should("be.visible");

    cy.get('[data-cy="history-filter-person-trigger"]').click();
    cy.get('[data-cy="history-filter-person-option-todos"]').click();

    cy.get('[data-cy="history-filter-type-trigger"]').click();
    cy.get('[data-cy="history-filter-type-option-todos"]').click();

    cy.get('[data-cy="history-view-tabela"]').click();
    cy.get("table tbody tr").should("have.length", 3);
  });
});
