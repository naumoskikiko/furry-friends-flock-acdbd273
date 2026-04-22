import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Eye, TrendingUp, Users, Calendar, Store, ChevronRight, ShoppingCart, Percent, AlertTriangle } from "lucide-react";

const fromTable = (table: string) => (supabase as any).from(table);

type TimeRange = "today" | "7d" | "30d" | "all";

interface BusinessConversionSummary {
  business_id: string;
  business_name: string;
  category: string;
  total_visits: number;
  total_orders: number;
  conversion_rate: number;
}

interface DailyPoint {
  date: string;
  visits: number;
  orders: number;
}

const getDateRange = (range: TimeRange): string | null => {
  if (range === "all") return null;
  const d = new Date();
  if (range === "today") return d.toISOString().slice(0, 10);
  if (range === "7d") { d.setDate(d.getDate() - 6); return d.toISOString().slice(0, 10); }
  d.setDate(d.getDate() - 29);
  return d.toISOString().slice(0, 10);
};

const pct = (orders: number, visits: number) => visits === 0 ? 0 : Math.round((orders / visits) * 1000) / 10;

const BusinessVisitAnalytics = () => {
  const [businesses, setBusinesses] = useState<BusinessConversionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<TimeRange>("30d");
  const [selectedBiz, setSelectedBiz] = useState<BusinessConversionSummary | null>(null);
  const [dailyData, setDailyData] = useState<DailyPoint[]>([]);
  const [uniqueUsers, setUniqueUsers] = useState(0);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadList = useCallback(async () => {
    setLoading(true);
    const { data: bizList } = await fromTable("business_profiles")
      .select("id, business_name, category")
      .eq("is_suspended", false)
      .order("business_name");

    if (!bizList || bizList.length === 0) { setBusinesses([]); setLoading(false); return; }

    const bizIds = bizList.map((b: any) => b.id);
    const startDate = getDateRange(range);

    // Fetch visits
    let vQuery = fromTable("business_visits").select("business_id, visit_date").in("business_id", bizIds);
    if (startDate) vQuery = vQuery.gte("visit_date", startDate);
    const { data: allVisits } = await vQuery;

    // Fetch orders via order_items (unique order_id per store)
    let oQuery = fromTable("order_items").select("store_id, order_id, created_at").in("store_id", bizIds);
    if (startDate) oQuery = oQuery.gte("created_at", new Date(startDate).toISOString());
    const { data: allOrderItems } = await oQuery;

    const visits = (allVisits || []) as { business_id: string; visit_date: string }[];
    const orderItems = (allOrderItems || []) as { store_id: string; order_id: string }[];

    // Count unique orders per store
    const orderCountMap: Record<string, Set<string>> = {};
    for (const oi of orderItems) {
      if (!orderCountMap[oi.store_id]) orderCountMap[oi.store_id] = new Set();
      orderCountMap[oi.store_id].add(oi.order_id);
    }

    const summaries: BusinessConversionSummary[] = bizList.map((b: any) => {
      const tv = visits.filter(v => v.business_id === b.id).length;
      const to = orderCountMap[b.id]?.size || 0;
      return {
        business_id: b.id,
        business_name: b.business_name,
        category: b.category,
        total_visits: tv,
        total_orders: to,
        conversion_rate: pct(to, tv),
      };
    });

    summaries.sort((a, b) => b.total_visits - a.total_visits);
    setBusinesses(summaries);
    setLoading(false);
  }, [range]);

  useEffect(() => { loadList(); }, [loadList]);

  const openDetail = async (biz: BusinessConversionSummary) => {
    setSelectedBiz(biz);
    setDetailLoading(true);

    const days = range === "today" ? 1 : range === "7d" ? 7 : 30;
    const startD = new Date();
    startD.setDate(startD.getDate() - (days - 1));
    const startDate = startD.toISOString().slice(0, 10);

    const [{ data: visits }, { data: oItems }] = await Promise.all([
      fromTable("business_visits").select("visit_date, user_id").eq("business_id", biz.business_id).gte("visit_date", startDate).order("visit_date"),
      fromTable("order_items").select("order_id, created_at").eq("store_id", biz.business_id).gte("created_at", new Date(startDate).toISOString()),
    ]);

    const vList = (visits || []) as { visit_date: string; user_id: string }[];
    const oList = (oItems || []) as { order_id: string; created_at: string }[];

    const visitMap: Record<string, number> = {};
    const userSet = new Set<string>();
    for (const v of vList) { visitMap[v.visit_date] = (visitMap[v.visit_date] || 0) + 1; userSet.add(v.user_id); }

    // Count unique orders per day
    const orderMap: Record<string, Set<string>> = {};
    for (const o of oList) {
      const d = o.created_at.slice(0, 10);
      if (!orderMap[d]) orderMap[d] = new Set();
      orderMap[d].add(o.order_id);
    }

    const daily: DailyPoint[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(startD);
      d.setDate(d.getDate() + i);
      const ds = d.toISOString().slice(0, 10);
      daily.push({ date: ds, visits: visitMap[ds] || 0, orders: orderMap[ds]?.size || 0 });
    }

    setDailyData(daily);
    setUniqueUsers(userSet.size);
    setDetailLoading(false);
  };

  const renderTimeFilters = () => (
    <div className="flex rounded-lg bg-secondary p-0.5 gap-0.5">
      {([["today", "Today"], ["7d", "7D"], ["30d", "30D"], ["all", "All"]] as [TimeRange, string][]).map(([k, l]) => (
        <button
          key={k}
          onClick={() => { setRange(k); if (selectedBiz) setSelectedBiz(null); }}
          className={`flex-1 rounded-md py-1.5 text-[10px] font-bold transition-colors ${range === k ? "bg-card shadow-sm" : "text-muted-foreground"}`}
        >
          {l}
        </button>
      ))}
    </div>
  );

  // ---------- DETAIL VIEW ----------
  if (selectedBiz) {
    const totalV = dailyData.reduce((s, d) => s + d.visits, 0);
    const totalO = dailyData.reduce((s, d) => s + d.orders, 0);
    const cr = pct(totalO, totalV);
    const maxVal = Math.max(...dailyData.map(d => d.visits), ...dailyData.map(d => d.orders), 1);

    return (
      <div className="space-y-4">
        <button onClick={() => setSelectedBiz(null)} className="flex items-center gap-1 text-xs text-primary font-bold">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to list
        </button>

        <div className="rounded-2xl bg-gradient-to-r from-primary/10 to-accent/10 p-4">
          <p className="text-sm font-bold">{selectedBiz.business_name}</p>
          <p className="text-[10px] text-muted-foreground capitalize">{selectedBiz.category.replace("_", " ")}</p>
        </div>

        <TimeFilters />

        {detailLoading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Visits", value: totalV, icon: Eye },
                { label: "Orders", value: totalO, icon: ShoppingCart },
                { label: "Conv.", value: `${cr}%`, icon: Percent },
                { label: "Users", value: uniqueUsers, icon: Users },
              ].map(s => (
                <div key={s.label} className="rounded-xl bg-card border border-border p-2.5 text-center">
                  <s.icon className="h-3.5 w-3.5 mx-auto text-primary mb-1" />
                  <p className="text-sm font-extrabold">{s.value}</p>
                  <p className="text-[8px] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Visits vs Orders chart */}
            <div className="rounded-xl bg-card border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-muted-foreground">Visits vs Orders</p>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-[9px] text-muted-foreground"><span className="w-2 h-2 rounded-full bg-primary/70" /> Visits</span>
                  <span className="flex items-center gap-1 text-[9px] text-muted-foreground"><span className="w-2 h-2 rounded-full bg-accent" /> Orders</span>
                </div>
              </div>
              <div className="flex items-end gap-[3px] h-28">
                {dailyData.map((d, i) => (
                  <div key={i} className="flex-1 flex items-end gap-[1px]">
                    <div className="flex-1 rounded-t bg-primary/60 min-h-[2px]" style={{ height: `${Math.max((d.visits / maxVal) * 100, 2)}%` }} />
                    <div className="flex-1 rounded-t bg-accent min-h-[2px]" style={{ height: `${Math.max((d.orders / maxVal) * 100, 2)}%` }} />
                  </div>
                ))}
              </div>
              {dailyData.length > 1 && (
                <div className="flex justify-between mt-1">
                  <span className="text-[8px] text-muted-foreground">{new Date(dailyData[0]?.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                  <span className="text-[8px] text-muted-foreground">{new Date(dailyData[dailyData.length - 1]?.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                </div>
              )}
            </div>

            {/* Conversion rate indicator */}
            <div className="rounded-xl bg-card border border-border p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <p className="text-xs text-muted-foreground">Conversion Rate</p>
                </div>
                <p className={`text-sm font-extrabold ${cr >= 5 ? "text-primary" : "text-destructive"}`}>{cr}%</p>
              </div>
              {cr < 2 && totalV > 10 && (
                <div className="flex items-center gap-1.5 mt-2 text-destructive">
                  <AlertTriangle className="h-3 w-3" />
                  <p className="text-[10px]">Low conversion — high visits but few orders</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  // ---------- LIST VIEW ----------
  const topConverting = [...businesses].filter(b => b.total_visits >= 5).sort((a, b) => b.conversion_rate - a.conversion_rate);
  const lowConversion = businesses.filter(b => b.total_visits >= 10 && b.conversion_rate < 2);

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-r from-primary/10 to-accent/10 p-4">
        <div className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-bold">Business Visit & Conversion Analytics</p>
            <p className="text-xs text-muted-foreground">Visits, orders & conversion rates</p>
          </div>
        </div>
      </div>

      <TimeFilters />

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : businesses.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">No businesses found</p>
      ) : (
        <>
          {/* Top converting highlight */}
          {topConverting.length > 0 && topConverting[0].conversion_rate > 0 && (
            <div className="rounded-xl bg-card border border-primary/30 p-3">
              <p className="text-[10px] text-primary font-bold mb-1">🏆 Top Converting</p>
              <p className="text-xs font-bold">{topConverting[0].business_name}</p>
              <p className="text-[10px] text-muted-foreground">{topConverting[0].conversion_rate}% conversion · {topConverting[0].total_orders} orders</p>
            </div>
          )}

          {/* Low conversion warning */}
          {lowConversion.length > 0 && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/30 p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <AlertTriangle className="h-3 w-3 text-destructive" />
                <p className="text-[10px] text-destructive font-bold">Low Conversion Warning</p>
              </div>
              <p className="text-[10px] text-muted-foreground">
                {lowConversion.length} store{lowConversion.length > 1 ? "s" : ""} with high visits but &lt;2% conversion
              </p>
            </div>
          )}

          <div className="space-y-2">
            {businesses.map(b => (
              <button
                key={b.business_id}
                onClick={() => openDetail(b)}
                className="w-full flex items-center gap-3 rounded-xl bg-card border border-border p-3 text-left hover:border-primary/40 transition-colors"
              >
                <Store className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate">{b.business_name}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{b.category.replace("_", " ")}</p>
                </div>
                <div className="text-right shrink-0 space-y-0.5">
                  <p className="text-[10px] text-muted-foreground">{b.total_visits} visits · {b.total_orders} orders</p>
                  <p className={`text-xs font-extrabold ${b.conversion_rate >= 5 ? "text-primary" : b.conversion_rate > 0 ? "text-foreground" : "text-muted-foreground"}`}>
                    {b.conversion_rate}%
                  </p>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default BusinessVisitAnalytics;
