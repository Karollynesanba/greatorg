import { useEffect, useMemo, useRef, useState } from "react";
import { useAuthSession } from "../auth";
import { usePosts } from "./posts";
import { readLocalJson, subscribeLocalKey, writeLocalJson } from "./localStore";
import { calendarEvents as seedCalendarEvents, goals as seedGoals, storyLogs as seedStoryLogs, teamMembers as baseTeamMembers, type TeamMember } from "./mockData";
import { useSupabaseSyncedListState } from "./supabaseSync";
import { deriveTeamProfiles } from "./teamAnalytics";
import { type CalendarEvent, type Goal, type StoryLog } from "./mockData";

export type EditableTeamMember = TeamMember & {
  userId: string;
  email: string;
  password?: string;
  avatarUrl: string;
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

export function useTeamProfiles() {
  const [profiles, setProfiles] = useState<EditableTeamMember[]>(seedAccounts);
  const { session } = useAuthSession();
  const [posts] = usePosts();
  const [goals] = useSupabaseSyncedListState<Goal>({ key: "goals", table: "goals", fallback: seedGoals });
  const [calendarEvents] = useSupabaseSyncedListState<CalendarEvent>({
    key: "calendar-events",
    table: "calendar_events",
    fallback: seedCalendarEvents,
  });
  const [storyLogItems] = useSupabaseSyncedListState<StoryLog>({
    key: "story-logs",
    table: "story_logs",
    fallback: seedStoryLogs,
  });
  const lastSavedSnapshotRef = useRef<string | null>(null);

  const normalizedProfiles = useMemo(
    () => profiles.map((profile, index) => mergeTeamMember(profile, baseTeamMembers[index] ?? baseTeamMembers[0])),
    [profiles],
  );
  const derivedProfiles = useMemo(
    () => deriveTeamProfiles(normalizedProfiles, posts, goals, calendarEvents, storyLogItems),
    [calendarEvents, goals, normalizedProfiles, posts, storyLogItems],
  );

  useEffect(() => {
    const loadedProfiles = readLocalJson<EditableTeamMember[]>(TEAM_PROFILES_KEY, seedAccounts);
    const nextProfiles = loadedProfiles.length > 0 ? loadedProfiles : seedAccounts;
    setProfiles(nextProfiles);
    lastSavedSnapshotRef.current = JSON.stringify(nextProfiles);

    return subscribeLocalKey(TEAM_PROFILES_KEY, () => {
      const nextProfiles = readLocalJson<EditableTeamMember[]>(TEAM_PROFILES_KEY, seedAccounts);
      const resolvedProfiles = nextProfiles.length > 0 ? nextProfiles : seedAccounts;
      const nextSnapshot = JSON.stringify(resolvedProfiles);
      if (nextSnapshot === lastSavedSnapshotRef.current) {
        return;
      }

      lastSavedSnapshotRef.current = nextSnapshot;
      setProfiles(resolvedProfiles);
    });
  }, []);

  useEffect(() => {
    if (JSON.stringify(profiles) === JSON.stringify(normalizedProfiles)) {
      return;
    }

    setProfiles(normalizedProfiles);
  }, [normalizedProfiles, profiles, setProfiles]);

  useEffect(() => {
    const nextSnapshot = JSON.stringify(normalizedProfiles);
    if (nextSnapshot === lastSavedSnapshotRef.current) {
      return;
    }

    writeLocalJson(TEAM_PROFILES_KEY, normalizedProfiles);
    lastSavedSnapshotRef.current = nextSnapshot;
  }, [normalizedProfiles, session?.user.id]);

  return [derivedProfiles, setProfiles] as const;
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
  return member?.name ?? "Usuário";
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
