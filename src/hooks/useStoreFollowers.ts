import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const fromTable = (table: string) => (supabase as any).from(table);

export function useStoreFollowers(storeId: string | null) {
  const { user } = useAuth();
  const [followerCount, setFollowerCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!storeId) { setFollowerCount(0); setIsFollowing(false); setLoading(false); return; }

    const { count } = await fromTable("store_followers")
      .select("*", { count: "exact", head: true })
      .eq("store_id", storeId);
    setFollowerCount(count || 0);

    if (user) {
      const { data } = await fromTable("store_followers")
        .select("id")
        .eq("store_id", storeId)
        .eq("user_id", user.id)
        .maybeSingle();
      setIsFollowing(!!data);
    }
    setLoading(false);
  }, [storeId, user]);

  useEffect(() => { refresh(); }, [refresh]);

  const toggleFollow = useCallback(async () => {
    if (!user || !storeId) return;
    if (isFollowing) {
      await fromTable("store_followers").delete().eq("store_id", storeId).eq("user_id", user.id);
    } else {
      await fromTable("store_followers").insert({ store_id: storeId, user_id: user.id });
    }
    await refresh();
  }, [user, storeId, isFollowing, refresh]);

  return { followerCount, isFollowing, toggleFollow, loading };
}
