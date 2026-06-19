import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getAuthenticatedMemberId, getDemoAccountUserId, useAuthSession } from "../auth";
import { isSupabaseConfigured, supabase } from "./supabase";
import { subscribeSharedChannel } from "./supabaseRealtime";
import { teamMembers as baseTeamMembers, type TeamMember } from "./mockData";

export type EditableTeamMember = TeamMember & {
  userId: string;
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
    userId: getDemoAccountUserId(credentials.email) ?? "",
    ...credentials,
    avatarUrl: "",
    bio: member.specialty,
  };
});

export function useTeamProfiles() {
  const [profiles, setProfiles] = useState<EditableTeamMember[]>(seedAccounts);
  const hydratedRef = useRef(false);
  const lastSavedSnapshotRef = useRef<string | null>(null);
  const supabaseClient = supabase;

  const commitProfiles = useCallback((nextProfiles: EditableTeamMember[]) => {
    setProfiles(nextProfiles);
    lastSavedSnapshotRef.current = JSON.stringify(nextProfiles);
    hydratedRef.current = true;
  }, []);

  const refreshTeamData = async () => {
    if (!isSupabaseConfigured() || !supabaseClient) {
      commitProfiles(seedAccounts);
      return;
    }

    const { data, error } = await supabaseClient.from(teamProfilesTable).select("*").order("id", { ascending: true });

    if (error) {
      console.warn("Supabase team_profiles refresh failed:", error.message);
      return;
    }

    const remoteProfiles = (data ?? []).map((row) => normalizeProfileRow(row as TeamProfileRow));
    if (remoteProfiles.length > 0) {
      commitProfiles(remoteProfiles);
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured() || !supabaseClient) {
      commitProfiles(seedAccounts);
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
        commitProfiles(remoteProfiles);
        return;
      }

      const { error: seedError } = await supabaseClient.from(teamProfilesTable).upsert(
        seedAccounts.map((profile) => toTeamProfileDbRow(profile)),
        {
          onConflict: "id",
        },
      );

      if (cancelled) {
        return;
      }

      if (seedError) {
        console.warn("Supabase team_profiles seed failed:", seedError.message);
        hydratedRef.current = true;
        return;
      }

      commitProfiles(seedAccounts);
    };

    void syncTeamProfiles();

    const unsubscribe = subscribeSharedChannel(
      "great-organico:team-profiles",
      (channel, dispatch) => {
        channel.on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: teamProfilesTable,
          },
          () => {
            dispatch();
          },
        );
      },
      () => {
        void syncTeamProfiles();
      },
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [commitProfiles, supabaseClient]);

  useEffect(() => {
    setProfiles((previous) => {
      const needsFix = previous.some((profile) => profile.name === "Brenda" && profile.role !== "Diretora Criativa");
      if (!needsFix) {
        return previous;
      }

      return previous.map((profile) =>
        profile.name === "Brenda"
          ? { ...profile, role: "Diretora Criativa" }
          : profile,
      );
    });
  }, [setProfiles]);

  useEffect(() => {
    if (!hydratedRef.current || !isSupabaseConfigured() || !supabaseClient) {
      return;
    }

    const snapshot = JSON.stringify(profiles);
    if (snapshot === lastSavedSnapshotRef.current) {
      return;
    }

    let cancelled = false;

    const persistTeamProfiles = async () => {
      const { error } = await supabaseClient.from(teamProfilesTable).upsert(
        profiles.map((profile) => toTeamProfileDbRow(profile)),
        { onConflict: "id" },
      );

      if (cancelled) {
        return;
      }

      if (error) {
        console.warn("Supabase team_profiles save failed:", error.message);
        return;
      }

      lastSavedSnapshotRef.current = snapshot;
    };

    void persistTeamProfiles();

    return () => {
      cancelled = true;
    };
  }, [profiles, supabaseClient]);

  return [profiles, setProfiles, refreshTeamData] as const;
}

export function useCurrentTeamMember() {
  const [profiles, setProfiles] = useTeamProfiles();
  const { session } = useAuthSession();
  const authenticatedEmail = session?.user.email?.trim().toLowerCase() ?? null;
  const memberId = getAuthenticatedMemberId() ?? profiles[0]?.id ?? null;

  const member = useMemo(() => {
    if (authenticatedEmail) {
      const matchedByEmail = profiles.find((item) => item.email.trim().toLowerCase() === authenticatedEmail) ?? null;
      if (matchedByEmail) {
        return matchedByEmail;
      }
    }

    if (memberId === null) {
      return null;
    }

    return profiles.find((item) => item.id === memberId) ?? null;
  }, [authenticatedEmail, memberId, profiles]);

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
  const defaultStats = {
    postsCreated: 0,
    avgEngagement: 0,
    goalsCompleted: 0,
    performance: 0,
    punctuality: 0,
    monthlyViews: 0,
  };

  return {
    id: Number.isFinite(id) ? id : 0,
    name: row.name ?? "",
    role: row.role ?? "",
    avatar: row.avatar ?? "",
    specialty: row.specialty ?? "",
    color: row.color ?? "#e50914",
    stats: {
      ...defaultStats,
      ...(row.stats ?? {}),
    },
    radar: row.radar ?? [],
    monthlyPosts: row.monthlyPosts ?? row.monthly_posts ?? [],
    userId: row.userId ?? getDemoAccountUserId(row.email ?? "") ?? "",
    email: row.email ?? "",
    password: row.password ?? "",
    avatarUrl: row.avatarUrl ?? row.avatar_url ?? "",
    bio: row.bio ?? "",
  } satisfies EditableTeamMember;
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
