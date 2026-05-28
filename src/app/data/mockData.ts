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
  status?: "Em andamento" | "Concluída" | "Atrasada" | "Pausada";
  priority?: "Alta" | "Média" | "Baixa";
  notes?: string;
  responsibleId: number;
  responsibleIds?: number[];
  target: number;
  current: number;
  period: string;
  deadline: string;
  deadlineTime?: string;
  description: string;
  checklist?: GoalChecklistItem[];
  history?: GoalValueEntry[];
};

export type GoalChecklistItem = {
  id: string;
  label: string;
  done: boolean;
};

export type GoalValueEntry = {
  id: string;
  date: string;
  value: number;
  total: number;
  addedById: number;
  note?: string;
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
  tasks?: CalendarTaskItem[];
  completed?: boolean;
};

export type CalendarTaskItem = {
  id: string;
  label: string;
  note?: string;
  checklist?: boolean;
  done: boolean;
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
};

export const teamMembers: TeamMember[] = [
  {
    id: 1,
    name: "Brenda",
    role: "Diretora Criativa",
    avatar: "B",
    specialty: "Gravação, edição e reels",
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
  },
  {
    id: 2,
    name: "Hannah",
    role: "Designer de Social",
    avatar: "H",
    specialty: "Artes estáticas e stories",
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
  },
  {
    id: 3,
    name: "Thiago",
    role: "Designer Editorial",
    avatar: "T",
    specialty: "Carrosséis e capas",
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
  },
];

export const dashboardMetrics: DashboardMetric[] = [
  { id: "reach", label: "Alcance", value: "0", change: 0, highlight: "Sem dados cadastrados." },
  { id: "impressions", label: "Impressões", value: "0", change: 0, highlight: "Sem dados cadastrados." },
  { id: "engagement", label: "Engajamento", value: "0", change: 0, highlight: "Sem dados cadastrados." },
  { id: "growth", label: "Crescimento", value: "0", change: 0, highlight: "Sem dados cadastrados." },
];

export const posts: Post[] = [];
export const topPosts = posts.slice(0, 5);
export const worstPosts = posts.slice(5, 7);

export const goals: Goal[] = [];
export const calendarEvents: CalendarEvent[] = [];
export const storyLogs: StoryLog[] = [];
export const ideas: Idea[] = [];
export const historyTimeline: HistoryEvent[] = [];

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
    prediction: "Nenhuma informação disponível ainda.",
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

export const daysOfWeek = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
export const calendarHours = Array.from({ length: 13 }, (_, index) => `${String(index + 8).padStart(2, "0")}:00`);

