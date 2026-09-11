// Uses the existing Cypress demo session; no production data is changed.
describe('Report mobile layout', () => {
  [375, 390, 414, 768].forEach((width) => {
    it(`fits report filters, table and preview at ${width}px`, () => {
      cy.viewport(width, 844);
      cy.visit('/login', { onBeforeLoad(win) { win.localStorage.clear(); } });
      cy.get('[data-cy="login-admin-quick-access"]').click();
      cy.get('[aria-label="Abrir menu de navegação"]').click();
      cy.get('[data-cy="nav-reports"]').click();
      cy.get('[data-cy="reports-period-custom"]').click();
      cy.get('[aria-label="Mês"]').click();
      cy.get('[aria-label="Opções de Mês"]').should(($el) => {
        const rect = $el[0].getBoundingClientRect();
        expect(rect.left).to.be.at.least(0);
        expect(rect.right).to.be.at.most(width);
        expect(rect.top).to.be.at.least(0);
        expect(rect.bottom).to.be.at.most(844);
      });
      cy.get('[aria-label="Opções de Mês"] button').first().click();
      cy.get('[data-cy="reports-custom-mode-range"]').click();
      cy.get('[data-cy="reports-custom-range-trigger"]').click();
      cy.get('[aria-label="Selecionar intervalo de datas"]').should(($el) => {
        const rect = $el[0].getBoundingClientRect();
        expect(rect.left).to.be.at.least(0);
        expect(rect.right).to.be.at.most(width);
        expect(rect.top).to.be.at.least(0);
        expect(rect.bottom).to.be.at.most(844);
      }).contains('button', 'Fechar').click();
      cy.get('.report-stories-scroll').scrollIntoView().scrollTo('right', { ensureScrollable: false });
      cy.get('.report-stories-scroll tbody tr').first().find('input').last().should('be.visible').should(($el) => {
        expect(parseFloat(getComputedStyle($el[0]).fontSize)).to.be.at.least(16);
        expect($el[0].getBoundingClientRect().height).to.be.at.least(44);
      });
      cy.document().should((doc) => expect(doc.documentElement.scrollWidth).to.equal(doc.documentElement.clientWidth));
      cy.visit('/reports/preview');
      cy.get('.report-mobile-preview').should('have.css', 'max-height', 'none');
      cy.document().should((doc) => expect(doc.documentElement.scrollWidth).to.equal(doc.documentElement.clientWidth));
    });
  });
});
