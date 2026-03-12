import { useState } from "react";
import { Plus, Trash2, X, Tag, Percent, DollarSign, Calendar, Hash } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useCoupons, type Coupon } from "@/hooks/useCoupons";
import { useToast } from "@/hooks/use-toast";

interface Props {
  businessId: string;
}

const DashboardCouponsTab = ({ businessId }: Props) => {
  const { coupons, addCoupon, updateCoupon, deleteCoupon } = useCoupons(businessId);
  const { toast } = useToast();
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [minOrder, setMinOrder] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const reset = () => {
    setCode(""); setDiscountType("percentage"); setDiscountValue(""); setMinOrder(""); setMaxUses(""); setExpiresAt("");
    setAdding(false);
  };

  const handleSave = async () => {
    if (!code.trim() || !discountValue) return;
    setSaving(true);
    try {
      await addCoupon({
        code: code.toUpperCase().trim(),
        discount_type: discountType,
        discount_value: parseFloat(discountValue),
        min_order_amount: minOrder ? parseFloat(minOrder) : 0,
        max_uses: maxUses ? parseInt(maxUses) : null,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      });
      toast({ title: "Coupon created!" });
      reset();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const handleToggle = async (coupon: Coupon) => {
    try {
      await updateCoupon(coupon.id, { is_active: !coupon.is_active });
      toast({ title: coupon.is_active ? "Coupon deactivated" : "Coupon activated" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCoupon(id);
      toast({ title: "Coupon deleted" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-3">
      {!adding ? (
        <button onClick={() => setAdding(true)}
          className="w-full rounded-xl border-2 border-dashed border-border py-4 text-sm font-bold text-primary hover:bg-secondary/30 transition-colors flex items-center justify-center gap-2">
          <Plus className="h-4 w-4" /> Create Coupon
        </button>
      ) : (
        <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold">New Coupon</h3>
            <button onClick={reset} className="rounded-full p-1 hover:bg-secondary"><X className="h-4 w-4" /></button>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Coupon Code *</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="PET10" />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Discount Type</Label>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setDiscountType("percentage")}
                className={`rounded-xl border-2 p-2.5 text-xs font-bold flex items-center gap-1.5 ${discountType === "percentage" ? "border-primary bg-primary/5" : "border-border"}`}>
                <Percent className="h-3.5 w-3.5" /> Percentage
              </button>
              <button onClick={() => setDiscountType("fixed")}
                className={`rounded-xl border-2 p-2.5 text-xs font-bold flex items-center gap-1.5 ${discountType === "fixed" ? "border-primary bg-primary/5" : "border-border"}`}>
                <DollarSign className="h-3.5 w-3.5" /> Fixed Amount
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs">Discount Value *</Label>
              <Input type="number" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)}
                placeholder={discountType === "percentage" ? "10" : "100"} min="0" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Min Order (MKD)</Label>
              <Input type="number" value={minOrder} onChange={(e) => setMinOrder(e.target.value)} placeholder="0" min="0" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs">Max Uses</Label>
              <Input type="number" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} placeholder="∞" min="1" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Expires</Label>
              <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} className="flex-1 petkeep-gradient text-primary-foreground font-bold" disabled={saving || !code.trim() || !discountValue}>
              {saving ? "Creating..." : "Create Coupon"}
            </Button>
            <Button variant="outline" onClick={reset}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Coupon list */}
      {coupons.map((c) => {
        const expired = c.expires_at && new Date(c.expires_at) < new Date();
        const maxedOut = c.max_uses !== null && c.used_count >= c.max_uses;
        return (
          <div key={c.id} className={`rounded-2xl bg-card border border-border p-3 ${!c.is_active || expired || maxedOut ? "opacity-60" : ""}`}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                <Tag className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold font-mono">{c.code}</p>
                  {!c.is_active && <span className="text-[8px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full font-bold">Inactive</span>}
                  {expired && <span className="text-[8px] bg-destructive/10 text-destructive px-1.5 py-0.5 rounded-full font-bold">Expired</span>}
                </div>
                <p className="text-xs text-muted-foreground">
                  {c.discount_type === "percentage" ? `${c.discount_value}% off` : `${c.discount_value} MKD off`}
                  {c.min_order_amount > 0 && ` · Min ${c.min_order_amount} MKD`}
                </p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Hash className="h-2.5 w-2.5" /> {c.used_count}{c.max_uses ? `/${c.max_uses}` : ""} used
                  </span>
                  {c.expires_at && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-2.5 w-2.5" /> {new Date(c.expires_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-1.5 mt-2 pt-2 border-t border-border">
              <button onClick={() => handleToggle(c)} className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-bold bg-secondary hover:bg-secondary/80">
                {c.is_active ? "Deactivate" : "Activate"}
              </button>
              <button onClick={() => handleDelete(c.id)} className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-bold hover:bg-destructive/10 text-muted-foreground hover:text-destructive ml-auto">
                <Trash2 className="h-3 w-3" /> Delete
              </button>
            </div>
          </div>
        );
      })}

      {coupons.length === 0 && !adding && (
        <div className="text-center py-8">
          <span className="text-3xl">🏷️</span>
          <p className="text-sm font-semibold mt-2">No coupons yet</p>
          <p className="text-xs text-muted-foreground">Create coupons to boost sales</p>
        </div>
      )}
    </div>
  );
};

export default DashboardCouponsTab;
