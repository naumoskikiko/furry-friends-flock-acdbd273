import { useState } from "react";
import { Truck, MapPin, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import type { BusinessProfile } from "@/hooks/useBusiness";

interface Props {
  business: BusinessProfile & {
    delivery_available?: boolean;
    pickup_available?: boolean;
    delivery_radius_km?: number | null;
    delivery_fee?: number;
    free_delivery_above?: number | null;
  };
  onUpdate: (updates: any) => Promise<void>;
}

const DashboardDeliveryTab = ({ business, onUpdate }: Props) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    delivery_available: business.delivery_available ?? false,
    pickup_available: business.pickup_available ?? true,
    delivery_radius_km: business.delivery_radius_km ?? "",
    delivery_fee: business.delivery_fee ?? 0,
    free_delivery_above: business.free_delivery_above ?? "",
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate({
        delivery_available: form.delivery_available,
        pickup_available: form.pickup_available,
        delivery_radius_km: form.delivery_radius_km ? Number(form.delivery_radius_km) : null,
        delivery_fee: Number(form.delivery_fee) || 0,
        free_delivery_above: form.free_delivery_above ? Number(form.free_delivery_above) : null,
      });
      toast({ title: "Delivery settings saved!" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-card border border-border p-4 space-y-4">
        <h3 className="text-sm font-bold flex items-center gap-2"><Truck className="h-4 w-4 text-primary" /> Delivery Options</h3>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold">Delivery Available</p>
            <p className="text-[10px] text-muted-foreground">Enable delivery for this store</p>
          </div>
          <Switch checked={form.delivery_available} onCheckedChange={(v) => setForm({ ...form, delivery_available: v })} />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold">Pickup Available</p>
            <p className="text-[10px] text-muted-foreground">Customers can pick up in store</p>
          </div>
          <Switch checked={form.pickup_available} onCheckedChange={(v) => setForm({ ...form, pickup_available: v })} />
        </div>

        {form.delivery_available && (
          <>
            <div className="space-y-2">
              <Label className="text-xs">Delivery Radius (km)</Label>
              <Input type="number" value={form.delivery_radius_km} onChange={(e) => setForm({ ...form, delivery_radius_km: e.target.value })} placeholder="10" min="1" />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Delivery Fee (MKD)</Label>
              <Input type="number" value={form.delivery_fee} onChange={(e) => setForm({ ...form, delivery_fee: e.target.value as any })} placeholder="120" min="0" />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Free Delivery Above (MKD)</Label>
              <Input type="number" value={form.free_delivery_above} onChange={(e) => setForm({ ...form, free_delivery_above: e.target.value })} placeholder="Leave empty for no free delivery" min="0" />
              <p className="text-[10px] text-muted-foreground">Orders above this amount get free delivery</p>
            </div>
          </>
        )}
      </div>

      <Button onClick={handleSave} className="w-full petkeep-gradient text-primary-foreground font-bold" disabled={saving}>
        <Save className="h-3.5 w-3.5 mr-1.5" /> {saving ? "Saving..." : "Save Delivery Settings"}
      </Button>
    </div>
  );
};

export default DashboardDeliveryTab;
