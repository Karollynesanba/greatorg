import { authMemberIdKey, authStorageKey } from "../../src/app/auth";
import { createStorageKey } from "../../src/app/data/sharedState";

describe("Calendário - regressão de persistência", () => {
  it("não traz tarefas antigas de volta depois de criar uma nova", () => {
    const teamProfilesKey = createStorageKey("team-profiles");
    const calendarEventsKey = "calendar-events";

    const ana = {
      id: 1,
      name: "Ana",
      role: "Social Media",
      avatar: "A",
      specialty: "Planejamento e operação",
      color: "#833AB4",
      stats: {
        postsCreated: 0,
        avgEngagement: 0,
        goalsCompleted: 0,
        performance: 0,
        punctuality: 0,
      },
      radar: [],
      monthlyPosts: [],
      email: "ana@greatorganico.com",
      password: "Great2026!",
      avatarUrl: "",
      bio: "Cria e atribui tarefas.",
    };

    const clara = {
      id: 2,
      name: "Clara",
      role: "Designer",
      avatar: "C",
      specialty: "Execução e acabamento",
      color: "#E1306C",
      stats: {
        postsCreated: 0,
        avgEngagement: 0,
        goalsCompleted: 0,
        performance: 0,
        punctuality: 0,
      },
      radar: [],
      monthlyPosts: [],
      email: "clara@greatorganico.com",
      password: "Great2026!",
      avatarUrl: "",
      bio: "Recebe e executa tarefas.",
    };

    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const oldTaskTitle = "Tarefa antiga";
    const newTaskTitle = "Tarefa nova";

    cy.visit("/", {
      onBeforeLoad(win) {
        win.localStorage.clear();
        win.localStorage.setItem(authStorageKey, "true");
        win.localStorage.setItem(authMemberIdKey, "1");
        win.localStorage.setItem(teamProfilesKey, JSON.stringify([ana, clara]));
        win.localStorage.setItem(
          calendarEventsKey,
          JSON.stringify([
            {
              id: 101,
              title: oldTaskTitle,
              description: "Essa tarefa não pode voltar depois do reload.",
              type: "Reels",
              responsibleId: 1,
              responsibleIds: [1],
              addedById: 1,
              status: "Agendado",
              date: todayKey,
              time: "10:00",
            },
          ]),
        );
      },
    });

    cy.get('a[href="/calendar"]').click();
    cy.url().should("include", "/calendar");

    cy.contains(oldTaskTitle).should("be.visible");
    cy.get('[data-cy="calendar-side-event-101"]').within(() => {
      cy.get('[data-cy="calendar-side-event-delete-101"]').click({ force: true });
    });
    cy.get('[data-cy="calendar-confirm-delete"]').click();
    cy.contains(oldTaskTitle).should("not.exist");

    cy.get('[data-cy="calendar-open-create"]').click();
    cy.get('[data-cy="calendar-create-title"]').type(newTaskTitle);
    cy.get('[data-cy="calendar-create-description"]').type("Nova tarefa criada depois da limpeza.");
    cy.get('[data-cy="calendar-create-submit"]').click();

    cy.contains(newTaskTitle).should("be.visible");
    cy.contains(oldTaskTitle).should("not.exist");

    cy.reload();

    cy.contains(newTaskTitle).should("be.visible");
    cy.contains(oldTaskTitle).should("not.exist");
  });
});
