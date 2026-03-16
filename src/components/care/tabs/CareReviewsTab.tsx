import { Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import type { CareReview } from "@/hooks/useCare";

interface Props {
  reviews: CareReview[];
  avgRating: number;
  totalReviews: number;
}

const CareReviewsTab = ({ reviews, avgRating, totalReviews }: Props) => {
  // Rating distribution
  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
    pct: reviews.length > 0 ? (reviews.filter((r) => r.rating === star).length / reviews.length) * 100 : 0,
  }));

  return (
    <div className="space-y-4">
      {/* Rating summary */}
      <div className="rounded-2xl bg-card border border-border p-4">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="font-display text-4xl font-extrabold text-primary">
              {avgRating > 0 ? Number(avgRating).toFixed(1) : "—"}
            </p>
            <div className="flex items-center justify-center gap-0.5 mt-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className={`h-3 w-3 ${s <= Math.round(avgRating) ? "fill-primary text-primary" : "text-muted-foreground/30"}`} />
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">{totalReviews} reviews</p>
          </div>
          <div className="flex-1 space-y-1">
            {distribution.map((d) => (
              <div key={d.star} className="flex items-center gap-2">
                <span className="text-[10px] font-bold w-3 text-right">{d.star}</span>
                <Star className="h-2.5 w-2.5 text-primary fill-primary" />
                <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${d.pct}%` }} />
                </div>
                <span className="text-[10px] text-muted-foreground w-5">{d.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Reviews list */}
      {reviews.length === 0 ? (
        <div className="text-center py-8">
          <span className="text-3xl">⭐</span>
          <p className="text-sm font-semibold mt-2">No reviews yet</p>
          <p className="text-xs text-muted-foreground">Reviews from clients will appear here</p>
        </div>
      ) : reviews.map((r) => (
        <div key={r.id} className="rounded-2xl bg-card border border-border p-4">
          <div className="flex items-center gap-2">
            <Avatar className="h-9 w-9">
              <AvatarImage src={r.profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-secondary text-xs font-bold">
                {r.profile?.full_name?.charAt(0) || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-xs font-bold">{r.profile?.full_name || "User"}</p>
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className={`h-3 w-3 ${s <= r.rating ? "fill-primary text-primary" : "text-muted-foreground/30"}`} />
                ))}
              </div>
            </div>
            <span className="text-[10px] text-muted-foreground">
              {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
            </span>
          </div>
          {r.comment && <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{r.comment}</p>}
        </div>
      ))}
    </div>
  );
};

export default CareReviewsTab;
