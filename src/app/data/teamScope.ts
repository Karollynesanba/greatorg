import { useSupabasePreference } from "./userPreferences";

export type TeamScope = number | "todos";

export function useTeamScope() {
  return useSupabasePreference<TeamScope>("team-scope", "todos");
}

export function matchesTeamScope(memberId: number, scope: TeamScope) {
  return scope === "todos" || scope === memberId;
}
