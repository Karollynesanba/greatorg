describe('Mobile navigation and calendar views', () => {
  it('renders destinations from menu links without reloading', () => {
    cy.viewport(375, 844);
    cy.visit('/login', { onBeforeLoad(win) { win.localStorage.clear(); } });
    cy.get('[data-cy="login-admin-quick-access"]').click();
    cy.get('[data-cy="dashboard-summary"]').should('be.visible');
    cy.get('[aria-label="Abrir menu de navegação"]').click();
    cy.get('[data-cy="nav-content"]').click();
    cy.get('[data-cy="content-create-open"]').should('be.visible');
    cy.get('[aria-label="Abrir menu de navegação"]').should('have.attr', 'aria-expanded', 'false');
    cy.get('[aria-label="Abrir menu de navegação"]').click();
    cy.get('[data-cy="nav-calendar"]').click();
    cy.get('[data-cy="calendar-open-create"]').should('be.visible');
    cy.get('[aria-label^="Agenda semanal"]').scrollIntoView().should(($region) => {
      expect($region[0].scrollWidth).to.be.greaterThan($region[0].clientWidth);
    });
    cy.get('[data-cy="calendar-view-mês"]').click();
    cy.get('[aria-label^="Agenda mensal"]').scrollIntoView().should(($region) => {
      expect($region[0].scrollWidth).to.be.greaterThan($region[0].clientWidth);
    });
    cy.document().should((doc) => expect(doc.documentElement.scrollWidth).to.equal(doc.documentElement.clientWidth));
    cy.screenshot('mobile-calendar-month', { capture: 'viewport', disableTimersAndAnimations: false });
  });
});
