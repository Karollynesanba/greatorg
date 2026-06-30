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

export type MetaSummary = {
  reach: number;
  views: number;
  profileViews: number;
  followers: number;
  accountsEngaged: number;
  totalInteractions: number;
  mediaCount: number;
  engagementRate: number;
};

export type MetaMediaInsight = {
  id: string;
  source: "instagram" | "facebook";
  caption: string;
  mediaType: string;
  permalink: string;
  timestamp: string;
  thumbnailUrl?: string;
  likeCount: number;
  commentsCount: number;
  shareCount: number;
  reach: number;
  views: number;
  engagement: number;
  saved: number;
};

export type MetaChannelInsights = {
  connected: boolean;
  label: string;
  summary: MetaSummary;
  trend: MetaTrendPoint[];
  audience: {
    countries: MetaAudienceItem[];
    cities: MetaAudienceItem[];
    genderAge: MetaAudienceItem[];
    locales: MetaAudienceItem[];
  };
  media: MetaMediaInsight[];
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
  summary: MetaSummary;
  breakdown: {
    instagram: MetaChannelInsights;
    facebook: MetaChannelInsights & {
      pageFollowers: number;
      pageFans: number;
    };
  };
  trend: MetaTrendPoint[];
  audience: MetaChannelInsights["audience"];
  media: MetaMediaInsight[];
  notes: string[];
};

const emptyAudience = {
  countries: [],
  cities: [],
  genderAge: [],
  locales: [],
} satisfies MetaChannelInsights["audience"];

const emptySummary: MetaSummary = {
  reach: 0,
  views: 0,
  profileViews: 0,
  followers: 0,
  accountsEngaged: 0,
  totalInteractions: 0,
  mediaCount: 0,
  engagementRate: 0,
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
  summary: emptySummary,
  breakdown: {
    instagram: {
      connected: false,
      label: "Instagram",
      summary: emptySummary,
      trend: [],
      audience: emptyAudience,
      media: [],
    },
    facebook: {
      connected: false,
      label: "Facebook",
      summary: emptySummary,
      trend: [],
      audience: emptyAudience,
      media: [],
      pageFollowers: 0,
      pageFans: 0,
    },
  },
  trend: [],
  audience: emptyAudience,
  media: [],
  notes: [],
};

