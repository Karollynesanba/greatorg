import { useCallback, useEffect, useRef, useState } from "react";
import type { Idea } from "./mockData";
import { isSupabaseConfigured, supabase } from "./supabase";
import { subscribeSharedChannel } from "./supabaseRealtime";

type IdeaRow = {
  id: number;
  title?: string | null;
  description?: string | null;
  status?: string | null;
  category?: string | null;
  date?: string | null;
  data?: Partial<Idea> | null;
  created_at?: string | null;
  updated_at?: string | null;
  deleted_at?: string | null;
};

function snapshotOf<T>(value: T) {
  return JSON.stringify(value);
}

function compareIdeasByFreshness(left: IdeaRow, right: IdeaRow) {
  const leftStamp = Date.parse(left.updated_at ?? left.created_at ?? "") || 0;
  const rightStamp = Date.parse(right.updated_at ?? right.created_at ?? "") || 0;
  return rightStamp - leftStamp;
}

function normalizeIdea(row: IdeaRow): Idea | null {
  const data = row.data ?? {};
  const id = Number(row.id ?? data.id ?? 0);

  if (!Number.isFinite(id) || id <= 0) {
    return null;
  }

  return {
    id,
    title: row.title ?? data.title ?? "",
    description: row.description ?? data.description ?? "",
    category: (row.category ?? data.category ?? "Post") as Idea["category"],
    theme: data.theme ?? "",
    status: (row.status ?? data.status ?? "Ideia") as Idea["status"],
    script: data.script ?? undefined,
    responsibleId: Number(data.responsibleId ?? 1),
    mediaSource: data.mediaSource ?? undefined,
    mediaKind: data.mediaKind ?? undefined,
    mediaUrl: data.mediaUrl ?? undefined,
    mediaFileName: data.mediaFileName ?? undefined,
  };
}

function toIdeaRow(idea: Idea): IdeaRow {
  return {
    id: idea.id,
    title: idea.title,
    description: idea.description,
    status: idea.status,
    category: idea.category,
    date: null,
    data: idea,
    deleted_at: null,
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
    throw new Error("Nenhuma sessao autenticada encontrada no Supabase.");
  }

  return userId;
}

async function fetchIdeas() {
  if (!isSupabaseConfigured() || !supabase) {
    return { items: [] as Idea[], hasRows: false };
  }

  try {
    const { data, error } = await supabase
      .from("ideas")
      .select("id, title, description, status, category, date, data, created_at, updated_at, deleted_at")
      .is("deleted_at", null)
      .order("updated_at", { ascending: false, nullsFirst: false })
      .order("id", { ascending: false });

    if (error) {
      throw error;
    }

    const dedupedRows = new Map<number, IdeaRow>();
    for (const rawRow of (data ?? []) as IdeaRow[]) {
      const rowId = Number(rawRow.id ?? rawRow.data?.id ?? 0);
      if (!Number.isFinite(rowId) || rowId <= 0) {
        continue;
      }

      const current = dedupedRows.get(rowId);
      if (!current || compareIdeasByFreshness(rawRow, current) < 0) {
        dedupedRows.set(rowId, rawRow);
      }
    }

    return {
      items: Array.from(dedupedRows.values()).map((row) => normalizeIdea(row)).filter((row): row is Idea => Boolean(row)),
      hasRows: true,
    };
  } catch (error) {
    console.error("Failed to load ideas from Supabase", error);
    return { items: [] as Idea[], hasRows: false };
  }
}

async function upsertIdea(idea: Idea) {
  if (!isSupabaseConfigured() || !supabase) {
    return;
  }

  await requireAuthenticatedSession();

  const { data, error } = await supabase
    .from("ideas")
    .upsert(toIdeaRow(idea), { onConflict: "id" })
    .select("id");
  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    throw new Error(`O Supabase nao confirmou a gravacao da ideia ${idea.id}.`);
  }
}

async function softDeleteIdea(ideaId: number) {
  if (!isSupabaseConfigured() || !supabase) {
    return;
  }

  await requireAuthenticatedSession();

  const { data, error } = await supabase
    .from("ideas")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", ideaId)
    .is("deleted_at", null)
    .select("id");

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    throw new Error(`A ideia ${ideaId} nao foi encontrada para exclusao no Supabase.`);
  }
}

export function useSupabaseIdeasState(fallback: Idea[]) {
  const [value, setValue] = useState<Idea[]>(fallback);
  const [hydrated, setHydrated] = useState(false);
  const hydratedRef = useRef(false);
  const lastSavedSnapshotRef = useRef<string | null>(null);
  const lastPersistedValueRef = useRef<Idea[]>(fallback);

  const commitValue = useCallback((nextValue: Idea[]) => {
    setValue(nextValue);
    lastSavedSnapshotRef.current = snapshotOf(nextValue);
    lastPersistedValueRef.current = nextValue;
    hydratedRef.current = true;
    setHydrated(true);
    return nextValue;
  }, []);

  const reload = useCallback(async () => {
    const remote = await fetchIdeas();
    const nextValue =
      !remote.hasRows
        ? lastPersistedValueRef.current.length > 0
          ? lastPersistedValueRef.current
          : fallback
        : remote.items;

    return commitValue(nextValue);
  }, [commitValue, fallback]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const remote = await fetchIdeas();
      if (cancelled) {
        return;
      }

      const nextValue =
        !remote.hasRows
          ? lastPersistedValueRef.current.length > 0
            ? lastPersistedValueRef.current
            : fallback
          : remote.items;

      commitValue(nextValue);
    };

    void load();

    const unsubscribe = subscribeSharedChannel(
      "great-organico:ideas-direct",
      (channel, dispatch) => {
        channel.on(
          "postgres_changes",
          { event: "*", schema: "public", table: "ideas" },
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

  const createIdea = useCallback(async (idea: Idea) => {
    if (!isSupabaseConfigured() || !supabase) {
      commitValue([idea, ...lastPersistedValueRef.current]);
      return idea;
    }

    await upsertIdea(idea);
    await reload();
    return idea;
  }, [commitValue, reload]);

  const updateIdea = useCallback(async (idea: Idea) => {
    if (!isSupabaseConfigured() || !supabase) {
      commitValue(lastPersistedValueRef.current.map((current) => (current.id === idea.id ? idea : current)));
      return idea;
    }

    await upsertIdea(idea);
    await reload();
    return idea;
  }, [commitValue, reload]);

  const deleteIdea = useCallback(async (ideaId: number) => {
    if (!isSupabaseConfigured() || !supabase) {
      commitValue(lastPersistedValueRef.current.filter((idea) => idea.id !== ideaId));
      return;
    }

    await softDeleteIdea(ideaId);
    await reload();
  }, [commitValue, reload]);

  return [value, hydrated, { createIdea, updateIdea, deleteIdea, reload }] as const;
}
