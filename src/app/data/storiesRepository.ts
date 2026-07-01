import type { CalendarEvent, StoryLog } from "./mockData";
import { buildStoryHistoryEvent, getStoryHistoryId } from "./historyEvents";
import { supabase } from "./supabase";

type StoryGoalCategory = "total" | "video" | "photo";
type StoryMetricKey = "views" | "reach";

type StoryListRow<T> = {
  id: number;
  user_id?: string;
  reference_month?: string;
  metric_date?: string;
  category?: string;
  page_module?: string;
  sort_order: number;
  data: T;
};

type StoryGoalMetricRow = {
  user_id: string;
  month_key: string;
  category: StoryGoalCategory;
  current_value: number;
  goal_value: number;
  updated_at?: string;
};

type StoryMetricRow = {
  user_id: string;
  month_key: string;
  metric: StoryMetricKey;
  value: number;
  updated_at?: string;
};

type StoriesMonthlyDataRow = {
  user_id: string;
  reference_month: string;
  video_current: number;
  video_goal: number;
  photo_current: number;
  photo_goal: number;
  total_current: number;
  total_goal: number;
  updated_at?: string;
};

export type StoryGoalMetricMap = Record<
  StoryGoalCategory,
  {
    currentValue: number;
    goalValue: number;
  }
>;

export type StoriesDashboardSnapshot = {
  month: string;
  goals: StoryGoalMetricMap;
  metrics: Record<StoryMetricKey, number>;
  stories: StoryLog[];
  calendar: CalendarEvent[];
};

export type StoriesMonthlySummary = {
  videoCurrent: number;
  videoGoal: number;
  photoCurrent: number;
  photoGoal: number;
  totalCurrent: number;
  totalGoal: number;
};

type SharedStateSummaryRow = {
  key: string;
  value: StoriesMonthlySummary | null;
  updated_at?: string;
};

type StoryPostPayload = Omit<StoryLog, "id"> & {
  id?: number;
  userId: string;
};

const defaultGoalValues: Record<StoryGoalCategory, number> = {
  total: 168,
  video: 105,
  photo: 63,
};

function monthKeyToDate(month: string) {
  return `${month}-01`;
}

function getClient() {
  if (!supabase) {
    throw new Error("Supabase não está configurado.");
  }

  return supabase;
}

function getStoriesMonthlySummaryKey(month: string) {
  return `stories-monthly-summary:${month}`;
}

function isStoriesMonthlySummary(value: unknown): value is StoriesMonthlySummary {
  if (!value || typeof value !== "object") {
    return false;
  }

  const summary = value as Partial<StoriesMonthlySummary>;
  return [
    summary.videoCurrent,
    summary.videoGoal,
    summary.photoCurrent,
    summary.photoGoal,
    summary.totalCurrent,
    summary.totalGoal,
  ].every((item) => typeof item === "number" && Number.isFinite(item));
}

async function fetchGlobalStoriesMonthlySummary(month: string) {
  const client = getClient();
  const { data, error } = await client
    .from("shared_state")
    .select("key, value, updated_at")
    .eq("key", getStoriesMonthlySummaryKey(month))
    .order("updated_at", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  const row = (data?.[0] as SharedStateSummaryRow | undefined) ?? null;
  return isStoriesMonthlySummary(row?.value) ? row.value : null;
}

async function persistGlobalStoriesMonthlySummary(month: string, summary: StoriesMonthlySummary) {
  const client = getClient();
  const payload = {
    key: getStoriesMonthlySummaryKey(month),
    value: summary,
    updated_at: new Date().toISOString(),
  };

  const { error } = await client.from("shared_state").upsert(payload, { onConflict: "key" });
  if (error) {
    throw new Error(error.message);
  }
}

function nextNumericId() {
  return Date.now() * 1000 + Math.floor(Math.random() * 1000);
}

function toStoryRow(data: StoryPostPayload, sortOrder: number): StoryListRow<StoryLog> {
  const id = data.id ?? nextNumericId();
  const metricDate = data.date;
  const referenceMonth = monthKeyToDate(data.date.slice(0, 7));

  return {
    id,
    user_id: data.userId,
    reference_month: referenceMonth,
    metric_date: metricDate,
    category: data.mediaType,
    page_module: "stories",
    sort_order: sortOrder,
    data: {
      id,
      date: data.date,
      time: data.time,
      quantity: data.quantity,
      mediaType: data.mediaType,
      status: data.status,
      madeById: data.madeById,
      postedById: data.postedById,
      notes: data.notes,
    },
  };
}

function normalizeStories(rows: StoryListRow<StoryLog>[] | null | undefined) {
  return (rows ?? [])
    .map((row) => row.data)
    .sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`));
}

export async function fetchStoryPosts(_userId: string) {
  const client = getClient();
  const { data, error } = await client
    .from("story_logs")
    .select("id, sort_order, data")
    .order("sort_order", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return normalizeStories((data ?? []) as StoryListRow<StoryLog>[]);
}

export async function fetchMonthlyCalendar(_userId: string, month: string) {
  const client = getClient();
  const { data, error } = await client
    .from("calendar_events")
    .select("data");

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as Array<{ data: CalendarEvent }>)
    .map((row) => row.data)
    .filter((row) => row.date.startsWith(month));
}

export async function fetchStoriesMonthlySummary(userId: string | null, month: string): Promise<StoriesMonthlySummary> {
  const globalSummary = await fetchGlobalStoriesMonthlySummary(month).catch(() => null);
  if (globalSummary) {
    return globalSummary;
  }

  if (!userId) {
    return {
      videoCurrent: 0,
      videoGoal: defaultGoalValues.video,
      photoCurrent: 0,
      photoGoal: defaultGoalValues.photo,
      totalCurrent: 0,
      totalGoal: defaultGoalValues.total,
    };
  }

  const client = getClient();
  const { data: monthlyDataRow, error: monthlyDataError } = await client
    .from("stories_monthly_data")
    .select("user_id, reference_month, video_current, video_goal, photo_current, photo_goal, total_current, total_goal, updated_at")
    .eq("user_id", userId)
    .eq("reference_month", monthKeyToDate(month))
    .maybeSingle();

  if (!monthlyDataError && monthlyDataRow) {
    const row = monthlyDataRow as StoriesMonthlyDataRow;
    const videoCurrent = Number(row.video_current) || 0;
    const photoCurrent = Number(row.photo_current) || 0;
    const videoGoal = Number(row.video_goal) || defaultGoalValues.video;
    const photoGoal = Number(row.photo_goal) || defaultGoalValues.photo;

    return {
      videoCurrent,
      videoGoal,
      photoCurrent,
      photoGoal,
      totalCurrent: Number(row.total_current) || videoCurrent + photoCurrent,
      totalGoal: Number(row.total_goal) || videoGoal + photoGoal,
    };
  }

  const { data: goalRows, error: goalError } = await client
    .from("story_goal_metrics")
    .select("user_id, month_key, category, current_value, goal_value, updated_at")
    .eq("user_id", userId)
    .eq("month_key", month);

  if (goalError) {
    throw new Error(monthlyDataError?.message || goalError.message);
  }

  const goals = (goalRows as StoryGoalMetricRow[] | null)?.reduce<StoryGoalMetricMap>(
    (accumulator, row) => {
      accumulator[row.category] = {
        currentValue: Number(row.current_value) || 0,
        goalValue: Number(row.goal_value) || defaultGoalValues[row.category],
      };
      return accumulator;
    },
    {
      total: { currentValue: 0, goalValue: defaultGoalValues.total },
      video: { currentValue: 0, goalValue: defaultGoalValues.video },
      photo: { currentValue: 0, goalValue: defaultGoalValues.photo },
    },
  ) ?? {
    total: { currentValue: 0, goalValue: defaultGoalValues.total },
    video: { currentValue: 0, goalValue: defaultGoalValues.video },
    photo: { currentValue: 0, goalValue: defaultGoalValues.photo },
  };

  const categoryCurrent = goals.video.currentValue + goals.photo.currentValue;
  const categoryGoal = goals.video.goalValue + goals.photo.goalValue;

  return {
    videoCurrent: goals.video.currentValue,
    videoGoal: goals.video.goalValue,
    photoCurrent: goals.photo.currentValue,
    photoGoal: goals.photo.goalValue,
    totalCurrent: goals.total.currentValue || categoryCurrent,
    totalGoal: goals.total.goalValue || categoryGoal || defaultGoalValues.total,
  };
}

export async function fetchStoriesDashboard(userId: string, month: string): Promise<StoriesDashboardSnapshot> {
  const globalSummary = await fetchGlobalStoriesMonthlySummary(month).catch(() => null);
  const client = getClient();
  const [{ data: monthlyDataRow, error: monthlyDataError }, { data: metricRows, error: metricError }, stories, calendar] = await Promise.all([
    client
      .from("stories_monthly_data")
      .select("user_id, reference_month, video_current, video_goal, photo_current, photo_goal, total_current, total_goal, updated_at")
      .eq("user_id", userId)
      .eq("reference_month", monthKeyToDate(month))
      .maybeSingle(),
    client
      .from("story_metrics")
      .select("user_id, month_key, metric, value, updated_at")
      .eq("user_id", userId)
      .eq("month_key", month),
    fetchStoryPosts(userId),
    fetchMonthlyCalendar(userId, month),
  ]);

  if (metricError) {
    throw new Error(metricError.message);
  }

  let goals: StoryGoalMetricMap;

  if (globalSummary) {
    goals = {
      total: {
        currentValue: globalSummary.totalCurrent,
        goalValue: globalSummary.totalGoal,
      },
      video: {
        currentValue: globalSummary.videoCurrent,
        goalValue: globalSummary.videoGoal,
      },
      photo: {
        currentValue: globalSummary.photoCurrent,
        goalValue: globalSummary.photoGoal,
      },
    };
  } else if (!monthlyDataError && monthlyDataRow) {
    const row = monthlyDataRow as StoriesMonthlyDataRow;
    goals = {
      total: {
        currentValue: Number(row.total_current) || 0,
        goalValue: Number(row.total_goal) || defaultGoalValues.total,
      },
      video: {
        currentValue: Number(row.video_current) || 0,
        goalValue: Number(row.video_goal) || defaultGoalValues.video,
      },
      photo: {
        currentValue: Number(row.photo_current) || 0,
        goalValue: Number(row.photo_goal) || defaultGoalValues.photo,
      },
    };
  } else {
    const { data: goalRows, error: goalError } = await client
      .from("story_goal_metrics")
      .select("user_id, month_key, category, current_value, goal_value, updated_at")
      .eq("user_id", userId)
      .eq("month_key", month);

    if (goalError) {
      throw new Error(goalError.message);
    }

    goals = (goalRows as StoryGoalMetricRow[] | null)?.reduce<StoryGoalMetricMap>(
      (accumulator, row) => {
        accumulator[row.category] = {
          currentValue: Number(row.current_value) || 0,
          goalValue: Number(row.goal_value) || defaultGoalValues[row.category],
        };
        return accumulator;
      },
      {
        total: { currentValue: 0, goalValue: defaultGoalValues.total },
        video: { currentValue: 0, goalValue: defaultGoalValues.video },
        photo: { currentValue: 0, goalValue: defaultGoalValues.photo },
      },
    ) ?? {
      total: { currentValue: 0, goalValue: defaultGoalValues.total },
      video: { currentValue: 0, goalValue: defaultGoalValues.video },
      photo: { currentValue: 0, goalValue: defaultGoalValues.photo },
    };
  }

  const metrics = (metricRows as StoryMetricRow[] | null)?.reduce<Record<StoryMetricKey, number>>(
    (accumulator, row) => {
      accumulator[row.metric] = Number(row.value) || 0;
      return accumulator;
    },
    { views: 0, reach: 0 },
  ) ?? { views: 0, reach: 0 };

  return {
    month,
    goals,
    metrics,
    stories: stories.filter((story) => story.date.startsWith(month)),
    calendar,
  };
}

export async function updateStoriesMonthlyData(userId: string, month: string, summary: StoriesMonthlySummary) {
  const client = getClient();
  await persistGlobalStoriesMonthlySummary(month, summary);

  const payload = {
    user_id: userId,
    reference_month: monthKeyToDate(month),
    video_current: summary.videoCurrent,
    video_goal: summary.videoGoal,
    photo_current: summary.photoCurrent,
    photo_goal: summary.photoGoal,
    total_current: summary.totalCurrent,
    total_goal: summary.totalGoal,
    updated_at: new Date().toISOString(),
  };

  const { error } = await client.from("stories_monthly_data").upsert(payload, {
    onConflict: "user_id,reference_month",
  });

  if (!error) {
    return;
  }

  await Promise.all([
    updateGoalMetric(userId, "video", summary.videoCurrent, summary.videoGoal, month),
    updateGoalMetric(userId, "photo", summary.photoCurrent, summary.photoGoal, month),
    updateGoalMetric(userId, "total", summary.totalCurrent, summary.totalGoal, month),
  ]);
}

export async function updateStoryMetric(userId: string, metric: StoryMetricKey, value: number, month = new Date().toISOString().slice(0, 7)) {
  const client = getClient();
  const { error } = await client.from("story_metrics").upsert(
    {
      user_id: userId,
      month_key: month,
      metric,
      value,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,month_key,metric" },
  );

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateGoalMetric(
  userId: string,
  category: StoryGoalCategory,
  currentValue: number,
  goalValue: number,
  month = new Date().toISOString().slice(0, 7),
) {
  const client = getClient();
  const { error } = await client.from("story_goal_metrics").upsert(
    {
      user_id: userId,
      month_key: month,
      category,
      current_value: currentValue,
      goal_value: goalValue,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,month_key,category" },
  );

  if (error) {
    throw new Error(error.message);
  }
}

async function upsertStoryHistory(_userId: string, story: StoryLog, actorName: string, action: "created" | "updated") {
  const client = getClient();
  const historyEvent = buildStoryHistoryEvent(story, actorName, action);
  const { error } = await client.from("history_events").upsert(
    {
      id: historyEvent.id,
      sort_order: Date.now(),
      data: historyEvent,
    },
    { onConflict: "id" },
  );

  if (error) {
    throw new Error(error.message);
  }
}

async function deleteStoryHistory(_userId: string, storyId: number) {
  const client = getClient();
  const { error } = await client
    .from("history_events")
    .delete()
    .eq("id", getStoryHistoryId(storyId));

  if (error) {
    throw new Error(error.message);
  }
}

export async function createStoryPost(data: StoryPostPayload & { actorName: string }) {
  const client = getClient();
  const row = toStoryRow(data, Date.now());
  const { error } = await client.from("story_logs").upsert(row, { onConflict: "id" });

  if (error) {
    throw new Error(error.message);
  }

  await upsertStoryHistory(data.userId, row.data, data.actorName, "created");
  return row.data;
}

export async function updateStoryPost(id: number, data: StoryPostPayload & { actorName: string }) {
  const client = getClient();
  const row = toStoryRow({ ...data, id }, Date.now());
  const { error } = await client.from("story_logs").upsert(row, { onConflict: "id" });

  if (error) {
    throw new Error(error.message);
  }

  await upsertStoryHistory(data.userId, row.data, data.actorName, "updated");
  return row.data;
}

export async function deleteStoryPost(id: number, userId: string) {
  const client = getClient();
  const { error } = await client.from("story_logs").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  await deleteStoryHistory(userId, id);
}
