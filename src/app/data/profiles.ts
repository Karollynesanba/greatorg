import { useEffect, useMemo, useRef } from "react";
import { getAuthenticatedMemberId } from "../auth";
import { createStorageKey, useSharedState } from "./sharedState";
import { isSupabaseConfigured, supabase } from "./supabase";
import { teamMembers as baseTeamMembers, type TeamMember } from "./mockData";

export type EditableTeamMember = TeamMember & {
  email: string;
  password: string;
  avatarUrl: string;
  bio: string;
};

type TeamProfileRow = Partial<EditableTeamMember> & {
  id?: number | string | null;
  avatar_url?: string | null;
  monthly_posts?: EditableTeamMember["monthlyPosts"] | null;
};

type TeamProfileDbRow = {
  id: number;
  name: string;
  role: string;
  avatar: string;
  specialty: string;
  color: string;
  stats: EditableTeamMember["stats"];
  radar: EditableTeamMember["radar"];
  monthly_posts: EditableTeamMember["monthlyPosts"];
  email: string;
  password: string;
  avatar_url: string;
  bio: string;
};

type TeamProfileDbUpsert = Omit<TeamProfileDbRow, "monthly_posts" | "avatar_url"> & {
  monthly_posts: EditableTeamMember["monthlyPosts"];
  avatar_url: string;
};

const teamProfilesTable = "team_profiles";

const seedAccounts: EditableTeamMember[] = baseTeamMembers.map((member, index) => {
  const credentials = [
    { email: "brendarayssa2706@gmail.com", password: "Great2026!" },
    { email: "hannahleticia13@gmail.com", password: "Great2026!" },
    { email: "thiagomarquesdev23@hotmail.com", password: "Great2026!" },
  ][index] ?? {
    email: `membro${index + 1}@greatorganico.com`,
    password: "Great2026!",
  };

  return {
    ...member,
    ...credentials,
    avatarUrl: "",
    bio: member.specialty,
  };
});

export function useTeamProfiles() {
  const sharedState = useSharedState(createStorageKey("team-profiles"), seedAccounts);
  const [profiles, setProfiles] = sharedState;
  const hydratedRef = useRef(false);
  const supabaseClient = supabase;
  const normalizedProfiles = useMemo(
    () => profiles.map((profile, index) => mergeTeamMember(profile, baseTeamMembers[index] ?? baseTeamMembers[0])),
    [profiles],
  );

  useEffect(() => {
    if (!isSupabaseConfigured() || !supabaseClient) {
      return;
    }

    let cancelled = false;

    const syncTeamProfiles = async () => {
      const { data, error } = await supabaseClient.from(teamProfilesTable).select("*").order("id", { ascending: true });

      if (cancelled) {
        return;
      }

      if (error) {
        console.warn("Supabase team_profiles load failed:", error.message);
        hydratedRef.current = true;
        return;
      }

      const remoteProfiles = (data ?? []).map((row) => normalizeProfileRow(row as TeamProfileRow));

      if (remoteProfiles.length > 0) {
        setProfiles(remoteProfiles);
        hydratedRef.current = true;
        return;
      }

      const { error: seedError } = await supabaseClient.from(teamProfilesTable).upsert(seedAccounts, {
        onConflict: "id",
      });

      if (cancelled) {
        return;
      }

      if (seedError) {
        console.warn("Supabase team_profiles seed failed:", seedError.message);
        hydratedRef.current = true;
        return;
      }

      setProfiles(seedAccounts);
      hydratedRef.current = true;
    };

    void syncTeamProfiles();

    return () => {
      cancelled = true;
    };
  }, [setProfiles, supabaseClient]);

  useEffect(() => {
    if (!hydratedRef.current || !isSupabaseConfigured() || !supabaseClient) {
      return;
    }

    let cancelled = false;

    const persistTeamProfiles = async () => {
      const { error } = await supabaseClient.from(teamProfilesTable).upsert(
        normalizedProfiles.map((profile) => toTeamProfileDbRow(profile)),
        { onConflict: "id" },
      );

      if (cancelled) {
        return;
      }

      if (error) {
        console.warn("Supabase team_profiles save failed:", error.message);
      }
    };

    void persistTeamProfiles();

    return () => {
      cancelled = true;
    };
  }, [normalizedProfiles, supabaseClient]);

  useEffect(() => {
    if (JSON.stringify(profiles) === JSON.stringify(normalizedProfiles)) {
      return;
    }

    setProfiles(normalizedProfiles);
  }, [normalizedProfiles, profiles, setProfiles]);

  return [normalizedProfiles, setProfiles] as const;
}

export function useCurrentTeamMember() {
  const [profiles, setProfiles] = useTeamProfiles();
  const memberId = getAuthenticatedMemberId() ?? profiles[0]?.id ?? null;

  const member = useMemo(() => {
    if (memberId === null) {
      return null;
    }

    return profiles.find((item) => item.id === memberId) ?? null;
  }, [memberId, profiles]);

  const updateMember = (memberIdToUpdate: number, updater: (current: EditableTeamMember) => EditableTeamMember) => {
    setProfiles((previous) =>
      previous.map((item) => (item.id === memberIdToUpdate ? updater(item) : item)),
    );
  };

  return {
    member,
    memberId,
    profiles,
    setProfiles,
    updateMember,
  } as const;
}

export function getProfileDisplayName(member: EditableTeamMember | null | undefined) {
  return member?.name ?? "Usuário";
}

function normalizeProfileRow(row: TeamProfileRow) {
  const id = typeof row.id === "string" ? Number(row.id) : row.id ?? 0;

  return {
    id: Number.isFinite(id) ? id : 0,
    name: row.name ?? "",
    role: row.role ?? "",
    avatar: row.avatar ?? "",
    specialty: row.specialty ?? "",
    color: row.color ?? "#e50914",
    stats: row.stats ?? {
      postsCreated: 0,
      avgEngagement: 0,
      goalsCompleted: 0,
      performance: 0,
      punctuality: 0,
    },
    radar: row.radar ?? [],
    monthlyPosts: row.monthlyPosts ?? row.monthly_posts ?? [],
    email: row.email ?? "",
    password: row.password ?? "",
    avatarUrl: row.avatarUrl ?? row.avatar_url ?? "",
    bio: row.bio ?? "",
  } satisfies EditableTeamMember;
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

function toTeamProfileDbRow(profile: EditableTeamMember): TeamProfileDbUpsert {
  return {
    id: profile.id,
    name: profile.name,
    role: profile.role,
    avatar: profile.avatar,
    specialty: profile.specialty,
    color: profile.color,
    stats: profile.stats,
    radar: profile.radar,
    monthly_posts: profile.monthlyPosts,
    email: profile.email,
    password: profile.password,
    avatar_url: profile.avatarUrl,
    bio: profile.bio,
  };
}
