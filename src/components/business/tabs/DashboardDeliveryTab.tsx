import { useState } from "react";
import { Truck, MapPin, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import type { BusinessProfile } from "@/hooks/useBusiness";
import AddressSearchMap from "@/components/business/AddressSearchMap";

interface Props {
  business: BusinessProfile & {
    delivery_available?: boolean;
    pickup_available?: boolean;
    delivery_radius_km?: number | null;
    delivery_fee?: number;
    free_delivery_above?: number | null;
    latitude?: number | null;
    longitude?: number | null;
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
    latitude: business.latitude ?? null as number | null,
    longitude: business.longitude ?? null as number | null,
  });

  const handleLocationChange = (lat: number, lng: number, address?: string) => {
    setForm((f) => ({ ...f, latitude: lat, longitude: lng }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate({
        delivery_available: form.delivery_available,
        pickup_available: form.pickup_available,
        delivery_radius_km: form.delivery_radius_km ? Number(form.delivery_radius_km) : null,
        delivery_fee: Number(form.delivery_fee) || 0,
        free_delivery_above: form.free_delivery_above ? Number(form.free_delivery_above) : null,
        latitude: form.latitude,
        longitude: form.longitude,
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

        {/* Store Location with Address Search & Map */}
        <div className="pt-2 border-t border-border">
          <h4 className="text-xs font-bold flex items-center gap-2 mb-2"><MapPin className="h-3.5 w-3.5 text-primary" /> Store Location</h4>
          <p className="text-[10px] text-muted-foreground mb-2">Search your address or tap the map to set your store location</p>
          <AddressSearchMap
            latitude={form.latitude}
            longitude={form.longitude}
            onLocationChange={handleLocationChange}
          />
        </div>

        {form.delivery_available && (
          <>
            <div className="space-y-2">
              <Label className="text-xs">Delivery Radius (km)</Label>
              <Input type="number" value={form.delivery_radius_km} onChange={(e) => setForm({ ...form, delivery_radius_km: e.target.value })} placeholder="10" min="1" />
              <p className="text-[10px] text-muted-foreground">Only users within this radius will see your products</p>
            </div>

            <div className="rounded-xl bg-secondary/50 border border-border p-3">
              <p className="text-xs font-bold">Delivery Fee: 120 MKD</p>
              <p className="text-[10px] text-muted-foreground mt-1">A flat platform-wide delivery fee is charged to customers at checkout. Stores cannot change this.</p>
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
