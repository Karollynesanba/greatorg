export const authStorageKey = "great-organico-authenticated";

export function isAuthenticated() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(authStorageKey) === "true";
}

export function signIn() {
  window.localStorage.setItem(authStorageKey, "true");
}

export function signOut() {
  window.localStorage.removeItem(authStorageKey);
}
