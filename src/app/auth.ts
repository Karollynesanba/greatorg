export const authStorageKey = "great-organico-authenticated";
export const authMemberIdKey = "great-organico-authenticated-member-id";

export function isAuthenticated() {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.localStorage.getItem(authStorageKey) === "true";
  } catch {
    return false;
  }
}

export function signIn() {
  try {
    window.localStorage.setItem(authStorageKey, "true");
  } catch {
    // Ignore storage failures; session will stay in memory only.
  }
}

export function signInAsMember(memberId: number) {
  try {
    window.localStorage.setItem(authStorageKey, "true");
    window.localStorage.setItem(authMemberIdKey, String(memberId));
  } catch {
    // Ignore storage failures; session will stay in memory only.
  }
}

export function signOut() {
  try {
    window.localStorage.removeItem(authStorageKey);
    window.localStorage.removeItem(authMemberIdKey);
  } catch {
    // Ignore storage failures.
  }
}

export function getAuthenticatedMemberId() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(authMemberIdKey);
    const parsed = raw ? Number(raw) : Number.NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  } catch {
    return null;
  }
}
