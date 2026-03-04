import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { UserX, Download } from "lucide-react";

const SettingsPrivacy = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    private_account: false,
    show_in_search: true,
    show_rating_publicly: true,
    messaging_access: "everyone",
    show_activity_status: true,
  });
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("user_settings").select("private_account, show_in_search, show_rating_publicly, messaging_access, show_activity_status").eq("user_id", user.id).single()
      .then(({ data }) => { if (data) setSettings(data as any); });
    supabase.from("blocked_users").select("*").eq("blocker_id", user.id)
      .then(({ data }) => setBlockedUsers(data || []));
  }, [user]);

  const updateSetting = async (key: string, value: any) => {
    if (!user) return;
    setSettings(prev => ({ ...prev, [key]: value }));
    await supabase.from("user_settings").update({ [key]: value }).eq("user_id", user.id);
    toast({ title: "Setting saved" });
  };

  const unblock = async (id: string) => {
    await supabase.from("blocked_users").delete().eq("id", id);
    setBlockedUsers(prev => prev.filter(b => b.id !== id));
    toast({ title: "User unblocked" });
  };

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="rounded-2xl bg-card p-4 petkeep-card-shadow space-y-1">
        {[
          { key: "private_account", label: "Private Account", desc: "Only approved followers can see your content" },
          { key: "show_in_search", label: "Show in Search", desc: "Allow your profile to appear in search results" },
          { key: "show_rating_publicly", label: "Show Rating Publicly", desc: "Display your rating on your profile" },
          { key: "show_activity_status", label: "Activity Status", desc: "Show when you're online" },
        ].map(item => (
          <div key={item.key} className="flex items-center justify-between py-3 border-b border-border last:border-0">
            <div>
              <p className="text-sm font-semibold">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
            <Switch checked={(settings as any)[item.key]} onCheckedChange={(v) => updateSetting(item.key, v)} />
          </div>
        ))}
      </div>

      {/* Messaging Access */}
      <div className="rounded-2xl bg-card p-4 petkeep-card-shadow">
        <p className="text-sm font-bold mb-2">Who can message you</p>
        {["everyone", "booked_only"].map(opt => (
          <button
            key={opt}
            onClick={() => updateSetting("messaging_access", opt)}
            className={`w-full text-left px-3 py-2.5 rounded-xl mb-1 text-sm transition-colors ${
              settings.messaging_access === opt ? "bg-primary/10 font-semibold text-primary" : "hover:bg-secondary"
            }`}
          >
            {opt === "everyone" ? "Everyone" : "Only booked users"}
          </button>
        ))}
      </div>

      {/* Blocked Users */}
      <div className="rounded-2xl bg-card p-4 petkeep-card-shadow space-y-3">
        <p className="text-sm font-bold flex items-center gap-2"><UserX className="h-4 w-4" /> Blocked Users</p>
        {blockedUsers.length === 0 ? (
          <p className="text-xs text-muted-foreground">No blocked users</p>
        ) : (
          blockedUsers.map(b => (
            <div key={b.id} className="flex items-center justify-between py-2">
              <span className="text-sm">{b.blocked_id.slice(0, 8)}...</span>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => unblock(b.id)}>Unblock</Button>
            </div>
          ))
        )}
      </div>

      {/* Download Data */}
      <Button variant="outline" className="w-full" onClick={() => toast({ title: "Data download requested", description: "You'll receive an email with your data export." })}>
        <Download className="h-4 w-4 mr-2" /> Download My Data (GDPR)
      </Button>
    </div>
  );
};

export default SettingsPrivacy;
