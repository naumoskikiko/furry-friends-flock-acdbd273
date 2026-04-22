import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import AppLayout from "@/components/AppLayout";
import { ArrowLeft, CheckCircle2, Truck, Store, CreditCard, Tag, X, Coins, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useCart } from "@/hooks/useCart";
import { useCreateOrder, type ShippingInfo } from "@/hooks/useOrders";
import { useApplyCoupon } from "@/hooks/useCoupons";
import { useToast } from "@/hooks/use-toast";
import { useCredits } from "@/hooks/useCredits";
import SlideToPayButton from "@/components/marketplace/SlideToPayButton";

import ProductImage from "@/components/marketplace/ProductImage";
import { useUserLocation } from "@/hooks/useUserLocation";
import { canDeliver, getDeliveryDistance, formatDistance } from "@/lib/deliveryRadius";

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
  const { applyCoupon, incrementUsage, applying } = useApplyCoupon();
  
  const { balance: creditBalance, applyCreditsToPayment } = useCredits();
  const { location: userLocation, requestLocation, PermissionDialog: LocationPermissionDialog } = useUserLocation();

  useEffect(() => { requestLocation(); }, [requestLocation]);

  const [step, setStep] = useState<"checkout" | "confirmed">("checkout");
  const [shipping, setShipping] = useState<ShippingInfo>({
    name: "", phone: "", address: "", city: "", postalCode: "", country: "",
  });
  const [orderId, setOrderId] = useState<string | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [cardForm, setCardForm] = useState({
    cardNumber: "", expiry: "", cvv: "", cardholderName: "",
  });

  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ coupon: any; discount: number } | null>(null);
  const [couponError, setCouponError] = useState("");
  const [useCreditsToggle, setUseCreditsToggle] = useState(true);

  // Fixed flat delivery fee across the platform
  const deliveryFee = 120;
  const cartBusiness = items[0]?.product?.business as any;

  // Delivery radius validation
  const deliveryBlocked = useMemo(() => {
    if (!cartBusiness) return false;
    const biz = cartBusiness as any;
    if (!biz.latitude || !biz.longitude || !biz.delivery_radius_km) return false;
    if (!userLocation) return false;
    return !canDeliver(userLocation.lat, userLocation.lng, biz.latitude, biz.longitude, biz.delivery_radius_km);
  }, [cartBusiness, userLocation]);

  const deliveryDistance = useMemo(() => {
    if (!cartBusiness) return null;
    const biz = cartBusiness as any;
    return getDeliveryDistance(userLocation?.lat, userLocation?.lng, biz.latitude, biz.longitude);
  }, [cartBusiness, userLocation]);

  // Platform fee is deducted server-side, not shown to users
  const discount = appliedCoupon?.discount || 0;
  const subtotalAfterDiscount = Math.max(0, totalPrice + deliveryFee - discount);
  const maxCreditsAllowed = Math.floor(totalPrice * 0.04 * 100) / 100; // 4% of product subtotal
  const creditsApplied = useCreditsToggle ? Math.min(creditBalance, maxCreditsAllowed, subtotalAfterDiscount) : 0;
  const grandTotal = Math.max(0, subtotalAfterDiscount - creditsApplied);

  const shippingValid = useMemo(() => shippingSchema.safeParse(shipping).success, [shipping]);
  const cardValid = useMemo(() => cardSchema.safeParse({
    cardNumber: cardForm.cardNumber.replace(/\s+/g, ""),
    expiry: cardForm.expiry,
    cvv: cardForm.cvv,
    cardholderName: cardForm.cardholderName,
  }).success, [cardForm]);

  const canPay = shippingValid && cardValid && items.length > 0;

  const storeGroups = items.reduce<Record<string, typeof items>>((acc, item) => {
    const storeId = item.product?.business_id || "unknown";
    if (!acc[storeId]) acc[storeId] = [];
    acc[storeId].push(item);
    return acc;
  }, {});

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponError("");
    // Try applying coupon to each store
    const storeIds = Object.keys(storeGroups);
    for (const storeId of storeIds) {
      try {
        const storeTotal = storeGroups[storeId].reduce((s, i) => s + (i.product?.price || 0) * i.quantity, 0);
        const result = await applyCoupon(couponCode, storeId, storeTotal);
        setAppliedCoupon(result);
        toast({ title: "Coupon applied!", description: `You saved ${result.discount} MKD` });
        return;
      } catch {
        // Try next store
      }
    }
    setCouponError("Invalid coupon code");
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError("");
  };

  const simulateCardCharge = async () => {
    await new Promise((resolve) => setTimeout(resolve, 650));
  };

  const handlePlaceOrder = async () => {
    if (deliveryBlocked) {
      toast({ title: "Delivery unavailable", description: "This business does not deliver to your location", variant: "destructive" });
      throw new Error("Outside delivery radius");
    }

    if (!shippingValid) {
      const message = shippingSchema.safeParse(shipping);
      const firstIssue = message.success ? "Enter valid shipping details" : message.error.issues[0]?.message;
      toast({ title: "Missing details", description: firstIssue, variant: "destructive" });
      throw new Error(firstIssue);
    }

    setProcessingPayment(true);
    try {
      // Validate card details freshly entered for this checkout
      const parsedCard = cardSchema.safeParse({
        cardNumber: cardForm.cardNumber.replace(/\s+/g, ""),
        expiry: cardForm.expiry,
        cvv: cardForm.cvv,
        cardholderName: cardForm.cardholderName,
      });
      if (!parsedCard.success) {
        throw new Error(parsedCard.error.issues[0]?.message || "Enter valid card details");
      }

      // Tokenize + charge via payment provider (simulated). Card details are NEVER persisted.
      await simulateCardCharge();

      const cartItems = items.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.product?.price || 0,
        business_id: item.product?.business_id || "",
      }));

      const round2 = (n: number) => Math.round(n * 100) / 100;
      if (import.meta.env.DEV) {
        console.log("[checkout] paying", { subtotal: totalPrice, deliveryFee, discount, creditsApplied, grandTotal });
      }

      const id = await createOrder(cartItems, shipping, {
        subtotal: round2(totalPrice),
        deliveryFee: round2(deliveryFee),
        discount: round2(discount),
        creditsUsed: round2(creditsApplied),
        totalPaid: round2(grandTotal),
      });
      
      // Apply credits discount
      if (creditsApplied > 0) {
        await applyCreditsToPayment(creditsApplied);
      }

      // Increment coupon usage
      if (appliedCoupon?.coupon) {
        await incrementUsage(appliedCoupon.coupon.id, appliedCoupon.coupon.used_count);
      }

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

  if (cartLoading) {
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
            {deliveryBlocked && (
              <div className="rounded-2xl bg-destructive/10 border border-destructive/20 p-4 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-destructive">Delivery unavailable</p>
                  <p className="text-xs text-muted-foreground mt-0.5">This business does not deliver to your location. You are {deliveryDistance != null ? formatDistance(deliveryDistance) : "too far"} away.</p>
                </div>
              </div>
            )}
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
                        <ProductImage src={item.product?.image_url} alt={item.product?.name || ""} size="sm" aspectRatio="square" className="rounded-lg" />
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

            {/* Coupon Code */}
            <div className="rounded-2xl bg-card border border-border p-4">
              <div className="flex items-center gap-2 mb-3">
                <Tag className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold">Promo Code</h3>
              </div>
              {appliedCoupon ? (
                <div className="flex items-center justify-between rounded-xl bg-primary/5 border border-primary/20 p-3">
                  <div>
                    <p className="text-xs font-bold text-primary">{appliedCoupon.coupon.code}</p>
                    <p className="text-[10px] text-muted-foreground">-{appliedCoupon.discount} MKD saved</p>
                  </div>
                  <button onClick={removeCoupon} className="rounded-full p-1 hover:bg-secondary">
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input value={couponCode} onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(""); }}
                    placeholder="Enter promo code" className="text-xs" />
                  <Button variant="outline" size="sm" onClick={handleApplyCoupon} disabled={applying || !couponCode.trim()} className="text-xs font-bold shrink-0">
                    {applying ? "..." : "Apply"}
                  </Button>
                </div>
              )}
              {couponError && <p className="text-[10px] text-destructive mt-1">{couponError}</p>}
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

            {/* Payment method — manual entry only, never saved */}
            <div className="rounded-2xl bg-card border border-border p-4">
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold">Payment Method</h3>
              </div>
              <form autoComplete="off" onSubmit={(e) => e.preventDefault()} className="space-y-3">
                <p className="text-[10px] text-muted-foreground">Enter your card details — they are not saved.</p>
                {/* Hidden dummy fields to discourage browser autofill */}
                <input type="text" name="prevent_autofill" autoComplete="off" className="hidden" />
                <input type="password" name="password_fake" autoComplete="new-password" className="hidden" />
                <div className="space-y-1.5">
                  <Label className="text-xs">Card number</Label>
                  <Input
                    inputMode="numeric"
                    autoComplete="off"
                    name="cc-number-nosave"
                    data-lpignore="true"
                    data-form-type="other"
                    value={cardForm.cardNumber}
                    onChange={(e) => setCardForm((p) => ({ ...p, cardNumber: e.target.value.replace(/[^\d\s]/g, "") }))}
                    placeholder="1234 5678 9012 3456"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Expiration</Label>
                    <Input
                      autoComplete="off"
                      name="cc-exp-nosave"
                      data-lpignore="true"
                      data-form-type="other"
                      value={cardForm.expiry}
                      onChange={(e) => setCardForm((p) => ({ ...p, expiry: e.target.value.replace(/[^\d/]/g, "") }))}
                      placeholder="MM/YY"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">CVV</Label>
                    <Input
                      inputMode="numeric"
                      autoComplete="off"
                      name="cc-csc-nosave"
                      data-lpignore="true"
                      data-form-type="other"
                      type="password"
                      value={cardForm.cvv}
                      onChange={(e) => setCardForm((p) => ({ ...p, cvv: e.target.value.replace(/\D/g, "") }))}
                      placeholder="123"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Card holder name</Label>
                  <Input
                    autoComplete="off"
                    name="cc-name-nosave"
                    data-lpignore="true"
                    data-form-type="other"
                    value={cardForm.cardholderName}
                    onChange={(e) => setCardForm((p) => ({ ...p, cardholderName: e.target.value }))}
                    placeholder="Card holder name"
                  />
                </div>
              </form>
            </div>

            {/* Credits */}
            {creditBalance > 0 && (
              <div className="rounded-2xl bg-card border border-border p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Coins className="h-4 w-4 text-primary" />
                    <div>
                      <h3 className="text-sm font-bold">Use PetKeep Credits</h3>
                      <p className="text-[10px] text-muted-foreground">Balance: {creditBalance.toFixed(2)} credits · Max usable: {maxCreditsAllowed.toFixed(2)} (4% limit)</p>
                    </div>
                  </div>
                  <Switch checked={useCreditsToggle} onCheckedChange={setUseCreditsToggle} />
                </div>
                {useCreditsToggle && creditsApplied > 0 && (
                  <p className="text-xs text-primary font-semibold mt-2">-{creditsApplied.toFixed(2)} MKD will be deducted (up to 4% of order)</p>
                )}
              </div>
            )}

            {/* Price breakdown */}
            <div className="rounded-2xl bg-card border border-border p-4">
              <h3 className="text-sm font-bold mb-3">Price Breakdown</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Subtotal ({itemCount} items)</span>
                  <span className="font-semibold">{totalPrice.toLocaleString()} MKD</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">
                    Delivery fee
                    {deliveryDistance != null && <span className="ml-1">({formatDistance(deliveryDistance)})</span>}
                  </span>
                  <span className="font-semibold">{deliveryFee.toLocaleString()} MKD</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-primary font-bold">Coupon Discount</span>
                    <span className="font-bold text-primary">-{discount.toLocaleString()} MKD</span>
                  </div>
                )}
                {creditsApplied > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-primary font-bold flex items-center gap-1"><Coins className="h-3 w-3" /> Credits Applied</span>
                    <span className="font-bold text-primary">-{creditsApplied.toFixed(2)} MKD</span>
                  </div>
                )}
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
              <SlideToPayButton amount={grandTotal} disabled={processingPayment || items.length === 0} onConfirm={handlePlaceOrder} />
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
                {discount > 0 && (
                  <>
                    <p className="text-xs text-muted-foreground">Discount applied</p>
                    <p className="text-sm font-bold text-primary">-{discount.toLocaleString()} MKD</p>
                  </>
                )}
                <p className="text-xs text-muted-foreground">Estimated delivery</p>
                <p className="text-sm font-bold">2-5 business days</p>
              </div>
            )}
            <div className="flex gap-3 pt-4">
              <button onClick={() => navigate("/orders")} className="flex-1 rounded-xl petkeep-gradient text-primary-foreground py-3 text-xs font-bold">
                View My Orders
              </button>
              <button onClick={() => navigate("/marketplace")} className="flex-1 rounded-xl bg-secondary text-secondary-foreground py-3 text-xs font-bold">
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
