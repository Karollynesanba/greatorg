import { useCallback, useEffect, useState } from "react";

const sharedStateEvent = "great-organico-shared-state";

type Updater<T> = T | ((current: T) => T);

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function isEmptyArrayValue(value: unknown) {
  return Array.isArray(value) && value.length === 0;
}

function readStoredValue<T>(key: string, fallback: T) {
  if (!canUseStorage()) {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw) as T;

    if (isEmptyArrayValue(parsed) && Array.isArray(fallback) && fallback.length > 0) {
      return fallback;
    }

    return parsed;
  } catch {
    return fallback;
  }
}

function writeStoredValue<T>(key: string, value: T) {
  if (!canUseStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent(sharedStateEvent, { detail: key }));
  } catch {
    // Ignore storage failures and keep the in-memory state functional.
  }
}

export function useSharedState<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => readStoredValue(key, fallback));

  useEffect(() => {
    const syncFromStorage = (event: StorageEvent | CustomEvent<string>) => {
      if ("storageArea" in event) {
        if (event.storageArea !== window.localStorage) {
          return;
        }

        if (event.key !== key) {
          return;
        }
      } else if (event.detail !== key) {
        return;
      }

      setValue(readStoredValue(key, fallback));
    };

    window.addEventListener("storage", syncFromStorage);
    window.addEventListener(sharedStateEvent, syncFromStorage as EventListener);
    return () => {
      window.removeEventListener("storage", syncFromStorage);
      window.removeEventListener(sharedStateEvent, syncFromStorage as EventListener);
    };
  }, [fallback, key]);

  const setSharedValue = useCallback((update: Updater<T>) => {
    setValue((current) => {
      const nextValue = typeof update === "function" ? (update as (current: T) => T)(current) : update;
      writeStoredValue(key, nextValue);
      return nextValue;
    });
  }, [key]);

  return [value, setSharedValue] as const;
}

export function createStorageKey(name: string) {
  return `great-organico-${name}`;
}
