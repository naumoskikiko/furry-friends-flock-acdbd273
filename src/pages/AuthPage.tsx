import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { PawPrint, Mail, Lock, User, ArrowLeft } from "lucide-react";

type AuthView = "login" | "signup" | "forgot";

const AuthPage = () => {
  const [view, setView] = useState<AuthView>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"owner" | "sitter">("owner");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    } else {
      navigate("/");
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role },
        emailRedirectTo: window.location.origin,
      },
    });
    setLoading(false);
    if (error) {
      toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Account created!", description: "Check your email for a confirmation link." });
      setView("login");
    }
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl petkeep-gradient">
            <PawPrint className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="font-display text-3xl font-extrabold text-foreground">PetKeep</h1>
          <p className="mt-1 text-sm text-muted-foreground">Your pet community & care platform</p>
        </div>

        <Card className="petkeep-card-shadow border-0">
          <CardHeader className="pb-4">
            {view !== "login" && (
              <button onClick={() => setView("login")} className="mb-2 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" /> Back to login
              </button>
            )}
            <CardTitle className="font-display text-xl">
              {view === "login" && "Welcome back"}
              {view === "signup" && "Create your account"}
              {view === "forgot" && "Reset password"}
            </CardTitle>
            <CardDescription>
              {view === "login" && "Sign in to your PetKeep account"}
              {view === "signup" && "Join the pet community"}
              {view === "forgot" && "We'll send you a reset link"}
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
                  {loading ? "Signing in..." : "Sign In"}
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

            {view === "signup" && (
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label>I am a...</Label>
                  <RadioGroup value={role} onValueChange={(v) => setRole(v as "owner" | "sitter")} className="flex gap-4">
                    <label className={`flex flex-1 cursor-pointer items-center gap-2 rounded-xl border-2 p-3 transition-all ${role === "owner" ? "border-primary bg-petkeep-cream" : "border-border"}`}>
                      <RadioGroupItem value="owner" id="owner" />
                      <div>
                        <p className="text-sm font-bold">🐾 Pet Owner</p>
                        <p className="text-[10px] text-muted-foreground">Find care for my pets</p>
                      </div>
                    </label>
                    <label className={`flex flex-1 cursor-pointer items-center gap-2 rounded-xl border-2 p-3 transition-all ${role === "sitter" ? "border-primary bg-petkeep-cream" : "border-border"}`}>
                      <RadioGroupItem value="sitter" id="sitter" />
                      <div>
                        <p className="text-sm font-bold">🏠 Sitter</p>
                        <p className="text-[10px] text-muted-foreground">Offer pet care services</p>
                      </div>
                    </label>
                  </RadioGroup>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="fullName" placeholder="John Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} className="pl-10" required />
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
                <Button type="submit" className="w-full petkeep-gradient text-primary-foreground font-bold" disabled={loading}>
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
    </div>
  );
};

export default AuthPage;
