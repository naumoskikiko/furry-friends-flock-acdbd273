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
      petIds.length > 0 ? supabase.from("pets").select("id, name, breed").in("id", petIds) : { data: [] as any[] },
      user ? supabase.from("post_likes").select("post_id").eq("user_id", user.id).in("post_id", postIds) : { data: [] as any[] },
      user ? (supabase as any).from("saved_posts").select("post_id").eq("user_id", user.id).in("post_id", postIds) : { data: [] as any[] },
    ]);

    const profileMap = new Map(profilesRes.data?.map((p) => [p.user_id, p]) || []);
    const petMap = new Map<string, { name: string; breed: string | null }>(
      (petsRes.data || []).map((p: any) => [p.id, { name: p.name, breed: p.breed }])
    );
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

    // Load all public posts from all users
    const { data: rawPosts } = await supabase
      .from("posts")
      .select("*")
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

  // Realtime subscription — listen to posts table for authoritative count updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("feed-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts" }, () => {
        fetchFeed(true);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "posts" }, (payload) => {
        // DB triggers update likes_count/comments_count — sync to local state
        const updated = payload.new as any;
        if (updated?.id) {
          setPosts((prev) =>
            prev.map((p) =>
              p.id === updated.id
                ? { ...p, likes_count: updated.likes_count, comments_count: updated.comments_count }
                : p
            )
          );
        }
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "posts" }, (payload) => {
        const deleted = payload.old as any;
        if (deleted?.id) {
          setPosts((prev) => prev.filter((p) => p.id !== deleted.id));
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "post_likes" }, (payload) => {
        // Update is_liked for the current user only
        const postId = (payload.new as any)?.post_id || (payload.old as any)?.post_id;
        const userId = (payload.new as any)?.user_id || (payload.old as any)?.user_id;
        if (postId && userId === user.id) {
          setPosts((prev) =>
            prev.map((p) =>
              p.id === postId
                ? { ...p, is_liked: payload.eventType === "INSERT" }
                : p
            )
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
