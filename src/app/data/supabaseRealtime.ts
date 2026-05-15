import type { RealtimeChannel } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "./supabase";

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
    channel.subscribe();

    entry = { channel, listeners };
    sharedChannels.set(name, entry);
  }

  entry.listeners.add(onChange);

  return () => {
    const currentEntry = sharedChannels.get(name);
    if (!currentEntry) {
      return;
    }

    currentEntry.listeners.delete(onChange);

    if (currentEntry.listeners.size > 0) {
      return;
    }

    sharedChannels.delete(name);
    void client.removeChannel(currentEntry.channel);
  };
}
