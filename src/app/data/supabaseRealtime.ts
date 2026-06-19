import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabaseDiagnostics, isSupabaseConfigured, supabase } from "./supabase";

type SharedChannel = {
  channel: RealtimeChannel;
  listeners: Set<() => void>;
};

const sharedChannels = new Map<string, SharedChannel>();

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

    entry = { channel, listeners };
    sharedChannels.set(name, entry);
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

    sharedChannels.delete(name);
    console.info("[SupabaseRealtime] Channel removed", {
      channel: name,
      ...getSupabaseDiagnostics(),
    });
    void client.removeChannel(currentEntry.channel);
  };
}
