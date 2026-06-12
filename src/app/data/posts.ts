import { useMemo } from "react";
import { useSupabaseSyncedListState } from "./supabaseSync";
import { posts as seedPosts, type Post } from "./mockData";

export type { Post } from "./mockData";

const postsTable = "posts";

export function usePosts() {
  return useSupabaseSyncedListState<Post>({
    key: "posts",
    table: postsTable,
    fallback: seedPosts,
    seedOnEmpty: true,
  });
}

export function usePostById(postId: string | undefined) {
  const [posts] = usePosts();

  return useMemo(() => posts.find((item) => String(item.id) === postId) ?? null, [postId, posts]);
}
