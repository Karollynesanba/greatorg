import type { CalendarEvent, StoryLog } from "./mockData";
import { buildStoryHistoryEvent, getStoryHistoryId } from "./historyEvents";
import { supabase } from "./supabase";

type StoryGoalCategory = "total" | "video" | "photo";
type StoryMetricKey = "views" | "reach";

type StoryListRow<T> = {
  id: number;
  user_id: string;
  sort_order: number;
  data: T;
  deleted_at?: string | null;
  archived_at?: string | null;
};

function tableSupportsArchivedAt(table: string) {
  return table !== "history_events";
}

function tableSupportsDeletedAt(table: string) {
  return table !== "history_events";
}

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

function nextNumericId() {
  return Date.now() * 1000 + Math.floor(Math.random() * 1000);
}

function toStoryRow(data: StoryPostPayload, sortOrder: number): StoryListRow<StoryLog> {
  const id = data.id ?? nextNumericId();

  return {
    id,
    user_id: data.userId,
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
    .filter((row) => !row.deleted_at && !row.archived_at)
    .map((row) => row.data)
    .sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`));
}

export async function fetchStoryPosts(_userId: string) {
  const client = getClient();
  const { data, error } = await client
    .from("story_logs")
    .select("id, user_id, sort_order, data, deleted_at, archived_at")
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
    .select("data, deleted_at, archived_at")

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as Array<{ data: CalendarEvent; deleted_at?: string | null; archived_at?: string | null }>)
    .filter((row) => !row.deleted_at && !row.archived_at)
    .map((row) => row.data)
    .filter((row) => row.date.startsWith(month));
}

export async function fetchStoriesDashboard(userId: string, month: string): Promise<StoriesDashboardSnapshot> {
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

  if (!monthlyDataError && monthlyDataRow) {
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

async function upsertStoryHistory(userId: string, story: StoryLog, actorName: string, action: "created" | "updated") {
  const client = getClient();
  const historyEvent = buildStoryHistoryEvent(story, actorName, action);
  const supportsArchivedAt = tableSupportsArchivedAt("history_events");
  const supportsDeletedAt = tableSupportsDeletedAt("history_events");
  const { error } = await client.from("history_events").upsert(
    {
      id: historyEvent.id,
      user_id: userId,
      sort_order: Date.now(),
      data: historyEvent,
      updated_at: new Date().toISOString(),
      ...(supportsDeletedAt ? { deleted_at: null } : {}),
      ...(supportsArchivedAt ? { archived_at: null } : {}),
    },
    { onConflict: "id" },
  );

  if (error) {
    throw new Error(error.message);
  }
}

async function deleteStoryHistory(userId: string, storyId: number) {
  if (!tableSupportsDeletedAt("history_events")) {
    return;
  }

  const client = getClient();
  const { error } = await client
    .from("history_events")
    .update({
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("id", getStoryHistoryId(storyId));

  if (error) {
    throw new Error(error.message);
  }
}

export async function createStoryPost(data: StoryPostPayload & { actorName: string }) {
  const client = getClient();
  const row = toStoryRow(data, Date.now());
  const { error } = await client.from("story_logs").upsert(
    {
      ...row,
      deleted_at: null,
      archived_at: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) {
    throw new Error(error.message);
  }

  await upsertStoryHistory(data.userId, row.data, data.actorName, "created");
  return row.data;
}

export async function updateStoryPost(id: number, data: StoryPostPayload & { actorName: string }) {
  const client = getClient();
  const row = toStoryRow({ ...data, id }, Date.now());
  const { error } = await client.from("story_logs").upsert(
    {
      ...row,
      deleted_at: null,
      archived_at: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) {
    throw new Error(error.message);
  }

  await upsertStoryHistory(data.userId, row.data, data.actorName, "updated");
  return row.data;
}

export async function deleteStoryPost(id: number, userId: string) {
  const client = getClient();
  const { error } = await client
    .from("story_logs")
    .update({
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  await deleteStoryHistory(userId, id);
}
