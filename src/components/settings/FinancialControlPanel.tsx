import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, TrendingUp, ShoppingCart, Zap, Heart, ArrowUpRight, ArrowDownRight } from "lucide-react";

const fromTable = (table: string) => (supabase as any).from(table);

interface FinancialData {
  totalSalesVolume: number;
  totalMarketplaceFees: number;
  totalBoostRevenue: number;
  totalCareFees: number;
  totalPlatformRevenue: number;
  totalOrders: number;
  totalBookings: number;
  totalBoosts: number;
  thisMonthSales: number;
  lastMonthSales: number;
  thisMonthFees: number;
  recentOrders: { id: string; total_price: number; platform_fee: number; created_at: string; status: string }[];
  recentBoosts: { id: string; type: string; price_paid: number; created_at: string }[];
}

const FinancialControlPanel = () => {
  const [data, setData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "orders" | "boosts">("overview");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();

      const [
        { data: allOrders },
        { data: allBoosts },
        { data: allCarePayments },
        { data: thisMonthOrders },
        { data: lastMonthOrders },
      ] = await Promise.all([
        fromTable("orders").select("id, total_price, platform_fee, created_at, status").order("created_at", { ascending: false }),
        fromTable("boosts").select("id, type, price_paid, created_at, status").order("created_at", { ascending: false }),
        fromTable("care_payments").select("total_amount, platform_fee, provider_earnings").eq("status", "completed"),
        fromTable("orders").select("total_price, platform_fee").gte("created_at", thisMonthStart),
        fromTable("orders").select("total_price, platform_fee").gte("created_at", lastMonthStart).lt("created_at", thisMonthStart),
      ]);

      const orders = allOrders || [];
      const boosts = allBoosts || [];
      const carePayments = allCarePayments || [];

      const totalSalesVolume = orders.reduce((s: number, o: any) => s + Number(o.total_price || 0), 0);
      const totalMarketplaceFees = orders.reduce((s: number, o: any) => s + Number(o.platform_fee || 0), 0);
      const totalBoostRevenue = boosts.reduce((s: number, b: any) => s + Number(b.price_paid || 0), 0);
      const totalCareFees = carePayments.reduce((s: number, c: any) => s + Number(c.platform_fee || 0), 0);

      const thisMonthSales = (thisMonthOrders || []).reduce((s: number, o: any) => s + Number(o.total_price || 0), 0);
      const lastMonthSales = (lastMonthOrders || []).reduce((s: number, o: any) => s + Number(o.total_price || 0), 0);
      const thisMonthFees = (thisMonthOrders || []).reduce((s: number, o: any) => s + Number(o.platform_fee || 0), 0);

      const { count: totalBookings } = await fromTable("care_bookings").select("*", { count: "exact", head: true });

      setData({
        totalSalesVolume,
        totalMarketplaceFees,
        totalBoostRevenue,
        totalCareFees,
        totalPlatformRevenue: totalMarketplaceFees + totalBoostRevenue + totalCareFees,
        totalOrders: orders.length,
        totalBookings: totalBookings || 0,
        totalBoosts: boosts.length,
        thisMonthSales,
        lastMonthSales,
        thisMonthFees,
        recentOrders: orders.slice(0, 10) as any,
        recentBoosts: boosts.slice(0, 10) as any,
      });
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!data) return null;

  const salesTrend = data.lastMonthSales > 0
    ? ((data.thisMonthSales - data.lastMonthSales) / data.lastMonthSales * 100).toFixed(0)
    : "0";
  const isUp = Number(salesTrend) >= 0;

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="rounded-2xl bg-gradient-to-r from-emerald-500/10 to-primary/10 p-4">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-emerald-600" />
          <div>
            <p className="text-sm font-bold">Financial Control</p>
            <p className="text-xs text-muted-foreground">Revenue tracking & platform earnings</p>
          </div>
        </div>
      </div>

      {/* Total Revenue */}
      <div className="rounded-xl bg-card border border-border p-4 text-center">
        <p className="text-[10px] text-muted-foreground">Total Platform Revenue</p>
        <p className="text-2xl font-extrabold text-primary mt-1">{data.totalPlatformRevenue.toLocaleString()} MKD</p>
        <div className="flex items-center justify-center gap-1 mt-1">
          {isUp ? <ArrowUpRight className="h-3 w-3 text-emerald-600" /> : <ArrowDownRight className="h-3 w-3 text-destructive" />}
          <span className={`text-[10px] font-bold ${isUp ? "text-emerald-600" : "text-destructive"}`}>
            {salesTrend}% vs last month
          </span>
        </div>
      </div>

      {/* Revenue breakdown */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-card border border-border p-3 text-center">
          <ShoppingCart className="h-4 w-4 text-indigo-500 mx-auto mb-1" />
          <p className="text-sm font-extrabold">{data.totalMarketplaceFees.toLocaleString()}</p>
          <p className="text-[9px] text-muted-foreground">Marketplace Fees</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-3 text-center">
          <Zap className="h-4 w-4 text-amber-500 mx-auto mb-1" />
          <p className="text-sm font-extrabold">{data.totalBoostRevenue.toLocaleString()}</p>
          <p className="text-[9px] text-muted-foreground">Boost Revenue</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-3 text-center">
          <Heart className="h-4 w-4 text-pink-500 mx-auto mb-1" />
          <p className="text-sm font-extrabold">{data.totalCareFees.toLocaleString()}</p>
          <p className="text-[9px] text-muted-foreground">Care Fees</p>
        </div>
      </div>

      {/* Volume stats */}
      <div className="rounded-xl bg-card border border-border p-3">
        <p className="text-xs font-bold mb-2">Volume</p>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Total Sales Volume</span>
            <span className="font-bold">{data.totalSalesVolume.toLocaleString()} MKD</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">This Month Sales</span>
            <span className="font-bold">{data.thisMonthSales.toLocaleString()} MKD</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">This Month Fees</span>
            <span className="font-bold text-primary">{data.thisMonthFees.toLocaleString()} MKD</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Orders</span>
            <span className="font-bold">{data.totalOrders}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Bookings</span>
            <span className="font-bold">{data.totalBookings}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Boosts</span>
            <span className="font-bold">{data.totalBoosts}</span>
          </div>
        </div>
      </div>

      {/* Tabs for recent transactions */}
      <div className="flex rounded-xl bg-secondary p-1">
        {[
          { key: "overview" as const, label: "Overview" },
          { key: "orders" as const, label: "Recent Orders" },
          { key: "boosts" as const, label: "Recent Boosts" },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-lg py-2 text-[10px] font-bold transition-colors ${
              tab === t.key ? "bg-card shadow-sm" : "text-muted-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "orders" && (
        <div className="space-y-1.5">
          {data.recentOrders.map(o => (
            <div key={o.id} className="flex items-center justify-between rounded-xl bg-card border border-border p-2.5">
              <div>
                <p className="text-[10px] font-bold">{Number(o.total_price).toLocaleString()} MKD</p>
                <p className="text-[9px] text-muted-foreground">{new Date(o.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-primary">+{Number(o.platform_fee).toLocaleString()} MKD</p>
                <span className={`text-[9px] font-bold ${o.status === "completed" ? "text-emerald-600" : o.status === "cancelled" ? "text-destructive" : "text-amber-600"}`}>
                  {o.status}
                </span>
              </div>
            </div>
          ))}
          {data.recentOrders.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No orders yet</p>}
        </div>
      )}

      {tab === "boosts" && (
        <div className="space-y-1.5">
          {data.recentBoosts.map(b => (
            <div key={b.id} className="flex items-center justify-between rounded-xl bg-card border border-border p-2.5">
              <div>
                <p className="text-[10px] font-bold capitalize">{b.type} Boost</p>
                <p className="text-[9px] text-muted-foreground">{new Date(b.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</p>
              </div>
              <p className="text-[10px] font-bold text-amber-600">{Number(b.price_paid).toLocaleString()} MKD</p>
            </div>
          ))}
          {data.recentBoosts.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No boosts yet</p>}
        </div>
      )}
    </div>
  );
};

export default FinancialControlPanel;
