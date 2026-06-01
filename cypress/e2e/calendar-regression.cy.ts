import { seedLegacySession } from "../support/session";

type CalendarRow = {
  id: number;
  sort_order: number;
  data: {
    id: number;
    title: string;
    description: string;
    type: "Reels" | "Stories" | "Carrossel" | "Feed";
    responsibleId: number;
    responsibleIds: number[];
    addedById: number;
    status: "Agendado" | "Em produção" | "Aprovado" | "Publicado";
    date: string;
    time: string;
  };
};

const calendarStorageKey = "great-organico:list:4b8a4d0f-6f9e-4c3d-9a1d-2e1f4d58d101:calendar_events";

describe("Calendário - regressão de persistência", () => {
  it("não traz tarefas antigas de volta depois de criar uma nova", () => {
    const suffix = Date.now();
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const oldTaskTitle = `Tarefa antiga ${suffix}`;
    const newTaskTitle = `Tarefa nova ${suffix + 1}`;

    const initialRows: CalendarRow[] = [
      {
        id: 101,
        sort_order: 0,
        data: {
          id: 101,
          title: oldTaskTitle,
          description: "Essa tarefa não pode voltar depois do reload.",
          type: "Reels",
          responsibleId: 1,
          responsibleIds: [1],
          addedById: 1,
          status: "Agendado",
          date: todayKey,
          time: "09:00",
        },
      },
    ];

    let calendarRows = [...initialRows];

    cy.intercept("GET", "**/rest/v1/calendar_events*", (req) => {
      req.reply(calendarRows);
    }).as("loadCalendarEvents");

    cy.intercept("POST", "**/rest/v1/calendar_events*", (req) => {
      if (Array.isArray(req.body)) {
        calendarRows = [...req.body];
      }

      req.reply({ statusCode: 200, body: [] });
    }).as("saveCalendarEvent");

    cy.visit("/calendar", {
      onBeforeLoad(win) {
        seedLegacySession(win, 1);
        win.localStorage.setItem(calendarStorageKey, JSON.stringify(calendarRows));
      },
    });

    cy.wait("@loadCalendarEvents");
    cy.contains(oldTaskTitle).should("be.visible");

    cy.get('[data-cy="calendar-open-create"]').click();
    cy.get('[data-cy="calendar-create-title"]').type(newTaskTitle);
    cy.get('[data-cy="calendar-create-description"]').type("Nova tarefa criada depois da limpeza.");
    cy.get('[data-cy="calendar-create-submit"]').click();
    cy.wait("@saveCalendarEvent");

    cy.contains(newTaskTitle).should("be.visible");
    cy.contains(oldTaskTitle).should("be.visible");

    cy.window().then((win) => {
      const nextRows = calendarRows.filter((row) => row.data.title !== oldTaskTitle);
      calendarRows = nextRows;
      win.localStorage.setItem(calendarStorageKey, JSON.stringify(nextRows));
    });

    cy.reload();

    cy.contains(newTaskTitle).should("be.visible");
    cy.contains(oldTaskTitle).should("not.exist");
  });
});
