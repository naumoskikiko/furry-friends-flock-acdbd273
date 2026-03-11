import { Package, ShoppingBag, Star, Clock, AlertTriangle, DollarSign } from "lucide-react";
import { BUSINESS_CATEGORIES } from "@/hooks/useBusiness";
import type { BusinessProfile, Product } from "@/hooks/useBusiness";

interface Props {
  business: BusinessProfile;
  analytics: {
    totalRevenue: number;
    totalOrders: number;
    productsSold: number;
    pendingOrders: number;
    lowStockProducts: Product[];
    outOfStockProducts: Product[];
    ordersPerDay: { label: string; count: number }[];
  };
  onTabChange: (tab: string) => void;
}

const DashboardOverviewTab = ({ business, analytics, onTabChange }: Props) => (
  <div className="space-y-4">
    {/* Store header card */}
    <div className="rounded-2xl bg-card border border-border p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 text-2xl shrink-0 overflow-hidden">
          {business.logo_url ? (
            <img src={business.logo_url} alt="" className="h-full w-full object-cover rounded-xl" />
          ) : (
            BUSINESS_CATEGORIES.find((c) => c.value === business.category)?.icon || "🏪"
          )}
        </div>
        <div className="min-w-0">
          <h3 className="font-display text-lg font-bold truncate">{business.business_name}</h3>
          <p className="text-xs text-muted-foreground capitalize">{business.category.replace("_", " ")}</p>
        </div>
      </div>
    </div>

    {/* Stats grid */}
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-2xl bg-primary/5 border border-primary/10 p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <DollarSign className="h-3.5 w-3.5 text-primary" />
          <p className="text-[10px] font-bold text-primary">Revenue</p>
        </div>
        <p className="font-display text-xl font-extrabold">{analytics.totalRevenue.toLocaleString()}</p>
        <p className="text-[10px] text-muted-foreground">MKD earned</p>
      </div>
      <div className="rounded-2xl bg-accent/5 border border-accent/10 p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <ShoppingBag className="h-3.5 w-3.5 text-accent" />
          <p className="text-[10px] font-bold text-accent">Orders</p>
        </div>
        <p className="font-display text-xl font-extrabold">{analytics.totalOrders}</p>
        <p className="text-[10px] text-muted-foreground">total orders</p>
      </div>
      <div className="rounded-2xl bg-secondary p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <Package className="h-3.5 w-3.5" />
          <p className="text-[10px] font-bold">Products Sold</p>
        </div>
        <p className="font-display text-xl font-extrabold">{analytics.productsSold}</p>
        <p className="text-[10px] text-muted-foreground">items sold</p>
      </div>
      <div className="rounded-2xl bg-secondary p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <Star className="h-3.5 w-3.5 text-primary" />
          <p className="text-[10px] font-bold">Rating</p>
        </div>
        <p className="font-display text-xl font-extrabold">
          {business.avg_rating > 0 ? Number(business.avg_rating).toFixed(1) : "—"}
        </p>
        <p className="text-[10px] text-muted-foreground">{business.total_reviews} reviews</p>
      </div>
    </div>

    {/* Alerts */}
    {analytics.pendingOrders > 0 && (
      <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-3 flex items-center gap-3">
        <Clock className="h-5 w-5 text-amber-600 shrink-0" />
        <div>
          <p className="text-xs font-bold text-amber-700 dark:text-amber-400">{analytics.pendingOrders} pending orders</p>
          <p className="text-[10px] text-amber-600 dark:text-amber-500">Require your attention</p>
        </div>
        <button onClick={() => onTabChange("orders")} className="ml-auto text-[10px] font-bold text-amber-700 dark:text-amber-400">View →</button>
      </div>
    )}

    {analytics.lowStockProducts.length > 0 && (
      <div className="rounded-2xl bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 p-3 flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0" />
        <div>
          <p className="text-xs font-bold text-orange-700 dark:text-orange-400">{analytics.lowStockProducts.length} low stock</p>
          <p className="text-[10px] text-orange-600 dark:text-orange-500">
            {analytics.lowStockProducts.map((p) => p.name).join(", ")}
          </p>
        </div>
      </div>
    )}

    {analytics.outOfStockProducts.length > 0 && (
      <div className="rounded-2xl bg-destructive/5 border border-destructive/20 p-3 flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
        <div>
          <p className="text-xs font-bold text-destructive">{analytics.outOfStockProducts.length} out of stock</p>
          <p className="text-[10px] text-destructive/70">
            {analytics.outOfStockProducts.map((p) => p.name).join(", ")}
          </p>
        </div>
      </div>
    )}

    {/* Quick orders chart */}
    <div className="rounded-2xl bg-card border border-border p-4">
      <h4 className="text-xs font-bold mb-3">Orders (Last 7 Days)</h4>
      <div className="flex items-end gap-1 h-20">
        {analytics.ordersPerDay.map((d, i) => {
          const max = Math.max(...analytics.ordersPerDay.map((x) => x.count), 1);
          const h = Math.max(4, (d.count / max) * 100);
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full rounded-t-md petkeep-gradient" style={{ height: `${h}%` }} />
              <span className="text-[8px] text-muted-foreground">{d.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  </div>
);

export default DashboardOverviewTab;
