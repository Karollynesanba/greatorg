import { seedLegacySession } from "../support/session";

describe("Relatorios - dropdown de mes", () => {
  function openMonthDropdown() {
    cy.contains('[data-cy="reports-period-custom"]', "Personalizado").click();
    cy.contains("button", "Mês específico").click();
    cy.contains("button", "Agosto").click();
  }

  function validatePortalMenu() {
    cy.contains("button", "Janeiro").should("be.visible").then(($option) => {
      const optionEl = $option[0] as HTMLElement;
      const menuEl = optionEl.closest("div[style*='position: fixed']") as HTMLElement | null;

      expect(menuEl, "menu portal fixo").to.not.equal(null);

      const menu = menuEl as HTMLElement;
      const menuDocument = menu.ownerDocument;
      const style = window.getComputedStyle(menu);

      expect(style.position).to.equal("fixed");
      expect(style.zIndex).to.equal("999999");

      const menuRect = menu.getBoundingClientRect();
      const pdfRect = Cypress.$('[data-cy="reports-export-pdf"]')[0].getBoundingClientRect();
      const responsibleRect = Cypress.$('[data-cy="reports-filter-responsible-trigger"]')[0].getBoundingClientRect();
      const cardRect = Cypress.$('[data-cy^="reports-row-"]')[0].getBoundingClientRect();

      const samplePoints = [
        { x: menuRect.left + menuRect.width / 2, y: menuRect.top + 16 },
        { x: menuRect.left + menuRect.width / 2, y: menuRect.top + Math.min(menuRect.height / 2, 120) },
        { x: menuRect.left + menuRect.width / 2, y: menuRect.bottom - 16 },
      ];

      samplePoints.forEach((point) => {
        const topNode = menuDocument.elementFromPoint(point.x, point.y);
        expect(topNode && menu.contains(topNode), `menu no topo em ${point.x},${point.y}`).to.equal(true);
      });

      const assertTopmostInOverlap = (targetRect: DOMRect, label: string) => {
        const overlapLeft = Math.max(menuRect.left, targetRect.left) + 8;
        const overlapRight = Math.min(menuRect.right, targetRect.right) - 8;
        const overlapTop = Math.max(menuRect.top, targetRect.top) + 8;
        const overlapBottom = Math.min(menuRect.bottom, targetRect.bottom) - 8;

        if (overlapLeft < overlapRight && overlapTop < overlapBottom) {
          const topNode = menuDocument.elementFromPoint(overlapLeft, overlapTop);
          expect(topNode && menu.contains(topNode), `${label} nao cobre o menu na area de sobreposicao`).to.equal(true);
        } else {
          expect(menuRect.bottom <= targetRect.top || menuRect.top >= targetRect.bottom, `${label} fica fora da area do menu`).to.equal(true);
        }
      };

      assertTopmostInOverlap(pdfRect, "botao Baixar PDF");
      assertTopmostInOverlap(responsibleRect, "filtro de responsavel");
      assertTopmostInOverlap(cardRect, "cards inferiores");
    });
  }

  it("abre o menu de mes acima dos filtros, botoes e cards", () => {
    cy.viewport(1440, 1400);

    cy.visit("/reports", {
      onBeforeLoad(win) {
        seedLegacySession(win, 1);
      },
    });

    openMonthDropdown();
    validatePortalMenu();

    cy.screenshot("reports-month-dropdown-overlay");
  });

  it("mantem o menu na frente em viewport mobile", () => {
    cy.viewport(390, 844);

    cy.visit("/reports", {
      onBeforeLoad(win) {
        seedLegacySession(win, 1);
      },
    });

    openMonthDropdown();
    validatePortalMenu();
  });
});
