const authStorageKey = "great-organico-authenticated";
const authMemberIdKey = "great-organico-authenticated-member-id";

function createDataTransfer() {
  const data = {};
  return {
    data,
    dropEffect: "move",
    effectAllowed: "all",
    files: [],
    items: [],
    types: [],
    setData(type, value) {
      data[type] = value;
    },
    getData(type) {
      return data[type] ?? "";
    },
    clearData(type) {
      if (type) {
        delete data[type];
        return;
      }

      Object.keys(data).forEach((key) => delete data[key]);
    },
  };
}

describe("Calendário - fluxo principal", () => {
  it("permite criar mais de um post no mesmo horário, mover e alternar as visões", () => {
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const firstTitle = `Post Cypress A ${Date.now()}`;
    const secondTitle = `Post Cypress B ${Date.now()}`;

    cy.visit("/calendar", {
      onBeforeLoad(win) {
        win.localStorage.clear();
        win.localStorage.setItem(authStorageKey, "true");
        win.localStorage.setItem(authMemberIdKey, "1");
      },
    });

    cy.get('[data-cy="calendar-open-create"]').should("be.visible").click();
    cy.get('[data-cy="calendar-create-submit"]').should("be.enabled");
    cy.get('[data-cy="calendar-create-title"]').should("be.visible");
    cy.get('[data-cy="calendar-create-title"]').type(firstTitle);
    cy.get('[data-cy="calendar-create-description"]').type("Primeiro post do fluxo de teste.");
    cy.get('[data-cy="calendar-create-submit"]').click();

    cy.get('[data-cy="calendar-open-create"]').click();
    cy.get('[data-cy="calendar-create-title"]').type(secondTitle);
    cy.get('[data-cy="calendar-create-description"]').type("Segundo post no mesmo horário.");
    cy.get('[data-cy="calendar-create-submit"]').click();

    cy.get(`[data-cy="calendar-slot-${todayKey}-09-00"]`).within(() => {
      cy.contains(firstTitle).should("be.visible");
      cy.contains(secondTitle).should("be.visible");
    });

    const dataTransfer = createDataTransfer();
    cy.contains('[data-cy^="calendar-event-"]', firstTitle)
      .trigger("dragstart", { dataTransfer, force: true });
    cy.get(`[data-cy="calendar-slot-${todayKey}-11-00"]`)
      .trigger("dragover", { dataTransfer, force: true })
      .trigger("drop", { dataTransfer, force: true });
    cy.contains('[data-cy^="calendar-event-"]', firstTitle)
      .trigger("dragend", { dataTransfer, force: true });

    cy.get(`[data-cy="calendar-slot-${todayKey}-11-00"]`).within(() => {
      cy.contains(firstTitle).should("be.visible");
    });
    cy.get(`[data-cy="calendar-slot-${todayKey}-09-00"]`).within(() => {
      cy.contains(firstTitle).should("not.exist");
      cy.contains(secondTitle).should("be.visible");
    });

    cy.get('[data-cy="calendar-view-mes"]').click();
    cy.get('[data-cy="calendar-view-mes"]').should("have.attr", "aria-pressed", "true");
    cy.get(`[data-cy="calendar-month-day-${todayKey}"]`).should("be.visible").trigger("keydown", { key: "Enter" });
    cy.get('[data-cy="calendar-view-dia"]').should("have.attr", "aria-pressed", "true");
    cy.contains("Arraste e solte os posts para reagendar.").should("be.visible");

    cy.get('[data-cy="calendar-view-semana"]').click();
    cy.get('[data-cy="calendar-view-semana"]').should("have.attr", "aria-pressed", "true");
    cy.get('[data-cy="calendar-view-dia"]').click();
    cy.get('[data-cy="calendar-view-dia"]').should("have.attr", "aria-pressed", "true");
    cy.get('[data-cy="calendar-view-mes"]').click();
    cy.get('[data-cy="calendar-view-mes"]').should("have.attr", "aria-pressed", "true");
  });
});
