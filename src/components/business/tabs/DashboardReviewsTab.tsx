import { useState, useEffect } from "react";
import { Star, MessageSquare, Flag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/hooks/useBusiness";

interface Review {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  productName?: string;
  userName?: string;
}

interface Props {
  businessId: string;
  products: Product[];
}

const DashboardReviewsTab = ({ businessId, products }: Props) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "1" | "2" | "3" | "4" | "5">("all");

  useEffect(() => {
    const fetchReviews = async () => {
      setLoading(true);
      const productIds = products.map((p) => p.id);
      if (productIds.length === 0) { setReviews([]); setLoading(false); return; }

      const { data } = await (supabase as any)
        .from("product_reviews")
        .select("*")
        .in("product_id", productIds)
        .order("created_at", { ascending: false });

      const reviewList = (data || []) as Review[];

      // Fetch user profiles
      if (reviewList.length > 0) {
        const userIds = [...new Set(reviewList.map((r) => r.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", userIds);
        const profileMap = Object.fromEntries((profiles || []).map((p) => [p.user_id, p.full_name]));
        const productMap = Object.fromEntries(products.map((p) => [p.id, p.name]));
        reviewList.forEach((r) => {
          r.userName = profileMap[r.user_id] || "Customer";
          r.productName = productMap[r.product_id] || "Product";
        });
      }

      setReviews(reviewList);
      setLoading(false);
    };
    fetchReviews();
  }, [businessId, products]);

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const filtered = filter === "all" ? reviews : reviews.filter((r) => String(r.rating) === filter);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="rounded-2xl bg-card border border-border p-4 flex items-center gap-4">
        <div className="text-center">
          <p className="font-display text-3xl font-extrabold">{avgRating > 0 ? avgRating.toFixed(1) : "—"}</p>
          <div className="flex items-center gap-0.5 justify-center mt-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} className={`h-3 w-3 ${s <= Math.round(avgRating) ? "text-amber-500 fill-amber-500" : "text-muted-foreground/30"}`} />
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">{reviews.length} reviews</p>
        </div>
        <div className="flex-1 space-y-1">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = reviews.filter((r) => r.rating === star).length;
            const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
            return (
              <div key={star} className="flex items-center gap-2">
                <span className="text-[10px] w-3 text-right">{star}</span>
                <Star className="h-2.5 w-2.5 text-amber-500 fill-amber-500" />
                <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full rounded-full bg-amber-500" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-[10px] text-muted-foreground w-5">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
        {(["all", "5", "4", "3", "2", "1"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-bold transition-colors ${
              filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            }`}
          >
            {f === "all" ? "All" : `${f} ★`}
          </button>
        ))}
      </div>

      {/* Review list */}
      {filtered.length === 0 ? (
        <div className="text-center py-8">
          <span className="text-3xl">⭐</span>
          <p className="text-sm font-semibold mt-2">No reviews yet</p>
        </div>
      ) : (
        filtered.map((r) => (
          <div key={r.id} className="rounded-2xl bg-card border border-border p-3 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold">{r.userName}</p>
                <p className="text-[10px] text-muted-foreground">{r.productName}</p>
              </div>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className={`h-2.5 w-2.5 ${s <= r.rating ? "text-amber-500 fill-amber-500" : "text-muted-foreground/30"}`} />
                ))}
              </div>
            </div>
            {r.comment && <p className="text-xs text-muted-foreground">{r.comment}</p>}
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">
                {new Date(r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default DashboardReviewsTab;
