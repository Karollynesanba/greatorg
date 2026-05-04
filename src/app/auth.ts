export const authStorageKey = "great-organico-authenticated";
export const authMemberIdKey = "great-organico-authenticated-member-id";

export function isAuthenticated() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(authStorageKey) === "true";
}

export function signIn() {
  window.localStorage.setItem(authStorageKey, "true");
}

export function signInAsMember(memberId: number) {
  window.localStorage.setItem(authStorageKey, "true");
  window.localStorage.setItem(authMemberIdKey, String(memberId));
}

export function signOut() {
  window.localStorage.removeItem(authStorageKey);
  window.localStorage.removeItem(authMemberIdKey);
}

export function getAuthenticatedMemberId() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(authMemberIdKey);
  const parsed = raw ? Number(raw) : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}
