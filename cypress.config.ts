import { defineConfig } from "cypress";

// Default to the local Vite dev server used in this workspace.
// Override with CYPRESS_BASE_URL when you want to target preview or another host.
const baseUrl = process.env.CYPRESS_BASE_URL?.trim() || "http://localhost:5173";

export default defineConfig({
  e2e: {
    baseUrl,
    specPattern: "cypress/e2e/**/*.cy.ts",
    supportFile: "cypress/support/e2e.ts",
    video: false,
    screenshotOnRunFailure: true,
  },
  viewportWidth: 1440,
  viewportHeight: 960,
  defaultCommandTimeout: 10000,
});
