import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Store, Heart, Package, Users, Star, ShoppingCart } from "lucide-react";

const fromTable = (table: string) => (supabase as any).from(table);

interface TopStore {
  id: string;
  business_name: string;
  category: string;
  avg_rating: number;
  total_reviews: number;
}

interface TopProvider {
  id: string;
  business_name: string;
  category: string;
  avg_rating: number;
  total_bookings: number;
}

interface TopProduct {
  id: string;
  name: string;
  price: number;
  category: string;
  business_name?: string;
}

const PlatformAnalyticsPanel = () => {
  const [tab, setTab] = useState<"stores" | "providers" | "products" | "growth">("stores");
  const [topStores, setTopStores] = useState<TopStore[]>([]);
  const [topProviders, setTopProviders] = useState<TopProvider[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [growthData, setGrowthData] = useState<{ label: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const [
        { data: stores },
        { data: providers },
        { data: products },
      ] = await Promise.all([
        fromTable("business_profiles")
          .select("id, business_name, category, avg_rating, total_reviews")
          .eq("is_suspended", false)
          .order("avg_rating", { ascending: false })
          .limit(10),
        fromTable("care_providers")
          .select("id, business_name, category, avg_rating, total_bookings")
          .eq("is_suspended", false)
          .eq("is_banned", false)
          .order("avg_rating", { ascending: false })
          .limit(10),
        fromTable("products")
          .select("id, name, price, category, business_id")
          .eq("is_active", true)
          .limit(10),
      ]);

      setTopStores((stores || []) as TopStore[]);
      setTopProviders((providers || []) as TopProvider[]);

      // Enrich products with store names
      const prods = (products || []) as (TopProduct & { business_id?: string })[];
      if (prods.length > 0) {
        const bizIds = [...new Set(prods.map(p => p.business_id).filter(Boolean))] as string[];
        if (bizIds.length > 0) {
          const { data: bizNames } = await fromTable("business_profiles")
            .select("id, business_name")
            .in("id", bizIds);
          const nameMap = new Map((bizNames || []).map((b: any) => [b.id, b.business_name]));
          prods.forEach(p => { p.business_name = nameMap.get(p.business_id!) || "Unknown"; });
        }
      }
      setTopProducts(prods);

      // Growth: users per recent days
      const days = 7;
      const growth: { label: string; value: number }[] = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
        const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).toISOString();
        const { count } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .gte("created_at", dayStart)
          .lt("created_at", dayEnd);
        growth.push({
          label: d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric" }),
          value: count || 0,
        });
      }
      setGrowthData(growth);

      setLoading(false);
    };
    load();
  }, []);

  const maxGrowth = Math.max(...growthData.map(g => g.value), 1);

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="rounded-2xl bg-gradient-to-r from-primary/10 to-accent/10 p-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-bold">Platform Analytics</p>
            <p className="text-xs text-muted-foreground">Performance insights & rankings</p>
          </div>
        </div>
      </div>

      <div className="flex rounded-xl bg-secondary p-1">
        {[
          { key: "stores" as const, label: "Stores", icon: Store },
          { key: "providers" as const, label: "Providers", icon: Heart },
          { key: "products" as const, label: "Products", icon: Package },
          { key: "growth" as const, label: "Growth", icon: Users },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1 rounded-lg py-2 text-[10px] font-bold transition-colors ${
              tab === t.key ? "bg-card shadow-sm" : "text-muted-foreground"
            }`}
          >
            <t.icon className="h-3 w-3" /> {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          {tab === "stores" && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-muted-foreground">Top Rated Stores</p>
              {topStores.map((s, i) => (
                <div key={s.id} className="flex items-center gap-3 rounded-xl bg-card border border-border p-3">
                  <span className="text-sm font-extrabold text-muted-foreground w-5 text-center">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate">{s.business_name}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">{s.category.replace("_", " ")}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-0.5 justify-end">
                      <Star className="h-3 w-3 fill-primary text-primary" />
                      <span className="text-xs font-bold">{Number(s.avg_rating).toFixed(1)}</span>
                    </div>
                    <p className="text-[9px] text-muted-foreground">{s.total_reviews} reviews</p>
                  </div>
                </div>
              ))}
              {topStores.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No stores yet</p>}
            </div>
          )}

          {tab === "providers" && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-muted-foreground">Top Rated Providers</p>
              {topProviders.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3 rounded-xl bg-card border border-border p-3">
                  <span className="text-sm font-extrabold text-muted-foreground w-5 text-center">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate">{p.business_name}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">{p.category.replace("_", " ")}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-0.5 justify-end">
                      <Star className="h-3 w-3 fill-primary text-primary" />
                      <span className="text-xs font-bold">{Number(p.avg_rating).toFixed(1)}</span>
                    </div>
                    <p className="text-[9px] text-muted-foreground">{p.total_bookings} bookings</p>
                  </div>
                </div>
              ))}
              {topProviders.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No providers yet</p>}
            </div>
          )}

          {tab === "products" && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-muted-foreground">Top Products</p>
              {topProducts.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3 rounded-xl bg-card border border-border p-3">
                  <span className="text-sm font-extrabold text-muted-foreground w-5 text-center">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground">{p.business_name} · {p.category.replace("_", " ")}</p>
                  </div>
                  <p className="text-xs font-extrabold text-primary">{p.price} MKD</p>
                </div>
              ))}
              {topProducts.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No products yet</p>}
            </div>
          )}

          {tab === "growth" && (
            <div className="space-y-3">
              <p className="text-xs font-bold text-muted-foreground">New Users (Last 7 Days)</p>
              <div className="rounded-xl bg-card border border-border p-4">
                <div className="flex items-end gap-2 h-32">
                  {growthData.map((g, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[9px] font-bold">{g.value}</span>
                      <div
                        className="w-full rounded-t-lg bg-primary/70 min-h-[4px] transition-all"
                        style={{ height: `${Math.max((g.value / maxGrowth) * 100, 4)}%` }}
                      />
                      <span className="text-[8px] text-muted-foreground leading-tight text-center">{g.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl bg-card border border-border p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Total new users this week</p>
                  <p className="text-sm font-extrabold text-primary">{growthData.reduce((s, g) => s + g.value, 0)}</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PlatformAnalyticsPanel;
