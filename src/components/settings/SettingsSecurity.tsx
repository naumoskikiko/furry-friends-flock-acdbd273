import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Shield, Monitor, Globe, Copy, Check, Loader2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type SetupStep = "idle" | "qr" | "verify" | "backup" | "disable";

const SettingsSecurity = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [twoFactor, setTwoFactor] = useState(false);
  const [step, setStep] = useState<SetupStep>("idle");
  const [secret, setSecret] = useState("");
  const [otpauthUrl, setOtpauthUrl] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [disableCode, setDisableCode] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase.from("user_settings").select("two_factor_enabled").eq("user_id", user.id).single()
      .then(({ data }) => { if (data) setTwoFactor(data.two_factor_enabled); });
  }, [user]);

  const callTotp = async (action: string, body: Record<string, any> = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/totp`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ action, ...body }),
      }
    );
    return res.json();
  };

  const startSetup = async () => {
    setLoading(true);
    const data = await callTotp("setup");
    setLoading(false);
    if (data.error) {
      toast({ title: "Error", description: data.error, variant: "destructive" });
      return;
    }
    setSecret(data.secret);
    setOtpauthUrl(data.otpauth_url);
    setStep("qr");
  };

  const verifySetup = async () => {
    if (verifyCode.length !== 6) {
      toast({ title: "Enter 6-digit code", variant: "destructive" });
      return;
    }
    setLoading(true);
    const data = await callTotp("verify-setup", { token: verifyCode });
    setLoading(false);
    if (data.error) {
      toast({ title: "Verification failed", description: data.error, variant: "destructive" });
      return;
    }
    setBackupCodes(data.backup_codes || []);
    setTwoFactor(true);
    setStep("backup");
    toast({ title: "2FA Enabled! 🔐" });
  };

  const disable2FA = async () => {
    if (disableCode.length < 6) {
      toast({ title: "Enter your code", variant: "destructive" });
      return;
    }
    setLoading(true);
    const data = await callTotp("disable", { token: disableCode });
    setLoading(false);
    if (data.error) {
      toast({ title: "Error", description: data.error, variant: "destructive" });
      return;
    }
    setTwoFactor(false);
    setStep("idle");
    setDisableCode("");
    toast({ title: "2FA Disabled" });
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join("\n"));
    toast({ title: "Backup codes copied!" });
  };

  const handleToggle = (val: boolean) => {
    if (val) {
      startSetup();
    } else {
      setStep("disable");
    }
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
            <p className="text-xs text-muted-foreground">Use Google Authenticator for extra security</p>
          </div>
          <Switch checked={twoFactor} onCheckedChange={handleToggle} disabled={loading} />
        </div>
      </div>

      {/* Setup Dialog - QR Code */}
      <Dialog open={step === "qr"} onOpenChange={(o) => !o && setStep("idle")}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg">Set Up 2FA</DialogTitle>
            <DialogDescription>Scan this QR code with your authenticator app</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4">
            <div className="rounded-xl bg-white p-4">
              <QRCodeSVG value={otpauthUrl} size={200} />
            </div>
            <div className="w-full space-y-2">
              <p className="text-xs text-muted-foreground text-center">Or enter this key manually:</p>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 p-2">
                <code className="flex-1 text-xs break-all font-mono">{secret}</code>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={copySecret}>
                  {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
            <Button className="w-full" onClick={() => setStep("verify")}>
              I've scanned the code
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Verify Dialog */}
      <Dialog open={step === "verify"} onOpenChange={(o) => !o && setStep("idle")}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg">Verify Code</DialogTitle>
            <DialogDescription>Enter the 6-digit code from your authenticator app</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
              className="text-center text-2xl tracking-[0.5em] font-mono"
            />
            <Button className="w-full" onClick={verifySetup} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Verify & Enable
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Backup Codes Dialog */}
      <Dialog open={step === "backup"} onOpenChange={(o) => !o && setStep("idle")}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg">Save Backup Codes 🔑</DialogTitle>
            <DialogDescription>
              Store these codes safely. Each can be used once if you lose access to your authenticator.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-muted/50 p-3">
              {backupCodes.map((code, i) => (
                <code key={i} className="text-sm font-mono text-center py-1">{code}</code>
              ))}
            </div>
            <Button variant="outline" className="w-full" onClick={copyBackupCodes}>
              <Copy className="h-4 w-4 mr-2" /> Copy All Codes
            </Button>
            <Button className="w-full" onClick={() => setStep("idle")}>
              I've saved my codes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Disable Dialog */}
      <Dialog open={step === "disable"} onOpenChange={(o) => { if (!o) { setStep("idle"); setDisableCode(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg">Disable 2FA</DialogTitle>
            <DialogDescription>Enter a code from your authenticator to confirm</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ""))}
              className="text-center text-2xl tracking-[0.5em] font-mono"
            />
            <Button variant="destructive" className="w-full" onClick={disable2FA} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Disable 2FA
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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


      {/* Logout Other Devices */}
      <Button variant="outline" className="w-full" onClick={() => toast({ title: "All other sessions signed out" })}>
        Logout from Other Devices
      </Button>
    </div>
  );
};

export default SettingsSecurity;
