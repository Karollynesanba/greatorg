import { authMemberIdKey, authStorageKey } from "../../src/app/auth";
import { createStorageKey } from "../../src/app/data/sharedState";

describe("Metas - visualizações diárias", () => {
  it("mantém a meta travada e soma apenas o valor diário ao acumulado", () => {
    const teamProfilesKey = createStorageKey("team-profiles");
    const teamScopeKey = createStorageKey("team-scope");
    const goalName = `Meta visualizações ${Date.now()}`;

    const teamProfiles = [
      {
        id: 1,
        name: "Brenda",
        role: "Video Maker",
        avatar: "B",
        specialty: "Edição",
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
        email: "brenda@greatorganico.com",
        password: "Great2026!",
        avatarUrl: "",
        bio: "Edição",
      },
      {
        id: 2,
        name: "Hannah",
        role: "Designer de Social",
        avatar: "H",
        specialty: "Stories",
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
        email: "hannah@greatorganico.com",
        password: "Great2026!",
        avatarUrl: "",
        bio: "Stories",
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
    cy.get('[data-cy="goal-name-input"]').scrollIntoView().clear().type(goalName);
    cy.get('[data-cy="goal-category-trigger"]').scrollIntoView().click();
    cy.get('[data-cy="goal-category-option-Alcance"]').click();
    cy.get('[data-cy="goal-period-trigger"]').scrollIntoView().click();
    cy.get('[data-cy="goal-period-option-Mês"]').click();
    cy.get('[data-cy="goal-target-input"]').scrollIntoView().clear().type("12000");
    cy.get('[data-cy="goal-description-input"]').scrollIntoView().clear().type("Meta travada com lançamento diário.");
    cy.get('[data-cy="goal-save-button"]').scrollIntoView().click();

    cy.contains('[data-cy="goal-card"]', goalName)
      .scrollIntoView()
      .should("be.visible")
      .find('[data-cy="goal-daily-open"]')
      .click({ force: true });

    cy.get('[data-cy="goal-daily-date-input"]').scrollIntoView().should("be.visible");
    cy.contains("12.000").should("be.visible");

    cy.get('[data-cy="goal-daily-value-input"]').scrollIntoView().clear().type("6000");
    cy.get('[data-cy="goal-daily-submit"]').scrollIntoView().click();

    cy.contains("6.000").should("be.visible");
    cy.get('[data-cy="goal-history-row"]').should("have.length", 1);

    cy.get('[data-cy="goal-daily-value-input"]').scrollIntoView().clear().type("5000");
    cy.get('[data-cy="goal-daily-submit"]').scrollIntoView().click();

    cy.contains("11.000").should("be.visible");
    cy.contains("1.000").should("be.visible");
    cy.get('[data-cy="goal-history-row"]').should("have.length", 2);
  });
});
