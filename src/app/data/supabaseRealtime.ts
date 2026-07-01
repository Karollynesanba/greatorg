import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabaseDiagnostics, isSupabaseConfigured, supabase } from "./supabase";

type SharedChannel = {
  channel: RealtimeChannel;
  listeners: Set<() => void>;
  cleanupTimer: ReturnType<typeof setTimeout> | null;
};

const sharedChannels = new Map<string, SharedChannel>();
const CHANNEL_CLEANUP_DELAY_MS = 1_000;

export function subscribeSharedChannel(
  name: string,
  setup: (channel: RealtimeChannel, dispatch: () => void) => void,
  onChange: () => void,
) {
  if (!isSupabaseConfigured() || !supabase) {
    console.warn("[SupabaseRealtime] Subscription skipped because Supabase is not configured.", {
      channel: name,
      ...getSupabaseDiagnostics(),
    });
    return () => {};
  }

  const client = supabase;
  let entry = sharedChannels.get(name);
  if (!entry) {
    const listeners = new Set<() => void>();
    const channel = client.channel(name);
    const dispatch = () => {
      listeners.forEach((listener) => {
        listener();
      });
    };

    setup(channel, dispatch);
    channel.subscribe((status) => {
      console.info("[SupabaseRealtime] Channel status changed", {
        channel: name,
        status,
        ...getSupabaseDiagnostics(),
      });
    });

    entry = { channel, listeners, cleanupTimer: null };
    sharedChannels.set(name, entry);
  } else if (entry.cleanupTimer) {
    clearTimeout(entry.cleanupTimer);
    entry.cleanupTimer = null;
  }

  console.info("[SupabaseRealtime] Listener attached", {
    channel: name,
    listeners: entry.listeners.size + 1,
    ...getSupabaseDiagnostics(),
  });

  entry.listeners.add(onChange);

  return () => {
    const currentEntry = sharedChannels.get(name);
    if (!currentEntry) {
      return;
    }

    currentEntry.listeners.delete(onChange);

    if (currentEntry.listeners.size > 0) {
      console.info("[SupabaseRealtime] Listener detached", {
        channel: name,
        listeners: currentEntry.listeners.size,
        ...getSupabaseDiagnostics(),
      });
      return;
    }

    currentEntry.cleanupTimer = setTimeout(() => {
      const pendingEntry = sharedChannels.get(name);
      if (!pendingEntry || pendingEntry !== currentEntry || pendingEntry.listeners.size > 0) {
        return;
      }

      sharedChannels.delete(name);
      pendingEntry.cleanupTimer = null;
      console.info("[SupabaseRealtime] Channel removed", {
        channel: name,
        ...getSupabaseDiagnostics(),
      });
      void client.removeChannel(pendingEntry.channel);
    }, CHANNEL_CLEANUP_DELAY_MS);

    console.info("[SupabaseRealtime] Channel cleanup scheduled", {
      channel: name,
      delayMs: CHANNEL_CLEANUP_DELAY_MS,
      ...getSupabaseDiagnostics(),
    });
  };
}
