import { authMemberIdKey, authStorageKey } from "../../src/app/auth";
import { createStorageKey } from "../../src/app/data/sharedState";

describe("Calend?rio - atribui??o de tarefas", () => {
  it("mostra a atividade do criador para o respons?vel no dia do destinat?rio", () => {
    const teamProfilesKey = createStorageKey("team-profiles");
    const calendarEventsKey = "calendar-events";

    const ana = {
      id: 1,
      name: "Ana",
      role: "Social Media",
      avatar: "A",
      specialty: "Planejamento e opera??o",
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
      specialty: "Execu??o e acabamento",
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

    cy.visit("/", {
      onBeforeLoad(win) {
        win.localStorage.clear();
        win.localStorage.setItem(authStorageKey, "true");
        win.localStorage.setItem(authMemberIdKey, "2");
        win.localStorage.setItem(teamProfilesKey, JSON.stringify([ana, clara]));
        win.localStorage.setItem(
          calendarEventsKey,
          JSON.stringify([
            {
              id: 301,
              title: "Revisar roteiro",
              description: "Ajustar o roteiro antes da publica??o.",
              type: "Reels",
              responsibleId: 2,
              responsibleIds: [2],
              addedById: 1,
              status: "Agendado",
              date: todayKey,
              time: "09:00",
            },
          ]),
        );
      },
    });

    cy.get('a[href="/calendar"]').click();
    cy.url().should("include", "/calendar");

    cy.contains("Revisar roteiro").should("be.visible");
    cy.get('[data-cy="calendar-assignment-label"]').should("contain.text", "Ana → Clara");

    cy.contains("Agenda r?pida").should("be.visible");
    cy.get('[data-cy="calendar-side-assignment-label"]').should("contain.text", "Ana → Clara");
  });
});

