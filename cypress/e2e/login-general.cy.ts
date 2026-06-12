const quickAccessUsers = [
  { dataCy: "login-admin-quick-access", name: "Brenda", email: "brendarayssa2706@gmail.com" },
  { dataCy: "login-quick-access-2", name: "Hannah", email: "hannahleticia13@gmail.com" },
  { dataCy: "login-quick-access-3", name: "Thiago", email: "thiagomarquesdev23@hotmail.com" },
];

describe("Login geral", () => {
  quickAccessUsers.forEach(({ dataCy, name, email }) => {
    it(`preenche o email e autentica ${name}`, () => {
      cy.visit("/", {
        onBeforeLoad(win) {
          win.localStorage.clear();
        },
      });

      cy.contains("Entrar na plataforma").should("be.visible");
      cy.get(`[data-cy="${dataCy}"]`).should("be.visible").click();
      cy.get('[data-cy="login-email"]').should("have.value", email);
      cy.get('[data-cy="login-password"]').clear().type("Great2026!");
      cy.get('[data-cy="login-submit"]').click();

      cy.url().should("include", "/dashboard");
      cy.get('[data-cy="dashboard-summary"]').should("be.visible");

      cy.get('[aria-label="Meu Perfil"]').click();
      cy.url().should("include", "/profile");
      cy.get('[data-cy="profile-name"]').should("contain.text", name);
    });
  });
});
