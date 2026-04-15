import { useMemo, useState, useEffect } from "react";
import { useActiveBoosts, type Boost } from "@/hooks/useBoosts";
import { rankStores, rankProducts, interleaveStores, type BoostInfo } from "@/lib/rankingAlgorithm";
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

    // Interleave naturally: boosted mixed with followed and organic
    const all = interleaveStores(promoted, followed, others);

    return { promoted, followed, others, all };
  }, [businesses, storeBoosts, followedIds]);
}

// Fetch engagement metrics for products (likes, saves, reviews)
function useProductEngagement(productIds: string[]) {
  const [engMap, setEngMap] = useState<Map<string, { likes: number; saves: number; reviews: number; avgRating: number }>>(new Map());

  useEffect(() => {
    if (productIds.length === 0) return;

    const load = async () => {
      const map = new Map<string, { likes: number; saves: number; reviews: number; avgRating: number }>();

      // Fetch wishlist counts (saves/likes)
      const { data: wishlistData } = await supabase
        .from("product_wishlist")
        .select("product_id")
        .in("product_id", productIds);

      // Fetch review stats
      const { data: reviewData } = await supabase
        .from("product_reviews")
        .select("product_id, rating")
        .in("product_id", productIds);

      // Aggregate
      const wishCounts: Record<string, number> = {};
      for (const w of wishlistData || []) {
        wishCounts[w.product_id] = (wishCounts[w.product_id] || 0) + 1;
      }

      const reviewAgg: Record<string, { count: number; sum: number }> = {};
      for (const r of reviewData || []) {
        if (!reviewAgg[r.product_id]) reviewAgg[r.product_id] = { count: 0, sum: 0 };
        reviewAgg[r.product_id].count++;
        reviewAgg[r.product_id].sum += r.rating;
      }

      for (const id of productIds) {
        const saves = wishCounts[id] || 0;
        const rev = reviewAgg[id] || { count: 0, sum: 0 };
        map.set(id, {
          likes: saves, // wishlist = likes
          saves,
          reviews: rev.count,
          avgRating: rev.count > 0 ? rev.sum / rev.count : 0,
        });
      }

      setEngMap(map);
    };

    load();
  }, [productIds.join(",")]);

  return engMap;
}

export function useRankedProducts(products: Product[], wishedProductIds?: Set<string>) {
  const { boosts: productBoosts } = useActiveBoosts("product");
  const { boosts: storeBoosts } = useActiveBoosts("store");
  const productIds = useMemo(() => products.map((p) => p.id), [products]);
  const engagementMap = useProductEngagement(productIds);

  return useMemo(() => {
    if (products.length === 0) return products;
    const prodBoostMap = boostsToMap(productBoosts);
    const storeBoostMap = boostsToMap(storeBoosts);

    // Separate liked products first (preserve recency order from wishlist)
    const liked: Product[] = [];
    const rest: Product[] = [];
    const likedSet = wishedProductIds || new Set<string>();

    for (const p of products) {
      if (likedSet.has(p.id)) {
        liked.push(p);
      } else {
        rest.push(p);
      }
    }

    // Rank remaining products (promoted will rise via boost multiplier)
    const rankedRest = rankProducts(rest, prodBoostMap, storeBoostMap, engagementMap);

    // Liked first, then ranked rest — one seamless list
    return [...liked, ...rankedRest];
  }, [products, productBoosts, storeBoosts, engagementMap, wishedProductIds]);
}
