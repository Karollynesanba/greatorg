import { seedLegacySession } from "../support/session";

describe("Relatorios", () => {
  it("inclui todos os dias, totais e membros da aba no documento para impressão", () => {
    cy.visit("/reports", {
      onBeforeLoad(win) {
        seedLegacySession(win, 1);
      },
    });
    cy.get('.report-stories-scroll tbody tr').last().find('input').first().clear().type('37');
    cy.get('[aria-label="Editar participações da equipe"]').click();
    cy.get('textarea[placeholder="Ex.: Kauan, Karol e Brayton"]').first().clear().type('Ana, Bruno e Carla');
    cy.contains('button', 'Salvar alterações').click();
    cy.get('.reports-pdf-team').should('contain.text', 'Ana, Bruno e Carla');
    cy.get('.report-stories-scroll tbody tr').then(($rows) => {
      cy.get('body > .reports-pdf-document .reports-pdf-stories tbody tr').should('have.length', $rows.length);
      $rows.each((index, row) => {
        const values = Array.from(row.querySelectorAll('input')).map((input) => input.value);
        cy.get('.reports-pdf-stories tbody tr').eq(index).find('td').then(($cells) => {
          expect($cells.first().text()).to.equal(row.querySelector('td')?.textContent);
          expect($cells.slice(1).toArray().map((cell) => cell.textContent)).to.deep.equal(values);
        });
      });
    });
    cy.get('.report-stories-scroll tfoot tr').first().find('td').then(($cells) => {
      const values = $cells.toArray().map((cell) => cell.textContent?.trim());
      cy.get('.reports-pdf-stories tfoot tr').first().find('th').then(($printed) => {
        expect($printed.toArray().map((cell) => cell.textContent?.trim())).to.deep.equal(values);
      });
    });
    cy.get('[data-cy="reports-stories-team"] > div').each(($week, index) => {
      if ($week.find('p').length) {
        cy.get('.reports-pdf-team-week').eq(index).should('contain.text', $week.find('p').first().text())
          .and('contain.text', $week.find('p').last().text());
      } else {
        cy.get('.reports-pdf-team').should('contain.text', $week.text().trim());
      }
    });
    cy.then(() => Cypress.automation('remote:debugger:protocol', {
      command: 'Emulation.setEmulatedMedia',
      params: { media: 'print' },
    }));
    cy.get('#root').should('not.be.visible');
    cy.get('.reports-pdf-stories tbody tr').last().should('be.visible').and('contain.text', '37');
    cy.get('.reports-pdf-team').should('be.visible').and('contain.text', 'Ana, Bruno e Carla');
    cy.then(() => Cypress.automation('remote:debugger:protocol', {
      command: 'Emulation.setEmulatedMedia',
      params: { media: '' },
    }));
  });

  it("salva relatorio, exporta e alterna filtros de periodo", () => {
    cy.visit("/reports", {
      onBeforeLoad(win) {
        seedLegacySession(win, 1);
      },
    });

    cy.window().then((win) => {
      cy.stub(win, "print").as("printWindow");
    });

    cy.url().should("include", "/reports");
    cy.get('[data-cy="reports-save"]').should("be.visible").click();
    cy.get('[data-cy="reports-history-restore"]').should("be.visible");

    cy.get('[data-cy="reports-export-image"]').click();
    cy.url().should("include", "/reports");

    cy.get('[data-cy="reports-export-pdf"]').click();
    cy.get("@printWindow").should("have.been.calledOnce");

    cy.get('[data-cy="reports-period-7"]').click();
    cy.get('[data-cy="reports-period-7"]').should("have.attr", "aria-pressed", "true");
    cy.get('[data-cy="reports-period-30"]').click();
    cy.get('[data-cy="reports-period-30"]').should("have.attr", "aria-pressed", "true");
    cy.get('[data-cy="reports-period-custom"]').click();
    cy.get('[data-cy="reports-period-custom"]').should("have.attr", "aria-pressed", "true");

    cy.get('[data-cy="reports-filter-type-trigger"]').click();
    cy.get('[data-cy="reports-filter-type-option-Reels"]').click();
    cy.get('[data-cy="reports-filter-type-trigger"]').should("contain.text", "Reels");

    cy.get('[data-cy="reports-filter-responsible-trigger"]').click();
    cy.get('[data-cy="reports-filter-responsible-option-1"]').click();
    cy.get('[data-cy="reports-filter-responsible-trigger"]').should("contain.text", "Brenda");
  });
});
