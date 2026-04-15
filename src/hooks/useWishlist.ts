import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cacheGet, cacheSet, CacheTTL } from "@/lib/cache";

const fromTable = (table: string) => (supabase as any).from(table);

export interface WishlistItem {
  id: string;
  product_id: string;
  user_id: string;
  created_at: string;
  product?: {
    id: string;
    name: string;
    price: number;
    image_url: string | null;
    category: string;
    business_id: string;
  };
}

export function useWishlist() {
  const { user } = useAuth();
  const CACHE_KEY = `wishlist_${user?.id || "anon"}`;
  const [items, setItems] = useState<WishlistItem[]>(() => cacheGet<WishlistItem[]>(CACHE_KEY) || []);
  const [loading, setLoading] = useState(!cacheGet<WishlistItem[]>(CACHE_KEY));
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    if (!user) { setItems([]); setWishlistIds(new Set()); setLoading(false); return; }
    const { data } = await fromTable("product_wishlist")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    const list = (data || []) as WishlistItem[];

    if (list.length > 0) {
      const productIds = list.map((i) => i.product_id);
      const { data: products } = await fromTable("products")
        .select("id, name, price, image_url, category, business_id")
        .in("id", productIds);
      if (products) {
        const map = Object.fromEntries((products as any[]).map((p) => [p.id, p]));
        list.forEach((item) => (item.product = map[item.product_id]));
      }
    }

    setItems(list);
    cacheSet(CACHE_KEY, list, CacheTTL.MARKETPLACE);
    setWishlistIds(new Set(list.map((i) => i.product_id)));
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const toggle = useCallback(async (productId: string) => {
    if (!user) return;
    if (wishlistIds.has(productId)) {
      await fromTable("product_wishlist").delete().eq("user_id", user.id).eq("product_id", productId);
    } else {
      await fromTable("product_wishlist").insert({ user_id: user.id, product_id: productId } as any);
    }
    await refresh();
  }, [user, wishlistIds, refresh]);

  const isWishlisted = useCallback((productId: string) => wishlistIds.has(productId), [wishlistIds]);

  return { items, loading, toggle, isWishlisted, refresh, count: items.length, wishlistProductIds: wishlistIds };
}
