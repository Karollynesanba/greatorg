import { useCallback, useEffect, useState } from "react";

const sharedStateEvent = "great-organico-shared-state";
const sharedStateStore = new Map<string, unknown>();

type Updater<T> = T | ((current: T) => T);

function readStoredValue<T>(key: string, fallback: T) {
  return sharedStateStore.has(key) ? (sharedStateStore.get(key) as T) : fallback;
}

function writeStoredValue<T>(key: string, value: T) {
  sharedStateStore.set(key, value);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(sharedStateEvent, { detail: key }));
  }
}

export function useSharedState<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => readStoredValue(key, fallback));

  useEffect(() => {
    const syncFromStorage = (event: StorageEvent | CustomEvent<string>) => {
      if (!("storageArea" in event) && event.detail !== key) {
        return;
      }

      setValue(readStoredValue(key, fallback));
    };

    if (typeof window !== "undefined") {
      window.addEventListener(sharedStateEvent, syncFromStorage as EventListener);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener(sharedStateEvent, syncFromStorage as EventListener);
      }
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
