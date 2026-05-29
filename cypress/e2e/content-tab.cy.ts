describe("Aba de conteúdos", () => {
  it("abre a aba, filtra por responsável e cria um novo card", () => {
    cy.visit("/", {
      onBeforeLoad(win) {
        win.localStorage.clear();
      },
    });

    cy.contains("Entrar na plataforma").should("be.visible");
    cy.get('[data-cy="login-admin-quick-access"]').click();

    cy.get('[data-cy="nav-content"]').should("be.visible").click();
    cy.url().should("include", "/content");
    cy.get('[data-cy="content-page-shell"]').should("be.visible");
    cy.get('[data-cy="content-main-progress"]').should("be.visible");

    cy.get('[data-cy="content-owner-brenda"]').click();
    cy.get('[data-cy="content-main-progress"]').should("contain.text", "Brenda");

    cy.get('[data-cy="content-owner-hannah"]').click();
    cy.get('[data-cy="content-main-progress"]').should("contain.text", "Hannah");

    cy.get('[data-cy="content-owner-thiago"]').click();
    cy.get('[data-cy="content-main-progress"]').should("contain.text", "Thiago");

    const contentTitle = `Conteúdo Cypress ${Date.now()}`;

    cy.get('[data-cy="content-create-open"]').click();
    cy.get('[data-cy="content-create-title"]').clear().type(contentTitle);
    cy.get('[data-cy="content-create-description"]').clear().type("Card criado pelo Cypress para validar a nova aba.");
    cy.get('[data-cy="content-create-reach"]').clear().type("9999999");
    cy.get('[data-cy="content-create-engagement"]').clear().type("999999");
    cy.get('[data-cy="content-create-submit"]').click();

    cy.contains(contentTitle).should("be.visible");
    cy.get('[data-cy="content-main-progress"]').should("contain.text", contentTitle);

    cy.get('[data-cy="content-preview-delete"]').click();
    cy.get('[data-cy="content-delete-confirm"]').click();
    cy.contains(contentTitle).should("not.exist");
  });
});
