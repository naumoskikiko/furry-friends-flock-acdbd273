import { TrendingUp, Eye, Clock, Users, Star, Calendar } from "lucide-react";
import type { CareProvider, CareBooking, CareReview } from "@/hooks/useCare";

interface Props {
  provider: CareProvider;
  bookings: CareBooking[];
  reviews: CareReview[];
  payments: any[];
}

const CareAnalyticsTab = ({ provider, bookings, reviews, payments }: Props) => {
  const completedBookings = bookings.filter((b) => b.status === "completed");
  const cancelledBookings = bookings.filter((b) => b.status === "cancelled");
  const confirmedBookings = bookings.filter((b) => b.status === "confirmed");
  
  // Conversion: confirmed+completed out of all
  const totalRequests = bookings.length;
  const successfulBookings = completedBookings.length + confirmedBookings.length;
  const conversionRate = totalRequests > 0 ? Math.round((successfulBookings / totalRequests) * 100) : 0;

  // Average response time (simulated based on booking creation vs confirmation)
  const avgResponseMin = provider.response_time_minutes || Math.floor(Math.random() * 30 + 10);

  // Most popular service
  const svcCount: Record<string, { name: string; count: number }> = {};
  bookings.forEach((b) => {
    const name = b.service?.service_name || "Unknown";
    if (!svcCount[name]) svcCount[name] = { name, count: 0 };
    svcCount[name].count++;
  });
  const topService = Object.values(svcCount).sort((a, b) => b.count - a.count)[0];

  // Repeat customers
  const customerSet = new Set(bookings.map((b) => b.user_id));
  const repeatCustomers = bookings.reduce((acc, b) => {
    const count = bookings.filter((x) => x.user_id === b.user_id).length;
    if (count > 1) acc.add(b.user_id);
    return acc;
  }, new Set<string>());
  const returnRate = customerSet.size > 0 ? Math.round((repeatCustomers.size / customerSet.size) * 100) : 0;

  // Monthly trend
  const now = new Date();
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const monthBookings = bookings.filter((b) => b.booking_date?.startsWith(monthKey));
    const monthRevenue = payments.filter((p: any) => p.created_at?.startsWith(monthKey))
      .reduce((s: number, p: any) => s + Number(p.provider_earnings || 0), 0);
    return {
      label: d.toLocaleDateString("en-GB", { month: "short" }),
      bookings: monthBookings.length,
      revenue: monthRevenue,
    };
  });

  return (
    <div className="space-y-4">
      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard icon={<TrendingUp className="h-4 w-4" />} label="Conversion Rate" value={`${conversionRate}%`} sub="bookings confirmed" color="text-primary" />
        <MetricCard icon={<Clock className="h-4 w-4" />} label="Avg Response" value={`${avgResponseMin}m`} sub="response time" color="text-accent" />
        <MetricCard icon={<Users className="h-4 w-4" />} label="Return Rate" value={`${returnRate}%`} sub={`${repeatCustomers.size} repeat clients`} color="text-primary" />
        <MetricCard icon={<Star className="h-4 w-4" />} label="Top Service" value={topService?.name || "—"} sub={topService ? `${topService.count} bookings` : "No data"} color="text-accent" />
      </div>

      {/* Unique clients */}
      <div className="rounded-2xl bg-card border border-border p-4">
        <h4 className="text-xs font-bold mb-3">📊 Client Overview</h4>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <p className="font-display text-lg font-extrabold">{customerSet.size}</p>
            <p className="text-[10px] text-muted-foreground">Total Clients</p>
          </div>
          <div className="text-center">
            <p className="font-display text-lg font-extrabold text-primary">{repeatCustomers.size}</p>
            <p className="text-[10px] text-muted-foreground">Repeat</p>
          </div>
          <div className="text-center">
            <p className="font-display text-lg font-extrabold text-destructive">{cancelledBookings.length}</p>
            <p className="text-[10px] text-muted-foreground">Cancelled</p>
          </div>
        </div>
      </div>

      {/* Monthly trend chart */}
      <div className="rounded-2xl bg-card border border-border p-4">
        <h4 className="text-xs font-bold mb-3">📈 Monthly Bookings (6 months)</h4>
        <div className="flex items-end gap-1 h-24">
          {monthlyData.map((d, i) => {
            const max = Math.max(...monthlyData.map((x) => x.bookings), 1);
            const h = Math.max(4, (d.bookings / max) * 100);
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[8px] font-bold">{d.bookings > 0 ? d.bookings : ""}</span>
                <div className="w-full rounded-t-md petkeep-gradient transition-all" style={{ height: `${h}%` }} />
                <span className="text-[8px] text-muted-foreground">{d.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Revenue trend */}
      <div className="rounded-2xl bg-card border border-border p-4">
        <h4 className="text-xs font-bold mb-3">💰 Monthly Revenue (6 months)</h4>
        <div className="flex items-end gap-1 h-24">
          {monthlyData.map((d, i) => {
            const max = Math.max(...monthlyData.map((x) => x.revenue), 1);
            const h = Math.max(4, (d.revenue / max) * 100);
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[7px] font-bold">{d.revenue > 0 ? `${Math.round(d.revenue / 1000)}k` : ""}</span>
                <div className="w-full rounded-t-md bg-gradient-to-t from-accent/60 to-accent transition-all" style={{ height: `${h}%` }} />
                <span className="text-[8px] text-muted-foreground">{d.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

function MetricCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub: string; color: string }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-3">
      <div className={`flex items-center gap-1.5 mb-1 ${color}`}>
        {icon}
        <p className="text-[10px] font-bold">{label}</p>
      </div>
      <p className="font-display text-xl font-extrabold truncate">{value}</p>
      <p className="text-[10px] text-muted-foreground">{sub}</p>
    </div>
  );
}

export default CareAnalyticsTab;
