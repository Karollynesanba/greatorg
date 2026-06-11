import { useMemo } from "react";
import { useSupabaseSyncedListState } from "./supabaseSync";
import type { Post } from "./mockData";

export type { Post } from "./mockData";

const postsTable = "posts";

export function usePosts() {
  return useSupabaseSyncedListState<Post>({
    key: "posts",
    table: postsTable,
    fallback: [],
  });
}

export function usePostById(postId: string | undefined) {
  const [posts] = usePosts();

  return useMemo(() => posts.find((item) => String(item.id) === postId) ?? null, [postId, posts]);
}
