import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { StoryGroup } from "@/components/stories/StoryViewer";

export const useStories = () => {
  const { user } = useAuth();
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasOwnStory, setHasOwnStory] = useState(false);

  const fetchStories = useCallback(async () => {
    setLoading(true);

    // Get followed user IDs to filter stories
    let followedIds: string[] = [];
    if (user) {
      const { data: follows } = await supabase
        .from("followers")
        .select("following_id")
        .eq("follower_id", user.id);
      followedIds = follows?.map((f) => f.following_id) || [];
    }
    const storyUserIds = user ? [...followedIds, user.id] : [];

    const query = supabase
      .from("stories")
      .select("*")
      .order("created_at", { ascending: true });

    // If user is logged in, filter to own + followed
    const { data: stories } = storyUserIds.length > 0
      ? await query.in("user_id", storyUserIds)
      : await query;

    if (!stories || stories.length === 0) {
      setStoryGroups([]);
      setHasOwnStory(false);
      setLoading(false);
      return;
    }

    // Get unique user IDs
    const userIds = [...new Set(stories.map((s) => s.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, avatar_url")
      .in("user_id", userIds);

    const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

    // Group stories by user
    const groupMap = new Map<string, StoryGroup>();
    for (const s of stories) {
      const p = profileMap.get(s.user_id);
      const name = p?.full_name || "User";
      if (!groupMap.has(s.user_id)) {
        groupMap.set(s.user_id, {
          user_id: s.user_id,
          username: name,
          avatar_url: p?.avatar_url || null,
          initials: name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2),
          stories: [],
        });
      }
      groupMap.get(s.user_id)!.stories.push({
        id: s.id,
        media_url: s.media_url,
        media_type: s.media_type,
        caption: s.caption || "",
        location: s.location || "",
        text_overlay: s.text_overlay || "",
        sticker: s.sticker || "",
        created_at: s.created_at,
      });
    }

    // Sort: own story first
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

  return { storyGroups, loading, hasOwnStory, refreshStories: fetchStories };
};
