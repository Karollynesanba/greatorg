import { useCallback, useEffect, useRef, useState } from "react";
import type { Goal } from "./mockData";
import { getSupabaseDiagnostics, isSupabaseConfigured, supabase } from "./supabase";
import { subscribeSharedChannel } from "./supabaseRealtime";

type GoalRow = {
  id: number;
  user_id?: string | null;
  sort_order?: number | null;
  data?: Partial<Goal> | null;
  created_at?: string | null;
  updated_at?: string | null;
};

function snapshotOf<T>(value: T) {
  return JSON.stringify(value);
}

function logGoals(message: string, details?: Record<string, unknown>) {
  console.info("[GoalsSync]", message, {
    ...getSupabaseDiagnostics(),
    ...details,
  });
}

function normalizeGoal(row: GoalRow): Goal | null {
  const data = row.data ?? {};
  const id = Number(row.id ?? data.id ?? 0);

  if (!Number.isFinite(id) || id <= 0) {
    return null;
  }

  return {
    id,
    name: data.name ?? "",
    category: data.category ?? "Alcance",
    status: (data.status ?? "Em andamento") as Goal["status"],
    priority: (data.priority ?? "Média") as Goal["priority"],
    notes: data.notes ?? "",
    responsibleId: Number(data.responsibleId ?? 1),
    responsibleIds: Array.isArray(data.responsibleIds) ? data.responsibleIds.map(Number) : undefined,
    target: Number(data.target ?? 0),
    current: Number(data.current ?? 0),
    period: data.period ?? "Mês",
    deadline: data.deadline ?? "",
    deadlineTime: data.deadlineTime ?? undefined,
    description: data.description ?? "",
    checklist: Array.isArray(data.checklist) ? data.checklist : undefined,
    history: Array.isArray(data.history) ? data.history : undefined,
  };
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
    console.error("[GoalsSync] Missing authenticated session", getSupabaseDiagnostics());
    throw new Error("Nenhuma sessao autenticada encontrada no Supabase.");
  }

  logGoals("Authenticated session resolved", { userId });
  return userId;
}

async function fetchGoals() {
  if (!isSupabaseConfigured() || !supabase) {
    logGoals("Fetch skipped because Supabase is not configured.");
    return { items: [] as Goal[], hasRows: false };
  }

  try {
    logGoals("Fetching goals from Supabase.");
    const { data, error } = await supabase
      .from("goals")
      .select("id, user_id, sort_order, data, created_at, updated_at")
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true });

    if (error) {
      throw error;
    }

    return {
      items: ((data ?? []) as GoalRow[])
        .map((row) => normalizeGoal(row))
        .filter((row): row is Goal => Boolean(row)),
      hasRows: true,
    };
  } catch (error) {
    console.error("[GoalsSync] Failed to load goals from Supabase", {
      error,
      ...getSupabaseDiagnostics(),
    });
    return { items: [] as Goal[], hasRows: false };
  }
}

async function upsertGoal(goal: Goal, sortOrder: number) {
  if (!isSupabaseConfigured() || !supabase) {
    return;
  }

  const userId = await requireAuthenticatedSession();
  logGoals("Persisting goal", {
    action: "upsert",
    goalId: goal.id,
    userId,
    sortOrder,
    name: goal.name,
  });

  const { data, error } = await supabase
    .from("goals")
    .upsert(
      {
        id: goal.id,
        user_id: userId,
        sort_order: sortOrder,
        data: goal,
      },
      { onConflict: "id" },
    )
    .select("id");

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    throw new Error(`O Supabase nao confirmou a gravacao da meta ${goal.id}.`);
  }

  logGoals("Goal persisted", {
    action: "upsert",
    goalId: goal.id,
    affectedRows: data.length,
  });
}

async function hardDeleteGoal(goalId: number) {
  if (!isSupabaseConfigured() || !supabase) {
    return;
  }

  const userId = await requireAuthenticatedSession();
  logGoals("Deleting goal", {
    action: "delete",
    goalId,
    userId,
  });

  const { data, error } = await supabase
    .from("goals")
    .delete()
    .eq("id", goalId)
    .select("id");

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    throw new Error(`A meta ${goalId} nao foi encontrada para exclusao no Supabase.`);
  }

  logGoals("Goal deleted", {
    action: "delete",
    goalId,
    affectedRows: data.length,
  });
}

export function useSupabaseGoalsState(fallback: Goal[]) {
  const [value, setValue] = useState<Goal[]>(isSupabaseConfigured() ? [] : fallback);
  const [hydrated, setHydrated] = useState(false);
  const lastPersistedValueRef = useRef<Goal[]>(isSupabaseConfigured() ? [] : fallback);
  const lastSavedSnapshotRef = useRef<string | null>(null);

  const commitValue = useCallback((nextValue: Goal[]) => {
    setValue(nextValue);
    lastPersistedValueRef.current = nextValue;
    lastSavedSnapshotRef.current = snapshotOf(nextValue);
    setHydrated(true);
    return nextValue;
  }, []);

  const reload = useCallback(async () => {
    const remote = await fetchGoals();
    const nextValue = !remote.hasRows ? lastPersistedValueRef.current : remote.items;
    logGoals("Reload completed", {
      hasRows: remote.hasRows,
      count: nextValue.length,
    });
    return commitValue(nextValue);
  }, [commitValue]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const remote = await fetchGoals();
      if (cancelled) {
        return;
      }

      const nextValue = !remote.hasRows ? lastPersistedValueRef.current : remote.items;
      logGoals("Initial load completed", {
        hasRows: remote.hasRows,
        count: nextValue.length,
      });
      commitValue(nextValue);
    };

    void load();

    const unsubscribe = subscribeSharedChannel(
      "great-organico:goals-direct",
      (channel, dispatch) => {
        channel.on(
          "postgres_changes",
          { event: "*", schema: "public", table: "goals" },
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
  }, [commitValue, fallback]);

  const createGoal = useCallback(async (goal: Goal, sortOrder: number) => {
    if (!isSupabaseConfigured() || !supabase) {
      commitValue([goal, ...lastPersistedValueRef.current]);
      return goal;
    }

    await upsertGoal(goal, sortOrder);
    await reload();
    return goal;
  }, [commitValue, reload]);

  const updateGoal = useCallback(async (goal: Goal, sortOrder: number) => {
    if (!isSupabaseConfigured() || !supabase) {
      commitValue(lastPersistedValueRef.current.map((current) => (current.id === goal.id ? goal : current)));
      return goal;
    }

    await upsertGoal(goal, sortOrder);
    await reload();
    return goal;
  }, [commitValue, reload]);

  const deleteGoal = useCallback(async (goalId: number) => {
    if (!isSupabaseConfigured() || !supabase) {
      commitValue(lastPersistedValueRef.current.filter((goal) => goal.id !== goalId));
      return;
    }

    await hardDeleteGoal(goalId);
    await reload();
  }, [commitValue, reload]);

  return [value, hydrated, { createGoal, updateGoal, deleteGoal, reload }] as const;
}
