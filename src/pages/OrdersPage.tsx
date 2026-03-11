import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { ArrowLeft, Package } from "lucide-react";
import { useMyOrders } from "@/hooks/useOrders";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  paid: "bg-primary/10 text-primary",
  processing: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  shipped: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  delivered: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-destructive/10 text-destructive",
};

const OrdersPage = () => {
  const navigate = useNavigate();
  const { orders, loading } = useMyOrders();

  return (
    <AppLayout>
      <div className="mx-auto max-w-lg pb-20">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="rounded-full p-1.5 hover:bg-secondary">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-display text-lg font-bold flex-1">My Orders</h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <span className="text-5xl mb-3">📦</span>
            <p className="text-sm font-semibold">No orders yet</p>
            <p className="text-xs text-muted-foreground mt-1">Your purchases will appear here</p>
            <button onClick={() => navigate("/marketplace")} className="mt-4 rounded-xl petkeep-gradient text-primary-foreground px-6 py-2.5 text-xs font-bold">
              Browse Products
            </button>
          </div>
        ) : (
          <div className="px-4 py-4 space-y-3">
            {orders.map((order) => (
              <div key={order.id} className="rounded-2xl bg-card border border-border overflow-hidden">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-primary" />
                      <span className="text-xs font-bold">#{order.id.slice(0, 8).toUpperCase()}</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[order.status] || "bg-secondary"}`}>
                      {order.status}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </p>

                  {/* Items */}
                  <div className="mt-3 space-y-2">
                    {order.items?.map((item) => (
                      <div key={item.id} className="flex items-center gap-2">
                        {item.product?.image_url ? (
                          <img src={item.product.image_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center text-sm">📦</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate">{item.product?.name || "Product"}</p>
                          <p className="text-[10px] text-muted-foreground">{item.store?.business_name} · Qty: {item.quantity}</p>
                        </div>
                        <p className="text-xs font-bold">{(item.price * item.quantity).toLocaleString()} MKD</p>
                      </div>
                    ))}
                  </div>

                  {/* Shipping */}
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-[10px] text-muted-foreground">Ship to: {order.shipping_name}, {order.shipping_city}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-muted-foreground">Total</span>
                      <span className="text-sm font-extrabold text-primary">{Number(order.total_price).toLocaleString()} MKD</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default OrdersPage;
