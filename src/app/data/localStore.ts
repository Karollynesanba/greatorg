const LOCAL_STORAGE_EVENT = "great-organico:local-storage-change";
const memoryStore = new Map<string, string>();

type LocalStorageChangeDetail = {
  key: string;
};

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function safeGetItem(key: string) {
  if (!canUseStorage()) {
    return memoryStore.get(key) ?? null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch {
    return memoryStore.get(key) ?? null;
  }
}

function safeSetItem(key: string, value: string) {
  if (!canUseStorage()) {
    memoryStore.set(key, value);
    return;
  }

  try {
    window.localStorage.setItem(key, value);
  } catch {
    memoryStore.set(key, value);
  }
}

function safeRemoveItem(key: string) {
  memoryStore.delete(key);

  if (!canUseStorage()) {
    return;
  }

  try {
    window.localStorage.removeItem(key);
  } catch {
    return;
  }
}

export function readLocalJson<T>(key: string, fallback: T): T {
  const raw = safeGetItem(key);
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeLocalJson<T>(key: string, value: T) {
  safeSetItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent<LocalStorageChangeDetail>(LOCAL_STORAGE_EVENT, { detail: { key } }));
}

export function readLocalText(key: string) {
  return safeGetItem(key);
}

export function writeLocalText(key: string, value: string | null) {
  if (value === null) {
    safeRemoveItem(key);
  } else {
    safeSetItem(key, value);
  }

  window.dispatchEvent(new CustomEvent<LocalStorageChangeDetail>(LOCAL_STORAGE_EVENT, { detail: { key } }));
}

export function subscribeLocalKey(key: string, onChange: () => void) {
  if (!canUseStorage()) {
    return () => {};
  }

  const handleCustomEvent = (event: Event) => {
    const detail = (event as CustomEvent<LocalStorageChangeDetail>).detail;
    if (detail?.key === key) {
      onChange();
    }
  };

  const handleStorageEvent = (event: StorageEvent) => {
    if (event.key === key) {
      onChange();
    }
  };

  window.addEventListener(LOCAL_STORAGE_EVENT, handleCustomEvent as EventListener);
  window.addEventListener("storage", handleStorageEvent);

  return () => {
    window.removeEventListener(LOCAL_STORAGE_EVENT, handleCustomEvent as EventListener);
    window.removeEventListener("storage", handleStorageEvent);
  };
}
