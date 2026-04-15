import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Eye, TrendingUp, Users, Calendar, Store, ChevronRight } from "lucide-react";

const fromTable = (table: string) => (supabase as any).from(table);

interface BusinessVisitSummary {
  business_id: string;
  business_name: string;
  category: string;
  total_visits: number;
  today_visits: number;
  month_visits: number;
}

interface DailyVisit {
  visit_date: string;
  count: number;
}

const BusinessVisitAnalytics = () => {
  const [businesses, setBusinesses] = useState<BusinessVisitSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBiz, setSelectedBiz] = useState<BusinessVisitSummary | null>(null);
  const [dailyData, setDailyData] = useState<DailyVisit[]>([]);
  const [uniqueUsers, setUniqueUsers] = useState(0);
  const [detailLoading, setDetailLoading] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      // Get all businesses
      const { data: bizList } = await fromTable("business_profiles")
        .select("id, business_name, category")
        .eq("is_suspended", false)
        .order("business_name");

      if (!bizList || bizList.length === 0) {
        setBusinesses([]);
        setLoading(false);
        return;
      }

      const bizIds = bizList.map((b: any) => b.id);

      // Get all visits for these businesses
      const { data: allVisits } = await fromTable("business_visits")
        .select("business_id, visit_date")
        .in("business_id", bizIds);

      const visits = (allVisits || []) as { business_id: string; visit_date: string }[];

      const summaries: BusinessVisitSummary[] = bizList.map((b: any) => {
        const bVisits = visits.filter(v => v.business_id === b.id);
        return {
          business_id: b.id,
          business_name: b.business_name,
          category: b.category,
          total_visits: bVisits.length,
          today_visits: bVisits.filter(v => v.visit_date === today).length,
          month_visits: bVisits.filter(v => v.visit_date >= monthStart).length,
        };
      });

      // Sort by total visits descending
      summaries.sort((a, b) => b.total_visits - a.total_visits);
      setBusinesses(summaries);
      setLoading(false);
    };
    load();
  }, []);

  const openDetail = async (biz: BusinessVisitSummary) => {
    setSelectedBiz(biz);
    setDetailLoading(true);

    // Get daily visits for last 30 days
    const thirtyAgo = new Date();
    thirtyAgo.setDate(thirtyAgo.getDate() - 29);
    const startDate = thirtyAgo.toISOString().slice(0, 10);

    const { data: visits } = await fromTable("business_visits")
      .select("visit_date, user_id")
      .eq("business_id", biz.business_id)
      .gte("visit_date", startDate)
      .order("visit_date", { ascending: true });

    const vList = (visits || []) as { visit_date: string; user_id: string }[];

    // Aggregate daily
    const dayMap: Record<string, number> = {};
    const userSet = new Set<string>();
    for (const v of vList) {
      dayMap[v.visit_date] = (dayMap[v.visit_date] || 0) + 1;
      userSet.add(v.user_id);
    }

    // Fill in missing days
    const daily: DailyVisit[] = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(thirtyAgo);
      d.setDate(d.getDate() + i);
      const ds = d.toISOString().slice(0, 10);
      daily.push({ visit_date: ds, count: dayMap[ds] || 0 });
    }

    setDailyData(daily);
    setUniqueUsers(userSet.size);
    setDetailLoading(false);
  };

  if (selectedBiz) {
    const maxVal = Math.max(...dailyData.map(d => d.count), 1);
    const totalInRange = dailyData.reduce((s, d) => s + d.count, 0);

    return (
      <div className="space-y-4">
        <button onClick={() => setSelectedBiz(null)} className="flex items-center gap-1 text-xs text-primary font-bold">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to list
        </button>

        <div className="rounded-2xl bg-gradient-to-r from-primary/10 to-accent/10 p-4">
          <p className="text-sm font-bold">{selectedBiz.business_name}</p>
          <p className="text-[10px] text-muted-foreground capitalize">{selectedBiz.category.replace("_", " ")}</p>
        </div>

        {detailLoading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
            {/* Stats cards */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Total (30d)", value: totalInRange, icon: Eye },
                { label: "Unique Users", value: uniqueUsers, icon: Users },
                { label: "Today", value: selectedBiz.today_visits, icon: Calendar },
              ].map(s => (
                <div key={s.label} className="rounded-xl bg-card border border-border p-3 text-center">
                  <s.icon className="h-4 w-4 mx-auto text-primary mb-1" />
                  <p className="text-lg font-extrabold">{s.value}</p>
                  <p className="text-[9px] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Daily chart */}
            <div className="rounded-xl bg-card border border-border p-4">
              <p className="text-xs font-bold text-muted-foreground mb-3">Daily Visits (Last 30 Days)</p>
              <div className="flex items-end gap-[2px] h-28">
                {dailyData.map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                    <div
                      className="w-full rounded-t bg-primary/70 min-h-[2px] transition-all"
                      style={{ height: `${Math.max((d.count / maxVal) * 100, 2)}%` }}
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[8px] text-muted-foreground">
                  {new Date(dailyData[0]?.visit_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </span>
                <span className="text-[8px] text-muted-foreground">
                  {new Date(dailyData[dailyData.length - 1]?.visit_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </span>
              </div>
            </div>

            {/* Growth indicator */}
            <div className="rounded-xl bg-card border border-border p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <p className="text-xs text-muted-foreground">This month</p>
                </div>
                <p className="text-sm font-extrabold text-primary">{selectedBiz.month_visits} visits</p>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-r from-primary/10 to-accent/10 p-4">
        <div className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-bold">Business Visit Analytics</p>
            <p className="text-xs text-muted-foreground">Unique daily visits per store</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : businesses.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">No businesses found</p>
      ) : (
        <>
          {/* Most visited highlight */}
          {businesses[0]?.total_visits > 0 && (
            <div className="rounded-xl bg-card border border-primary/30 p-3">
              <p className="text-[10px] text-primary font-bold mb-1">🏆 Most Visited</p>
              <p className="text-xs font-bold">{businesses[0].business_name}</p>
              <p className="text-[10px] text-muted-foreground">{businesses[0].total_visits} total visits</p>
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
                <div className="text-right shrink-0">
                  <p className="text-xs font-extrabold">{b.total_visits}</p>
                  <p className="text-[9px] text-muted-foreground">today: {b.today_visits}</p>
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
