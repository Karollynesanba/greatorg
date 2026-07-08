const quickAccessUsers = [
  { dataCy: "login-admin-quick-access", name: "Brenda", email: "brendarayssa2706@gmail.com" },
  { dataCy: "login-quick-access-2", name: "Hannah", email: "hannahleticia13@gmail.com" },
  { dataCy: "login-quick-access-3", name: "Thiago", email: "thiagomarquesdev23@hotmail.com" },
];

describe("Login geral", () => {
  quickAccessUsers.forEach(({ dataCy, name }) => {
    it(`autentica ${name} com um clique`, () => {
      cy.visit("/", {
        onBeforeLoad(win) {
          win.localStorage.clear();
        },
      });

      cy.contains("Entrar na plataforma").should("be.visible");
      cy.get(`[data-cy="${dataCy}"]`).should("be.visible").click();

      cy.url().should("include", "/dashboard");
      cy.get('[data-cy="dashboard-summary"]').should("be.visible");
      cy.get('[aria-label="Meu Perfil"]').should("contain.text", name);
    });
  });
});
