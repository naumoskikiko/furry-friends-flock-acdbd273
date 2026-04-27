import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { PawPrint, Mail, Lock, User, ArrowLeft, Store, Briefcase, Loader2, Shield } from "lucide-react";
import { CURRENT_TERMS_VERSION } from "@/data/legalContent";
import TermsPreviewModal from "@/components/auth/TermsPreviewModal";
import petkeepIcon from "@/assets/petkeep-icon.png";

type AuthView = "login" | "signup" | "forgot" | "2fa" | "reaccept";
type AccountRole = "user" | "provider" | "business";

const ROLES: { value: AccountRole; label: string; icon: React.ReactNode; emoji: string; desc: string }[] = [
  { value: "user", label: "Pet Owner", icon: <PawPrint className="h-5 w-5" />, emoji: "🐾", desc: "Find care & connect" },
  { value: "provider", label: "Provider", icon: <Briefcase className="h-5 w-5" />, emoji: "🩺", desc: "Offer pet services" },
  { value: "business", label: "Business", icon: <Store className="h-5 w-5" />, emoji: "🏪", desc: "Sell pet products" },
];

const AuthPage = () => {
  const [view, setView] = useState<AuthView>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<AccountRole>("user");
  const [loading, setLoading] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [confirmedAge, setConfirmedAge] = useState(false);
  const [termsError, setTermsError] = useState("");
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [termsModalTab, setTermsModalTab] = useState<"terms" | "privacy">("terms");
  const { toast } = useToast();
  const navigate = useNavigate();

  const check2FAStatus = async (userId: string): Promise<boolean> => {
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      };
      if (currentSession?.access_token) {
        headers.Authorization = `Bearer ${currentSession.access_token}`;
      }
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/totp`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ action: "check-status", user_id: userId }),
        }
      );
      const data = await res.json();
      return data.enabled === true;
    } catch {
      return false;
    }
  };

  const checkTermsAcceptance = async (userId: string): Promise<boolean> => {
    const { data } = await supabase
      .from("terms_acceptance")
      .select("terms_version")
      .eq("user_id", userId)
      .eq("terms_version", CURRENT_TERMS_VERSION)
      .limit(1);
    return (data?.length ?? 0) > 0;
  };

  const saveTermsAcceptance = async (userId: string) => {
    await supabase.from("terms_acceptance").insert({
      user_id: userId,
      terms_version: CURRENT_TERMS_VERSION,
    });
  };

  const verify2FA = async () => {
    if (!pendingUserId || totpCode.length < 6) {
      toast({ title: "Enter your 6-digit code", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/totp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ action: "verify-login", user_id: pendingUserId, token: totpCode }),
        }
      );
      const data = await res.json();
      if (data.success) {
        setLoading(false);
        if (data.backup_used) {
          toast({ title: "Logged in with backup code", description: "Consider generating new backup codes in Settings." });
        }
        navigate("/");
      } else {
        setLoading(false);
        toast({ title: "Invalid code", description: data.error || "Try again", variant: "destructive" });
      }
    } catch {
      setLoading(false);
      toast({ title: "Error verifying code", variant: "destructive" });
    }
  };

  const handleReaccept = async () => {
    if (!pendingUserId) return;
    setLoading(true);
    await saveTermsAcceptance(pendingUserId);
    setLoading(false);
    navigate("/");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
      return;
    }

    const userId = signInData.user?.id;
    if (!userId) {
      setLoading(false);
      toast({ title: "Login failed", variant: "destructive" });
      return;
    }

    // Check terms acceptance
    const hasAccepted = await checkTermsAcceptance(userId);
    if (!hasAccepted) {
      setPendingUserId(userId);
      setAgreedToTerms(false);
      setView("reaccept");
      setLoading(false);
      return;
    }

    // Check if 2FA is enabled
    const has2FA = await check2FAStatus(userId);
    if (has2FA) {
      setPendingUserId(userId);
      setView("2fa");
      setLoading(false);
      return;
    }

    setLoading(false);
    navigate("/");
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    // App Store Guideline 1.3 / Play UGC policy require explicit user
    // confirmation that they meet the minimum age (13). We capture this as
    // a separate boolean from T&C so reviewers can see it's an explicit step.
    if (!agreedToTerms || !confirmedAge) {
      setTermsError(
        !confirmedAge && !agreedToTerms
          ? "Please confirm your age and agree to the Terms to continue"
          : !confirmedAge
          ? "You must confirm you are at least 13 years old"
          : "You must agree to the Terms and Privacy Policy to continue"
      );
      return;
    }
    setTermsError("");

    setLoading(true);
    const { data: signUpData, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role },
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      setLoading(false);
      toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
      return;
    }

    // Save terms acceptance if we got a user
    if (signUpData.user) {
      await saveTermsAcceptance(signUpData.user.id);
    }

    setLoading(false);
    toast({ title: "Account created!", description: "Check your email for a confirmation link." });
    setView("login");
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Email sent", description: "Check your inbox for a password reset link." });
    }
  };

  const openTermsModal = (tab: "terms" | "privacy") => {
    setTermsModalTab(tab);
    setTermsModalOpen(true);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-1 flex h-28 w-28 items-center justify-center">
            <img src={petkeepIcon} alt="PetKeep" className="h-28 w-28 object-contain mix-blend-multiply dark:mix-blend-normal" />
          </div>
          <h1 className="font-display text-3xl font-extrabold uppercase tracking-tight">
            <span style={{ color: 'hsl(25, 90%, 55%)' }}>Pet</span>
            <span style={{ color: 'hsl(85, 45%, 38%)' }}>Keep</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Your pet community & care platform</p>
        </div>

        <Card className="petkeep-card-shadow border-0">
          <CardHeader className="pb-4">
            {view !== "login" && (
              <button onClick={() => { if (view === "2fa" || view === "reaccept") { supabase.auth.signOut(); } setView("login"); setTotpCode(""); setPendingUserId(null); setTermsError(""); setAgreedToTerms(false); setConfirmedAge(false); }} className="mb-2 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" /> Back to login
              </button>
            )}
            <CardTitle className="font-display text-xl">
              {view === "login" && "Welcome back"}
              {view === "signup" && "Create your account"}
              {view === "forgot" && "Reset password"}
              {view === "2fa" && "Two-Factor Authentication"}
              {view === "reaccept" && "Updated Terms"}
            </CardTitle>
            <CardDescription>
              {view === "login" && "Sign in to your PetKeep account"}
              {view === "signup" && "Join the pet community"}
              {view === "forgot" && "We'll send you a reset link"}
              {view === "2fa" && "Enter the code from your authenticator app"}
              {view === "reaccept" && "We've updated our Terms. Please review and accept to continue."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {view === "login" && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" required />
                  </div>
                </div>
                <Button type="submit" className="w-full petkeep-gradient text-primary-foreground font-bold" disabled={loading}>
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Signing in...</> : "Sign In"}
                </Button>
                <button type="button" onClick={() => setView("forgot")} className="w-full text-center text-sm text-muted-foreground hover:text-primary">
                  Forgot password?
                </button>
                <div className="text-center text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <button type="button" onClick={() => setView("signup")} className="font-bold text-primary hover:underline">
                    Sign Up
                  </button>
                </div>
              </form>
            )}

            {view === "2fa" && (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                    <Shield className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={8}
                  placeholder="Enter code"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/[^A-Za-z0-9]/g, ""))}
                  className="text-center text-2xl tracking-[0.3em] font-mono"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground text-center">
                  You can also use a backup code
                </p>
                <Button className="w-full petkeep-gradient text-primary-foreground font-bold" onClick={verify2FA} disabled={loading}>
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Verifying...</> : "Verify"}
                </Button>
              </div>
            )}

            {view === "reaccept" && (
              <div className="space-y-4">
                <div className="rounded-xl bg-secondary/50 p-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Our Terms of Service and Privacy Policy have been updated. Please review and accept the latest version to continue using PetKeep.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => openTermsModal("terms")}
                    className="flex-1 text-xs font-bold text-primary hover:underline text-center py-2 rounded-lg bg-primary/5"
                  >
                    📄 Read Terms
                  </button>
                  <button
                    type="button"
                    onClick={() => openTermsModal("privacy")}
                    className="flex-1 text-xs font-bold text-primary hover:underline text-center py-2 rounded-lg bg-primary/5"
                  >
                    🔒 Read Privacy Policy
                  </button>
                </div>

                <div className="flex items-start gap-3 pt-1">
                  <Checkbox
                    id="reaccept-terms"
                    checked={agreedToTerms}
                    onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
                    className="mt-0.5"
                  />
                  <label htmlFor="reaccept-terms" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                    I agree to the updated{" "}
                    <button type="button" onClick={() => openTermsModal("terms")} className="font-bold text-primary hover:underline">Terms of Service</button>
                    {" "}and{" "}
                    <button type="button" onClick={() => openTermsModal("privacy")} className="font-bold text-primary hover:underline">Privacy Policy</button>
                  </label>
                </div>

                <Button
                  className="w-full petkeep-gradient text-primary-foreground font-bold"
                  disabled={!agreedToTerms || loading}
                  onClick={handleReaccept}
                >
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</> : "Accept & Continue"}
                </Button>
              </div>
            )}

            {view === "signup" && (
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label>Select your account type</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {ROLES.map((r) => (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => setRole(r.value)}
                        className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 transition-all ${
                          role === r.value
                            ? "border-primary bg-petkeep-cream dark:bg-primary/10"
                            : "border-border hover:border-muted-foreground/30"
                        }`}
                      >
                        <span className="text-2xl">{r.emoji}</span>
                        <p className="text-xs font-bold">{r.label}</p>
                        <p className="text-[9px] text-muted-foreground leading-tight text-center">{r.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fullName">{role === "business" ? "Business Name" : "Full Name"}</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="fullName" placeholder={role === "business" ? "Happy Paws Pet Shop" : "John Doe"} value={fullName} onChange={(e) => setFullName(e.target.value)} className="pl-10" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signupEmail">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="signupEmail" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signupPassword">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="signupPassword" type="password" placeholder="Min 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" required minLength={6} />
                  </div>
                </div>

                {/* Age confirmation — App Store 1.3 + Play UGC policy.
                    Stored client-side only at signup; we DO NOT collect a date of birth. */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="confirm-age"
                      checked={confirmedAge}
                      onCheckedChange={(checked) => {
                        setConfirmedAge(checked === true);
                        if (checked) setTermsError("");
                      }}
                      className="mt-0.5"
                    />
                    <label
                      htmlFor="confirm-age"
                      className="text-[11px] text-muted-foreground leading-relaxed cursor-pointer"
                    >
                      I confirm I am at least <strong className="text-foreground">13 years old</strong> (or the
                      minimum age in my country) and accept the{" "}
                      <Link to="/legal/guidelines" className="font-bold text-primary hover:underline">
                        Community Guidelines
                      </Link>
                      .
                    </label>
                  </div>

                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="agree-terms"
                      checked={agreedToTerms}
                      onCheckedChange={(checked) => {
                        setAgreedToTerms(checked === true);
                        if (checked) setTermsError("");
                      }}
                      className="mt-0.5"
                    />
                    <label htmlFor="agree-terms" className="text-[11px] text-muted-foreground leading-relaxed cursor-pointer">
                      I agree to the{" "}
                      <button type="button" onClick={() => openTermsModal("terms")} className="font-bold text-primary hover:underline">Terms of Service</button>
                      {" "}and{" "}
                      <button type="button" onClick={() => openTermsModal("privacy")} className="font-bold text-primary hover:underline">Privacy Policy</button>
                    </label>
                  </div>
                  {termsError && (
                    <p className="text-[11px] text-destructive font-medium pl-7">{termsError}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full petkeep-gradient text-primary-foreground font-bold"
                  disabled={loading || !agreedToTerms || !confirmedAge}
                >
                  {loading ? "Creating account..." : "Create Account"}
                </Button>
                <div className="text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <button type="button" onClick={() => setView("login")} className="font-bold text-primary hover:underline">
                    Sign In
                  </button>
                </div>
              </form>
            )}

            {view === "forgot" && (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="resetEmail">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="resetEmail" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required />
                  </div>
                </div>
                <Button type="submit" className="w-full petkeep-gradient text-primary-foreground font-bold" disabled={loading}>
                  {loading ? "Sending..." : "Send Reset Link"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Terms Preview Modal */}
      <TermsPreviewModal
        open={termsModalOpen}
        onClose={() => setTermsModalOpen(false)}
        initialTab={termsModalTab}
      />
    </div>
  );
};

export default AuthPage;
