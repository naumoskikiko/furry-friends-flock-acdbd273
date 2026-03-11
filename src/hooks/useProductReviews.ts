import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const fromTable = (table: string) => (supabase as any).from(table);

export interface ProductReview {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  comment: string;
  created_at: string;
  profile?: { full_name: string; avatar_url: string | null; username: string | null };
}

export function useProductReviews(productId: string | null) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [avgRating, setAvgRating] = useState(0);

  const refresh = useCallback(async () => {
    if (!productId) { setReviews([]); setLoading(false); return; }
    const { data } = await fromTable("product_reviews")
      .select("*")
      .eq("product_id", productId)
      .order("created_at", { ascending: false });

    const reviewList = (data || []) as ProductReview[];

    // Fetch profiles
    if (reviewList.length > 0) {
      const userIds = [...new Set(reviewList.map((r) => r.user_id))];
      const { data: profiles } = await supabase.from("profiles")
        .select("user_id, full_name, avatar_url, username")
        .in("user_id", userIds);
      if (profiles) {
        const map = Object.fromEntries(profiles.map((p) => [p.user_id, p]));
        reviewList.forEach((r) => (r.profile = map[r.user_id]));
      }
      setAvgRating(reviewList.reduce((sum, r) => sum + r.rating, 0) / reviewList.length);
    } else {
      setAvgRating(0);
    }

    setReviews(reviewList);
    setLoading(false);
  }, [productId]);

  useEffect(() => { refresh(); }, [refresh]);

  const addReview = useCallback(async (rating: number, comment: string) => {
    if (!user || !productId) return;
    const { error } = await fromTable("product_reviews")
      .upsert({ product_id: productId, user_id: user.id, rating, comment } as any, { onConflict: "product_id,user_id" });
    if (error) throw error;
    await refresh();
  }, [user, productId, refresh]);

  const deleteReview = useCallback(async (reviewId: string) => {
    await fromTable("product_reviews").delete().eq("id", reviewId);
    await refresh();
  }, [refresh]);

  const myReview = reviews.find((r) => r.user_id === user?.id);

  return { reviews, loading, avgRating, addReview, deleteReview, myReview, refresh };
}
