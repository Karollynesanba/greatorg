type MetaPayload = {
  connected: boolean;
  updatedAt: string;
  rangeDays: number;
  source: {
    pageId: string;
    pageName: string;
    instagramUserId: string;
    instagramUsername: string | null;
  };
  summary: {
    reach: number;
    views: number;
    profileViews: number;
    followers: number;
    accountsEngaged: number;
    totalInteractions: number;
    mediaCount: number;
    engagementRate: number;
  };
  trend: Array<{
    date: string;
    reach: number;
    views: number;
    profileViews: number;
    followers: number;
  }>;
  audience: {
    countries: Array<{ label: string; value: number }>;
    cities: Array<{ label: string; value: number }>;
    genderAge: Array<{ label: string; value: number }>;
    locales: Array<{ label: string; value: number }>;
  };
  media: Array<{
    id: string;
    caption: string;
    mediaType: string;
    permalink: string;
    timestamp: string;
    thumbnailUrl?: string;
    likeCount: number;
    commentsCount: number;
    reach: number;
    views: number;
    engagement: number;
    saved: number;
  }>;
  notes: string[];
};

const authStorageKey = "great-organico-authenticated";
const authMemberIdKey = "great-organico-authenticated-member-id";

function svgDataUrl(label: string, color: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><rect width="800" height="600" rx="48" fill="${color}"/><text x="400" y="312" text-anchor="middle" font-family="Arial, sans-serif" font-size="64" font-weight="700" fill="white">${label}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function buildTrend(days: number, base: number) {
  const points = Math.max(days, 2);

  return Array.from({ length: points }, (_, index) => {
    const current = index + 1;

    return {
      date: `2026-05-${String(current).padStart(2, "0")}`,
      reach: base + index * 250,
      views: base + index * 180,
      profileViews: base / 2 + index * 90,
      followers: 1200 + index * 12,
    };
  });
}

function buildMedia(days: number) {
  const items = days === 1 ? 1 : days === 7 ? 2 : 3;

  return Array.from({ length: items }, (_, index) => {
    const number = index + 1;
    return {
      id: `media-${days}-${number}`,
      caption: `Conteúdo ${number} do período ${days}`,
      mediaType: number % 2 === 0 ? "CAROUSEL" : "IMAGE",
      permalink: `https://instagram.com/p/media-${days}-${number}`,
      timestamp: `2026-05-${String(number).padStart(2, "0")}T12:00:00Z`,
      thumbnailUrl: svgDataUrl(`D${days}-${number}`, number % 2 === 0 ? "#E1306C" : "#833AB4"),
      likeCount: 1000 + days * 10 + index * 50,
      commentsCount: 40 + index * 4,
      reach: 3000 + days * 100 + index * 120,
      views: 4000 + days * 120 + index * 180,
      engagement: 600 + days * 15 + index * 25,
      saved: 80 + index * 6,
    };
  });
}

function buildPayload(days: number): MetaPayload {
  const base = days * 1000;

  return {
    connected: true,
    updatedAt: new Date("2026-05-08T12:00:00Z").toISOString(),
    rangeDays: days,
    source: {
      pageId: "123",
      pageName: "Great Orgânico",
      instagramUserId: "999",
      instagramUsername: "great.organico",
    },
    summary: {
      reach: base * 2,
      views: base * 3,
      profileViews: base,
      followers: 1500 + days,
      accountsEngaged: 120 + days,
      totalInteractions: 300 + days * 2,
      mediaCount: buildMedia(days).length,
      engagementRate: 4.5 + days * 0.1,
    },
    trend: buildTrend(days, base),
    audience: {
      countries: [
        { label: "Brasil", value: 1200 + days },
        { label: "Portugal", value: 300 + days },
      ],
      cities: [
        { label: "Fortaleza", value: 500 + days },
        { label: "São Paulo", value: 420 + days },
      ],
      genderAge: [
        { label: "25-34", value: 700 + days },
        { label: "35-44", value: 200 + days },
      ],
      locales: [{ label: "pt-BR", value: 1000 + days }],
    },
    media: buildMedia(days),
    notes: [`stub ${days}`],
  };
}

describe("Meta Insights", () => {
  it("filtra por dia, semana e mês e mostra imagens dos conteúdos", () => {
    cy.intercept("GET", "**/api/meta-insights*", (req) => {
      const daysParam = Array.isArray(req.query.days) ? req.query.days[0] : req.query.days;
      const days = Number(daysParam ?? 30);
      req.reply(buildPayload(Number.isFinite(days) ? days : 30));
    });

    cy.visit("/", {
      onBeforeLoad(win) {
        win.localStorage.removeItem(authStorageKey);
        win.localStorage.removeItem(authMemberIdKey);
      },
    });

    cy.contains("Entrar na plataforma").should("be.visible");
    cy.get('[data-cy="login-admin-quick-access"]').click();

    cy.contains("Dashboard").should("be.visible");
    cy.contains("Meta Insights").click();

    cy.get('[data-cy="meta-summary-shell"]').should("be.visible");
    cy.get('[data-cy="meta-range-label"]').should("contain.text", "Últimos 30 dias");
    cy.get('[data-cy="meta-media-card"]').should("have.length", 3);
    cy.get('[data-cy="meta-media-image"]').should("have.length", 3);
    cy.get('[data-cy="meta-media-image"]').first().should("have.attr", "src").and("include", "data:image/svg+xml");

    cy.get('[data-cy="meta-period-day"]').click();
    cy.get('[data-cy="meta-range-label"]').should("contain.text", "Últimos 1 dias");
    cy.get('[data-cy="meta-media-card"]').should("have.length", 1);
    cy.get('[data-cy="meta-media-image"]').should("have.length", 1);
    cy.get('[data-cy="meta-media-image"]').first().should("have.attr", "src").and("include", "D1-1");

    cy.get('[data-cy="meta-period-week"]').click();
    cy.get('[data-cy="meta-range-label"]').should("contain.text", "Últimos 7 dias");
    cy.get('[data-cy="meta-media-card"]').should("have.length", 2);
    cy.get('[data-cy="meta-media-image"]').should("have.length", 2);
    cy.get('[data-cy="meta-media-image"]').first().should("have.attr", "src").and("include", "D7-1");

    cy.get('[data-cy="meta-period-month"]').click();
    cy.get('[data-cy="meta-range-label"]').should("contain.text", "Últimos 30 dias");
    cy.get('[data-cy="meta-media-card"]').should("have.length", 3);
    cy.get('[data-cy="meta-media-image"]').should("have.length", 3);
    cy.get('[data-cy="meta-media-image"]').first().should("have.attr", "src").and("include", "D30-1");
  });
});
