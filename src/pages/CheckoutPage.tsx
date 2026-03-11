import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { ArrowLeft, CheckCircle2, CreditCard, Truck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCart } from "@/hooks/useCart";
import { useCreateOrder, type ShippingInfo } from "@/hooks/useOrders";
import { useToast } from "@/hooks/use-toast";

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { items, totalPrice, itemCount } = useCart();
  const { createOrder } = useCreateOrder();

  const [step, setStep] = useState<"shipping" | "payment" | "confirmed">("shipping");
  const [shipping, setShipping] = useState<ShippingInfo>({
    name: "", phone: "", address: "", city: "", postalCode: "", country: "",
  });
  const [processing, setProcessing] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  const platformFee = Math.round(totalPrice * 0.10 * 100) / 100;

  const canProceedShipping = shipping.name && shipping.phone && shipping.address && shipping.city && shipping.country;

  const handlePlaceOrder = async () => {
    setProcessing(true);
    try {
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
    } catch (e: any) {
      toast({ title: "Order failed", description: e.message, variant: "destructive" });
    }
    setProcessing(false);
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

        {/* Progress */}
        {step !== "confirmed" && (
          <div className="flex items-center gap-2 px-4 py-3">
            {["shipping", "payment"].map((s, i) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                  step === s ? "petkeep-gradient text-primary-foreground" : i === 0 && step === "payment" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                }`}>
                  {i + 1}
                </div>
                <span className={`text-xs font-semibold capitalize ${step === s ? "text-foreground" : "text-muted-foreground"}`}>{s}</span>
                {i < 1 && <div className="flex-1 h-0.5 bg-secondary rounded-full" />}
              </div>
            ))}
          </div>
        )}

        {step === "shipping" && (
          <div className="px-4 py-4 space-y-4">
            <div className="rounded-2xl bg-card border border-border p-4">
              <div className="flex items-center gap-2 mb-4">
                <Truck className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold">Shipping Information</h3>
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

            <button
              onClick={() => setStep("payment")}
              disabled={!canProceedShipping}
              className="w-full rounded-2xl petkeep-gradient text-primary-foreground py-4 text-sm font-bold disabled:opacity-50"
            >
              Continue to Payment
            </button>
          </div>
        )}

        {step === "payment" && (
          <div className="px-4 py-4 space-y-4">
            {/* Order summary */}
            <div className="rounded-2xl bg-card border border-border p-4">
              <h3 className="text-sm font-bold mb-3">Order Summary</h3>
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs text-muted-foreground">{item.quantity}x</span>
                    <span className="text-xs font-semibold truncate">{item.product?.name}</span>
                  </div>
                  <span className="text-xs font-bold">{((item.product?.price || 0) * item.quantity).toLocaleString()} MKD</span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-3 mt-1">
                <span className="text-sm font-bold">Total</span>
                <span className="text-lg font-extrabold text-primary">{totalPrice.toLocaleString()} MKD</span>
              </div>
            </div>

            {/* Shipping summary */}
            <div className="rounded-2xl bg-card border border-border p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold">Shipping to</h3>
                <button onClick={() => setStep("shipping")} className="text-xs text-primary font-bold">Edit</button>
              </div>
              <p className="text-xs text-muted-foreground">{shipping.name}</p>
              <p className="text-xs text-muted-foreground">{shipping.address}, {shipping.city}</p>
              <p className="text-xs text-muted-foreground">{shipping.postalCode} {shipping.country}</p>
            </div>

            {/* Payment method */}
            <div className="rounded-2xl bg-card border-2 border-primary p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <CreditCard className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold">Card Payment</p>
                  <p className="text-[10px] text-muted-foreground">Secure payment processing</p>
                </div>
              </div>
            </div>

            <button
              onClick={handlePlaceOrder}
              disabled={processing}
              className="w-full rounded-2xl petkeep-gradient text-primary-foreground py-4 text-sm font-bold disabled:opacity-50"
            >
              {processing ? "Processing..." : `Pay ${totalPrice.toLocaleString()} MKD`}
            </button>
          </div>
        )}

        {step === "confirmed" && (
          <div className="px-4 py-12 text-center space-y-4">
            <div className="flex justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <CheckCircle2 className="h-10 w-10 text-primary" />
              </div>
            </div>
            <h2 className="font-display text-xl font-extrabold">Order Confirmed!</h2>
            <p className="text-sm text-muted-foreground">Your order has been placed successfully. The stores will process your items.</p>
            {orderId && (
              <p className="text-xs text-muted-foreground">Order ID: {orderId.slice(0, 8).toUpperCase()}</p>
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
