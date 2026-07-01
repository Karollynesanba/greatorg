import { useCallback, useEffect, useRef, useState } from "react";
import type { CalendarEvent, StoryLog } from "./mockData";
import { buildStoryHistoryEvent, getStoryHistoryId } from "./historyEvents";
import { getSupabaseDiagnostics, isSupabaseConfigured, supabase } from "./supabase";
import { subscribeSharedChannel } from "./supabaseRealtime";

type StoryGoalCategory = "total" | "video" | "photo";
type StoryMetricKey = "views" | "reach";

type StoryListRow<T> = {
  id: number;
  user_id?: string | null;
  reference_month?: string;
  metric_date?: string;
  category?: string;
  page_module?: string;
  sort_order: number;
  data: T;
  created_at?: string | null;
  updated_at?: string | null;
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
  category?: string;
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

function snapshotOf<T>(value: T) {
  return JSON.stringify(value);
}

function monthKeyToDate(month: string) {
  return `${month}-01`;
}

function getClient() {
  if (!supabase) {
    throw new Error("Supabase nao esta configurado.");
  }

  return supabase;
}

function logStories(message: string, details?: Record<string, unknown>) {
  console.info("[StoriesSync]", message, {
    ...getSupabaseDiagnostics(),
    ...details,
  });
}

function isMissingOnConflictConstraint(errorMessage: string) {
  return errorMessage.includes("no unique or exclusion constraint matching the ON CONFLICT specification");
}

async function requireAuthenticatedSession() {
  if (!isSupabaseConfigured() || !supabase) {
    return null;
  }

  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw error;
  }

  const userId = data.session?.user.id ?? null;
  if (!userId) {
    console.error("[StoriesSync] Missing authenticated session", getSupabaseDiagnostics());
    throw new Error("Nenhuma sessao autenticada encontrada no Supabase.");
  }

  logStories("Authenticated session resolved", { userId });
  return userId;
}

async function upsertStoriesMonthlyDataRow(client: ReturnType<typeof getClient>, payload: {
  user_id: string;
  reference_month: string;
  video_current: number;
  video_goal: number;
  photo_current: number;
  photo_goal: number;
  total_current: number;
  total_goal: number;
  updated_at: string;
  category: string;
}) {
  const { error } = await client.from("stories_monthly_data").upsert(payload, {
    onConflict: "user_id,reference_month,category",
  });

  if (!error) {
    return;
  }

  if (!isMissingOnConflictConstraint(error.message)) {
    throw new Error(error.message);
  }

  const { data: updatedRows, error: updateError } = await client
    .from("stories_monthly_data")
    .update({
      video_current: payload.video_current,
      video_goal: payload.video_goal,
      photo_current: payload.photo_current,
      photo_goal: payload.photo_goal,
      total_current: payload.total_current,
      total_goal: payload.total_goal,
      updated_at: payload.updated_at,
    })
    .eq("user_id", payload.user_id)
    .eq("reference_month", payload.reference_month)
    .eq("category", payload.category)
    .select("user_id")
    .limit(1);

  if (!updateError && (updatedRows?.length ?? 0) > 0) {
    return;
  }

  const { error: insertError } = await client.from("stories_monthly_data").insert(payload);
  if (insertError) {
    throw new Error(insertError.message);
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

async function syncStoryMonthlyPost(userId: string, story: StoryLog) {
  const client = getClient();
  const payload = {
    user_id: userId,
    reference_month: monthKeyToDate(story.date.slice(0, 7)),
    metric_date: story.date,
    category: story.mediaType,
    status: story.status ?? null,
    quantity: story.quantity,
    responsible_profile_id: story.madeById,
    published_by_profile_id: story.postedById,
    source_story_log_id: story.id,
    notes: story.notes ?? "",
    updated_at: new Date().toISOString(),
  };

  const { error } = await client.from("stories_monthly_posts").upsert(payload, {
    onConflict: "user_id,source_story_log_id",
  });

  if (!error) {
    return;
  }

  const { data: updatedRows, error: updateError } = await client
    .from("stories_monthly_posts")
    .update(payload)
    .eq("user_id", userId)
    .eq("source_story_log_id", story.id)
    .select("source_story_log_id")
    .limit(1);

  if (!updateError && (updatedRows?.length ?? 0) > 0) {
    return;
  }

  const { error: insertError } = await client.from("stories_monthly_posts").insert(payload);
  if (insertError) {
    throw new Error(insertError.message);
  }
}

async function deleteStoryMonthlyPost(userId: string, storyId: number) {
  const client = getClient();
  const { error } = await client
    .from("stories_monthly_posts")
    .delete()
    .eq("user_id", userId)
    .eq("source_story_log_id", storyId);

  if (error) {
    throw new Error(error.message);
  }
}

async function fetchStoryLogById(userId: string, storyId: number) {
  const client = getClient();
  const { data, error } = await client
    .from("story_logs")
    .select("id, user_id, reference_month, metric_date, category, page_module, sort_order, data, created_at, updated_at")
    .eq("user_id", userId)
    .eq("id", storyId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? ((data as StoryListRow<StoryLog>).data ?? null) : null;
}

export async function fetchStoryPosts(userId: string) {
  const client = getClient();
  const { data, error } = await client
    .from("story_logs")
    .select("id, user_id, reference_month, metric_date, category, page_module, sort_order, data, created_at, updated_at")
    .eq("user_id", userId)
    .order("sort_order", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return normalizeStories((data ?? []) as StoryListRow<StoryLog>[]);
}

export async function fetchMonthlyCalendar(userId: string, month: string) {
  const client = getClient();
  const { data, error } = await client
    .from("calendar_events")
    .select("data")
    .eq("user_id", userId)
    .gte("metric_date", `${month}-01`)
    .lt("metric_date", `${month}-32`);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as Array<{ data: CalendarEvent }>)
    .map((row) => row.data)
    .filter((row) => row.date.startsWith(month));
}

export async function fetchStoriesMonthlySummary(userId: string | null, month: string): Promise<StoriesMonthlySummary> {
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
    .select("user_id, reference_month, video_current, video_goal, photo_current, photo_goal, total_current, total_goal, updated_at, category")
    .eq("user_id", userId)
    .eq("reference_month", monthKeyToDate(month))
    .eq("category", "summary")
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
  const client = getClient();
  const [{ data: monthlyDataRow, error: monthlyDataError }, { data: metricRows, error: metricError }, stories, calendar] = await Promise.all([
    client
      .from("stories_monthly_data")
      .select("user_id, reference_month, video_current, video_goal, photo_current, photo_goal, total_current, total_goal, updated_at, category")
      .eq("user_id", userId)
      .eq("reference_month", monthKeyToDate(month))
      .eq("category", "summary")
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

async function syncStoriesMonthlySummaryForMonth(userId: string, month: string) {
  const dashboard = await fetchStoriesDashboard(userId, month);
  const videoCurrent = dashboard.stories
    .filter((story) => story.mediaType === "video")
    .reduce((sum, story) => sum + story.quantity, 0);
  const photoCurrent = dashboard.stories
    .filter((story) => story.mediaType === "photo")
    .reduce((sum, story) => sum + story.quantity, 0);
  const videoGoal = dashboard.goals.video.goalValue || defaultGoalValues.video;
  const photoGoal = dashboard.goals.photo.goalValue || defaultGoalValues.photo;

  await updateStoriesMonthlyData(userId, month, {
    videoCurrent,
    videoGoal,
    photoCurrent,
    photoGoal,
    totalCurrent: videoCurrent + photoCurrent,
    totalGoal: videoGoal + photoGoal,
  });
}

async function syncStoriesMonthlySummaryForMonths(userId: string, months: string[]) {
  const uniqueMonths = [...new Set(months.filter(Boolean))];
  await Promise.all(uniqueMonths.map((month) => syncStoriesMonthlySummaryForMonth(userId, month)));
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
    category: "summary",
  };

  try {
    await upsertStoriesMonthlyDataRow(client, payload);
    return;
  } catch (error) {
    // Fall back to the older metrics table shape when the relational monthly table
    // is not available or does not yet have the expected unique constraint.
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
  const { error } = await client.from("history_events").upsert(
    {
      id: historyEvent.id,
      user_id: userId,
      sort_order: Date.now(),
      page_module: "history",
      reference_month: monthKeyToDate(story.date.slice(0, 7)),
      metric_date: story.date,
      category: "story",
      event_title: historyEvent.title,
      event_type: historyEvent.type,
      data: historyEvent,
    },
    { onConflict: "id" },
  );

  if (error) {
    throw new Error(error.message);
  }
}

async function deleteStoryHistory(userId: string, storyId: number) {
  const client = getClient();
  const { error } = await client
    .from("history_events")
    .delete()
    .eq("user_id", userId)
    .eq("id", getStoryHistoryId(storyId));

  if (error) {
    throw new Error(error.message);
  }
}

async function upsertStoryLogRow(row: StoryListRow<StoryLog>, story: StoryLog) {
  const client = getClient();
  const { error } = await client.from("story_logs").upsert(row, { onConflict: "id" });

  if (error) {
    throw new Error(error.message);
  }

  await syncStoryMonthlyPost(row.user_id ?? "", story);
}

export async function createStoryPost(data: StoryPostPayload & { actorName: string }) {
  const sessionUserId = await requireAuthenticatedSession();
  const userId = data.userId || sessionUserId;
  if (!userId) {
    throw new Error("Nao foi possivel resolver o usuario autenticado.");
  }

  const row = toStoryRow({ ...data, userId }, Date.now());
  await upsertStoryLogRow(row, row.data);
  await upsertStoryHistory(userId, row.data, data.actorName, "created");
  await syncStoriesMonthlySummaryForMonths(userId, [row.data.date.slice(0, 7)]);
  return row.data;
}

export async function updateStoryPost(id: number, data: StoryPostPayload & { actorName: string }) {
  const sessionUserId = await requireAuthenticatedSession();
  const userId = data.userId || sessionUserId;
  if (!userId) {
    throw new Error("Nao foi possivel resolver o usuario autenticado.");
  }

  const previousStory = await fetchStoryLogById(userId, id);
  const row = toStoryRow({ ...data, id, userId }, Date.now());
  await upsertStoryLogRow(row, row.data);
  await upsertStoryHistory(userId, row.data, data.actorName, "updated");
  await syncStoriesMonthlySummaryForMonths(userId, [
    previousStory?.date.slice(0, 7) ?? "",
    row.data.date.slice(0, 7),
  ]);
  return row.data;
}

export async function deleteStoryPost(id: number, userId: string) {
  const client = getClient();
  const existingStory = await fetchStoryLogById(userId, id);
  const { error } = await client
    .from("story_logs")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  await deleteStoryMonthlyPost(userId, id);
  await deleteStoryHistory(userId, id);
  await syncStoriesMonthlySummaryForMonths(userId, [existingStory?.date.slice(0, 7) ?? ""]);
}

export function useSupabaseStoryLogsState() {
  const [value, setValue] = useState<StoryLog[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const lastPersistedValueRef = useRef<StoryLog[]>([]);
  const lastSavedSnapshotRef = useRef<string | null>(null);

  const commitValue = useCallback((nextValue: StoryLog[]) => {
    setValue(nextValue);
    lastPersistedValueRef.current = nextValue;
    lastSavedSnapshotRef.current = snapshotOf(nextValue);
    setHydrated(true);
    return nextValue;
  }, []);

  const reload = useCallback(async () => {
    if (!isSupabaseConfigured() || !supabase) {
      return commitValue([]);
    }

    const userId = await requireAuthenticatedSession();
    const nextValue = userId ? await fetchStoryPosts(userId) : [];
    return commitValue(nextValue);
  }, [commitValue]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const nextValue = await reload();
        if (cancelled) {
          return;
        }

        logStories("Initial load completed", {
          count: nextValue.length,
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error("[StoriesSync] Failed to load story_logs from Supabase", {
          error,
          ...getSupabaseDiagnostics(),
        });
        commitValue(lastPersistedValueRef.current);
      }
    };

    void load();

    const unsubscribe = subscribeSharedChannel(
      "great-organico:story-logs-direct",
      (channel, dispatch) => {
        channel.on(
          "postgres_changes",
          { event: "*", schema: "public", table: "story_logs" },
          () => {
            dispatch();
          },
        );
      },
      () => {
        void load();
      },
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [commitValue, reload]);

  return [value, hydrated, { reload }] as const;
}
