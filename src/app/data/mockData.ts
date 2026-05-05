const createThumbnail = (title: string, start: string, end: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="${start}" />
          <stop offset="100%" stop-color="${end}" />
        </linearGradient>
      </defs>
      <rect width="640" height="400" rx="40" fill="url(#g)" />
      <circle cx="548" cy="92" r="56" fill="rgba(255,255,255,0.16)" />
      <circle cx="96" cy="302" r="92" fill="rgba(255,255,255,0.12)" />
      <text x="54" y="150" fill="white" font-family="Inter, Arial, sans-serif" font-size="24" opacity="0.86">Great Orgânico</text>
      <text x="54" y="218" fill="white" font-family="Inter, Arial, sans-serif" font-weight="700" font-size="34">${title}</text>
    </svg>
  `)}`;

export type ContentType = "Reels" | "Stories" | "Carrossel" | "Feed";
export type PostStatus = "Agendado" | "Em produção" | "Aprovado" | "Publicado";
export type IdeaStatus = "Ideia" | "Em produção" | "Pronto";
export type TimelineType = "post" | "goal" | "schedule";

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
  description: string;
};

export function getGoalResponsibleIds(goal: Goal) {
  const ids = goal.responsibleIds?.filter((value, index, array) => array.indexOf(value) === index) ?? [];

  if (ids.length > 0) {
    return ids;
  }

  return goal.responsibleId ? [goal.responsibleId] : [];
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
  status: PostStatus;
  date: string;
  time: string;
};

export type Idea = {
  id: number;
  title: string;
  description: string;
  theme: string;
  status: IdeaStatus;
  script?: string;
  responsibleId: number;
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
    role: "Vídeo Maker",
    avatar: "B",
    specialty: "Gravação, edição e reels",
      color: "#833AB4",
    stats: {
      postsCreated: 42,
      avgEngagement: 7.8,
      goalsCompleted: 5,
      performance: 91,
      punctuality: 94,
    },
    radar: [
      { subject: "Criatividade", value: 92 },
      { subject: "Pontualidade", value: 94 },
      { subject: "Qualidade", value: 90 },
      { subject: "Engajamento", value: 88 },
      { subject: "Produtividade", value: 86 },
    ],
    monthlyPosts: [
      { month: "Jan", posts: 8 },
      { month: "Fev", posts: 9 },
      { month: "Mar", posts: 11 },
      { month: "Abr", posts: 14 },
    ],
  },
  {
    id: 2,
    name: "Hannah",
    role: "Designer de Social",
    avatar: "H",
    specialty: "Artes estáticas e stories",
      color: "#E1306C",
    stats: {
      postsCreated: 38,
      avgEngagement: 6.9,
      goalsCompleted: 4,
      performance: 88,
      punctuality: 96,
    },
    radar: [
      { subject: "Criatividade", value: 89 },
      { subject: "Pontualidade", value: 96 },
      { subject: "Qualidade", value: 91 },
      { subject: "Engajamento", value: 82 },
      { subject: "Produtividade", value: 87 },
    ],
    monthlyPosts: [
      { month: "Jan", posts: 10 },
      { month: "Fev", posts: 8 },
      { month: "Mar", posts: 9 },
      { month: "Abr", posts: 11 },
    ],
  },
  {
    id: 3,
    name: "Thiago",
    role: "Designer Editorial",
    avatar: "T",
    specialty: "Carrosséis e capas",
      color: "#FCAF45",
    stats: {
      postsCreated: 35,
      avgEngagement: 7.2,
      goalsCompleted: 4,
      performance: 86,
      punctuality: 89,
    },
    radar: [
      { subject: "Criatividade", value: 86 },
      { subject: "Pontualidade", value: 89 },
      { subject: "Qualidade", value: 92 },
      { subject: "Engajamento", value: 84 },
      { subject: "Produtividade", value: 83 },
    ],
    monthlyPosts: [
      { month: "Jan", posts: 7 },
      { month: "Fev", posts: 8 },
      { month: "Mar", posts: 9 },
      { month: "Abr", posts: 11 },
    ],
  },
];

export const dashboardMetrics: DashboardMetric[] = [
  {
    id: "reach",
    label: "Alcance",
    value: "125.400",
    change: 12.5,
    highlight: "Impulsionado por reels educacionais.",
  },
  {
    id: "impressions",
    label: "Impressões",
    value: "248.900",
    change: 8.3,
    highlight: "Stories com frequência estável na semana.",
  },
  {
    id: "engagement",
    label: "Engajamento",
    value: "18.750",
    change: -3.2,
    highlight: "Carrosséis comerciais abaixo do esperado.",
  },
  {
    id: "growth",
    label: "Crescimento",
    value: "+1.250",
    change: 15.7,
    highlight: "Base de seguidores acelerando com conteúdo de bastidor.",
  },
];

export const posts: Post[] = [
  {
    id: 1,
    title: "5 erros que travam sua organização",
    description: "Reels educativo com dicas práticas e CTA para salvar o conteúdo.",
    type: "Reels",
    authorId: 1,
    engagement: 5420,
    reach: 31800,
    date: "2026-04-23",
    thumbnail: createThumbnail("Reels Educativo", "#D10000", "#FF7A59"),
    status: "Publicado",
    metrics: {
      likes: 3120,
      comments: 188,
      saves: 1540,
      shares: 572,
    },
    checklist: [
      { id: "c1", label: "Brief alinhado com estratégia", done: true },
      { id: "c2", label: "Captação finalizada", done: true },
      { id: "c3", label: "Legenda revisada", done: true },
      { id: "c4", label: "CTA validada pelo time", done: false },
    ],
    comments: [
      { id: "cm1", authorId: 2, time: "há 3h", text: "A thumb ficou forte e ajudou muito no CTR." },
      { id: "cm2", authorId: 3, time: "há 1h", text: "Podemos testar uma variação de capa com mais contraste na próxima." },
    ],
    files: [
      { id: "f1", name: "reels-final.mp4", size: "28 MB", kind: "video" },
      { id: "f2", name: "thumb-v3.png", size: "2.8 MB", kind: "image" },
      { id: "f3", name: "roteiro-aprovado.pdf", size: "420 KB", kind: "pdf" },
    ],
    script: {
      hook: "Você sente que está fazendo muito e entregando pouco?",
      development: "Mostrar 5 erros comuns de organização em rotinas de conteúdo.",
      solution: "Apresentar ajustes simples e acionáveis para o time implementar.",
      cta: "Salve este vídeo e compartilhe com quem precisa organizar a operação.",
    },
    approval: {
      approvedBy: "Direção Great",
      date: "2026-04-22 17:40",
    },
  },
  {
    id: 2,
    title: "Checklist visual para social media",
    description: "Carrossel com framework de revisão antes de publicar.",
    type: "Carrossel",
    authorId: 3,
    engagement: 4310,
    reach: 27400,
    date: "2026-04-20",
    thumbnail: createThumbnail("Checklist de Revisão", "#007AFF", "#33C3F0"),
    status: "Publicado",
    metrics: {
      likes: 2290,
      comments: 132,
      saves: 1421,
      shares: 467,
    },
    checklist: [
      { id: "c1", label: "Estrutura do carrossel aprovada", done: true },
      { id: "c2", label: "CTA da última página revisada", done: true },
      { id: "c3", label: "Legenda aprovada", done: true },
    ],
    comments: [
      { id: "cm1", authorId: 1, time: "há 9h", text: "Esse formato está puxando muito save, vale repetir." },
    ],
    files: [
      { id: "f1", name: "carrossel-arte.ai", size: "6.2 MB", kind: "doc" },
      { id: "f2", name: "carrossel-export.zip", size: "18 MB", kind: "image" },
    ],
    script: {
      hook: "Antes de postar, confira estes 6 pontos.",
      development: "Cada slide apresenta uma camada do processo editorial.",
      solution: "Ao final, o público tem um checklist aplicável no mesmo dia.",
      cta: "Compartilhe com seu time para padronizar a operação.",
    },
    approval: {
      approvedBy: "Coordenação Criativa",
      date: "2026-04-18 15:10",
    },
  },
  {
    id: 3,
    title: "Bastidores da semana Great",
    description: "Sequência de stories mostrando gravação e rotina interna.",
    type: "Stories",
    authorId: 2,
    engagement: 3180,
    reach: 22400,
    date: "2026-04-18",
    thumbnail: createThumbnail("Bastidores Stories", "#34C759", "#AEEA6F"),
    status: "Publicado",
    metrics: {
      likes: 1240,
      comments: 91,
      saves: 807,
      shares: 214,
    },
    checklist: [
      { id: "c1", label: "Sequência de stories alinhada", done: true },
      { id: "c2", label: "Links revisados", done: true },
      { id: "c3", label: "Sticker de enquete configurado", done: false },
    ],
    comments: [
      { id: "cm1", authorId: 3, time: "ontem", text: "A narrativa ficou boa, podemos estender para um reels de bastidores." },
    ],
    files: [
      { id: "f1", name: "stories-pack.mov", size: "15 MB", kind: "video" },
      { id: "f2", name: "stickers.png", size: "1.3 MB", kind: "image" },
    ],
    script: {
      hook: "Vem ver o que rolou nos bastidores da semana.",
      development: "Mostrar processo de produção, reuniões e preparação de posts.",
      solution: "Conectar rotina a resultados de conteúdo de forma leve.",
      cta: "Responder com uma dúvida para virar conteúdo da próxima semana.",
    },
    approval: {
      approvedBy: "Social Lead",
      date: "2026-04-17 10:00",
    },
  },
  {
    id: 4,
    title: "Case: cronograma que dobrou consistência",
    description: "Feed estático com narrativa de case e resultado final.",
    type: "Feed",
    authorId: 2,
    engagement: 2970,
    reach: 19600,
    date: "2026-04-15",
    thumbnail: createThumbnail("Case em Feed", "#111827", "#6B7280"),
    status: "Publicado",
    metrics: {
      likes: 1680,
      comments: 102,
      saves: 764,
      shares: 198,
    },
    checklist: [
      { id: "c1", label: "Texto principal revisado", done: true },
      { id: "c2", label: "Versão final exportada", done: true },
    ],
    comments: [
      { id: "cm1", authorId: 1, time: "2 dias atrás", text: "Boa peça para pinarmos no perfil por mais tempo." },
    ],
    files: [{ id: "f1", name: "feed-case-vfinal.png", size: "4.1 MB", kind: "image" }],
    script: {
      hook: "Como um cronograma simples dobrou nossa consistência?",
      development: "Mostrar antes, durante e depois da organização operacional.",
      solution: "Explicar o framework aplicado e os ganhos percebidos.",
      cta: "Comente 'cronograma' para receber o modelo.",
    },
    approval: {
      approvedBy: "Direção Great",
      date: "2026-04-14 19:05",
    },
  },
  {
    id: 5,
    title: "Capas que aumentam retenção",
    description: "Carrossel com exemplos práticos de design para retenção.",
    type: "Carrossel",
    authorId: 3,
    engagement: 2850,
    reach: 18200,
    date: "2026-04-11",
    thumbnail: createThumbnail("Capas com Retenção", "#8B5CF6", "#EC4899"),
    status: "Publicado",
    metrics: {
      likes: 1510,
      comments: 74,
      saves: 930,
      shares: 168,
    },
    checklist: [
      { id: "c1", label: "Exemplos aprovados", done: true },
      { id: "c2", label: "Texto adaptado para mobile", done: true },
      { id: "c3", label: "Ordem de slides revisada", done: false },
    ],
    comments: [
      { id: "cm1", authorId: 2, time: "4 dias atrás", text: "Tema excelente para virar uma série recorrente." },
    ],
    files: [
      { id: "f1", name: "capas-referencias.pdf", size: "2.1 MB", kind: "pdf" },
      { id: "f2", name: "carrossel-capas.fig", size: "9.8 MB", kind: "doc" },
    ],
    script: {
      hook: "Capas boas seguram o olhar antes de qualquer swipe.",
      development: "Apontar padrões de contraste, título e enquadramento.",
      solution: "Traduzir os padrões em um checklist visual aplicável.",
      cta: "Salve para consultar na próxima criação.",
    },
    approval: {
      approvedBy: "Coordenação Criativa",
      date: "2026-04-10 11:20",
    },
  },
  {
    id: 6,
    title: "Story de bastidor sem CTA",
    description: "Story leve que performou abaixo do esperado por falta de ação clara.",
    type: "Stories",
    authorId: 2,
    engagement: 740,
    reach: 10400,
    date: "2026-04-09",
    thumbnail: createThumbnail("Story sem CTA", "#FF9500", "#FFD60A"),
    status: "Publicado",
    metrics: {
      likes: 310,
      comments: 12,
      saves: 96,
      shares: 18,
    },
    checklist: [
      { id: "c1", label: "Objetivo definido", done: false },
      { id: "c2", label: "CTA de resposta incluída", done: false },
    ],
    comments: [
      { id: "cm1", authorId: 1, time: "1 semana atrás", text: "Faltou uma pergunta clara para puxar interação." },
    ],
    files: [{ id: "f1", name: "story-v1.mp4", size: "7.6 MB", kind: "video" }],
    script: {
      hook: "Mostrando o bastidor do dia.",
      development: "Cenas rápidas sem contexto de resultado.",
      solution: "Adicionar enquete ou pergunta na próxima versão.",
      cta: "Responder com uma dúvida sobre processo.",
    },
    approval: {
      approvedBy: "Social Lead",
      date: "2026-04-08 09:10",
    },
  },
  {
    id: 7,
    title: "Feed institucional genérico",
    description: "Peça institucional com pouco contexto e baixa retenção.",
    type: "Feed",
    authorId: 3,
    engagement: 620,
    reach: 8900,
    date: "2026-04-05",
    thumbnail: createThumbnail("Feed Genérico", "#4B5563", "#9CA3AF"),
    status: "Publicado",
    metrics: {
      likes: 280,
      comments: 9,
      saves: 71,
      shares: 14,
    },
    checklist: [
      { id: "c1", label: "Ângulo editorial definido", done: false },
      { id: "c2", label: "Headline revisada", done: false },
    ],
    comments: [
      { id: "cm1", authorId: 2, time: "2 semanas atrás", text: "Sem gancho forte na primeira dobra do layout." },
    ],
    files: [{ id: "f1", name: "institucional-feed.png", size: "3.2 MB", kind: "image" }],
    script: {
      hook: "Mensagem institucional ampla demais.",
      development: "Peça pouco específica para a dor do público.",
      solution: "Trazer benefício claro e insight de bastidor.",
      cta: "Testar CTA de comentário temático.",
    },
    approval: {
      approvedBy: "Direção Great",
      date: "2026-04-03 16:35",
    },
  },
];

export const topPosts = posts.slice(0, 5);
export const worstPosts = posts.slice(5, 7);

export const goals: Goal[] = [
  {
    id: 1,
    name: "Alcançar 130 mil de alcance mensal",
    category: "Alcance",
    responsibleId: 1,
    target: 130000,
    current: 125400,
    period: "Mês",
    deadline: "2026-05-05",
    description: "Sustentar crescimento com reels educativos e bastidores.",
  },
  {
    id: 2,
    name: "Manter média de 7.5% de engajamento",
    category: "Engajamento",
    responsibleId: 2,
    target: 7.5,
    current: 6.9,
    period: "Mês",
    deadline: "2026-05-07",
    description: "Ajustar CTA e sequência de stories para elevar respostas.",
  },
  {
    id: 3,
    name: "Publicar 12 reels no mês",
    category: "Volume",
    responsibleId: 1,
    target: 12,
    current: 13,
    period: "Mês",
    deadline: "2026-05-10",
    description: "Acelerar formatos curtos com temas de autoridade.",
  },
  {
    id: 4,
    name: "Aumentar saves em carrosséis",
    category: "Retenção",
    responsibleId: 3,
    target: 1200,
    current: 980,
    period: "Semana",
    deadline: "2026-05-03",
    description: "Explorar checklists visuais e templates de consulta.",
  },
  {
    id: 5,
    name: "Garantir 95% de pontualidade de publicação",
    category: "Operação",
    responsibleId: 2,
    target: 95,
    current: 92,
    period: "Semana",
    deadline: "2026-05-02",
    description: "Reduzir gargalos de aprovação e centralizar arquivos.",
  },
  {
    id: 6,
    name: "Gerar 400 respostas em stories",
    category: "Comunidade",
    responsibleId: 2,
    target: 400,
    current: 418,
    period: "Mês",
    deadline: "2026-05-12",
    description: "Usar enquetes e caixas de perguntas em temas recorrentes.",
  },
];

export const calendarEvents: CalendarEvent[] = [
  {
    id: 1,
    title: "Reels: rotina de planejamento",
    description: "Captação e edição do reels semanal.",
    type: "Reels",
    responsibleId: 1,
    status: "Em produção",
    date: "2026-04-28",
    time: "10:00",
  },
  {
    id: 2,
    title: "Stories: bastidores do escritório",
    description: "Sequência com sticker de perguntas.",
    type: "Stories",
    responsibleId: 2,
    status: "Agendado",
    date: "2026-04-29",
    time: "14:00",
  },
  {
    id: 3,
    title: "Carrossel: checklist criativo",
    description: "Arte final e revisão do copy.",
    type: "Carrossel",
    responsibleId: 3,
    status: "Aprovado",
    date: "2026-04-30",
    time: "09:00",
  },
  {
    id: 4,
    title: "Feed: case Great",
    description: "Publicação institucional com dados de crescimento.",
    type: "Feed",
    responsibleId: 2,
    status: "Publicado",
    date: "2026-05-01",
    time: "11:00",
  },
  {
    id: 5,
    title: "Reels: erros de conteúdo",
    description: "Versão curta com CTA de salvar.",
    type: "Reels",
    responsibleId: 1,
    status: "Agendado",
    date: "2026-05-02",
    time: "16:00",
  },
];

export const ideas: Idea[] = [
  {
    id: 1,
    title: "Série 'por trás do calendário'",
    description: "Explicar como a Great organiza produção semanal e tomada de decisão.",
    theme: "Processo",
    status: "Em produção",
    script: "Abrir com caos comum em agências, mostrar framework e encerrar com convite para salvar.",
    responsibleId: 1,
  },
  {
    id: 2,
    title: "Carrossel com 7 gatilhos de retenção",
    description: "Peça visual com exemplos reais de títulos e capas.",
    theme: "Design",
    status: "Ideia",
    responsibleId: 3,
  },
  {
    id: 3,
    title: "Stories de dúvidas frequentes",
    description: "Caixinha semanal para gerar pauta e responder objeções do público.",
    theme: "Comunidade",
    status: "Pronto",
    script: "Abrir com pergunta, coletar respostas e transformar as melhores em sequência narrativa.",
    responsibleId: 2,
  },
];

export const insights = {
  bestTime: {
    day: "Quarta-feira",
    hour: "19:30",
    engagement: 23,
  },
  bestContent: {
    type: "Reels educativos",
    avgEngagement: "8.4%",
    avgReach: "31.8 mil",
  },
  worstContent: {
    type: "Feeds institucionais genéricos",
    avgEngagement: "2.1%",
    avgReach: "8.9 mil",
  },
  growthTrend: {
    direction: "Alta consistente",
    rate: "+15.7%",
    prediction: "Mantendo o ritmo atual, a conta chega a 140 mil de alcance no próximo ciclo.",
  },
  recommendations: [
    "Aumentar a cadência de reels com ganchos fortes nos 3 primeiros segundos.",
    "Transformar perguntas de stories em carrosséis de resposta para gerar save.",
    "Reduzir peças institucionais frias e priorizar casos com resultado concreto.",
  ],
};

export const contentDistribution = [
  { name: "Reels", value: 38, color: "#D10000" },
  { name: "Stories", value: 24, color: "#FF9500" },
  { name: "Carrossel", value: 26, color: "#34C759" },
  { name: "Feed", value: 12, color: "#007AFF" },
];

export const evolutionData = [
  { date: "01 Abr", reach: 87000, engagement: 12500, followers: 18210 },
  { date: "05 Abr", reach: 91200, engagement: 13150, followers: 18340 },
  { date: "09 Abr", reach: 96800, engagement: 13820, followers: 18510 },
  { date: "13 Abr", reach: 103400, engagement: 14600, followers: 18720 },
  { date: "17 Abr", reach: 110900, engagement: 15680, followers: 18960 },
  { date: "23 Abr", reach: 118700, engagement: 16790, followers: 19220 },
  { date: "29 Abr", reach: 125400, engagement: 18750, followers: 19470 },
];

export const metaPeriods = ["Dia", "Semana", "Mês"] as const;

export const historyTimeline: HistoryEvent[] = [
  {
    id: 1,
    type: "post",
    title: "Reels publicado com recorde de alcance",
    description: "O conteúdo '5 erros que travam sua organização' superou a média do mês.",
    authorId: 1,
    date: "2026-04-23 18:40",
    result: "5.420 engajamentos",
    metrics: "+22% acima da média",
  },
  {
    id: 2,
    type: "goal",
    title: "Meta de respostas em stories atingida",
    description: "A meta de comunidade foi ultrapassada com a nova dinâmica de perguntas.",
    authorId: 2,
    date: "2026-04-21 11:20",
    result: "418 respostas",
    metrics: "104.5% da meta",
  },
  {
    id: 3,
    type: "schedule",
    title: "Calendário semanal reorganizado",
    description: "Slots de quinta e sexta foram redistribuídos para priorizar reels.",
    authorId: 3,
    date: "2026-04-19 09:10",
    result: "2 eventos remarcados",
    metrics: "Sem atrasos na semana",
  },
];

export const apiStatus = {
  connected: true,
  lastUpdated: "30 Abr 2026, 09:12",
};

export const dashboardSummary = {
  healthScore: 87,
  completedGoals: 4,
  totalReach: 125400,
  totalEngagement: 18750,
};

export const weekLabel = "Semana de Lançamentos";

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
export const calendarHours = Array.from({ length: 13 }, (_, index) =>
  `${String(index + 8).padStart(2, "0")}:00`,
);
