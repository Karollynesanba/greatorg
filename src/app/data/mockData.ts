export type ContentType = "Reels" | "Stories" | "Carrossel" | "Feed";
export type PostStatus = "Agendado" | "Em produção" | "Aprovado" | "Publicado";
export type IdeaStatus = "Ideia" | "Em produção" | "Pronto";
export type TimelineType = "post" | "goal" | "schedule";
export type IdeaCategory = "Stories em foto" | "Stories em vídeo" | "Reels" | "Post" | "Carrossel" | "Feed";

export type TeamMember = {
  id: number;
  name: string;
  role: string;
  avatar: string;
  specialty: string;
  color: string;
  stats: {
    postsCreated: number;
    avgEngagement: number;
    goalsCompleted: number;
    performance: number;
    punctuality: number;
  };
  radar: {
    subject: string;
    value: number;
  }[];
  monthlyPosts: {
    month: string;
    posts: number;
  }[];
};

export type DashboardMetric = {
  id: string;
  label: string;
  value: string;
  change: number;
  highlight: string;
};

export type PostComment = {
  id: string;
  authorId: number;
  time: string;
  text: string;
};

export type PostFile = {
  id: string;
  name: string;
  size: string;
  kind: "video" | "image" | "pdf" | "doc";
};

export type PostChecklistItem = {
  id: string;
  label: string;
  done: boolean;
};

export type Post = {
  id: number;
  title: string;
  description: string;
  type: ContentType;
  authorId: number;
  engagement: number;
  reach: number;
  date: string;
  thumbnail: string;
  status: PostStatus;
  metrics: {
    likes: number;
    comments: number;
    saves: number;
    shares: number;
  };
  checklist: PostChecklistItem[];
  comments: PostComment[];
  files: PostFile[];
  script: {
    hook: string;
    development: string;
    solution: string;
    cta: string;
  };
  approval: {
    approvedBy: string;
    date: string;
  };
};

export type Goal = {
  id: number;
  name: string;
  category: string;
  responsibleId: number;
  responsibleIds?: number[];
  target: number;
  current: number;
  period: string;
  deadline: string;
  deadlineTime?: string;
  description: string;
  checklist?: GoalChecklistItem[];
};

export type GoalChecklistItem = {
  id: string;
  label: string;
  done: boolean;
};

export type CalendarChecklistItem = {
  id: string;
  label: string;
  done: boolean;
};

export function getGoalResponsibleIds(goal: Goal) {
  const ids = goal.responsibleIds?.filter((value, index, array) => array.indexOf(value) === index) ?? [];
  return ids.length > 0 ? ids : goal.responsibleId ? [goal.responsibleId] : [];
}

export function getGoalPrimaryResponsibleId(goal: Goal) {
  return getGoalResponsibleIds(goal)[0] ?? goal.responsibleId;
}

export type CalendarEvent = {
  id: number;
  title: string;
  description: string;
  type: ContentType;
  responsibleId: number;
  responsibleIds?: number[];
  addedById?: number;
  status: PostStatus;
  date: string;
  time: string;
  checklist?: CalendarChecklistItem[];
  completedAt?: string;
  completedById?: number;
};

export type StoryLog = {
  id: number;
  date: string;
  time: string;
  quantity: number;
  mediaType: "video" | "photo";
  madeById: number;
  postedById: number;
  notes: string;
};

export type Idea = {
  id: number;
  title: string;
  description: string;
  category: IdeaCategory;
  theme: string;
  status: IdeaStatus;
  script?: string;
  responsibleId: number;
  mediaSource?: "url" | "upload";
  mediaKind?: "photo" | "video";
  mediaUrl?: string;
  mediaFileName?: string;
};

export type HistoryEvent = {
  id: number;
  type: TimelineType;
  title: string;
  description: string;
  authorId: number;
  date: string;
  result: string;
  metrics?: string;
  completedAt?: string;
  source?: {
    kind: "calendar_event";
    eventId: number;
    memberId?: number;
  };
};

function pad(number: number) {
  return String(number).padStart(2, "0");
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  next.setHours(12, 0, 0, 0);
  return next;
}

function createRadarSeries(entries: Array<[string, number]>) {
  return entries.map(([subject, value]) => ({ subject, value }));
}

function createMonthlyPostsSeries(entries: Array<[string, number]>) {
  return entries.map(([month, posts]) => ({ month, posts }));
}

export const teamMembers: TeamMember[] = [
  {
    id: 1,
    name: "Brenda",
    role: "Video Maker",
    avatar: "B",
    specialty: "Gravacao, edicao e reels",
    color: "#833AB4",
    stats: {
      postsCreated: 28,
      avgEngagement: 7.4,
      goalsCompleted: 9,
      performance: 76,
      punctuality: 68,
    },
    radar: createRadarSeries([
      ["Execucao", 88],
      ["Criatividade", 92],
      ["Agilidade", 74],
      ["Qualidade", 85],
      ["Consistencia", 68],
    ]),
    monthlyPosts: createMonthlyPostsSeries([
      ["Jan", 7],
      ["Fev", 6],
      ["Mar", 8],
      ["Abr", 7],
      ["Mai", 9],
      ["Jun", 10],
    ]),
  },
  {
    id: 2,
    name: "Hannah",
    role: "Designer de Social",
    avatar: "H",
    specialty: "Artes estatica e stories",
    color: "#E1306C",
    stats: {
      postsCreated: 32,
      avgEngagement: 8.1,
      goalsCompleted: 11,
      performance: 81,
      punctuality: 91,
    },
    radar: createRadarSeries([
      ["Direcao de arte", 90],
      ["Velocidade", 78],
      ["Consistencia", 86],
      ["Detalhe", 94],
      ["Colaboracao", 82],
    ]),
    monthlyPosts: createMonthlyPostsSeries([
      ["Jan", 8],
      ["Fev", 9],
      ["Mar", 7],
      ["Abr", 10],
      ["Mai", 11],
      ["Jun", 12],
    ]),
  },
  {
    id: 3,
    name: "Thiago",
    role: "Designer Editorial",
    avatar: "T",
    specialty: "Carrosseis e capas",
    color: "#3B82F6",
    stats: {
      postsCreated: 24,
      avgEngagement: 6.8,
      goalsCompleted: 8,
      performance: 73,
      punctuality: 84,
    },
    radar: createRadarSeries([
      ["Layout", 89],
      ["Narrativa", 84],
      ["Rapidez", 71],
      ["Acabamento", 93],
      ["Consistencia", 77],
    ]),
    monthlyPosts: createMonthlyPostsSeries([
      ["Jan", 5],
      ["Fev", 6],
      ["Mar", 7],
      ["Abr", 6],
      ["Mai", 8],
      ["Jun", 9],
    ]),
  },
];

export const dashboardMetrics: DashboardMetric[] = [
  { id: "reach", label: "Alcance", value: "0", change: 0, highlight: "Sem dados cadastrados." },
  { id: "impressions", label: "Impressoes", value: "0", change: 0, highlight: "Sem dados cadastrados." },
  { id: "engagement", label: "Engajamento", value: "0", change: 0, highlight: "Sem dados cadastrados." },
  { id: "growth", label: "Crescimento", value: "0", change: 0, highlight: "Sem dados cadastrados." },
];

export const posts: Post[] = [];
export const topPosts = posts.slice(0, 5);
export const worstPosts = posts.slice(5, 7);

export const goals: Goal[] = (() => {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const yesterday = addDays(today, -1);
  const tomorrow = addDays(today, 1);
  const nextWeek = addDays(today, 7);

  return [
    {
      id: 1,
      name: "Entrega de reels da campanha",
      category: "Reels",
      responsibleId: 1,
      target: 4,
      current: 2,
      period: "Dia",
      deadline: formatDateKey(today),
      deadlineTime: "08:00",
      description: "Fechar a entrega dos reels do ciclo atual. A meta ja passou do prazo e precisa de ajuste imediato.",
      checklist: [
        { id: "goal-1-1", label: "Finalizar cortes", done: true },
        { id: "goal-1-2", label: "Ajustar legenda", done: false },
        { id: "goal-1-3", label: "Exportar e subir no drive", done: false },
      ],
    },
    {
      id: 2,
      name: "Pacote de stories da semana",
      category: "Stories",
      responsibleId: 2,
      target: 12,
      current: 9,
      period: "Semana",
      deadline: formatDateKey(tomorrow),
      deadlineTime: "18:00",
      description: "Manter a cadencia de stories com layout consistente e revisao antes do envio.",
      checklist: [
        { id: "goal-2-1", label: "Fechar os 3 primeiros layouts", done: true },
        { id: "goal-2-2", label: "Revisar tipografia", done: true },
        { id: "goal-2-3", label: "Preparar versao final", done: false },
      ],
    },
    {
      id: 3,
      name: "Carrossel editorial do ciclo",
      category: "Carrossel",
      responsibleId: 3,
      target: 6,
      current: 6,
      period: "Semana",
      deadline: formatDateKey(yesterday),
      deadlineTime: "15:00",
      description: "Meta concluida com antecedencia para manter a fila do calendario editorial em dia.",
      checklist: [
        { id: "goal-3-1", label: "Rascunho aprovado", done: true },
        { id: "goal-3-2", label: "Arte finalizada", done: true },
        { id: "goal-3-3", label: "Publicacao agendada", done: true },
      ],
    },
    {
      id: 4,
      name: "Pacote de ajustes para a proxima semana",
      category: "Feed",
      responsibleId: 1,
      responsibleIds: [1, 2, 3],
      target: 3,
      current: 1,
      period: "Semana",
      deadline: formatDateKey(nextWeek),
      deadlineTime: "10:00",
      description: "Reunir os materiais pendentes e redistribuir as entregas para o proximo ciclo.",
      checklist: [
        { id: "goal-4-1", label: "Separar referencias", done: true },
        { id: "goal-4-2", label: "Conferir responsaveis", done: false },
        { id: "goal-4-3", label: "Atualizar briefing", done: false },
      ],
    },
  ];
})();

export const calendarEvents: CalendarEvent[] = [
  {
    id: 1,
    title: "Alinhamento de stories do mes",
    description: "Brenda, Hannah e Thiago fecham o plano para bater 168 stories no periodo.",
    type: "Stories",
    responsibleId: 1,
    responsibleIds: [1, 2, 3],
    status: "Agendado",
    date: "2026-04-30",
    time: "09:00",
    checklist: [
      { id: "calendar-1-1", label: "Definir pauta", done: true },
      { id: "calendar-1-2", label: "Separar responsaveis", done: false },
      { id: "calendar-1-3", label: "Confirmar horario", done: false },
    ],
  },
  {
    id: 2,
    title: "Gravacao de reels",
    description: "Rodada de captação para os reels de conversao da semana.",
    type: "Reels",
    responsibleId: 1,
    responsibleIds: [1],
    status: "Em produção",
    date: "2026-05-01",
    time: "10:00",
    checklist: [
      { id: "calendar-2-1", label: "Gravar abertura", done: true },
      { id: "calendar-2-2", label: "Gravar cenas de apoio", done: false },
      { id: "calendar-2-3", label: "Salvar backups", done: false },
    ],
  },
  {
    id: 3,
    title: "Revisao do carrossel",
    description: "Hannah e Thiago validam a arte e a narrativa antes de publicar.",
    type: "Carrossel",
    responsibleId: 3,
    responsibleIds: [2, 3],
    status: "Aprovado",
    date: "2026-05-01",
    time: "14:00",
    checklist: [
      { id: "calendar-3-1", label: "Revisar copy", done: true },
      { id: "calendar-3-2", label: "Checar arte final", done: true },
      { id: "calendar-3-3", label: "Liberar agendamento", done: false },
    ],
  },
  {
    id: 4,
    title: "Stories de conversao",
    description: "Sequencia curta para aquecer audiencia e gerar resposta direta.",
    type: "Stories",
    responsibleId: 2,
    responsibleIds: [2],
    status: "Publicado",
    date: "2026-05-02",
    time: "08:30",
    checklist: [
      { id: "calendar-4-1", label: "Validar legenda", done: true },
      { id: "calendar-4-2", label: "Subir stories", done: true },
      { id: "calendar-4-3", label: "Monitorar respostas", done: false },
    ],
  },
  {
    id: 5,
    title: "Fechamento do ciclo",
    description: "Revisao final das entregas e pendencias para a proxima semana.",
    type: "Feed",
    responsibleId: 3,
    responsibleIds: [1, 3],
    status: "Agendado",
    date: "2026-05-03",
    time: "16:00",
    checklist: [
      { id: "calendar-5-1", label: "Fechar pendencias", done: true },
      { id: "calendar-5-2", label: "Revisar entregas", done: false },
      { id: "calendar-5-3", label: "Agendar proximos passos", done: false },
    ],
  },
];
export const storyLogs: StoryLog[] = [];
export const ideas: Idea[] = [];
export const historyTimeline: HistoryEvent[] = [
  {
    id: 1,
    type: "post",
    title: "Post de reels publicado",
    description: "Brenda publicou o reels de bastidores com fechamento forte.",
    authorId: 1,
    date: "2026-04-28",
    result: "4,8 mil de engajamento no primeiro dia",
    metrics: "54 mil de alcance",
  },
  {
    id: 2,
    type: "goal",
    title: "Meta de stories concluída",
    description: "A equipe fechou os 168 stories no período com uma distribuição flexível entre os três membros.",
    authorId: 2,
    date: "2026-04-30",
    result: "Meta coletiva batida",
    metrics: "100% concluído",
  },
  {
    id: 3,
    type: "schedule",
    title: "Calendário ajustado",
    description: "Thiago reorganizou a fila do carrossel para encaixar melhor a aprovação.",
    authorId: 3,
    date: "2026-05-01",
    result: "Entrega mantida dentro do prazo",
    metrics: "1 ajuste no fluxo",
  },
  {
    id: 4,
    type: "post",
    title: "Stories de conversão no ar",
    description: "Hannah publicou a sequência com foco em resposta e prova social.",
    authorId: 2,
    date: "2026-05-02",
    result: "Respostas orgânicas acima da média",
    metrics: "1,5 mil interações",
  },
  {
    id: 5,
    type: "goal",
    title: "Revisão do mês feita",
    description: "Fechamento com leitura dos cards, dos grupos e das próximas metas.",
    authorId: 1,
    date: "2026-05-03",
    result: "Planejamento do próximo ciclo iniciado",
    metrics: "4 metas acompanhadas",
  },
];

export const insights = {
  bestTime: {
    day: "Sem dados",
    hour: "--:--",
    engagement: 0,
  },
  bestContent: {
    type: "Sem dados",
    avgEngagement: "0%",
    avgReach: "0",
  },
  worstContent: {
    type: "Sem dados",
    avgEngagement: "0%",
    avgReach: "0",
  },
  growthTrend: {
    direction: "Sem dados",
    rate: "0%",
    prediction: "Nenhuma informacao disponivel ainda.",
  },
  recommendations: [],
};

export const contentDistribution = [
  { name: "Reels", value: 0, color: "#D10000" },
  { name: "Stories", value: 0, color: "#FF9500" },
  { name: "Carrossel", value: 0, color: "#34C759" },
  { name: "Feed", value: 0, color: "#007AFF" },
];

export const evolutionData: Array<{ date: string; reach: number; engagement: number; followers: number }> = [];

export const metaPeriods = ["Dia", "Semana", "Mês"] as const;

export const apiStatus = {
  connected: false,
  lastUpdated: "Sem dados",
};

export const dashboardSummary = {
  healthScore: 0,
  completedGoals: 0,
  totalReach: 0,
  totalEngagement: 0,
};

export const weekLabel = "Sem dados";

export const typeColors: Record<ContentType, string> = {
  Reels: "#D10000",
  Stories: "#FF9500",
  Carrossel: "#34C759",
  Feed: "#007AFF",
};

export const statusColors: Record<PostStatus, string> = {
  Agendado: "#FF9500",
  "Em produção": "#007AFF",
  Aprovado: "#34C759",
  Publicado: "#8B5CF6",
};

export const timelineTypeColors: Record<TimelineType, string> = {
  post: "#D10000",
  goal: "#34C759",
  schedule: "#007AFF",
};

export const daysOfWeek = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"];
export const calendarHours = Array.from({ length: 13 }, (_, index) => `${String(index + 8).padStart(2, "0")}:00`);
