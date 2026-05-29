const quickAccessUsers = [
  { dataCy: "login-admin-quick-access", name: "Brenda" },
  { dataCy: "login-quick-access-2", name: "Hannah" },
  { dataCy: "login-quick-access-3", name: "Thiago" },
];

describe("Login geral", () => {
  quickAccessUsers.forEach(({ dataCy, name }) => {
    it(`abre o app ao clicar no atalho de ${name}`, () => {
      cy.visit("/", {
        onBeforeLoad(win) {
          win.localStorage.clear();
        },
      });

      cy.contains("Entrar na plataforma").should("be.visible");
      cy.get(`[data-cy="${dataCy}"]`).should("be.visible").click();

      cy.url().should("include", "/dashboard");
      cy.get('[data-cy="dashboard-summary"]').should("be.visible");

      cy.get('[aria-label="Meu Perfil"]').click();
      cy.url().should("include", "/profile");
      cy.get('[data-cy="profile-name"]').should("contain.text", name);
    });
  });
});
