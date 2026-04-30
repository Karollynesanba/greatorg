import { useEffect, useState } from "react";

const sharedStateEvent = "great-organico-shared-state";

type Updater<T> = T | ((current: T) => T);

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readStoredValue<T>(key: string, fallback: T) {
  if (!canUseStorage()) {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStoredValue<T>(key: string, value: T) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(sharedStateEvent, { detail: key }));
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

  const setSharedValue = (update: Updater<T>) => {
    setValue((current) => {
      const nextValue = typeof update === "function" ? (update as (current: T) => T)(current) : update;
      writeStoredValue(key, nextValue);
      return nextValue;
    });
  };

  return [value, setSharedValue] as const;
}

export function createStorageKey(name: string) {
  return `great-organico-${name}`;
}
