import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Heart, MessageCircle, ShoppingBag, CalendarCheck, PawPrint, MapPin, Shield, Bell, X } from "lucide-react";

const AVAILABLE_TYPES = ["Social", "Messages", "Orders", "Bookings", "PetMatch", "Tracking", "System"];

interface CustomFilter {
  name: string;
  types: string[];
}

type NotifKey =
  | "push_booking_request" | "push_booking_confirmation" | "push_new_message"
  | "push_payment_received" | "push_new_review" | "push_promotions"
  | "email_booking_request" | "email_booking_confirmation" | "email_new_message"
  | "email_payment_received" | "email_new_review" | "email_promotions"
  | "sms_enabled";

const pushItems: { key: NotifKey; label: string; icon: React.ReactNode }[] = [
  { key: "push_new_message", label: "Messages", icon: <MessageCircle className="h-4 w-4 text-primary" /> },
  { key: "push_booking_request", label: "Booking requests", icon: <CalendarCheck className="h-4 w-4 text-petkeep-mint" /> },
  { key: "push_booking_confirmation", label: "Booking updates", icon: <CalendarCheck className="h-4 w-4 text-petkeep-mint" /> },
  { key: "push_payment_received", label: "Payments & orders", icon: <ShoppingBag className="h-4 w-4 text-accent" /> },
  { key: "push_new_review", label: "Reviews & ratings", icon: <Heart className="h-4 w-4 text-primary" /> },
  { key: "push_promotions", label: "Promotions & tips", icon: <Bell className="h-4 w-4 text-muted-foreground" /> },
];

const emailItems: { key: NotifKey; label: string; icon: React.ReactNode }[] = [
  { key: "email_new_message", label: "Messages", icon: <MessageCircle className="h-4 w-4 text-primary" /> },
  { key: "email_booking_request", label: "Booking requests", icon: <CalendarCheck className="h-4 w-4 text-petkeep-mint" /> },
  { key: "email_booking_confirmation", label: "Booking updates", icon: <CalendarCheck className="h-4 w-4 text-petkeep-mint" /> },
  { key: "email_payment_received", label: "Payments & orders", icon: <ShoppingBag className="h-4 w-4 text-accent" /> },
  { key: "email_new_review", label: "Reviews & ratings", icon: <Heart className="h-4 w-4 text-primary" /> },
  { key: "email_promotions", label: "Promotions & tips", icon: <Bell className="h-4 w-4 text-muted-foreground" /> },
];

const SettingsNotifications = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<Record<NotifKey, boolean>>({
    push_booking_request: true, push_booking_confirmation: true, push_new_message: true,
    push_payment_received: true, push_new_review: true, push_promotions: false,
    email_booking_request: true, email_booking_confirmation: true, email_new_message: true,
    email_payment_received: true, email_new_review: true, email_promotions: false,
    sms_enabled: false,
  });

  useEffect(() => {
    if (!user) return;
    supabase.from("notification_preferences").select("*").eq("user_id", user.id).single()
      .then(({ data }) => {
        if (data) {
          const mapped: Record<string, boolean> = {};
          for (const key of Object.keys(prefs)) {
            mapped[key] = (data as any)[key] ?? prefs[key as NotifKey];
          }
          setPrefs(mapped as any);
        }
      });
  }, [user]);

  const toggle = async (key: NotifKey, val: boolean) => {
    if (!user) return;
    setPrefs(prev => ({ ...prev, [key]: val }));
    await supabase.from("notification_preferences").update({ [key]: val }).eq("user_id", user.id);
    toast({ title: "Preference saved" });
  };

  const Section = ({ title, emoji, items }: { title: string; emoji: string; items: { key: NotifKey; label: string; icon: React.ReactNode }[] }) => (
    <div className="rounded-2xl bg-card p-4 petkeep-card-shadow space-y-1">
      <p className="text-sm font-bold mb-2">{emoji} {title}</p>
      {items.map((item) => (
        <div key={item.key} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
          <div className="flex items-center gap-2.5">
            {item.icon}
            <span className="text-sm">{item.label}</span>
          </div>
          <Switch checked={prefs[item.key]} onCheckedChange={(v) => toggle(item.key, v)} />
        </div>
      ))}
    </div>
  );

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Quick info */}
      <div className="rounded-2xl bg-primary/5 p-3">
        <p className="text-xs text-muted-foreground text-center">
          Control what notifications you receive. Changes apply instantly.
        </p>
      </div>

      <Section title="Push Notifications" emoji="🔔" items={pushItems} />
      <Section title="Email Notifications" emoji="📧" items={emailItems} />

      {/* Safety Alerts - always prominent */}
      <div className="rounded-2xl bg-card p-4 petkeep-card-shadow">
        <div className="flex items-center gap-2.5 mb-3">
          <MapPin className="h-4 w-4 text-destructive" />
          <p className="text-sm font-bold">🚨 Safety Alerts</p>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Safe zone exit/return alerts for FindMyPet are always enabled for your pet's safety.
        </p>
        <div className="flex items-center justify-between py-2">
          <span className="text-sm">Safety alerts</span>
          <Switch checked={true} disabled />
        </div>
      </div>

      {/* Custom Notification Filters */}
      <div className="rounded-2xl bg-card p-4 petkeep-card-shadow space-y-3">
        <div>
          <p className="text-sm font-bold">🎛️ Custom Notification Filters</p>
          <p className="text-xs text-muted-foreground mt-0.5">Create custom filter pills for your notifications page</p>
        </div>

        {customFilters.map((filter, idx) => (
          <div key={idx} className="flex items-center justify-between rounded-xl border border-border p-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">{filter.name}</p>
              <p className="text-[10px] text-muted-foreground truncate">{filter.types.join(", ")}</p>
            </div>
            <button
              onClick={() => removeCustomFilter(idx)}
              className="ml-2 shrink-0 rounded-full p-1.5 text-destructive hover:bg-destructive/10"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}

        {showAddFilter ? (
          <div className="space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-3">
            <input
              type="text"
              placeholder="Filter name (e.g. Work)"
              value={newFilterName}
              onChange={(e) => setNewFilterName(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <p className="text-xs font-bold text-muted-foreground">Select types to include:</p>
            <div className="flex flex-wrap gap-1.5">
              {AVAILABLE_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setNewFilterTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])}
                  className={`rounded-full px-2.5 py-1 text-[10px] font-bold transition-all ${
                    newFilterTypes.includes(t)
                      ? "petkeep-gradient text-primary-foreground"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={addCustomFilter}
                disabled={!newFilterName.trim() || newFilterTypes.length === 0}
                className="flex-1 rounded-lg petkeep-gradient px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50"
              >
                Save Filter
              </button>
              <button
                onClick={() => { setShowAddFilter(false); setNewFilterName(""); setNewFilterTypes([]); }}
                className="rounded-lg bg-secondary px-3 py-2 text-xs font-bold text-muted-foreground"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddFilter(true)}
            className="w-full rounded-xl border-2 border-dashed border-border py-3 text-xs font-bold text-muted-foreground hover:border-primary/30 hover:text-primary transition-colors"
          >
            + Create Custom Filter
          </button>
        )}
      </div>
    </div>
  );
};

export default SettingsNotifications;
