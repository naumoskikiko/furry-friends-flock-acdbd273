import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { ArrowLeft, CheckCircle2, Truck, Store, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCart } from "@/hooks/useCart";
import { useCreateOrder, type ShippingInfo } from "@/hooks/useOrders";
import { useToast } from "@/hooks/use-toast";
import SlideToPayButton from "@/components/marketplace/SlideToPayButton";

const DELIVERY_FEE = 120; // MKD flat rate

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { items, totalPrice, itemCount } = useCart();
  const { createOrder } = useCreateOrder();

  const [step, setStep] = useState<"checkout" | "confirmed">("checkout");
  const [shipping, setShipping] = useState<ShippingInfo>({
    name: "", phone: "", address: "", city: "", postalCode: "", country: "",
  });
  const [orderId, setOrderId] = useState<string | null>(null);

  const platformFee = Math.round(totalPrice * 0.10 * 100) / 100;
  const grandTotal = totalPrice + DELIVERY_FEE;

  const canPay = shipping.name && shipping.phone && shipping.address && shipping.city && shipping.country;

  // Group items by store
  const storeGroups = items.reduce<Record<string, typeof items>>((acc, item) => {
    const storeId = item.product?.business_id || "unknown";
    if (!acc[storeId]) acc[storeId] = [];
    acc[storeId].push(item);
    return acc;
  }, {});

  const handlePlaceOrder = async () => {
    const cartItems = items.map((item) => ({
      product_id: item.product_id,
      quantity: item.quantity,
      price: item.product?.price || 0,
      business_id: item.product?.business_id || "",
    }));

    const id = await createOrder(cartItems, shipping);
    setOrderId(id);
    setStep("confirmed");
    toast({ title: "Order placed successfully!" });
  };

  if (items.length === 0 && step !== "confirmed") {
    navigate("/cart");
    return null;
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-lg pb-32">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center gap-3">
          <button onClick={() => step === "confirmed" ? navigate("/marketplace") : navigate(-1)} className="rounded-full p-1.5 hover:bg-secondary">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-display text-lg font-bold flex-1">
            {step === "confirmed" ? "Order Confirmed" : "Checkout"}
          </h1>
        </div>

        {step === "checkout" && (
          <div className="px-4 py-4 space-y-4">
            {/* Order summary by store */}
            <div className="space-y-3">
              {Object.entries(storeGroups).map(([storeId, storeItems]) => {
                const storeName = storeItems[0]?.product?.business?.business_name || "Store";
                return (
                  <div key={storeId} className="rounded-2xl bg-card border border-border p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Store className="h-4 w-4 text-primary" />
                      <h3 className="text-sm font-bold">{storeName}</h3>
                      <span className="text-[10px] text-muted-foreground ml-auto">{storeItems.length} items</span>
                    </div>
                    {storeItems.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 py-2 border-t border-border first:border-0">
                        {item.product?.image_url ? (
                          <img src={item.product.image_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center text-sm">📦</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate">{item.product?.name}</p>
                          <p className="text-[10px] text-muted-foreground">{item.quantity}x {item.product?.price} MKD</p>
                        </div>
                        <span className="text-xs font-bold">{((item.product?.price || 0) * item.quantity).toLocaleString()} MKD</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>

            {/* Delivery info */}
            <div className="rounded-2xl bg-card border border-border p-4">
              <div className="flex items-center gap-2 mb-4">
                <Truck className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold">Delivery Information</h3>
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Full Name *</Label>
                  <Input value={shipping.name} onChange={(e) => setShipping({ ...shipping, name: e.target.value })} placeholder="John Doe" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Phone Number *</Label>
                  <Input value={shipping.phone} onChange={(e) => setShipping({ ...shipping, phone: e.target.value })} placeholder="+389 7X XXX XXX" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Address *</Label>
                  <Input value={shipping.address} onChange={(e) => setShipping({ ...shipping, address: e.target.value })} placeholder="Street address" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">City *</Label>
                    <Input value={shipping.city} onChange={(e) => setShipping({ ...shipping, city: e.target.value })} placeholder="Skopje" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Postal Code</Label>
                    <Input value={shipping.postalCode} onChange={(e) => setShipping({ ...shipping, postalCode: e.target.value })} placeholder="1000" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Country *</Label>
                  <Input value={shipping.country} onChange={(e) => setShipping({ ...shipping, country: e.target.value })} placeholder="North Macedonia" />
                </div>
              </div>
            </div>

            {/* Price breakdown - Wolt style */}
            <div className="rounded-2xl bg-card border border-border p-4">
              <h3 className="text-sm font-bold mb-3">Price Breakdown</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Subtotal ({itemCount} items)</span>
                  <span className="font-semibold">{totalPrice.toLocaleString()} MKD</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Delivery fee</span>
                  <span className="font-semibold">{DELIVERY_FEE.toLocaleString()} MKD</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Platform fee</span>
                  <span className="font-semibold">{platformFee.toLocaleString()} MKD</span>
                </div>
                <div className="border-t border-border pt-2 flex justify-between">
                  <span className="text-sm font-bold">Total</span>
                  <span className="text-lg font-extrabold text-primary">{grandTotal.toLocaleString()} MKD</span>
                </div>
              </div>
            </div>

            {/* Slide to pay */}
            <SlideToPayButton
              amount={grandTotal}
              disabled={!canPay}
              onConfirm={handlePlaceOrder}
            />

            {!canPay && (
              <p className="text-xs text-muted-foreground text-center">
                Fill in all required delivery fields to pay
              </p>
            )}
          </div>
        )}

        {step === "confirmed" && (
          <div className="px-4 py-12 text-center space-y-4">
            <div className="flex justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <CheckCircle2 className="h-10 w-10 text-primary" />
              </div>
            </div>
            <h2 className="font-display text-xl font-extrabold">Order Confirmed! 🎉</h2>
            <p className="text-sm text-muted-foreground">Your order has been placed. The stores will prepare your items for delivery.</p>
            {orderId && (
              <div className="rounded-2xl bg-card border border-border p-4 text-left space-y-2">
                <p className="text-xs text-muted-foreground">Order ID</p>
                <p className="text-sm font-bold font-mono">#{orderId.slice(0, 8).toUpperCase()}</p>
                <p className="text-xs text-muted-foreground">Total paid</p>
                <p className="text-sm font-bold text-primary">{grandTotal.toLocaleString()} MKD</p>
                <p className="text-xs text-muted-foreground">Estimated delivery</p>
                <p className="text-sm font-bold">2-5 business days</p>
              </div>
            )}
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => navigate("/orders")}
                className="flex-1 rounded-xl petkeep-gradient text-primary-foreground py-3 text-xs font-bold"
              >
                View My Orders
              </button>
              <button
                onClick={() => navigate("/marketplace")}
                className="flex-1 rounded-xl bg-secondary text-secondary-foreground py-3 text-xs font-bold"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default CheckoutPage;
