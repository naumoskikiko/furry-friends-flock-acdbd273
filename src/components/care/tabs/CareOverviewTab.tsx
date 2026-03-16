import { Star, Calendar, DollarSign, Users, Clock, TrendingUp, AlertTriangle, BadgeCheck } from "lucide-react";
import type { CareProvider, CareBooking, CareReview } from "@/hooks/useCare";

interface Props {
  provider: CareProvider;
  bookings: CareBooking[];
  reviews: CareReview[];
  balance: any;
  payments: any[];
  isFullyVerified: boolean;
  onTabChange: (tab: string) => void;
}

const CareOverviewTab = ({ provider, bookings, reviews, balance, payments, isFullyVerified, onTabChange }: Props) => {
  const pendingBookings = bookings.filter((b) => b.status === "pending");
  const confirmedBookings = bookings.filter((b) => b.status === "confirmed");
  const completedBookings = bookings.filter((b) => b.status === "completed");

  // Calculate earnings
  const totalEarnings = balance?.total_earned || 0;
  const monthlyPayments = payments.filter((p) => {
    const d = new Date(p.created_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const monthlyEarnings = monthlyPayments.reduce((s: number, p: any) => s + Number(p.provider_earnings || 0), 0);

  // Bookings per day chart (last 7 days)
  const dayMap: Record<string, number> = {};
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dayMap[d.toISOString().slice(0, 10)] = 0;
  }
  bookings.forEach((b) => {
    const day = b.booking_date?.slice(0, 10);
    if (day && dayMap[day] !== undefined) dayMap[day]++;
  });
  const bookingsPerDay = Object.entries(dayMap).map(([date, count]) => ({
    label: new Date(date).toLocaleDateString("en-GB", { weekday: "short" }),
    count,
  }));

  return (
    <div className="space-y-4">
      {/* Provider header */}
      <div className="rounded-2xl bg-card border border-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 text-2xl shrink-0 overflow-hidden">
            {provider.photo_url ? (
              <img src={provider.photo_url} alt="" className="h-full w-full object-cover rounded-xl" />
            ) : "🐾"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h3 className="font-display text-lg font-bold truncate">{provider.business_name}</h3>
              {isFullyVerified && <BadgeCheck className="h-4 w-4 text-primary shrink-0" />}
            </div>
            <p className="text-xs text-muted-foreground capitalize">{provider.category}</p>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-primary/5 border border-primary/10 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <DollarSign className="h-3.5 w-3.5 text-primary" />
            <p className="text-[10px] font-bold text-primary">Monthly</p>
          </div>
          <p className="font-display text-xl font-extrabold">{monthlyEarnings.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground">MKD this month</p>
        </div>
        <div className="rounded-2xl bg-accent/5 border border-accent/10 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Calendar className="h-3.5 w-3.5 text-accent" />
            <p className="text-[10px] font-bold text-accent">Bookings</p>
          </div>
          <p className="font-display text-xl font-extrabold">{provider.total_bookings}</p>
          <p className="text-[10px] text-muted-foreground">total bookings</p>
        </div>
        <div className="rounded-2xl bg-secondary p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Star className="h-3.5 w-3.5 text-primary" />
            <p className="text-[10px] font-bold">Rating</p>
          </div>
          <p className="font-display text-xl font-extrabold">
            {provider.avg_rating > 0 ? Number(provider.avg_rating).toFixed(1) : "—"}
          </p>
          <p className="text-[10px] text-muted-foreground">{provider.total_reviews} reviews</p>
        </div>
        <div className="rounded-2xl bg-secondary p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="h-3.5 w-3.5" />
            <p className="text-[10px] font-bold">Total Earned</p>
          </div>
          <p className="font-display text-xl font-extrabold">{totalEarnings.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground">MKD lifetime</p>
        </div>
      </div>

      {/* Alerts */}
      {pendingBookings.length > 0 && (
        <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-3 flex items-center gap-3">
          <Clock className="h-5 w-5 text-amber-600 shrink-0" />
          <div>
            <p className="text-xs font-bold text-amber-700 dark:text-amber-400">{pendingBookings.length} pending request{pendingBookings.length > 1 ? "s" : ""}</p>
            <p className="text-[10px] text-amber-600 dark:text-amber-500">Require your attention</p>
          </div>
          <button onClick={() => onTabChange("bookings")} className="ml-auto text-[10px] font-bold text-amber-700 dark:text-amber-400">View →</button>
        </div>
      )}

      {!isFullyVerified && (
        <div className="rounded-2xl bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 p-3 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0" />
          <div>
            <p className="text-xs font-bold text-orange-700 dark:text-orange-400">Get Verified</p>
            <p className="text-[10px] text-orange-600 dark:text-orange-500">Submit documents to earn a verified badge</p>
          </div>
          <button onClick={() => onTabChange("verification")} className="ml-auto text-[10px] font-bold text-orange-700 dark:text-orange-400">Start →</button>
        </div>
      )}

      {/* Bookings chart */}
      <div className="rounded-2xl bg-card border border-border p-4">
        <h4 className="text-xs font-bold mb-3">Bookings (Last 7 Days)</h4>
        <div className="flex items-end gap-1 h-20">
          {bookingsPerDay.map((d, i) => {
            const max = Math.max(...bookingsPerDay.map((x) => x.count), 1);
            const h = Math.max(4, (d.count / max) * 100);
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[8px] font-bold">{d.count > 0 ? d.count : ""}</span>
                <div className="w-full rounded-t-md petkeep-gradient transition-all" style={{ height: `${h}%` }} />
                <span className="text-[8px] text-muted-foreground">{d.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick stats summary */}
      <div className="rounded-2xl bg-card border border-border p-4">
        <h4 className="text-xs font-bold mb-3">📊 Booking Summary</h4>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <p className="font-display text-lg font-extrabold text-amber-600">{pendingBookings.length}</p>
            <p className="text-[10px] text-muted-foreground">Pending</p>
          </div>
          <div className="text-center">
            <p className="font-display text-lg font-extrabold text-primary">{confirmedBookings.length}</p>
            <p className="text-[10px] text-muted-foreground">Confirmed</p>
          </div>
          <div className="text-center">
            <p className="font-display text-lg font-extrabold text-accent">{completedBookings.length}</p>
            <p className="text-[10px] text-muted-foreground">Completed</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CareOverviewTab;
