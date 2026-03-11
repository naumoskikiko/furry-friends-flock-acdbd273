import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import AppLayout from "@/components/AppLayout";
import { ArrowLeft, CheckCircle2, Truck, Store, CreditCard } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCart } from "@/hooks/useCart";
import { useCreateOrder, type ShippingInfo } from "@/hooks/useOrders";
import { useToast } from "@/hooks/use-toast";
import SlideToPayButton from "@/components/marketplace/SlideToPayButton";
import { usePaymentMethods } from "@/hooks/usePaymentMethods";

const DELIVERY_FEE = 120; // MKD flat rate

const shippingSchema = z.object({
  name: z.string().trim().min(2, "Full name is required").max(100),
  phone: z.string().trim().min(6, "Phone number is required").max(30),
  address: z.string().trim().min(5, "Address is required").max(200),
  city: z.string().trim().min(2, "City is required").max(80),
  postalCode: z.string().trim().max(20),
  country: z.string().trim().min(2, "Country is required").max(80),
});

const cardSchema = z.object({
  cardNumber: z.string().trim().regex(/^\d{13,19}$/, "Enter a valid card number"),
  expiry: z.string().trim().regex(/^(0[1-9]|1[0-2])\/(\d{2})$/, "Use MM/YY"),
  cvv: z.string().trim().regex(/^\d{3,4}$/, "Enter a valid CVV"),
  cardholderName: z.string().trim().min(2, "Cardholder name is required").max(80),
});

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { items, totalPrice, itemCount, loading: cartLoading } = useCart();
  const { createOrder } = useCreateOrder();
  const { defaultMethod, saveCard, loading: paymentLoading } = usePaymentMethods();

  const [step, setStep] = useState<"checkout" | "confirmed">("checkout");
  const [shipping, setShipping] = useState<ShippingInfo>({
    name: "", phone: "", address: "", city: "", postalCode: "", country: "",
  });
  const [orderId, setOrderId] = useState<string | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [cardForm, setCardForm] = useState({
    cardNumber: "",
    expiry: "",
    cvv: "",
    cardholderName: "",
  });

  const platformFee = Math.round(totalPrice * 0.10 * 100) / 100;
  const grandTotal = totalPrice + DELIVERY_FEE;

  const shippingValid = useMemo(() => shippingSchema.safeParse(shipping).success, [shipping]);
  const hasSavedCard = !!defaultMethod;
  const cardValid = useMemo(() => hasSavedCard || cardSchema.safeParse({
    cardNumber: cardForm.cardNumber.replace(/\s+/g, ""),
    expiry: cardForm.expiry,
    cvv: cardForm.cvv,
    cardholderName: cardForm.cardholderName,
  }).success, [hasSavedCard, cardForm]);

  const canPay = shippingValid && cardValid && items.length > 0;

  // Group items by store
  const storeGroups = items.reduce<Record<string, typeof items>>((acc, item) => {
    const storeId = item.product?.business_id || "unknown";
    if (!acc[storeId]) acc[storeId] = [];
    acc[storeId].push(item);
    return acc;
  }, {});

  const simulateCardCharge = async () => {
    await new Promise((resolve) => setTimeout(resolve, 650));
  };

  const handlePlaceOrder = async () => {
    if (!shippingValid) {
      const message = shippingSchema.safeParse(shipping);
      const firstIssue = message.success ? "Enter valid shipping details" : message.error.issues[0]?.message;
      toast({ title: "Missing details", description: firstIssue, variant: "destructive" });
      throw new Error(firstIssue);
    }

    setProcessingPayment(true);
    try {
      let method = defaultMethod;

      if (!method) {
        method = await saveCard({
          cardNumber: cardForm.cardNumber,
          expiry: cardForm.expiry,
          cvv: cardForm.cvv,
          cardholderName: cardForm.cardholderName,
        });
      }

      if (!method) {
        throw new Error("Add a payment method first");
      }

      await simulateCardCharge();

      const cartItems = items.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.product?.price || 0,
        business_id: item.product?.business_id || "",
      }));

      const id = await createOrder(cartItems, shipping);
      setOrderId(id);
      setStep("confirmed");
      toast({ title: "Payment successful", description: "Your order is confirmed" });
    } catch (error: any) {
      toast({ title: "Payment failed", description: error?.message || "Try again", variant: "destructive" });
      throw error;
    } finally {
      setProcessingPayment(false);
    }
  };

  if (cartLoading || paymentLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </AppLayout>
    );
  }

  if (items.length === 0 && step !== "confirmed") {
    navigate("/cart");
    return null;
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-lg pb-56">
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
                          <img src={item.product.image_url} alt={item.product.name} className="h-10 w-10 rounded-lg object-cover" />
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center text-sm" aria-hidden="true">📦</div>
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

            {/* Payment method */}
            <div className="rounded-2xl bg-card border border-border p-4">
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold">Payment Method</h3>
              </div>

              {hasSavedCard ? (
                <div className="rounded-xl bg-secondary p-3">
                  <p className="text-xs font-semibold capitalize">{defaultMethod?.card_brand} •••• {defaultMethod?.card_last4}</p>
                  <p className="text-[10px] text-muted-foreground">Expires {String(defaultMethod?.exp_month).padStart(2, "0")}/{String(defaultMethod?.exp_year).slice(-2)} · {defaultMethod?.cardholder_name}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">Add Payment Method</p>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Card number</Label>
                    <Input
                      inputMode="numeric"
                      autoComplete="cc-number"
                      value={cardForm.cardNumber}
                      onChange={(e) => setCardForm((prev) => ({ ...prev, cardNumber: e.target.value.replace(/[^\d\s]/g, "") }))}
                      placeholder="4242 4242 4242 4242"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Expiration</Label>
                      <Input
                        autoComplete="cc-exp"
                        value={cardForm.expiry}
                        onChange={(e) => setCardForm((prev) => ({ ...prev, expiry: e.target.value.replace(/[^\d/]/g, "") }))}
                        placeholder="MM/YY"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">CVV</Label>
                      <Input
                        inputMode="numeric"
                        autoComplete="cc-csc"
                        type="password"
                        value={cardForm.cvv}
                        onChange={(e) => setCardForm((prev) => ({ ...prev, cvv: e.target.value.replace(/\D/g, "") }))}
                        placeholder="123"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Card holder name</Label>
                    <Input
                      autoComplete="cc-name"
                      value={cardForm.cardholderName}
                      onChange={(e) => setCardForm((prev) => ({ ...prev, cardholderName: e.target.value }))}
                      placeholder="Card holder name"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Price breakdown */}
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
          </div>
        )}

        {step === "checkout" && (
          <div className="fixed left-0 right-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-[60] px-4">
            <div className="mx-auto max-w-lg rounded-2xl bg-background/95 backdrop-blur-sm border border-border p-3 space-y-2">
              <SlideToPayButton
                amount={grandTotal}
                disabled={processingPayment || items.length === 0}
                onConfirm={handlePlaceOrder}
              />
              {!canPay && (
                <p className="text-[11px] text-muted-foreground text-center">
                  You can slide now — payment runs after required details are valid
                </p>
              )}
            </div>
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
