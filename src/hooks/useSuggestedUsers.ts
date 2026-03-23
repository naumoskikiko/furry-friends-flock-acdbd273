import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface SuggestedUser {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  username: string | null;
  mutual_count: number;
  created_at: string;
}

const BATCH = 5;

export function useSuggestedUsers() {
  const { user } = useAuth();
  const [users, setUsers] = useState<SuggestedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const lastBatchIdsRef = useRef<Set<string>>(new Set());

  const fetchSuggestions = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Get followed + blocked user ids to exclude
    const [followRes, blockedRes] = await Promise.all([
      supabase.from("followers").select("following_id").eq("follower_id", user.id),
      (supabase as any).from("blocked_users").select("blocked_id").eq("blocker_id", user.id),
    ]);

    const hardExcludeIds = new Set<string>([
      user.id,
      ...(followRes.data?.map((f: any) => f.following_id) || []),
      ...(blockedRes.data?.map((b: any) => b.blocked_id) || []),
    ]);
    // Soft-exclude last batch to avoid immediate repeats
    const softExcludeIds = lastBatchIdsRef.current;

    // Get the user's followers' followings (mutual logic)
    const myFollowingIds = followRes.data?.map((f: any) => f.following_id) || [];

    let mutualMap = new Map<string, number>();
    if (myFollowingIds.length > 0) {
      const { data: mutualData } = await supabase
        .from("followers")
        .select("following_id")
        .in("follower_id", myFollowingIds.slice(0, 50));
      
      for (const row of mutualData || []) {
        if (!hardExcludeIds.has(row.following_id)) {
          mutualMap.set(row.following_id, (mutualMap.get(row.following_id) || 0) + 1);
        }
      }
    }

    // Fetch candidate profiles excluding already shown/followed/blocked
    const excludeArr = [...hardExcludeIds];
    let query = supabase
      .from("profiles")
      .select("user_id, full_name, avatar_url, username, created_at")
      .order("created_at", { ascending: false })
      .limit(BATCH + excludeArr.length + 20);

    const { data: candidates } = await query;

    // Prefer users not in last batch, but allow repeats if pool is small
    const allCandidates = (candidates || [])
      .filter((p) => !hardExcludeIds.has(p.user_id))
      .map((p) => ({
        ...p,
        mutual_count: mutualMap.get(p.user_id) || 0,
      }))
      .sort((a, b) => b.mutual_count - a.mutual_count || new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const fresh = allCandidates.filter((p) => !softExcludeIds.has(p.user_id));
    const filtered = fresh.length >= BATCH
      ? fresh.slice(0, BATCH)
      : [...fresh, ...allCandidates.filter((p) => softExcludeIds.has(p.user_id))].slice(0, BATCH);

    lastBatchIdsRef.current = new Set(filtered.map((u) => u.user_id));

    setUsers(filtered);
    setLoading(false);
  }, [user]);

  const followUser = useCallback(async (targetId: string) => {
    if (!user) return;
    await supabase.from("followers").insert({ follower_id: user.id, following_id: targetId });
    setUsers((prev) => prev.filter((u) => u.user_id !== targetId));
  }, [user]);

  const resetShown = useCallback(() => {
    lastBatchIdsRef.current.clear();
  }, []);

  return { users, loading, fetchSuggestions, followUser, resetShown };
}
