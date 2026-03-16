import { Calendar, Star, ShieldCheck, Bell, XCircle } from "lucide-react";
import type { CareBooking, CareReview } from "@/hooks/useCare";

interface Props {
  bookings: CareBooking[];
  reviews: CareReview[];
  isFullyVerified: boolean;
  pendingVerifications: number;
}

const CareNotificationsTab = ({ bookings, reviews, isFullyVerified, pendingVerifications }: Props) => {
  const notifications: { id: string; icon: any; title: string; description: string; type: "warning" | "info" | "success" }[] = [];

  // Pending bookings
  const pendingBookings = bookings.filter((b) => b.status === "pending");
  if (pendingBookings.length > 0) {
    notifications.push({
      id: "pending-bookings",
      icon: Calendar,
      title: `${pendingBookings.length} new booking request${pendingBookings.length > 1 ? "s" : ""}`,
      description: "Require your attention",
      type: "warning",
    });
  }

  // Cancelled bookings (recent)
  const recentCancelled = bookings.filter((b) => {
    if (b.status !== "cancelled") return false;
    const d = new Date(b.created_at);
    return Date.now() - d.getTime() < 86400000 * 3; // last 3 days
  });
  if (recentCancelled.length > 0) {
    notifications.push({
      id: "cancelled",
      icon: XCircle,
      title: `${recentCancelled.length} recent cancellation${recentCancelled.length > 1 ? "s" : ""}`,
      description: "In the last 3 days",
      type: "info",
    });
  }

  // New reviews (last 7 days)
  const recentReviews = reviews.filter((r) => {
    const d = new Date(r.created_at);
    return Date.now() - d.getTime() < 86400000 * 7;
  });
  if (recentReviews.length > 0) {
    notifications.push({
      id: "reviews",
      icon: Star,
      title: `${recentReviews.length} new review${recentReviews.length > 1 ? "s" : ""}`,
      description: "In the last week",
      type: "success",
    });
  }

  // Verification
  if (!isFullyVerified) {
    notifications.push({
      id: "verification",
      icon: ShieldCheck,
      title: "Verification incomplete",
      description: pendingVerifications > 0 ? `${pendingVerifications} document(s) pending review` : "Submit documents to get verified",
      type: "warning",
    });
  }

  return (
    <div className="space-y-3">
      {notifications.length === 0 ? (
        <div className="text-center py-8">
          <span className="text-3xl">🔔</span>
          <p className="text-sm font-semibold mt-2">All clear!</p>
          <p className="text-xs text-muted-foreground">No alerts right now</p>
        </div>
      ) : notifications.map((n) => (
        <div key={n.id} className={`rounded-2xl border p-3 flex items-center gap-3 ${
          n.type === "warning" ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
          : n.type === "success" ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
          : "bg-card border-border"
        }`}>
          <div className={`flex h-9 w-9 items-center justify-center rounded-xl shrink-0 ${
            n.type === "warning" ? "bg-amber-100 dark:bg-amber-900/40 text-amber-600"
            : n.type === "success" ? "bg-green-100 dark:bg-green-900/40 text-green-600"
            : "bg-primary/10 text-primary"
          }`}>
            <n.icon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-bold">{n.title}</p>
            <p className="text-[10px] text-muted-foreground">{n.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CareNotificationsTab;
