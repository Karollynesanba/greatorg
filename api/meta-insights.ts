import type { MetaAudienceItem, MetaInsightsPayload, MetaMediaInsight } from "../src/app/data/metaInsights.js";

type GraphError = {
  message?: string;
  code?: number;
  error_subcode?: number;
};

type GraphResponse<T> = {
  data?: T;
  error?: GraphError;
};

type PageRecord = {
  id: string;
  name?: string;
};

type PageDetails = {
  instagram_business_account?: {
    id: string;
    username?: string | null;
  };
};

type InsightValue = {
  value: number | Record<string, number>;
  end_time?: string;
};

type InsightSeriesResponse = {
  name?: string;
  values?: InsightValue[];
};

type MediaRecord = {
  id: string;
  caption?: string;
  media_type?: string;
  permalink?: string;
  timestamp?: string;
  thumbnail_url?: string;
  like_count?: number;
  comments_count?: number;
};

type MediaInsightResponse = {
  name?: string;
  values?: Array<{ value: number | Record<string, number> }>;
};

const DEFAULT_VERSION = "v22.0";

function getApiVersion() {
  return process.env.META_GRAPH_API_VERSION?.trim() || DEFAULT_VERSION;
}

function getAccessToken() {
  return process.env.META_IG_ACCESS_TOKEN?.trim() || process.env.META_ACCESS_TOKEN?.trim() || "";
}

function queryValue(value: unknown) {
  if (typeof value === "string") {
    return value.trim();
  }

  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0].trim();
  }

  return "";
}

function getRequestedPageId(query: Record<string, unknown>) {
  return process.env.META_IG_PAGE_ID?.trim() || queryValue(query.pageId) || "";
}

function getRequestedInstagramUserId(query: Record<string, unknown>) {
  return process.env.META_IG_USER_ID?.trim() || queryValue(query.igUserId) || "";
}

function getQueryDays(value: unknown) {
  const parsed = Number(queryValue(value));
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 30;
  }

  return Math.min(Math.max(Math.trunc(parsed), 1), 90);
}

function buildGraphUrl(version: string, path: string, params: Record<string, string | number | undefined>) {
  const url = new URL(`https://graph.facebook.com/${version}${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });
  return url;
}

async function graphGet<T>(
  version: string,
  path: string,
  token: string,
  params: Record<string, string | number | undefined>,
): Promise<T> {
  const url = buildGraphUrl(version, path, {
    ...params,
    access_token: token,
  });

  const response = await fetch(url);
  const data = (await response.json()) as GraphResponse<T>;

  if (!response.ok || data.error) {
    const error = new Error(data.error?.message || `Meta Graph API retornou ${response.status}`);
    throw error;
  }

  return data as T;
}

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function latestValue(points: Array<{ value: number }>) {
  return toNumber(points.length > 0 ? points[points.length - 1]?.value : 0);
}

function parseSeries(values: InsightSeriesResponse | undefined) {
  return (values?.values ?? []).map((item) => ({
    value: toNumber(item.value),
    date: item.end_time ? item.end_time.slice(0, 10) : "",
  }));
}

function mergeTrendSeries(
  reachSeries: Array<{ date: string; value: number }>,
  viewsSeries: Array<{ date: string; value: number }>,
  profileViewsSeries: Array<{ date: string; value: number }>,
  followersSeries: Array<{ date: string; value: number }>,
) {
  const dateSet = new Set<string>();
  [reachSeries, viewsSeries, profileViewsSeries, followersSeries].forEach((series) => {
    series.forEach((point) => {
      if (point.date) {
        dateSet.add(point.date);
      }
    });
  });

  return Array.from(dateSet)
    .sort((left, right) => left.localeCompare(right))
    .map((date) => ({
      date,
      reach: reachSeries.find((item) => item.date === date)?.value ?? 0,
      views: viewsSeries.find((item) => item.date === date)?.value ?? 0,
      profileViews: profileViewsSeries.find((item) => item.date === date)?.value ?? 0,
      followers: followersSeries.find((item) => item.date === date)?.value ?? 0,
    }));
}

function parseAudience(values: Record<string, number> | undefined): MetaAudienceItem[] {
  if (!values) {
    return [];
  }

  return Object.entries(values)
    .map(([label, value]) => ({ label, value: toNumber(value) }))
    .filter((item) => item.value > 0)
    .sort((left, right) => right.value - left.value);
}

async function safeMetricSeries(
  version: string,
  igUserId: string,
  token: string,
  metric: string,
  period: "day" | "lifetime",
  since?: number,
  until?: number,
) {
  try {
    const response = await graphGet<{ data?: InsightSeriesResponse[] }>(version, `/${igUserId}/insights`, token, {
      metric,
      period,
      since,
      until,
    });
    return response.data?.[0];
  } catch {
    return undefined;
  }
}

async function safeMediaInsights(version: string, mediaId: string, token: string) {
  try {
    const response = await graphGet<{ data?: MediaInsightResponse[] }>(version, `/${mediaId}/insights`, token, {
      metric: "reach,engagement,saved,views",
    });
    const entries = response.data ?? [];
    const lookup = new Map(entries.map((item) => [item.name ?? "", toNumber(item.values?.[0]?.value)] as const));

    return {
      reach: lookup.get("reach") ?? 0,
      engagement: lookup.get("engagement") ?? 0,
      saved: lookup.get("saved") ?? 0,
      views: lookup.get("views") ?? 0,
    };
  } catch {
    return null;
  }
}

async function discoverInstagramAccount(version: string, token: string, requestedPageId: string) {
  const pagesResponse = await graphGet<{ data?: PageRecord[] }>(version, "/me/accounts", token, {
    fields: "id,name",
    limit: 100,
  });

  const pages = pagesResponse.data ?? [];
  const candidatePages = requestedPageId ? pages.filter((page) => page.id === requestedPageId) : pages;

  for (const page of candidatePages) {
    const pageDetails = await graphGet<PageDetails>(version, `/${page.id}`, token, {
      fields: "instagram_business_account{id,username}",
    });

    const instagramAccount = pageDetails.instagram_business_account;
    if (instagramAccount?.id) {
      return {
        pageId: page.id,
        pageName: page.name ?? "Página Meta",
        instagramUserId: instagramAccount.id,
        instagramUsername: instagramAccount.username ?? null,
      };
    }
  }

  throw new Error(
    "Nenhuma Página com conta Instagram profissional foi encontrada para este token. Conecte uma conta Business/Creator vinculada à Página.",
  );
}

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const token = getAccessToken();
  if (!token) {
    return res
      .status(500)
      .setHeader("Cache-Control", "no-store")
      .json({ error: "Defina META_IG_ACCESS_TOKEN no ambiente para conectar a conta do Instagram." });
  }

  const query = (req.query ?? {}) as Record<string, unknown>;
  const version = getApiVersion();
  const rangeDays = getQueryDays(query.days);
  const requestedPageId = getRequestedPageId(query);
  const requestedInstagramUserId = getRequestedInstagramUserId(query);
  const now = Math.floor(Date.now() / 1000);
  const until = now;
  const since = now - rangeDays * 24 * 60 * 60;

  let pageId = requestedPageId;
  let pageName = "";
  let instagramUserId = requestedInstagramUserId;
  let instagramUsername: string | null = null;

  try {
    if (!instagramUserId) {
      const discovered = await discoverInstagramAccount(version, token, requestedPageId);
      pageId = discovered.pageId;
      pageName = discovered.pageName;
      instagramUserId = discovered.instagramUserId;
      instagramUsername = discovered.instagramUsername;
    } else {
      const account = await graphGet<{ name?: string; username?: string }>(version, `/${instagramUserId}`, token, {
        fields: "id,name,username",
      });

      pageName = account.name ?? "Conta Instagram";
      instagramUsername = account.username ?? null;
    }

    const [reachSeriesRaw, viewsSeriesRaw, profileViewsSeriesRaw, followersSeriesRaw] = await Promise.all([
      safeMetricSeries(version, instagramUserId, token, "reach", "day", since, until),
      safeMetricSeries(version, instagramUserId, token, "views", "day", since, until),
      safeMetricSeries(version, instagramUserId, token, "profile_views", "day", since, until),
      safeMetricSeries(version, instagramUserId, token, "follower_count", "day", since, until),
    ]);

    const accountsEngagedRaw = await safeMetricSeries(version, instagramUserId, token, "accounts_engaged", "lifetime");
    const totalInteractionsRaw = await safeMetricSeries(version, instagramUserId, token, "total_interactions", "lifetime");
    const onlineFollowersRaw = await safeMetricSeries(version, instagramUserId, token, "online_followers", "lifetime");

    const reachSeries = parseSeries(reachSeriesRaw);
    const viewsSeries = parseSeries(viewsSeriesRaw);
    const profileViewsSeries = parseSeries(profileViewsSeriesRaw);
    const followersSeries = parseSeries(followersSeriesRaw);

    const trend = mergeTrendSeries(reachSeries, viewsSeries, profileViewsSeries, followersSeries);

    const audienceResponse = await Promise.all([
      safeMetricSeries(version, instagramUserId, token, "audience_country", "lifetime"),
      safeMetricSeries(version, instagramUserId, token, "audience_city", "lifetime"),
      safeMetricSeries(version, instagramUserId, token, "audience_gender_age", "lifetime"),
      safeMetricSeries(version, instagramUserId, token, "audience_locale", "lifetime"),
    ]);

    const audience = {
      countries: parseAudience(
        audienceResponse[0]?.values?.[0]?.value && typeof audienceResponse[0]?.values?.[0].value === "object"
          ? (audienceResponse[0]?.values?.[0].value as Record<string, number>)
          : undefined,
      ),
      cities: parseAudience(
        audienceResponse[1]?.values?.[0]?.value && typeof audienceResponse[1]?.values?.[0].value === "object"
          ? (audienceResponse[1]?.values?.[0].value as Record<string, number>)
          : undefined,
      ),
      genderAge: parseAudience(
        audienceResponse[2]?.values?.[0]?.value && typeof audienceResponse[2]?.values?.[0].value === "object"
          ? (audienceResponse[2]?.values?.[0].value as Record<string, number>)
          : undefined,
      ),
      locales: parseAudience(
        audienceResponse[3]?.values?.[0]?.value && typeof audienceResponse[3]?.values?.[0].value === "object"
          ? (audienceResponse[3]?.values?.[0].value as Record<string, number>)
          : undefined,
      ),
    };

    const mediaResponse = await graphGet<{ data?: MediaRecord[] }>(version, `/${instagramUserId}/media`, token, {
      fields: "id,caption,media_type,permalink,timestamp,thumbnail_url,like_count,comments_count",
      limit: 10,
    });

    const media = await Promise.all(
      (mediaResponse.data ?? []).slice(0, 8).map(async (item) => {
        const metrics = await safeMediaInsights(version, item.id, token);
        const likes = toNumber(item.like_count);
        const comments = toNumber(item.comments_count);
        const reach = metrics?.reach ?? 0;
        const views = metrics?.views ?? 0;
        const engagement = metrics?.engagement ?? likes + comments;
        const saved = metrics?.saved ?? 0;

        return {
          id: item.id,
          caption: item.caption ?? "Sem legenda",
          mediaType: item.media_type ?? "media",
          permalink: item.permalink ?? `https://www.instagram.com/p/${item.id}/`,
          timestamp: item.timestamp ?? "",
          thumbnailUrl: item.thumbnail_url ?? undefined,
          likeCount: likes,
          commentsCount: comments,
          reach,
          views,
          engagement,
          saved,
        } satisfies MetaMediaInsight;
      }),
    );

    const summaryReach = reachSeries.reduce((acc, item) => acc + item.value, 0);
    const summaryViews = viewsSeries.reduce((acc, item) => acc + item.value, 0);
    const summaryProfileViews = profileViewsSeries.reduce((acc, item) => acc + item.value, 0);
    const summaryFollowers = latestValue(followersSeries.map((item) => ({ value: item.value })));
    const accountsEngaged = latestValue((accountsEngagedRaw?.values ?? []).map((item) => ({ value: toNumber(item.value) })));
    const totalInteractions = latestValue((totalInteractionsRaw?.values ?? []).map((item) => ({ value: toNumber(item.value) })));
    const engagementRate = summaryReach > 0 ? (totalInteractions / summaryReach) * 100 : 0;

    const payload: MetaInsightsPayload = {
      connected: true,
      updatedAt: new Date().toISOString(),
      rangeDays,
      source: {
        pageId,
        pageName,
        instagramUserId,
        instagramUsername,
      },
      summary: {
        reach: summaryReach,
        views: summaryViews,
        profileViews: summaryProfileViews,
        followers: summaryFollowers,
        accountsEngaged,
        totalInteractions,
        mediaCount: media.length,
        engagementRate,
      },
      trend,
      audience,
      media,
      notes: [
        `Última atualização em ${new Intl.DateTimeFormat("pt-BR", {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date())}`,
        `Fonte: ${pageName || "Página Meta"}`,
        ...(!onlineFollowersRaw ? [] : ["online_followers disponível para esta conta"]),
      ],
    };

    return res.status(200).setHeader("Cache-Control", "no-store").json(payload);
  } catch (error_) {
    const message = error_ instanceof Error ? error_.message : "Falha ao consultar a Meta.";
    return res.status(400).setHeader("Cache-Control", "no-store").json({ error: message });
  }
}
