import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { StoryGroup } from "@/components/stories/StoryViewer";
import { cacheGet, cacheSet } from "@/lib/cache";

const fromTable = (table: string) => (supabase as any).from(table);

export const useStories = () => {
  const { user } = useAuth();
  const CACHE_KEY = `stories_${user?.id || "anon"}`;
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>(() => cacheGet<StoryGroup[]>(CACHE_KEY) || []);
  const [loading, setLoading] = useState(!cacheGet<StoryGroup[]>(CACHE_KEY));
  const [hasOwnStory, setHasOwnStory] = useState(false);

  const fetchStories = useCallback(async () => {
    setLoading(true);

    // Get followed user IDs
    let followingIds: string[] = [];
    if (user) {
      const { data: followingData } = await supabase
        .from("followers")
        .select("following_id")
        .eq("follower_id", user.id);
      followingIds = followingData?.map((f) => f.following_id) || [];
    }

    // Include own + followed users
    const storyUserIds = user ? [user.id, ...followingIds] : [];

    if (storyUserIds.length === 0) {
      setStoryGroups([]);
      setHasOwnStory(false);
      setLoading(false);
      return;
    }

    const { data: stories } = await supabase
      .from("stories")
      .select("*")
      .in("user_id", storyUserIds)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: true });

    if (!stories || stories.length === 0) {
      setStoryGroups([]);
      setHasOwnStory(false);
      setLoading(false);
      return;
    }

    const userIds = [...new Set(stories.map((s) => s.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, avatar_url, username")
      .in("user_id", userIds);

    const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

    // Fetch likes for all stories
    const storyIds = stories.map((s) => s.id);
    const { data: likes } = await fromTable("story_likes")
      .select("story_id, user_id")
      .in("story_id", storyIds);

    const likeMap = new Map<string, string[]>();
    for (const like of likes || []) {
      if (!likeMap.has(like.story_id)) likeMap.set(like.story_id, []);
      likeMap.get(like.story_id)!.push(like.user_id);
    }

    const groupMap = new Map<string, StoryGroup>();
    for (const s of stories) {
      const p = profileMap.get(s.user_id);
      const name = p?.full_name || "User";
      if (!groupMap.has(s.user_id)) {
        groupMap.set(s.user_id, {
          user_id: s.user_id,
          username: p?.username || name,
          avatar_url: p?.avatar_url || null,
          initials: name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2),
          stories: [],
        });
      }
      const storyLikes = likeMap.get(s.id) || [];
      groupMap.get(s.user_id)!.stories.push({
        id: s.id,
        user_id: s.user_id,
        media_url: s.media_url,
        media_type: s.media_type,
        caption: s.caption || "",
        location: s.location || "",
        location_lat: s.location_lat || null,
        location_lng: s.location_lng || null,
        text_overlay: s.text_overlay || "",
        sticker: s.sticker || "",
        created_at: s.created_at,
        likes_count: storyLikes.length,
        is_liked: user ? storyLikes.includes(user.id) : false,
      });
    }

    const groups = Array.from(groupMap.values());
    if (user) {
      groups.sort((a, b) => {
        if (a.user_id === user.id) return -1;
        if (b.user_id === user.id) return 1;
        return 0;
      });
    }

    setStoryGroups(groups);
    setHasOwnStory(groups.some((g) => g.user_id === user?.id));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  const likeStory = useCallback(async (storyId: string) => {
    if (!user) return;
    await fromTable("story_likes").insert({ story_id: storyId, user_id: user.id });
    // Optimistic update
    setStoryGroups((prev) =>
      prev.map((g) => ({
        ...g,
        stories: g.stories.map((s) =>
          s.id === storyId ? { ...s, is_liked: true, likes_count: s.likes_count + 1 } : s
        ),
      }))
    );
  }, [user]);

  const unlikeStory = useCallback(async (storyId: string) => {
    if (!user) return;
    await fromTable("story_likes").delete().eq("story_id", storyId).eq("user_id", user.id);
    setStoryGroups((prev) =>
      prev.map((g) => ({
        ...g,
        stories: g.stories.map((s) =>
          s.id === storyId ? { ...s, is_liked: false, likes_count: Math.max(0, s.likes_count - 1) } : s
        ),
      }))
    );
  }, [user]);

  const recordView = useCallback(async (storyId: string) => {
    if (!user) return;
    await fromTable("story_views").upsert(
      { story_id: storyId, user_id: user.id },
      { onConflict: "story_id,user_id" }
    );
  }, [user]);

  const deleteStory = useCallback((storyId: string) => {
    setStoryGroups((prev) => {
      const updated = prev.map((g) => ({
        ...g,
        stories: g.stories.filter((s) => s.id !== storyId),
      })).filter((g) => g.stories.length > 0);
      return updated;
    });
    setHasOwnStory((prev) => {
      // Recheck after deletion
      return storyGroups.some((g) => g.user_id === user?.id && g.stories.some((s) => s.id !== storyId));
    });
  }, [storyGroups, user]);

  return {
    storyGroups, loading, hasOwnStory, refreshStories: fetchStories,
    likeStory, unlikeStory, recordView, deleteStory,
  };
};

// --- Story drafts (localStorage-based) ---
export interface StoryDraft {
  id: string;
  mediaDataUrl: string;
  mediaType: "image" | "video";
  caption: string;
  location: string;
  textOverlay: string;
  sticker: string;
  petId: string;
  createdAt: number;
}

const DRAFTS_KEY = "story_drafts";

export function getStoryDrafts(): StoryDraft[] {
  try {
    return JSON.parse(localStorage.getItem(DRAFTS_KEY) || "[]");
  } catch { return []; }
}

export function saveStoryDraft(draft: StoryDraft) {
  const drafts = getStoryDrafts().filter((d) => d.id !== draft.id);
  drafts.unshift(draft);
  localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts.slice(0, 10))); // max 10 drafts
}

export function deleteStoryDraft(draftId: string) {
  const drafts = getStoryDrafts().filter((d) => d.id !== draftId);
  localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
}
