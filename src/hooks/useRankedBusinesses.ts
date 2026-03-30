import { useMemo, useState, useEffect } from "react";
import { useActiveBoosts, type Boost } from "@/hooks/useBoosts";
import { rankStores, rankProducts, type BoostInfo } from "@/lib/rankingAlgorithm";
import type { BusinessProfile, Product } from "@/hooks/useBusiness";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const fromTable = (table: string) => (supabase as any).from(table);

function boostsToMap(boosts: Boost[]): Map<string, BoostInfo> {
  const map = new Map<string, BoostInfo>();
  for (const b of boosts) {
    const hours = (new Date(b.end_date).getTime() - new Date(b.start_date).getTime()) / 3600000;
    map.set(b.target_id, { target_id: b.target_id, end_date: b.end_date, duration_hours: hours });
  }
  return map;
}

export function useFollowedStoreIds() {
  const { user } = useAuth();
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) { setFollowedIds(new Set()); return; }
    const load = async () => {
      const { data } = await fromTable("store_followers")
        .select("store_id")
        .eq("user_id", user.id);
      setFollowedIds(new Set((data || []).map((r: any) => r.store_id)));
    };
    load();

    // Real-time updates
    const channel = supabase
      .channel("store_followers_marketplace")
      .on("postgres_changes", { event: "*", schema: "public", table: "store_followers", filter: `user_id=eq.${user.id}` }, () => load())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  return followedIds;
}

export function useRankedBusinesses(businesses: BusinessProfile[]) {
  const { boosts: storeBoosts } = useActiveBoosts("store");
  const followedIds = useFollowedStoreIds();

  return useMemo(() => {
    if (businesses.length === 0) return { promoted: [] as BusinessProfile[], followed: [] as BusinessProfile[], others: [] as BusinessProfile[], all: businesses };

    const boostMap = boostsToMap(storeBoosts);
    const ranked = rankStores(
      businesses.map(b => ({
        ...b,
        total_orders: 0,
        follower_count: 0,
        product_count: 0,
      })),
      boostMap
    );

    const promoted: BusinessProfile[] = [];
    const followed: BusinessProfile[] = [];
    const others: BusinessProfile[] = [];

    for (const b of ranked) {
      const isBoosted = boostMap.has(b.id) && new Date(boostMap.get(b.id)!.end_date) > new Date();
      if (isBoosted) {
        promoted.push(b as unknown as BusinessProfile);
      } else if (followedIds.has(b.id)) {
        followed.push(b as unknown as BusinessProfile);
      } else {
        others.push(b as unknown as BusinessProfile);
      }
    }

    // Combined flat list: promoted → followed → others
    const all = [...promoted, ...followed, ...others];

    return { promoted, followed, others, all };
  }, [businesses, storeBoosts, followedIds]);
}

export function useRankedProducts(products: Product[]) {
  const { boosts: productBoosts } = useActiveBoosts("product");
  const { boosts: storeBoosts } = useActiveBoosts("store");

  return useMemo(() => {
    if (products.length === 0) return products;
    const prodBoostMap = boostsToMap(productBoosts);
    const storeBoostMap = boostsToMap(storeBoosts);
    return rankProducts(products, prodBoostMap, storeBoostMap);
  }, [products, productBoosts, storeBoosts]);
}
