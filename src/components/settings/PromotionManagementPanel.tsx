import { useState } from "react";
import { Zap, Trash2, Clock, DollarSign, TrendingUp, Package, Store, Users, Edit2, Save, X } from "lucide-react";
import { useAllBoosts, useBoostPricing, type Boost, type BoostPricing } from "@/hooks/useBoosts";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const typeIcons: Record<string, any> = { product: Package, store: Store, provider: Users };
const typeColors: Record<string, string> = {
  product: "bg-primary/10 text-primary",
  store: "bg-blue-500/10 text-blue-500",
  provider: "bg-green-500/10 text-green-500",
};

const PromotionManagementPanel = () => {
  const { boosts, loading, cancelBoost, extendBoost, refresh } = useAllBoosts();
  const { pricing, loading: pricingLoading, updatePrice } = useBoostPricing();
  const { toast } = useToast();
  const [tab, setTab] = useState<"active" | "pricing" | "revenue">("active");
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");

  const activeBoosts = boosts.filter((b) => b.status === "active" && new Date(b.end_date) > new Date());
  const expiredBoosts = boosts.filter((b) => b.status !== "active" || new Date(b.end_date) <= new Date());
  const totalRevenue = boosts.reduce((s, b) => s + Number(b.price_paid), 0);
  const activeRevenue = activeBoosts.reduce((s, b) => s + Number(b.price_paid), 0);

  const handleSavePrice = async (id: string) => {
    const val = parseFloat(editPrice);
    if (isNaN(val) || val < 0) return;
    await updatePrice(id, val);
    setEditingPrice(null);
    toast({ title: "Price updated!" });
  };

  const handleCancel = async (id: string) => {
    await cancelBoost(id);
    toast({ title: "Boost cancelled" });
  };

  const handleExtend = async (id: string) => {
    await extendBoost(id, 168); // extend by 7 days
    toast({ title: "Boost extended by 7 days" });
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const timeRemaining = (end: string) => {
    const diff = new Date(end).getTime() - Date.now();
    if (diff <= 0) return "Expired";
    const hours = Math.floor(diff / 3600000);
    if (hours < 24) return `${hours}h left`;
    return `${Math.floor(hours / 24)}d left`;
  };

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="rounded-2xl bg-gradient-to-r from-amber-500/10 to-primary/10 p-4">
        <p className="text-sm font-bold">🚀 Promotion Management</p>
        <p className="text-xs text-muted-foreground mt-1">Manage boosts, pricing & revenue</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-card border border-border p-3 text-center">
          <p className="text-lg font-extrabold text-primary">{activeBoosts.length}</p>
          <p className="text-[10px] text-muted-foreground">Active Boosts</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-3 text-center">
          <p className="text-lg font-extrabold text-primary">{totalRevenue.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground">Total Revenue</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-3 text-center">
          <p className="text-lg font-extrabold text-primary">{boosts.length}</p>
          <p className="text-[10px] text-muted-foreground">All Time</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl bg-secondary p-1">
        {[
          { key: "active" as const, label: "Active", icon: Zap },
          { key: "pricing" as const, label: "Pricing", icon: DollarSign },
          { key: "revenue" as const, label: "Revenue", icon: TrendingUp },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1 rounded-lg py-2 text-xs font-bold transition-colors ${
              tab === t.key ? "bg-card shadow-sm" : "text-muted-foreground"
            }`}
          >
            <t.icon className="h-3.5 w-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {/* Active Boosts */}
      {tab === "active" && (
        <div className="space-y-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : activeBoosts.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-3xl">🚀</span>
              <p className="text-xs font-semibold mt-2">No active boosts</p>
            </div>
          ) : (
            activeBoosts.map((b) => {
              const Icon = typeIcons[b.type] || Package;
              return (
                <div key={b.id} className="rounded-xl bg-card border border-border p-3">
                  <div className="flex items-center gap-2">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full ${typeColors[b.type]}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold capitalize">{b.type} Boost</p>
                      <p className="text-[10px] text-muted-foreground">ID: {b.target_id.slice(0, 8)}</p>
                    </div>
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                      <Clock className="h-2.5 w-2.5" /> {timeRemaining(b.end_date)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span>{formatDate(b.start_date)} → {formatDate(b.end_date)}</span>
                      <span className="font-bold text-foreground">{Number(b.price_paid)} MKD</span>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => handleExtend(b.id)} className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-1 rounded-lg">
                        +7d
                      </button>
                      <button onClick={() => handleCancel(b.id)} className="text-[10px] font-bold text-destructive bg-destructive/10 px-2 py-1 rounded-lg">
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {expiredBoosts.length > 0 && (
            <>
              <p className="text-xs font-bold text-muted-foreground mt-4">Past Boosts</p>
              {expiredBoosts.slice(0, 10).map((b) => {
                const Icon = typeIcons[b.type] || Package;
                return (
                  <div key={b.id} className="rounded-xl bg-card border border-border p-3 opacity-60">
                    <div className="flex items-center gap-2">
                      <div className={`flex h-7 w-7 items-center justify-center rounded-full ${typeColors[b.type]}`}>
                        <Icon className="h-3 w-3" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold capitalize">{b.type} Boost</p>
                        <p className="text-[10px] text-muted-foreground">{formatDate(b.start_date)} → {formatDate(b.end_date)}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${b.status === "cancelled" ? "text-destructive bg-destructive/10" : "text-muted-foreground bg-secondary"}`}>
                        {b.status === "cancelled" ? "Cancelled" : "Expired"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* Pricing */}
      {tab === "pricing" && (
        <div className="space-y-3">
          {["product", "store", "provider"].map((type) => {
            const items = pricing.filter((p) => p.boost_type === type);
            const Icon = typeIcons[type] || Package;
            return (
              <div key={type} className="rounded-xl bg-card border border-border p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full ${typeColors[type]}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <p className="text-xs font-bold capitalize">{type} Boost Pricing</p>
                </div>
                <div className="space-y-1.5">
                  {items.map((p) => (
                    <div key={p.id} className="flex items-center justify-between py-1.5 border-t border-border first:border-0">
                      <span className="text-xs text-muted-foreground">{p.duration_label}</span>
                      {editingPrice === p.id ? (
                        <div className="flex items-center gap-1">
                          <Input
                            value={editPrice}
                            onChange={(e) => setEditPrice(e.target.value)}
                            className="h-7 w-20 text-xs"
                            type="number"
                          />
                          <button onClick={() => handleSavePrice(p.id)} className="rounded-lg p-1 hover:bg-secondary">
                            <Save className="h-3 w-3 text-primary" />
                          </button>
                          <button onClick={() => setEditingPrice(null)} className="rounded-lg p-1 hover:bg-secondary">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold">{p.price} MKD</span>
                          <button
                            onClick={() => { setEditingPrice(p.id); setEditPrice(String(p.price)); }}
                            className="rounded-lg p-1 hover:bg-secondary"
                          >
                            <Edit2 className="h-3 w-3 text-muted-foreground" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Revenue */}
      {tab === "revenue" && (
        <div className="space-y-3">
          <div className="rounded-xl bg-card border border-border p-4">
            <p className="text-xs font-bold mb-3">Revenue Summary</p>
            <div className="space-y-3">
              {["product", "store", "provider"].map((type) => {
                const typeBoosts = boosts.filter((b) => b.type === type);
                const rev = typeBoosts.reduce((s, b) => s + Number(b.price_paid), 0);
                const active = typeBoosts.filter((b) => b.status === "active" && new Date(b.end_date) > new Date()).length;
                const Icon = typeIcons[type] || Package;
                return (
                  <div key={type} className="flex items-center gap-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-full ${typeColors[type]}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold capitalize">{type} Boosts</p>
                      <p className="text-[10px] text-muted-foreground">{active} active · {typeBoosts.length} total</p>
                    </div>
                    <p className="text-sm font-extrabold text-primary">{rev.toLocaleString()} MKD</p>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
              <p className="text-sm font-bold">Total Boost Revenue</p>
              <p className="text-lg font-extrabold text-primary">{totalRevenue.toLocaleString()} MKD</p>
            </div>
          </div>

          {/* Top boosts */}
          {boosts.length > 0 && (
            <div className="rounded-xl bg-card border border-border p-4">
              <p className="text-xs font-bold mb-2">Recent Boost Purchases</p>
              <div className="space-y-2">
                {boosts.slice(0, 8).map((b) => (
                  <div key={b.id} className="flex items-center justify-between text-[10px]">
                    <span className="capitalize font-semibold">{b.type}</span>
                    <span className="text-muted-foreground">{new Date(b.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                    <span className="font-bold">{Number(b.price_paid)} MKD</span>
                    <span className={`font-bold ${b.status === "active" ? "text-green-600" : "text-muted-foreground"}`}>
                      {b.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PromotionManagementPanel;
