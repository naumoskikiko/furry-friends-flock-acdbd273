import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface FeedPostData {
  id: string;
  user_id: string;
  caption: string | null;
  image_url: string | null;
  post_type: string;
  location: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  pet_id: string | null;
  // joined data
  username: string;
  avatar_url: string | null;
  user_role: string;
  pet_name: string | null;
  pet_breed: string | null;
  is_liked: boolean;
  is_saved: boolean;
}

const BATCH_SIZE = 20;

export const useFeed = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<FeedPostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const offsetRef = useRef(0);

  const enrichPosts = useCallback(async (rawPosts: any[]): Promise<FeedPostData[]> => {
    if (rawPosts.length === 0) return [];

    const userIds = [...new Set(rawPosts.map((p) => p.user_id))];
    const petIds = [...new Set(rawPosts.map((p) => p.pet_id).filter(Boolean))];
    const postIds = rawPosts.map((p) => p.id);

    const [profilesRes, petsRes, likesRes, savesRes] = await Promise.all([
      supabase.from("profiles").select("user_id, full_name, avatar_url, role").in("user_id", userIds),
      petIds.length > 0 ? supabase.from("pets").select("id, name, breed").in("id", petIds) : { data: [] },
      user ? supabase.from("post_likes").select("post_id").eq("user_id", user.id).in("post_id", postIds) : { data: [] },
      user ? supabase.from("saved_posts").select("post_id").eq("user_id", user.id).in("post_id", postIds) : { data: [] },
    ]);

    const profileMap = new Map(profilesRes.data?.map((p) => [p.user_id, p]) || []);
    const petMap = new Map(petsRes.data?.map((p: any) => [p.id, p]) || []);
    const likedSet = new Set(likesRes.data?.map((l: any) => l.post_id) || []);
    const savedSet = new Set(savesRes.data?.map((s: any) => s.post_id) || []);

    return rawPosts.map((post) => {
      const profile = profileMap.get(post.user_id);
      const pet = post.pet_id ? petMap.get(post.pet_id) : null;
      return {
        id: post.id,
        user_id: post.user_id,
        caption: post.caption,
        image_url: post.image_url,
        post_type: post.post_type,
        location: post.location,
        likes_count: post.likes_count,
        comments_count: post.comments_count,
        created_at: post.created_at,
        pet_id: post.pet_id,
        username: profile?.full_name || "User",
        avatar_url: profile?.avatar_url || null,
        user_role: profile?.role || "owner",
        pet_name: pet?.name || null,
        pet_breed: pet?.breed || null,
        is_liked: likedSet.has(post.id),
        is_saved: savedSet.has(post.id),
      };
    });
  }, [user]);

  const fetchFeed = useCallback(async (reset = false) => {
    if (!user) return;
    if (reset) {
      offsetRef.current = 0;
      setHasMore(true);
    }

    setLoading(true);

    // Get followed user IDs
    const { data: follows } = await supabase
      .from("followers")
      .select("following_id")
      .eq("follower_id", user.id);

    const followedIds = follows?.map((f) => f.following_id) || [];
    const feedUserIds = [...followedIds, user.id];

    const { data: rawPosts } = await supabase
      .from("posts")
      .select("*")
      .in("user_id", feedUserIds)
      .order("created_at", { ascending: false })
      .range(offsetRef.current, offsetRef.current + BATCH_SIZE - 1);

    const enriched = await enrichPosts(rawPosts || []);

    if (reset) {
      setPosts(enriched);
    } else {
      setPosts((prev) => [...prev, ...enriched]);
    }

    if (!rawPosts || rawPosts.length < BATCH_SIZE) {
      setHasMore(false);
    }
    offsetRef.current += rawPosts?.length || 0;
    setLoading(false);
  }, [user, enrichPosts]);

  // Initial load
  useEffect(() => {
    fetchFeed(true);
  }, [fetchFeed]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("feed-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts" }, () => {
        fetchFeed(true);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "post_likes" }, (payload) => {
        // Update like count locally
        const postId = (payload.new as any)?.post_id || (payload.old as any)?.post_id;
        if (postId) {
          setPosts((prev) =>
            prev.map((p) => {
              if (p.id !== postId) return p;
              const delta = payload.eventType === "INSERT" ? 1 : payload.eventType === "DELETE" ? -1 : 0;
              return {
                ...p,
                likes_count: Math.max(0, p.likes_count + delta),
                is_liked: payload.eventType === "INSERT" && (payload.new as any).user_id === user.id ? true :
                          payload.eventType === "DELETE" && (payload.old as any).user_id === user.id ? false : p.is_liked,
              };
            })
          );
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "post_comments" }, (payload) => {
        const postId = (payload.new as any)?.post_id || (payload.old as any)?.post_id;
        if (postId) {
          setPosts((prev) =>
            prev.map((p) => {
              if (p.id !== postId) return p;
              const delta = payload.eventType === "INSERT" ? 1 : payload.eventType === "DELETE" ? -1 : 0;
              return { ...p, comments_count: Math.max(0, p.comments_count + delta) };
            })
          );
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, fetchFeed]);

  const loadMore = () => {
    if (hasMore && !loading) fetchFeed(false);
  };

  return { posts, loading, hasMore, loadMore, refreshFeed: () => fetchFeed(true) };
};
