export const metaPeriods = ["Dia", "Semana", "Mês"] as const;

export type MetaPeriod = (typeof metaPeriods)[number];

export const metaPeriodDays: Record<MetaPeriod, number> = {
  Dia: 1,
  Semana: 7,
  Mês: 30,
};

export type MetaTrendPoint = {
  date: string;
  reach: number;
  views: number;
  profileViews: number;
  followers: number;
};

export type MetaAudienceItem = {
  label: string;
  value: number;
};

export type MetaMediaInsight = {
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
};

export type MetaInsightsPayload = {
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
  trend: MetaTrendPoint[];
  audience: {
    countries: MetaAudienceItem[];
    cities: MetaAudienceItem[];
    genderAge: MetaAudienceItem[];
    locales: MetaAudienceItem[];
  };
  media: MetaMediaInsight[];
  notes: string[];
};

export const emptyMetaInsightsPayload: MetaInsightsPayload = {
  connected: false,
  updatedAt: "",
  rangeDays: 30,
  source: {
    pageId: "",
    pageName: "",
    instagramUserId: "",
    instagramUsername: null,
  },
  summary: {
    reach: 0,
    views: 0,
    profileViews: 0,
    followers: 0,
    accountsEngaged: 0,
    totalInteractions: 0,
    mediaCount: 0,
    engagementRate: 0,
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
};

