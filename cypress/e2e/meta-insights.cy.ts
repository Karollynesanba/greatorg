import { seedLegacySession } from "../support/session";

describe("Meta Insights", () => {
  it("abre a tela e alterna dia, semana e mes", () => {
    cy.intercept("GET", "**/api/meta-insights*", {
      connected: true,
      updatedAt: new Date("2026-05-08T12:00:00Z").toISOString(),
      rangeDays: 30,
      source: {
        pageId: "123",
        pageName: "Great Organico",
        instagramUserId: "999",
        instagramUsername: "great.organico",
      },
      summary: {
        reach: 60000,
        views: 90000,
        profileViews: 30000,
        followers: 3330,
        accountsEngaged: 390,
        totalInteractions: 960,
        mediaCount: 6,
        engagementRate: 4.8,
      },
      breakdown: {
        instagram: {
          connected: true,
          label: "Instagram",
          summary: {
            reach: 60000,
            views: 90000,
            profileViews: 30000,
            followers: 1530,
            accountsEngaged: 150,
            totalInteractions: 360,
            mediaCount: 3,
            engagementRate: 4.8,
          },
          trend: [],
          audience: {
            countries: [],
            cities: [],
            genderAge: [],
            locales: [],
          },
          media: [],
        },
        facebook: {
          connected: true,
          label: "Facebook",
          summary: {
            reach: 12000,
            views: 18000,
            profileViews: 0,
            followers: 1800,
            accountsEngaged: 240,
            totalInteractions: 600,
            mediaCount: 3,
            engagementRate: 5,
          },
          trend: [],
          audience: {
            countries: [],
            cities: [],
            genderAge: [],
            locales: [],
          },
          media: [],
          pageFollowers: 1800,
          pageFans: 1700,
        },
      },
      trend: [],
      audience: {
        countries: [],
        cities: [],
        genderAge: [],
        locales: [],
      },
      media: [],
      notes: [],
    }).as("loadMetaInsights");

    cy.visit("/meta-insights", {
      onBeforeLoad(win) {
        seedLegacySession(win, 1);
      },
    });

    cy.contains("Insights reais de Instagram e Facebook").should("be.visible");
    cy.wait("@loadMetaInsights");

    cy.get('[data-cy="meta-period-day"]').click({ force: true });
    cy.get('[data-cy="meta-period-day"]').should("have.class", "bg-primary");
    cy.get('[data-cy="meta-period-week"]').click({ force: true });
    cy.get('[data-cy="meta-period-week"]').should("have.class", "bg-primary");
    cy.get('[data-cy="meta-period-month"]').click({ force: true });
    cy.get('[data-cy="meta-period-month"]').should("have.class", "bg-primary");
  });
});
