const authStorageKey = "great-organico-authenticated";
const authMemberIdKey = "great-organico-authenticated-member-id";

describe("Metas", () => {
  it("adiciona uma nova meta e remove uma meta existente", () => {
    const suffix = Date.now();
    const goalName = `Meta Cypress ${suffix}`;

    cy.visit("/", {
      onBeforeLoad(win) {
        win.localStorage.clear();
        win.localStorage.removeItem(authStorageKey);
        win.localStorage.removeItem(authMemberIdKey);
      },
    });

    cy.contains("Entrar na plataforma").should("be.visible");
    cy.get('[data-cy="login-admin-quick-access"]').click();
    cy.get('[data-cy="login-password"]').clear().type("Great2026!");
    cy.get('[data-cy="login-submit"]').click();

    cy.get("aside").contains("Metas").click();
    cy.contains("Metas vivas e conectadas ao time").should("be.visible");

    cy.get('[data-cy="goal-create-open"]').click();
    cy.get('[data-cy="goal-name-input"]').clear().type(goalName);
    cy.get('[data-cy="goal-category-trigger"]').click();
    cy.get('[data-cy="goal-category-option-Alcance"]').click();
    cy.get('[data-cy="goal-period-trigger"]').click();
    cy.get('[data-cy="goal-period-option-Mês"]').click();
    cy.get('[data-cy="goal-target-input"]').clear().type("1000");
    cy.get('[data-cy="goal-description-input"]').clear().type("Meta criada via Cypress");
    cy.get('[data-cy="goal-save-button"]').click();

    cy.contains('[data-cy="goal-card"]', goalName).should("be.visible");

    cy.contains('[data-cy="goal-card"]', goalName)
      .find('[data-cy="goal-delete-button"]')
      .click();

    cy.get('[data-cy="goal-delete-confirm"]').click();
    cy.contains('[data-cy="goal-card"]', goalName).should("not.exist");
  });
});
