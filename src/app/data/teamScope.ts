import { createStorageKey, useSharedState } from "./sharedState";

export type TeamScope = number | "todos";

const teamScopeStorageKey = createStorageKey("team-scope");

export function useTeamScope() {
  return useSharedState<TeamScope>(teamScopeStorageKey, "todos");
}

export function matchesTeamScope(memberId: number, scope: TeamScope) {
  return scope === "todos" || scope === memberId;
}

