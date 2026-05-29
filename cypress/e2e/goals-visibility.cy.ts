import { authMemberIdKey, authStorageKey } from "../../src/app/auth";
import { createStorageKey } from "../../src/app/data/sharedState";

describe("Metas - visibilidade após criar", () => {
  it("mostra a meta criada no recorte atual do membro", () => {
    const teamProfilesKey = createStorageKey("team-profiles");
    const teamScopeKey = createStorageKey("team-scope");
    const today = new Date();
    const goalName = `Meta visível ${today.getTime()}`;

    const teamProfiles = [
      {
        id: 1,
        name: "Ana",
        role: "Social Media",
        avatar: "A",
        specialty: "Planejamento",
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
        bio: "Planejamento",
      },
      {
        id: 2,
        name: "Clara",
        role: "Designer",
        avatar: "C",
        specialty: "Execução",
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
        bio: "Execução",
      },
    ];

    cy.visit("/goals", {
      onBeforeLoad(win) {
        win.localStorage.clear();
        win.localStorage.setItem(authStorageKey, "true");
        win.localStorage.setItem(authMemberIdKey, "2");
        win.localStorage.setItem(teamProfilesKey, JSON.stringify(teamProfiles));
        win.localStorage.setItem(teamScopeKey, JSON.stringify(2));
      },
    });

    cy.get('[data-cy="goal-create-open"]').should("be.visible").click();
    cy.get('[data-cy="goal-name-input"]').clear().type(goalName);
    cy.get('[data-cy="goal-category-input"]').clear().type("Crescimento");
    cy.get('[data-cy="goal-target-input"]').clear().type("100");
    cy.get('[data-cy="goal-description-input"]').clear().type("Meta criada para validar visibilidade.");
    cy.get('[data-cy="goal-save-button"]').click();

    cy.contains('[data-cy="goal-card"]', goalName).should("be.visible");
    cy.reload();
    cy.contains('[data-cy="goal-card"]', goalName).should("be.visible");
  });
});
