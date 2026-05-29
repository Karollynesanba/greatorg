export const authStorageKey = "great-organico-authenticated";
export const authMemberIdKey = "great-organico-authenticated-member-id";

export function seedLegacySession(win: Window, memberId = 1) {
  win.localStorage.clear();
  win.localStorage.setItem(authStorageKey, "true");
  win.localStorage.setItem(authMemberIdKey, String(memberId));
}

export function clearLegacySession(win: Window) {
  win.localStorage.removeItem(authStorageKey);
  win.localStorage.removeItem(authMemberIdKey);
}
