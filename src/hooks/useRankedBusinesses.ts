import { useMemo } from "react";
import { useActiveBoosts, type Boost } from "@/hooks/useBoosts";
import { rankStores, rankProducts, type BoostInfo } from "@/lib/rankingAlgorithm";
import type { BusinessProfile, Product } from "@/hooks/useBusiness";

function boostsToMap(boosts: Boost[]): Map<string, BoostInfo> {
  const map = new Map<string, BoostInfo>();
  for (const b of boosts) {
    // Calculate approximate duration from start/end
    const hours = (new Date(b.end_date).getTime() - new Date(b.start_date).getTime()) / 3600000;
    map.set(b.target_id, { target_id: b.target_id, end_date: b.end_date, duration_hours: hours });
  }
  return map;
}

export function useRankedBusinesses(businesses: BusinessProfile[]) {
  const { boosts: storeBoosts } = useActiveBoosts("store");

  return useMemo(() => {
    if (businesses.length === 0) return businesses;
    const boostMap = boostsToMap(storeBoosts);
    return rankStores(
      businesses.map(b => ({
        ...b,
        total_orders: 0, // Could be enhanced with real order counts
        follower_count: 0,
        product_count: 0,
      })),
      boostMap
    );
  }, [businesses, storeBoosts]);
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
