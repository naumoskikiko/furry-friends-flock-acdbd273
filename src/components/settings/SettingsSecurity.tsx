import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Shield, Smartphone, Monitor, Globe } from "lucide-react";

const SettingsSecurity = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [twoFactor, setTwoFactor] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("user_settings").select("two_factor_enabled").eq("user_id", user.id).single()
      .then(({ data }) => { if (data) setTwoFactor(data.two_factor_enabled); });
  }, [user]);

  const toggleTwoFactor = async (val: boolean) => {
    if (!user) return;
    setTwoFactor(val);
    await supabase.from("user_settings").update({ two_factor_enabled: val }).eq("user_id", user.id);
    toast({ title: val ? "2FA Enabled" : "2FA Disabled", description: val ? "Your account is now more secure." : "Two-factor authentication has been turned off." });
  };

  const handleChangePassword = async () => {
    if (!user?.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Password reset email sent!" });
    }
  };

  return (
    <div className="px-4 py-4 space-y-5">
      {/* Change Password */}
      <div className="rounded-2xl bg-card p-4 petkeep-card-shadow space-y-2">
        <p className="text-sm font-bold">Change Password</p>
        <p className="text-xs text-muted-foreground">We'll send a password reset link to your email.</p>
        <Button variant="outline" size="sm" onClick={handleChangePassword} className="mt-2">
          Send Reset Link
        </Button>
      </div>

      {/* 2FA */}
      <div className="rounded-2xl bg-card p-4 petkeep-card-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold">Two-Factor Authentication</p>
            <p className="text-xs text-muted-foreground">Add extra security to your account</p>
          </div>
          <Switch checked={twoFactor} onCheckedChange={toggleTwoFactor} />
        </div>
      </div>

      {/* Login Activity */}
      <div className="rounded-2xl bg-card p-4 petkeep-card-shadow space-y-3">
        <p className="text-sm font-bold">Login Activity</p>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-petkeep-mint-light">
              <Monitor className="h-4 w-4 text-petkeep-mint" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold">Current Session</p>
              <p className="text-[10px] text-muted-foreground">This device · Active now</p>
            </div>
            <span className="h-2 w-2 rounded-full bg-petkeep-green" />
          </div>
        </div>
      </div>

      {/* Connected Accounts */}
      <div className="rounded-2xl bg-card p-4 petkeep-card-shadow space-y-3">
        <p className="text-sm font-bold">Connected Accounts</p>
        {["Google", "Apple"].map((provider) => (
          <div key={provider} className="flex items-center justify-between py-2 border-b border-border last:border-0">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{provider}</span>
            </div>
            <Button variant="outline" size="sm" className="text-xs h-7">
              Connect
            </Button>
          </div>
        ))}
      </div>

      {/* Logout Other Devices */}
      <Button variant="outline" className="w-full" onClick={() => toast({ title: "All other sessions signed out" })}>
        Logout from Other Devices
      </Button>
    </div>
  );
};

export default SettingsSecurity;
