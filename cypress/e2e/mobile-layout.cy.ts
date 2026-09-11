const widths = [375, 390, 414, 768];
const pages = ['dashboard', 'meta-insights', 'calendar', 'content', 'reports', 'settings', 'profile'];
function checkViewport() {
  cy.document().should((doc) => {
    expect(doc.documentElement.scrollWidth, 'document width').to.be.at.most(doc.documentElement.clientWidth + 1);
    const main = doc.querySelector('main');
    if (main) expect(main.scrollWidth, 'main width').to.be.at.most(main.clientWidth + 1);
  });
}
describe('Mobile presentation', () => {
  widths.forEach((width) => {
    it(`fits pages and navigation at ${width}px`, () => {
      cy.viewport(width, 844);
      cy.visit('/login', { onBeforeLoad(win) { win.localStorage.clear(); } });
      cy.contains('Entrar na plataforma').should('be.visible');
      checkViewport();
      cy.get('input').filter(':visible').each(($input) => {
        expect(parseFloat(getComputedStyle($input[0]).fontSize)).to.be.at.least(16);
      });
      cy.screenshot(`mobile-${width}-login`, { capture: 'viewport' });
      cy.get('[data-cy="login-admin-quick-access"]').click();
      cy.location('pathname').should('eq', '/dashboard');
      pages.forEach((page) => {
        cy.visit(`/${page}`);
        cy.get('main').should('be.visible');
        cy.get('[aria-label="Abrir menu de navegação"]').click();
        cy.get('#site-sidebar').should('be.visible');
        cy.get('#site-sidebar').find('a').each(($a) => {
          expect($a[0].getBoundingClientRect().height).to.be.at.least(44);
        });
        cy.get('#site-sidebar a').each(($a) => {
          expect($a.attr('href')).to.match(/^\//);
        });
        cy.get('[aria-label="Fechar menu de navegação"]').click();
        cy.location('pathname').should('eq', `/${page}`);
        cy.get('[aria-label="Abrir menu de navegação"]').should('have.attr', 'aria-expanded', 'false');
        cy.get('#site-sidebar').should('not.be.visible');
        cy.get('main').should('be.visible');
        checkViewport();
        if (width === 375) cy.screenshot(`mobile-${width}-${page}`, { capture: 'viewport' });
        if (page === 'content') {
          cy.get('[data-cy="content-create-open"]').click();
          cy.get('[data-cy="content-create-submit"]').scrollIntoView().should('be.visible');
          checkViewport();
          cy.get('[data-cy="content-create-cancel"]').click();
        }
      });
      cy.visit('/reports/preview');
      cy.get('main').should('be.visible');
      checkViewport();
    });
  });
});
