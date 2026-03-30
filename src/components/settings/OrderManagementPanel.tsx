import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Package, Truck, CheckCircle2, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const fromTable = (table: string) => (supabase as any).from(table);

interface Order {
  id: string;
  buyer_id: string;
  status: string;
  total_price: number;
  platform_fee: number;
  shipping_name: string;
  shipping_address: string;
  shipping_city: string;
  shipping_phone: string;
  created_at: string;
  buyer_profile?: { full_name: string; avatar_url: string | null };
  items?: { product_name: string; quantity: number; price: number; store_name: string }[];
}

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  confirmed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  shipped: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
  delivered: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const OrderManagementPanel = () => {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    const { data: orderData } = await fromTable("orders").select("*").order("created_at", { ascending: false }).limit(200);
    if (!orderData) { setLoading(false); return; }

    const buyerIds = [...new Set((orderData as any[]).map((o: any) => o.buyer_id))];
    const orderIds = (orderData as any[]).map((o: any) => o.id);

    const [{ data: profiles }, { data: items }] = await Promise.all([
      supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", buyerIds),
      fromTable("order_items").select("order_id, quantity, price, product_id, store_id").in("order_id", orderIds),
    ]);

    // Get product names and store names
    const productIds = [...new Set((items || []).map((i: any) => i.product_id))];
    const storeIds = [...new Set((items || []).map((i: any) => i.store_id))];

    const [{ data: products }, { data: stores }] = await Promise.all([
      fromTable("products").select("id, name").in("id", productIds.length ? productIds : [""]),
      fromTable("business_profiles").select("id, business_name").in("id", storeIds.length ? storeIds : [""]),
    ]);

    const profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.user_id, p]));
    const productMap = Object.fromEntries((products || []).map((p: any) => [p.id, p.name]));
    const storeMap = Object.fromEntries((stores || []).map((s: any) => [s.id, s.business_name]));

    setOrders((orderData as any[]).map((o: any) => ({
      ...o,
      buyer_profile: profileMap[o.buyer_id],
      items: (items || []).filter((i: any) => i.order_id === o.id).map((i: any) => ({
        product_name: productMap[i.product_id] || "Unknown",
        quantity: i.quantity,
        price: i.price,
        store_name: storeMap[i.store_id] || "Unknown",
      })),
    })));
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await fromTable("orders").update({ status }).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Order ${status}` });
      fetchOrders();
    }
  };

  const filtered = filter === "all" ? orders : orders.filter(o => o.status === filter);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-3 pb-24">
      <h2 className="font-display text-lg font-bold">📦 Order Management</h2>

      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {["all", "pending", "confirmed", "shipped", "delivered", "cancelled"].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
              filter === f ? "petkeep-gradient text-primary-foreground" : "bg-secondary text-muted-foreground"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)} ({orders.filter(o => f === "all" || o.status === f).length})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <span className="text-4xl">📦</span>
          <p className="text-sm font-semibold mt-2">No orders</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(o => (
            <div key={o.id} className="rounded-2xl bg-card border border-border overflow-hidden">
              <button
                onClick={() => setExpandedId(expandedId === o.id ? null : o.id)}
                className="w-full p-4 text-left"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold">{o.buyer_profile?.full_name || "Buyer"}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(o.created_at).toLocaleDateString()} • {o.items?.length || 0} items
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{o.total_price} MKD</span>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold capitalize ${statusColors[o.status] || "bg-secondary"}`}>
                      {o.status}
                    </span>
                    {expandedId === o.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </div>
              </button>

              {expandedId === o.id && (
                <div className="px-4 pb-4 border-t border-border pt-3 space-y-3">
                  {/* Items */}
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Items</p>
                    {o.items?.map((item, i) => (
                      <div key={i} className="flex justify-between text-xs py-1">
                        <span>{item.product_name} × {item.quantity}</span>
                        <span className="font-semibold">{item.price * item.quantity} MKD</span>
                      </div>
                    ))}
                  </div>

                  {/* Shipping */}
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Shipping</p>
                    <p className="text-xs">{o.shipping_name}</p>
                    <p className="text-xs text-muted-foreground">{o.shipping_address}, {o.shipping_city}</p>
                    <p className="text-xs text-muted-foreground">{o.shipping_phone}</p>
                  </div>

                  {/* Platform fee */}
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Platform fee</span>
                    <span className="font-semibold">{o.platform_fee} MKD</span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 flex-wrap">
                    {o.status === "pending" && (
                      <>
                        <Button size="sm" className="h-8 text-xs" onClick={() => updateStatus(o.id, "confirmed")}>
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Confirm
                        </Button>
                        <Button size="sm" variant="destructive" className="h-8 text-xs" onClick={() => updateStatus(o.id, "cancelled")}>
                          Cancel
                        </Button>
                      </>
                    )}
                    {o.status === "confirmed" && (
                      <Button size="sm" className="h-8 text-xs" onClick={() => updateStatus(o.id, "shipped")}>
                        <Truck className="h-3.5 w-3.5 mr-1" /> Mark Shipped
                      </Button>
                    )}
                    {o.status === "shipped" && (
                      <Button size="sm" className="h-8 text-xs" onClick={() => updateStatus(o.id, "delivered")}>
                        <Package className="h-3.5 w-3.5 mr-1" /> Mark Delivered
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrderManagementPanel;
