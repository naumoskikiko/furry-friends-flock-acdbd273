import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Camera, User, Mail, MapPin, Phone, AtSign } from "lucide-react";

const SettingsAccount = () => {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [location, setLocation] = useState(profile?.location || "");
  const [username, setUsername] = useState((profile as any)?.username || "");
  const [usernameError, setUsernameError] = useState("");
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [professionalMode, setProfessionalMode] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setBio(profile.bio || "");
      setLocation(profile.location || "");
      setUsername((profile as any)?.username || "");
    }
  }, [profile]);

  const validateUsername = async (value: string) => {
    const clean = value.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase();
    setUsername(clean);
    setUsernameError("");
    if (!clean) return;
    if (clean.length < 3) { setUsernameError("Username must be at least 3 characters"); return; }
    if (clean === (profile as any)?.username) return;
    setCheckingUsername(true);
    const { data } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("username", clean)
      .maybeSingle();
    setCheckingUsername(false);
    if (data && data.user_id !== user?.id) {
      setUsernameError("Username already taken");
    }
  };

  useEffect(() => {
    if (!user) return;
    supabase.from("user_settings").select("professional_mode").eq("user_id", user.id).single()
      .then(({ data }) => { if (data) setProfessionalMode(data.professional_mode); });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    if (usernameError) {
      toast({ title: "Fix errors", description: usernameError, variant: "destructive" });
      setSaving(false);
      return;
    }
    const updates: any = { full_name: fullName, bio, location };
    if (username) updates.username = username;
    const { error } = await supabase.from("profiles").update(updates).eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile updated!" });
      await refreshProfile();
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const filePath = `${user.id}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true });
    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(filePath);
    await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("user_id", user.id);
    await refreshProfile();
    setUploading(false);
    toast({ title: "Avatar updated!" });
  };

  const toggleProfessionalMode = async (val: boolean) => {
    if (!user) return;
    setProfessionalMode(val);
    await supabase.from("user_settings").update({ professional_mode: val }).eq("user_id", user.id);
    toast({ title: val ? "Professional Mode enabled" : "Professional Mode disabled" });
  };

  const handleChangePassword = async () => {
    if (!user?.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Password reset email sent", description: "Check your inbox for the reset link." });
    }
  };

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "";
  const initials = displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="px-4 py-4 space-y-6">
      {/* Avatar */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="Avatar" className="h-24 w-24 rounded-full object-cover" />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent font-display text-2xl font-bold text-primary-foreground">
              {initials}
            </div>
          )}
          <label className="absolute -bottom-1 -right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Camera className="h-4 w-4" />
            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploading} />
          </label>
        </div>
        <p className="text-xs text-muted-foreground">{uploading ? "Uploading..." : "Tap to change photo"}</p>
      </div>

      {/* Fields */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-2"><User className="h-3.5 w-3.5" /> Full Name</Label>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" />
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> Email</Label>
          <Input value={user?.email || ""} disabled className="bg-muted" />
          <p className="text-xs text-muted-foreground">Email cannot be changed here</p>
        </div>
        <div className="space-y-2">
          <Label>Bio</Label>
          <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell us about yourself..." rows={3} maxLength={300} />
          <p className="text-xs text-muted-foreground text-right">{bio.length}/300</p>
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> Location</Label>
          <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City, Country" />
        </div>
      </div>

      <Button onClick={handleSave} className="w-full petkeep-gradient text-primary-foreground font-bold" disabled={saving}>
        {saving ? "Saving..." : "Save Changes"}
      </Button>

      {/* Change Password */}
      <div className="border-t border-border pt-4">
        <Button variant="outline" className="w-full" onClick={handleChangePassword}>
          Change Password
        </Button>
      </div>

      {/* Role display */}
      <div className="border-t border-border pt-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Account Type</p>
            <p className="text-xs text-muted-foreground capitalize">{profile?.role || "owner"}</p>
          </div>
          <span className="rounded-full bg-petkeep-cream px-3 py-1 text-xs font-bold capitalize text-foreground">
            {profile?.role || "owner"}
          </span>
        </div>
      </div>

      {/* Professional Mode */}
      <div className="border-t border-border pt-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Professional Mode</p>
            <p className="text-xs text-muted-foreground">Unlock analytics & insights</p>
          </div>
          <Switch checked={professionalMode} onCheckedChange={toggleProfessionalMode} />
        </div>
      </div>
    </div>
  );
};

export default SettingsAccount;
