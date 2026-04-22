import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Heart, MessageCircle, ShoppingBag, CalendarCheck, PawPrint, MapPin, Shield, Bell, BellOff, Pill } from "lucide-react";
import { Button } from "@/components/ui/button";

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

  // Custom filter pills
  const STORAGE_KEY = "petkeep_custom_notif_filters";
  const [customFilters, setCustomFilters] = useState<CustomFilter[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
  });
  const [showAddFilter, setShowAddFilter] = useState(false);
  const [newFilterName, setNewFilterName] = useState("");
  const [newFilterTypes, setNewFilterTypes] = useState<string[]>([]);

  const saveFilters = (filters: CustomFilter[]) => {
    setCustomFilters(filters);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  };

  const addCustomFilter = () => {
    if (!newFilterName.trim() || newFilterTypes.length === 0) return;
    saveFilters([...customFilters, { name: newFilterName.trim(), types: newFilterTypes }]);
    setNewFilterName("");
    setNewFilterTypes([]);
    setShowAddFilter(false);
    toast({ title: "Custom filter created!" });
  };

  const removeCustomFilter = (idx: number) => {
    saveFilters(customFilters.filter((_, i) => i !== idx));
    toast({ title: "Filter removed" });
  };

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

  const { permissionStatus, enablePush, loading: pushLoading } = usePushNotifications();

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Quick info */}
      <div className="rounded-2xl bg-primary/5 p-3">
        <p className="text-xs text-muted-foreground text-center">
          Control what notifications you receive. Changes apply instantly.
        </p>
      </div>

      {/* Push Permission & Medication Reminders */}
      <div className="rounded-2xl bg-card p-4 petkeep-card-shadow space-y-3">
        <p className="text-sm font-bold">💊 Medication Reminders</p>
        <p className="text-xs text-muted-foreground">
          Get push notifications when it's time to give your pet their medication.
        </p>
        {permissionStatus !== "granted" ? (
          <Button
            variant="outline"
            size="sm"
            className="w-full h-9 text-xs font-bold"
            onClick={enablePush}
            disabled={pushLoading}
          >
            <BellOff className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            {pushLoading ? "Enabling..." : "Enable Push Notifications"}
          </Button>
        ) : (
          <div className="flex items-center gap-2 rounded-xl bg-petkeep-green/10 px-3 py-2">
            <Bell className="h-4 w-4 text-petkeep-green" />
            <span className="text-xs font-bold text-petkeep-green">Push notifications enabled</span>
          </div>
        )}
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

    </div>
  );
};

export default SettingsNotifications;
