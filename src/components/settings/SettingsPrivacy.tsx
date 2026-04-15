import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { UserX, Download, Lock, MessageCircle, Shield, Loader2 } from "lucide-react";

const SettingsPrivacy = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    private_account: false,
    show_in_search: true,
    show_rating_publicly: true,
    messaging_access: "everyone",
    show_activity_status: true,
  });
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [blockedProfiles, setBlockedProfiles] = useState<Record<string, any>>({});
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("user_settings").select("private_account, show_in_search, show_rating_publicly, messaging_access, show_activity_status").eq("user_id", user.id).single()
      .then(({ data }) => { if (data) setSettings(data as any); });
    
    supabase.from("blocked_users").select("*").eq("blocker_id", user.id)
      .then(async ({ data }) => {
        setBlockedUsers(data || []);
        if (data && data.length > 0) {
          const ids = data.map(b => b.blocked_id);
          const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, username, avatar_url").in("user_id", ids);
          const map: Record<string, any> = {};
          profiles?.forEach(p => { map[p.user_id] = p; });
          setBlockedProfiles(map);
        }
      });
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

  const handleDownloadData = async () => {
    if (!user) return;
    setDownloading(true);
    try {
      const [profileRes, postsRes, petsRes, ordersRes, followersRes, followingRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id).single(),
        supabase.from("posts").select("id, caption, image_url, post_type, location, created_at").eq("user_id", user.id),
        supabase.from("pets").select("*").eq("owner_id", user.id),
        supabase.from("orders").select("id, total_price, status, created_at").eq("buyer_id", user.id),
        supabase.from("followers").select("following_id, created_at").eq("follower_id", user.id),
        supabase.from("followers").select("follower_id, created_at").eq("following_id", user.id),
      ]);

      const exportData = {
        exported_at: new Date().toISOString(),
        profile: profileRes.data,
        posts: postsRes.data || [],
        pets: petsRes.data || [],
        orders: ordersRes.data || [],
        following: followersRes.data || [],
        followers: followingRes.data || [],
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `petkeep-data-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Data exported successfully" });
    } catch (e: any) {
      toast({ title: "Export failed", description: e?.message, variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Privacy Section */}
      <div className="rounded-2xl bg-card p-4 petkeep-card-shadow space-y-1">
        <div className="flex items-center gap-2 mb-2">
          <Lock className="h-4 w-4 text-primary" />
          <p className="text-sm font-bold">{t("settings.privacy")}</p>
        </div>
        {[
          { key: "private_account", label: t("privacy.privateAccount"), desc: t("privacy.privateAccountDesc") },
          { key: "show_in_search", label: t("privacy.showInSearch"), desc: t("privacy.showInSearchDesc") },
          { key: "show_activity_status", label: t("privacy.activityStatus"), desc: t("privacy.activityStatusDesc") },
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

      {/* Communication Section */}
      <div className="rounded-2xl bg-card p-4 petkeep-card-shadow">
        <div className="flex items-center gap-2 mb-2">
          <MessageCircle className="h-4 w-4 text-primary" />
          <p className="text-sm font-bold">Communication</p>
        </div>
        <p className="text-xs text-muted-foreground mb-2">Who can message you</p>
        {["everyone", "booked_only"].map(opt => (
          <button
            key={opt}
            onClick={() => updateSetting("messaging_access", opt)}
            className={`w-full text-left px-3 py-2.5 rounded-xl mb-1 text-sm transition-colors ${
              settings.messaging_access === opt ? "bg-primary/10 font-semibold text-primary" : "hover:bg-secondary"
            }`}
          >
            {opt === "everyone" ? t("privacy.everyone") : t("privacy.followersOnly")}
          </button>
        ))}
      </div>

      {/* Blocked Users Section */}
      <div className="rounded-2xl bg-card p-4 petkeep-card-shadow space-y-3">
        <div className="flex items-center gap-2">
          <UserX className="h-4 w-4 text-destructive" />
          <p className="text-sm font-bold">Blocked Users</p>
        </div>
        {blockedUsers.length === 0 ? (
          <p className="text-xs text-muted-foreground">No blocked users</p>
        ) : (
          blockedUsers.map(b => {
            const bp = blockedProfiles[b.blocked_id];
            return (
              <div key={b.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-2.5">
                  {bp?.avatar_url ? (
                    <img src={bp.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-bold">
                      {(bp?.full_name || "U")[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold">{bp?.full_name || "User"}</p>
                    <p className="text-[10px] text-muted-foreground">@{bp?.username || b.blocked_id.slice(0, 8)}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => unblock(b.id)}>Unblock</Button>
              </div>
            );
          })
        )}
      </div>

      {/* Account / GDPR Section */}
      <div className="rounded-2xl bg-card p-4 petkeep-card-shadow space-y-3">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <p className="text-sm font-bold">Account Data</p>
        </div>
        <p className="text-xs text-muted-foreground">{t("privacy.dataExportDesc")}</p>
        <Button variant="outline" className="w-full" onClick={handleDownloadData} disabled={downloading}>
          {downloading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
          Download My Data (GDPR)
        </Button>
      </div>
    </div>
  );
};

export default SettingsPrivacy;
