import { useMemo } from "react";
import { getAuthenticatedMemberId } from "../auth";
import { createStorageKey, useSharedState } from "./sharedState";
import { teamMembers as baseTeamMembers, type TeamMember } from "./mockData";

export type EditableTeamMember = TeamMember & {
  email: string;
  password: string;
  avatarUrl: string;
  bio: string;
};

const seedAccounts: EditableTeamMember[] = baseTeamMembers.map((member, index) => {
  const credentials = [
    { email: "brenda@greatorganico.com", password: "great123" },
    { email: "hannah@greatorganico.com", password: "great123" },
    { email: "thiago@greatorganico.com", password: "great123" },
  ][index] ?? {
    email: `membro${index + 1}@greatorganico.com`,
    password: "great123",
  };

  return {
    ...member,
    ...credentials,
    avatarUrl: "",
    bio: member.specialty,
  };
});

export function useTeamProfiles() {
  return useSharedState(createStorageKey("team-profiles"), seedAccounts);
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
