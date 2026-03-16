import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Users, Store, Heart, ShoppingCart, DollarSign, Zap, ShieldCheck, TrendingUp,
  Package, BarChart3,
} from "lucide-react";

const fromTable = (table: string) => (supabase as any).from(table);

interface PlatformStats {
  totalUsers: number;
  totalStores: number;
  totalProviders: number;
  totalOrders: number;
  totalRevenue: number;
  platformEarnings: number;
  activeBoosts: number;
  pendingVerifications: number;
  totalProducts: number;
  newUsersToday: number;
  ordersThisWeek: number;
  revenueThisMonth: number;
}

const PlatformDashboard = () => {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const [
        { count: totalUsers },
        { count: totalStores },
        { count: totalProviders },
        { count: totalOrders },
        { count: totalProducts },
        { count: activeBoosts },
        { count: pendingVerifications },
        { count: newUsersToday },
        { count: ordersThisWeek },
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        fromTable("business_profiles").select("*", { count: "exact", head: true }),
        fromTable("care_providers").select("*", { count: "exact", head: true }),
        fromTable("orders").select("*", { count: "exact", head: true }),
        fromTable("products").select("*", { count: "exact", head: true }),
        fromTable("boosts").select("*", { count: "exact", head: true }).eq("status", "active").gte("end_date", now.toISOString()),
        fromTable("provider_verifications").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", todayStart),
        fromTable("orders").select("*", { count: "exact", head: true }).gte("created_at", weekAgo),
      ]);

      // Revenue from orders
      const { data: orderRevData } = await fromTable("orders").select("total_price, platform_fee");
      const totalRevenue = (orderRevData || []).reduce((s: number, o: any) => s + Number(o.total_price || 0), 0);
      const orderPlatformFees = (orderRevData || []).reduce((s: number, o: any) => s + Number(o.platform_fee || 0), 0);

      // Revenue from boosts
      const { data: boostRevData } = await fromTable("boosts").select("price_paid");
      const boostRevenue = (boostRevData || []).reduce((s: number, b: any) => s + Number(b.price_paid || 0), 0);

      // Revenue from care payments
      const { data: careRevData } = await fromTable("care_payments").select("platform_fee").eq("status", "completed");
      const carePlatformFees = (careRevData || []).reduce((s: number, c: any) => s + Number(c.platform_fee || 0), 0);

      // Monthly revenue
      const { data: monthOrders } = await fromTable("orders").select("total_price").gte("created_at", monthAgo);
      const revenueThisMonth = (monthOrders || []).reduce((s: number, o: any) => s + Number(o.total_price || 0), 0);

      setStats({
        totalUsers: totalUsers || 0,
        totalStores: totalStores || 0,
        totalProviders: totalProviders || 0,
        totalOrders: totalOrders || 0,
        totalRevenue,
        platformEarnings: orderPlatformFees + boostRevenue + carePlatformFees,
        activeBoosts: activeBoosts || 0,
        pendingVerifications: pendingVerifications || 0,
        totalProducts: totalProducts || 0,
        newUsersToday: newUsersToday || 0,
        ordersThisWeek: ordersThisWeek || 0,
        revenueThisMonth,
      });
      setLoading(false);
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!stats) return null;

  const mainStats = [
    { label: "Total Users", value: stats.totalUsers, icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Stores", value: stats.totalStores, icon: Store, color: "text-primary", bg: "bg-primary/10" },
    { label: "Care Providers", value: stats.totalProviders, icon: Heart, color: "text-pink-500", bg: "bg-pink-500/10" },
    { label: "Products", value: stats.totalProducts, icon: Package, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  ];

  const financialStats = [
    { label: "Total Orders", value: stats.totalOrders, icon: ShoppingCart, color: "text-indigo-500", bg: "bg-indigo-500/10" },
    { label: "Sales Volume", value: `${stats.totalRevenue.toLocaleString()} MKD`, icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-500/10" },
    { label: "Platform Earnings", value: `${stats.platformEarnings.toLocaleString()} MKD`, icon: TrendingUp, color: "text-amber-600", bg: "bg-amber-500/10" },
    { label: "Active Boosts", value: stats.activeBoosts, icon: Zap, color: "text-amber-500", bg: "bg-amber-500/10" },
  ];

  const activityStats = [
    { label: "New Users Today", value: stats.newUsersToday },
    { label: "Orders This Week", value: stats.ordersThisWeek },
    { label: "Revenue This Month", value: `${stats.revenueThisMonth.toLocaleString()} MKD` },
    { label: "Pending Verifications", value: stats.pendingVerifications, highlight: stats.pendingVerifications > 0 },
  ];

  return (
    <div className="space-y-4">
      {/* Hero stats */}
      <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-accent/5 to-primary/5 p-4">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="h-5 w-5 text-primary" />
          <p className="text-sm font-bold">Platform Overview</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {mainStats.map((s) => (
            <div key={s.label} className="rounded-xl bg-card/80 backdrop-blur-sm border border-border p-3">
              <div className="flex items-center gap-2 mb-1">
                <div className={`flex h-7 w-7 items-center justify-center rounded-full ${s.bg}`}>
                  <s.icon className={`h-3.5 w-3.5 ${s.color}`} />
                </div>
              </div>
              <p className="text-xl font-extrabold">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Financial overview */}
      <div className="grid grid-cols-2 gap-2">
        {financialStats.map((s) => (
          <div key={s.label} className="rounded-xl bg-card border border-border p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <div className={`flex h-6 w-6 items-center justify-center rounded-full ${s.bg}`}>
                <s.icon className={`h-3 w-3 ${s.color}`} />
              </div>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
            <p className="text-sm font-extrabold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Activity */}
      <div className="rounded-xl bg-card border border-border p-4">
        <p className="text-xs font-bold mb-3">📊 Recent Activity</p>
        <div className="space-y-2.5">
          {activityStats.map((s) => (
            <div key={s.label} className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`text-sm font-bold ${s.highlight ? "text-amber-600" : ""}`}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PlatformDashboard;
