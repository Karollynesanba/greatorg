import { seedLegacySession } from "../support/session";

type HistoryRow = {
  id: number;
  sort_order: number;
  data: {
    id: number;
    type: "post" | "goal" | "schedule";
    title: string;
    description: string;
    authorId: number;
    date: string;
    result: string;
    metrics: string;
  };
};

function buildTeamProfiles() {
  return [
    {
      id: 1,
      name: "Brenda",
      role: "Social Media",
      avatar: "B",
      specialty: "Planejamento e operação",
      color: "#833AB4",
      stats: {
        postsCreated: 0,
        avgEngagement: 0,
        goalsCompleted: 0,
        performance: 0,
        punctuality: 0,
      },
      radar: [],
      monthlyPosts: [],
      email: "brenda@greatorganico.com",
      password: "Great2026!",
      avatarUrl: "",
      bio: "Cria e atribui tarefas.",
    },
    {
      id: 2,
      name: "Hannah",
      role: "Designer",
      avatar: "H",
      specialty: "Execução e acabamento",
      color: "#E1306C",
      stats: {
        postsCreated: 0,
        avgEngagement: 0,
        goalsCompleted: 0,
        performance: 0,
        punctuality: 0,
      },
      radar: [],
      monthlyPosts: [],
      email: "hannah@greatorganico.com",
      password: "Great2026!",
      avatarUrl: "",
      bio: "Recebe e executa tarefas.",
    },
    {
      id: 3,
      name: "Thiago",
      role: "Editor",
      avatar: "T",
      specialty: "Edição e publicação",
      color: "#3B82F6",
      stats: {
        postsCreated: 0,
        avgEngagement: 0,
        goalsCompleted: 0,
        performance: 0,
        punctuality: 0,
      },
      radar: [],
      monthlyPosts: [],
      email: "thiago@greatorganico.com",
      password: "Great2026!",
      avatarUrl: "",
      bio: "Organiza a pauta.",
    },
  ];
}

describe("Histórico", () => {
  it("alterna entre timeline e tabela, e permite clicar nos filtros", () => {
    const historyRows: HistoryRow[] = [
      {
        id: 101,
        sort_order: 0,
        data: {
          id: 101,
          type: "post",
          title: "Reels de lançamento",
          description: "Publicação de abertura da campanha da semana.",
          authorId: 1,
          date: "08/05/2026",
          result: "8,2k impressões",
          metrics: "1,4k interações",
        },
      },
      {
        id: 102,
        sort_order: 1,
        data: {
          id: 102,
          type: "goal",
          title: "Meta semanal aprovada",
          description: "Meta de engajamento validada pela equipe.",
          authorId: 2,
          date: "07/05/2026",
          result: "Meta concluída",
          metrics: "106% da meta",
        },
      },
      {
        id: 103,
        sort_order: 2,
        data: {
          id: 103,
          type: "schedule",
          title: "Post agendado",
          description: "Postagem do calendário enviada para aprovação.",
          authorId: 3,
          date: "06/05/2026",
          result: "Agendamento confirmado",
          metrics: "09:00",
        },
      },
    ];

    cy.intercept("GET", "**/rest/v1/team_profiles*", (req) => {
      req.reply(buildTeamProfiles());
    }).as("loadTeamProfiles");

    cy.intercept("GET", "**/rest/v1/app_preferences*", (req) => {
      const url = new URL(req.url);
      const key = url.searchParams.get("key") ?? "";

      if (key === "team-scope") {
        req.reply([{ value: "todos" }]);
        return;
      }

      req.reply([]);
    }).as("loadAppPreferences");

    cy.intercept("GET", "**/rest/v1/history_events*", (req) => {
      req.reply(historyRows);
    }).as("loadHistoryEvents");

    cy.intercept("POST", "**/rest/v1/history_events*", (req) => {
      if (Array.isArray(req.body)) {
        historyRows.splice(0, historyRows.length, ...req.body);
      }

      req.reply({ statusCode: 200, body: [] });
    }).as("saveHistoryEvents");

    cy.intercept("DELETE", "**/rest/v1/history_events*", (req) => {
      const url = new URL(req.url);
      const filter = url.searchParams.get("id") ?? "";
      const match = filter.match(/\d+/g);
      const idsToRemove = match?.map(Number) ?? [];

      if (idsToRemove.length > 0) {
        const ids = new Set(idsToRemove);
        historyRows.splice(0, historyRows.length, ...historyRows.filter((row) => !ids.has(row.id)));
      }

      req.reply({ statusCode: 200, body: [] });
    }).as("deleteHistoryEvents");

    cy.visit("/", {
      onBeforeLoad(win) {
        win.localStorage.clear();
        seedLegacySession(win, 1);
      },
    });

    cy.get('a[href="/history"]').click();
    cy.url().should("include", "/history");
    cy.wait(["@loadTeamProfiles", "@loadAppPreferences", "@loadHistoryEvents"]);

    cy.contains("Reels de lançamento").should("be.visible");
    cy.contains("Meta semanal aprovada").should("be.visible");
    cy.contains("Post agendado").should("be.visible");
    cy.get("table").should("not.exist");

    cy.get('[data-cy="history-view-tabela"]').click();
    cy.get("table").should("be.visible");
    cy.get("table tbody tr").should("have.length", 3);

    cy.get('[data-cy="history-filter-person-trigger"]').click();
    cy.get('[data-cy="history-filter-person-option-2"]').click();

    cy.get('[data-cy="history-filter-type-trigger"]').click();
    cy.get('[data-cy="history-filter-type-option-goal"]').click();

    cy.contains("Meta semanal aprovada").should("be.visible");
    cy.contains("Reels de lançamento").should("not.exist");
    cy.contains("Post agendado").should("not.exist");
    cy.get("table tbody tr").should("have.length", 1);

    cy.get('[data-cy="history-delete-table-102"]').click();
    cy.get('[data-cy="history-delete-cancel"]').click();
    cy.get("table tbody tr").should("have.length", 1);

    cy.get('[data-cy="history-delete-table-102"]').click();
    cy.get('[data-cy="history-delete-confirm"]').click();
    cy.wait(["@saveHistoryEvents", "@deleteHistoryEvents"]);
    cy.contains("Meta semanal aprovada").should("not.exist");

    cy.get('[data-cy="history-filter-person-trigger"]').click();
    cy.get('[data-cy="history-filter-person-option-todos"]').click();

    cy.get('[data-cy="history-filter-type-trigger"]').click();
    cy.get('[data-cy="history-filter-type-option-todos"]').click();

    cy.get('[data-cy="history-view-timeline"]').click();
    cy.contains("Reels de lançamento").should("be.visible");

    cy.get('[data-cy="history-view-tabela"]').click();
    cy.get("table tbody tr").should("have.length", 2);
    cy.contains("Meta semanal aprovada").should("not.exist");
  });
});
