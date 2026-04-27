import { useState, useEffect, useMemo } from "react";
import { Users, ShoppingBag, DollarSign, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CustomerData {
  buyer_id: string;
  name: string;
  totalOrders: number;
  totalSpent: number;
  lastPurchase: string;
}

interface Props {
  businessId: string;
}

const DashboardCustomersTab = ({ businessId }: Props) => {
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCustomers = async () => {
      setLoading(true);
      // Get non-PII order item rows for this store
      const { data: items } = await (supabase as any)
        .from("store_order_items_safe")
        .select("order_id, price, quantity, store_earnings")
        .eq("store_id", businessId);

      if (!items || items.length === 0) {
        setCustomers([]);
        setLoading(false);
        return;
      }

      const orderIds = new Set((items as any[]).map((i: any) => i.order_id));
      // Use the safe RPC — returns only non-PII fulfillment columns for orders
      // that contain items from stores owned by the authenticated user.
      const { data: ownerOrders } = await (supabase as any).rpc("get_store_owner_orders");
      const orders = (ownerOrders as any[] | null)?.filter((o: any) => orderIds.has(o.id)) ?? null;

      if (!orders) {
        setCustomers([]);
        setLoading(false);
        return;
      }

      // Group by buyer_id
      const buyerMap: Record<string, CustomerData> = {};
      (orders as any[]).forEach((order: any) => {
        const orderItems = (items as any[]).filter((i: any) => i.order_id === order.id);
        const spent = orderItems.reduce((s: number, i: any) => s + i.price * i.quantity, 0);

        if (!buyerMap[order.buyer_id]) {
          buyerMap[order.buyer_id] = {
            buyer_id: order.buyer_id,
            name: order.shipping_name || "Customer",
            totalOrders: 0,
            totalSpent: 0,
            lastPurchase: order.created_at,
          };
        }
        buyerMap[order.buyer_id].totalOrders++;
        buyerMap[order.buyer_id].totalSpent += spent;
        if (order.created_at > buyerMap[order.buyer_id].lastPurchase) {
          buyerMap[order.buyer_id].lastPurchase = order.created_at;
        }
      });

      setCustomers(Object.values(buyerMap).sort((a, b) => b.totalSpent - a.totalSpent));
      setLoading(false);
    };
    fetchCustomers();
  }, [businessId]);

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <div className="text-center py-8">
        <span className="text-3xl">👥</span>
        <p className="text-sm font-semibold mt-2">No customers yet</p>
        <p className="text-xs text-muted-foreground">Customers who buy your products will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-card border border-border p-4">
        <h4 className="text-xs font-bold mb-1">Total Customers</h4>
        <p className="font-display text-2xl font-extrabold">{customers.length}</p>
      </div>

      {customers.map((c) => (
        <div key={c.buyer_id} className="rounded-2xl bg-card border border-border p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
              <Users className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">{c.name}</p>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <ShoppingBag className="h-2.5 w-2.5" /> {c.totalOrders} orders
                </span>
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <DollarSign className="h-2.5 w-2.5" /> {c.totalSpent.toLocaleString()} MKD
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Calendar className="h-2.5 w-2.5" />
                {new Date(c.lastPurchase).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default DashboardCustomersTab;
