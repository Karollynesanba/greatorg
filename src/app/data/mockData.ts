import {
  seedCalendarEvents,
  seedGoals,
  seedHistoryTimeline,
  seedIdeas,
  seedPosts,
  seedTeamMembers,
} from "./siteSeed";

export type ContentType = "Reels" | "Stories" | "Carrossel" | "Feed";
export type PostStatus = "Agendado" | "Em produção" | "Aprovado" | "Publicado";
export type IdeaStatus = "Ideia" | "Em produção" | "Pronto";
export type TimelineType = "post" | "goal" | "schedule" | "idea";
export type IdeaCategory = "Stories em foto" | "Stories em vídeo" | "Reels" | "Post" | "Carrossel" | "Feed";
export type CalendarVisualizationType = "Carrossel" | "Depoimento" | "Agendamento" | "Material" | "Vídeo viral";

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
  visualization?: CalendarVisualizationType;
  tasks?: CalendarTaskItem[];
  checklist?: CalendarChecklistItem[];
  completed?: boolean;
  completedAt?: string;
  completedById?: number;
};

export type CalendarTaskItem = {
  id: string;
  label: string;
  note?: string;
  checklist?: boolean;
  done: boolean;
};

export type CalendarChecklistItem = CalendarTaskItem;

export type StoryLog = {
  id: number;
  date: string;
  time: string;
  quantity: number;
  mediaType: "video" | "photo";
  status?: "Agendado" | "Publicado" | "Rascunho";
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

export const teamMembers: TeamMember[] = seedTeamMembers.map((member) =>
  member.name === "Brenda"
    ? {
        ...member,
        stats: {
          ...member.stats,
          postsCreated: 43,
        },
      }
    : member.name === "Hannah" || member.name === "Thiago"
      ? {
          ...member,
          stats: {
            ...member.stats,
            goalsCompleted: 9,
          },
        }
      : member,
);

export const dashboardMetrics: DashboardMetric[] = [
  { id: "reach", label: "Alcance", value: "0", change: 0, highlight: "Sem dados cadastrados." },
  { id: "impressions", label: "Impressões", value: "0", change: 0, highlight: "Sem dados cadastrados." },
  { id: "engagement", label: "Engajamento", value: "0", change: 0, highlight: "Sem dados cadastrados." },
  { id: "growth", label: "Crescimento", value: "0", change: 0, highlight: "Sem dados cadastrados." },
];

export const posts: Post[] = seedPosts;
export const topPosts = posts.slice(0, 5);
export const worstPosts = posts.slice(5, 7);

export const goals: Goal[] = seedGoals;
export const calendarEvents: CalendarEvent[] = seedCalendarEvents;

const juneStoryMediaByHistoryId: Record<number, StoryLog["mediaType"]> = {
  100006: "video",
  100007: "photo",
  100008: "photo",
  100009: "video",
  100010: "photo",
  100011: "video",
  100012: "photo",
  100013: "photo",
  100014: "photo",
  100015: "video",
  100016: "video",
  100017: "photo",
};

function extractStoryQuantity(metrics?: string) {
  const match = metrics?.match(/(\d+)/);
  return match ? Number(match[1]) : 0;
}

function extractStoryTime(description: string) {
  const match = description.match(/em (\d{4}-\d{2}-\d{2}) (\d{2}:\d{2})\./);
  return match?.[2] ?? "09:00";
}

export const storyLogs: StoryLog[] = seedHistoryTimeline
  .filter((entry) => entry.id >= 100006 && entry.id <= 100017)
  .map((entry) => ({
    id: entry.id - 100000,
    date: entry.date,
    time: extractStoryTime(entry.description),
    quantity: extractStoryQuantity(entry.metrics),
    mediaType: juneStoryMediaByHistoryId[entry.id] ?? "photo",
    madeById: entry.authorId,
    postedById: juneStoryMediaByHistoryId[entry.id] === "video" ? 2 : 3,
    notes: entry.description,
  }));

export const ideas: Idea[] = seedIdeas;
export const historyTimeline: HistoryEvent[] = seedHistoryTimeline;

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
  idea: "#F59E0B",
};

export const daysOfWeek = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
export const calendarHours = Array.from({ length: 13 }, (_, index) => `${String(index + 8).padStart(2, "0")}:00`);

