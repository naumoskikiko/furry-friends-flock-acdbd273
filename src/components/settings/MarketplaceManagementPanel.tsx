import { useState, useEffect } from "react";
import { Search, Store, Trash2, Ban, Eye, ShieldCheck, ChevronDown, ChevronUp, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { BUSINESS_CATEGORIES } from "@/hooks/useBusiness";

const fromTable = (table: string) => supabase.from(table as any);

interface BizRow {
  id: string;
  user_id: string;
  business_name: string;
  category: string;
  is_verified: boolean;
  is_suspended: boolean;
  avg_rating: number;
  total_reviews: number;
  created_at: string;
  profile?: { full_name: string; username: string | null };
}

const MarketplaceManagementPanel = () => {
  const { toast } = useToast();
  const [businesses, setBusinesses] = useState<BizRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "verified" | "suspended">("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [productCounts, setProductCounts] = useState<Record<string, number>>({});

  const load = async () => {
    setLoading(true);
    let q = fromTable("business_profiles").select("*").order("created_at", { ascending: false });
    if (search) q = q.ilike("business_name", `%${search}%`);
    if (filter === "pending") q = q.eq("is_verified", false).eq("is_suspended", false);
    if (filter === "verified") q = q.eq("is_verified", true);
    if (filter === "suspended") q = q.eq("is_suspended", true);
    const { data } = await q;
    const biz = (data as any as BizRow[]) || [];

    // Fetch owner profiles
    const userIds = biz.map((b) => b.user_id);
    if (userIds.length) {
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, username").in("user_id", userIds);
      if (profiles) {
        const map = Object.fromEntries(profiles.map((p) => [p.user_id, p]));
        biz.forEach((b) => (b.profile = map[b.user_id]));
      }
    }

    // Fetch product counts
    const counts: Record<string, number> = {};
    for (const b of biz) {
      const { count } = await fromTable("products").select("*", { count: "exact", head: true }).eq("business_id", b.id);
      counts[b.id] = count || 0;
    }
    setProductCounts(counts);
    setBusinesses(biz);
    setLoading(false);
  };

  useEffect(() => { load(); }, [search, filter]);

  const toggleSuspend = async (biz: BizRow) => {
    await fromTable("business_profiles").update({ is_suspended: !biz.is_suspended } as any).eq("id", biz.id);
    toast({ title: biz.is_suspended ? "Store reactivated" : "Store suspended" });
    load();
  };

  const removeBusiness = async (biz: BizRow) => {
    if (!confirm(`Remove "${biz.business_name}"? This will delete the store and all its products.`)) return;
    await fromTable("business_profiles").delete().eq("id", biz.id);
    toast({ title: "Store removed" });
    load();
  };

  const toggleVerified = async (biz: BizRow) => {
    await fromTable("business_profiles").update({ is_verified: !biz.is_verified } as any).eq("id", biz.id);
    toast({ title: biz.is_verified ? "Verification revoked" : "Store verified" });
    load();
  };

  return (
    <div className="px-4 py-4 space-y-3">
      <div className="rounded-2xl bg-gradient-to-r from-primary/10 to-accent/10 p-4">
        <p className="text-sm font-bold">🏪 Marketplace Control</p>
        <p className="text-xs text-muted-foreground mt-1">Manage stores, products, and business accounts.</p>
      </div>

      <div className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search stores..."
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {([
          { key: "all" as const, label: "All" },
          { key: "pending" as const, label: "⏳ Pending" },
          { key: "verified" as const, label: "✅ Verified" },
          { key: "suspended" as const, label: "🚫 Suspended" },
        ]).map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              filter === f.key ? "petkeep-gradient text-primary-foreground" : "bg-secondary text-secondary-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : businesses.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">No stores found</p>
      ) : (
        <div className="space-y-2">
          {businesses.map((b) => {
            const catInfo = BUSINESS_CATEGORIES.find((c) => c.value === b.category);
            const isExpanded = expanded === b.id;
            return (
              <div key={b.id} className="rounded-2xl bg-card border border-border overflow-hidden">
                <button
                  onClick={() => setExpanded(isExpanded ? null : b.id)}
                  className="w-full flex items-center gap-3 p-3 text-left"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-lg shrink-0">
                    {catInfo?.icon || "🏪"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-bold truncate">{b.business_name}</p>
                      {b.is_verified && <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />}
                      {b.is_suspended && (
                        <span className="text-[10px] bg-destructive/10 text-destructive px-1.5 py-0.5 rounded-full font-bold">Suspended</span>
                      )}
                      {!b.is_verified && !b.is_suspended && (
                        <span className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded-full font-bold">Pending</span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {b.profile?.full_name || "Unknown"} · {productCounts[b.id] || 0} products
                    </p>
                  </div>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </button>

                {isExpanded && (
                  <div className="border-t border-border px-3 py-3 space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-xl bg-secondary p-2">
                        <p className="text-[10px] text-muted-foreground">Products</p>
                        <p className="text-sm font-bold">{productCounts[b.id] || 0}</p>
                      </div>
                      <div className="rounded-xl bg-secondary p-2">
                        <p className="text-[10px] text-muted-foreground">Rating</p>
                        <p className="text-sm font-bold">{Number(b.avg_rating).toFixed(1)}</p>
                      </div>
                      <div className="rounded-xl bg-secondary p-2">
                        <p className="text-[10px] text-muted-foreground">Reviews</p>
                        <p className="text-sm font-bold">{b.total_reviews}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => toggleVerified(b)}
                        className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold ${
                          b.is_verified ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
                        }`}
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        {b.is_verified ? "Revoke Verification" : "Verify Store"}
                      </button>
                      <button
                        onClick={() => toggleSuspend(b)}
                        className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold ${
                          b.is_suspended ? "bg-primary/10 text-primary" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        }`}
                      >
                        <Ban className="h-3.5 w-3.5" />
                        {b.is_suspended ? "Reactivate" : "Suspend"}
                      </button>
                      <button
                        onClick={() => removeBusiness(b)}
                        className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold bg-destructive/10 text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MarketplaceManagementPanel;
