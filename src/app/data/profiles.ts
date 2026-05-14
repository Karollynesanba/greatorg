import { useEffect, useMemo, useRef, useState } from "react";
import { useAuthSession } from "../auth";
import { isSupabaseConfigured, supabase } from "./supabase";
import { teamMembers as baseTeamMembers, type TeamMember } from "./mockData";

export type EditableTeamMember = TeamMember & {
  userId: string;
  email: string;
  password?: string;
  avatarUrl: string;
  bio: string;
};

type TeamProfileRow = Partial<EditableTeamMember> & {
  id?: number | string | null;
  user_id?: string | null;
  avatar_url?: string | null;
  monthly_posts?: EditableTeamMember["monthlyPosts"] | null;
};

type TeamProfileDbRow = {
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

type TeamProfileDbUpsert = TeamProfileDbRow;

const teamProfilesTable = "team_profiles";

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
  const hydratedRef = useRef(false);
  const { session } = useAuthSession();
  const supabaseClient = supabase;
  const currentUserId = session?.user.id ?? null;
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
    if (!hydratedRef.current || !isSupabaseConfigured() || !supabaseClient || !currentUserId) {
      return;
    }

    let cancelled = false;

    const persistTeamProfiles = async () => {
      const currentProfile =
        normalizedProfiles.find((profile) => profile.userId === currentUserId) ??
        normalizedProfiles.find((profile) => profile.email.toLowerCase() === (session?.user.email ?? "").toLowerCase());

      if (!currentProfile) {
        return;
      }

      const row = await toTeamProfileDbRow({
        ...currentProfile,
        userId: currentUserId,
      });
      const { error } = await supabaseClient.from(teamProfilesTable).upsert(row, { onConflict: "user_id" });

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
  }, [normalizedProfiles, currentUserId, session?.user.email, supabaseClient]);

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
  const { session } = useAuthSession();
  const memberId = session?.user.id ?? null;
  const memberEmail = session?.user.email?.toLowerCase() ?? null;

  const member = useMemo(() => {
    if (!memberId && !memberEmail) {
      return null;
    }

    return (
      profiles.find((item) => item.userId === memberId) ??
      (memberEmail ? profiles.find((item) => item.email.toLowerCase() === memberEmail) ?? null : null)
    );
  }, [memberEmail, memberId, profiles]);

  const updateMember = (memberIdToUpdate: number, updater: (current: EditableTeamMember) => EditableTeamMember) => {
    setProfiles((previous) =>
      previous.map((item) => (item.id === memberIdToUpdate ? updater(item) : item)),
    );
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

function normalizeProfileRow(row: TeamProfileRow) {
  const id = typeof row.id === "string" ? Number(row.id) : row.id ?? 0;

  return {
    id: Number.isFinite(id) ? id : 0,
    userId: row.userId ?? row.user_id ?? "",
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

async function toTeamProfileDbRow(profile: EditableTeamMember): Promise<TeamProfileDbUpsert> {
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
