import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

type NotifKey = "push_booking_request" | "push_booking_confirmation" | "push_new_message" | "push_payment_received" | "push_new_review" | "push_promotions" | "email_booking_request" | "email_booking_confirmation" | "email_new_message" | "email_payment_received" | "email_new_review" | "email_promotions" | "sms_enabled";

const pushItems: { key: NotifKey; label: string }[] = [
  { key: "push_booking_request", label: "New booking request" },
  { key: "push_booking_confirmation", label: "Booking confirmation" },
  { key: "push_new_message", label: "New message" },
  { key: "push_payment_received", label: "Payment received" },
  { key: "push_new_review", label: "New review" },
  { key: "push_promotions", label: "Promotions" },
];

const emailItems: { key: NotifKey; label: string }[] = [
  { key: "email_booking_request", label: "New booking request" },
  { key: "email_booking_confirmation", label: "Booking confirmation" },
  { key: "email_new_message", label: "New message" },
  { key: "email_payment_received", label: "Payment received" },
  { key: "email_new_review", label: "New review" },
  { key: "email_promotions", label: "Promotions" },
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

  const Section = ({ title, items }: { title: string; items: { key: NotifKey; label: string }[] }) => (
    <div className="rounded-2xl bg-card p-4 petkeep-card-shadow space-y-1">
      <p className="text-sm font-bold mb-2">{title}</p>
      {items.map((item) => (
        <div key={item.key} className="flex items-center justify-between py-2 border-b border-border last:border-0">
          <span className="text-sm">{item.label}</span>
          <Switch checked={prefs[item.key]} onCheckedChange={(v) => toggle(item.key, v)} />
        </div>
      ))}
    </div>
  );

  return (
    <div className="px-4 py-4 space-y-4">
      <Section title="🔔 Push Notifications" items={pushItems} />
      <Section title="📧 Email Notifications" items={emailItems} />
      <div className="rounded-2xl bg-card p-4 petkeep-card-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold">📱 SMS Alerts</p>
            <p className="text-xs text-muted-foreground">Receive critical alerts via SMS</p>
          </div>
          <Switch checked={prefs.sms_enabled} onCheckedChange={(v) => toggle("sms_enabled", v)} />
        </div>
      </div>
    </div>
  );
};

export default SettingsNotifications;
