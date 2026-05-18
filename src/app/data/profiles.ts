import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuthSession } from "../auth";
import { usePosts } from "./posts";
import { isSupabaseConfigured, supabase } from "./supabase";
import { readLocalJson, subscribeLocalKey, writeLocalJson } from "./localStore";
import { subscribeSharedChannel } from "./supabaseRealtime";
import {
  calendarEvents as seedCalendarEvents,
  goals as seedGoals,
  storyLogs as seedStoryLogs,
  teamMembers as baseTeamMembers,
  type TeamMember,
  type CalendarEvent,
  type Goal,
  type StoryLog,
} from "./mockData";
import { useSupabaseSyncedListState } from "./supabaseSync";
import { deriveTeamProfiles } from "./teamAnalytics";

export type EditableTeamMember = TeamMember & {
  userId: string;
  email: string;
  password?: string;
  avatarUrl: string;
  bio: string;
};

type TeamProfileRow = {
  id: number;
  user_id: string;
  name: string;
  role: string;
  avatar: string;
  specialty: string;
  color: string;
  stats: EditableTeamMember["stats"];
  radar: EditableTeamMember["radar"];
  monthly_posts: EditableTeamMember["monthlyPosts"];
  email: string;
  avatar_url: string;
  bio: string;
};

const TEAM_PROFILES_KEY = "great-organico:team-profiles";

const seedAccounts: EditableTeamMember[] = baseTeamMembers.map((member, index) => {
  const credentials = [
    { userId: "4b8a4d0f-6f9e-4c3d-9a1d-2e1f4d58d101", email: "brendarayssa2706@gmail.com" },
    { userId: "2c1b7d5f-88a4-4b7b-8cb5-7d8a6f5c2b02", email: "hannahleticia13@gmail.com" },
    { userId: "7d8a2c11-0f4e-4e7b-b0a9-3f9d77a1c303", email: "thiagomarquesdev23@hotmail.com" },
  ][index] ?? {
    userId: `00000000-0000-0000-0000-${String(index + 1).padStart(12, "0")}`,
    email: `membro${index + 1}@greatorganico.com`,
  };

  return {
    ...member,
    ...credentials,
    avatarUrl: "",
    bio: member.specialty,
  };
});

function snapshotOf<T>(value: T) {
  return JSON.stringify(value);
}

function toEditableTeamMember(row: TeamProfileRow): EditableTeamMember {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    avatar: row.avatar,
    specialty: row.specialty,
    color: row.color,
    stats: row.stats,
    radar: row.radar,
    monthlyPosts: row.monthly_posts,
    userId: row.user_id,
    email: row.email,
    avatarUrl: row.avatar_url,
    bio: row.bio,
  };
}

function toTeamProfileRow(profile: EditableTeamMember): TeamProfileRow {
  return {
    id: profile.id,
    user_id: profile.userId,
    name: profile.name,
    role: profile.role,
    avatar: profile.avatar,
    specialty: profile.specialty,
    color: profile.color,
    stats: profile.stats,
    radar: profile.radar,
    monthly_posts: profile.monthlyPosts,
    email: profile.email,
    avatar_url: profile.avatarUrl,
    bio: profile.bio,
  };
}

function mergeTeamMember(profile: EditableTeamMember, fallback: TeamMember) {
  const radar = profile.radar ?? [];
  const monthlyPosts = profile.monthlyPosts ?? [];

  return {
    ...fallback,
    ...profile,
    stats: {
      ...fallback.stats,
      ...profile.stats,
    },
    radar: radar.length > 0 ? radar : fallback.radar,
    monthlyPosts: monthlyPosts.length > 0 ? monthlyPosts : fallback.monthlyPosts,
    avatarUrl: profile.avatarUrl || "",
    bio: profile.bio || fallback.specialty,
  };
}

export function useTeamProfiles() {
  const [profiles, setProfiles] = useState<EditableTeamMember[]>(seedAccounts);
  const { session, ready: authReady } = useAuthSession();
  const [posts, , , reloadPosts] = usePosts();
  const [goals, , , reloadGoals] = useSupabaseSyncedListState<Goal>({ key: "goals", table: "goals", fallback: seedGoals });
  const [calendarEvents, , , reloadCalendarEvents] = useSupabaseSyncedListState<CalendarEvent>({
    key: "calendar-events",
    table: "calendar_events",
    fallback: seedCalendarEvents,
  });
  const [storyLogItems, , , reloadStoryLogs] = useSupabaseSyncedListState<StoryLog>({
    key: "story-logs",
    table: "story_logs",
    fallback: seedStoryLogs,
  });
  const lastSavedSnapshotRef = useRef<string | null>(null);
  const isRemoteSourceAvailable = isSupabaseConfigured() && Boolean(supabase) && Boolean(session);

  const mergedProfiles = useMemo(
    () => profiles.map((profile, index) => mergeTeamMember(profile, baseTeamMembers[index] ?? baseTeamMembers[0])),
    [profiles],
  );
  const derivedProfiles = useMemo(
    () => deriveTeamProfiles(mergedProfiles, posts, goals, calendarEvents, storyLogItems),
    [calendarEvents, goals, mergedProfiles, posts, storyLogItems],
  );

  const commitProfiles = useCallback((nextProfiles: EditableTeamMember[]) => {
    setProfiles(nextProfiles);
    lastSavedSnapshotRef.current = snapshotOf(nextProfiles);
    return nextProfiles;
  }, []);

  const readLocalProfiles = useCallback(() => {
    const loadedProfiles = readLocalJson<EditableTeamMember[]>(TEAM_PROFILES_KEY, seedAccounts);
    return loadedProfiles.length > 0 ? loadedProfiles : seedAccounts;
  }, []);

  const fetchProfiles = useCallback(async () => {
    if (!authReady) {
      return seedAccounts;
    }

    if (!isRemoteSourceAvailable) {
      return readLocalProfiles();
    }

    try {
      const client = supabase;
      if (!client) {
        return seedAccounts;
      }

      const { data, error } = await client
        .from("team_profiles")
        .select("id,user_id,name,role,avatar,specialty,color,stats,radar,monthly_posts,email,avatar_url,bio")
        .order("id", { ascending: true });

      if (error) {
        throw error;
      }

      const nextProfiles = (data ?? []).map((row) => toEditableTeamMember(row as TeamProfileRow));
      return nextProfiles.length > 0 ? nextProfiles : seedAccounts;
    } catch (error) {
      console.error("Failed to load team profiles from Supabase", error);
      return seedAccounts;
    }
  }, [authReady, isRemoteSourceAvailable, readLocalProfiles]);

  const refreshAllTeamData = useCallback(async () => {
    const nextProfiles = await fetchProfiles();
    commitProfiles(nextProfiles);
    await Promise.all([reloadPosts(), reloadGoals(), reloadCalendarEvents(), reloadStoryLogs()]);
    return nextProfiles;
  }, [commitProfiles, fetchProfiles, reloadCalendarEvents, reloadGoals, reloadPosts, reloadStoryLogs]);

  useEffect(() => {
    if (!authReady) {
      return;
    }

    if (!isRemoteSourceAvailable) {
      commitProfiles(readLocalProfiles());

      return subscribeLocalKey(TEAM_PROFILES_KEY, () => {
        const resolvedProfiles = readLocalProfiles();
        const nextSnapshot = snapshotOf(resolvedProfiles);
        if (nextSnapshot === lastSavedSnapshotRef.current) {
          return;
        }

        commitProfiles(resolvedProfiles);
      });
    }

    let cancelled = false;

    void fetchProfiles().then((nextProfiles) => {
      if (cancelled) {
        return;
      }

      commitProfiles(nextProfiles);
    });

    const unsubscribe = subscribeSharedChannel(
      "great-organico:team_profiles",
      (channel, dispatch) => {
        channel.on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "team_profiles",
          },
          () => {
            dispatch();
          },
        );
      },
      () => {
        void fetchProfiles().then((nextProfiles) => {
          if (cancelled) {
            return;
          }

          commitProfiles(nextProfiles);
        });
      },
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [authReady, commitProfiles, fetchProfiles, isRemoteSourceAvailable, readLocalProfiles]);

  useEffect(() => {
    const nextSnapshot = snapshotOf(profiles);
    if (nextSnapshot === lastSavedSnapshotRef.current) {
      return;
    }

    if (!isSupabaseConfigured() || !supabase || !session) {
      writeLocalJson(TEAM_PROFILES_KEY, profiles);
      lastSavedSnapshotRef.current = nextSnapshot;
      return;
    }

    const client = supabase;

    void (async () => {
      const { error } = await client.from("team_profiles").upsert(profiles.map(toTeamProfileRow), {
        onConflict: "id",
      });

      if (error) {
        throw error;
      }

      lastSavedSnapshotRef.current = nextSnapshot;
    })().catch((error: unknown) => {
      console.error("Failed to sync team profiles to Supabase", error);
    });
  }, [profiles, session]);

  return [derivedProfiles, setProfiles, refreshAllTeamData] as const;
}

export function useCurrentTeamMember() {
  const [profiles, setProfiles] = useTeamProfiles();
  const { session } = useAuthSession();
  const memberId = session?.user.id ?? null;

  const member = useMemo(() => {
    if (!memberId) {
      return null;
    }

    return profiles.find((item) => item.userId === memberId) ?? null;
  }, [memberId, profiles]);

  const updateMember = (memberIdToUpdate: number, updater: (current: EditableTeamMember) => EditableTeamMember) => {
    setProfiles((previous) => previous.map((item) => (item.id === memberIdToUpdate ? updater(item) : item)));
  };

  return {
    member,
    memberId: member?.id ?? null,
    profiles,
    setProfiles,
    updateMember,
  } as const;
}

export function getProfileDisplayName(member: EditableTeamMember | null | undefined) {
  return member?.name ?? "Usuario";
}
