import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Settings, Grid3X3, Bookmark, Heart, Star, MapPin, CreditCard, Camera, LogOut } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const ProfilePage = () => {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [pets, setPets] = useState<any[]>([]);
  const [creditBalance, setCreditBalance] = useState(0);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setBio(profile.bio || "");
      setLocation(profile.location || "");
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    // Fetch follower/following counts
    supabase.from("followers").select("id", { count: "exact", head: true }).eq("following_id", user.id).then(({ count }) => setFollowerCount(count || 0));
    supabase.from("followers").select("id", { count: "exact", head: true }).eq("follower_id", user.id).then(({ count }) => setFollowingCount(count || 0));
    // Fetch pets
    supabase.from("pets").select("*").eq("owner_id", user.id).then(({ data }) => setPets(data || []));
    // Fetch credits
    supabase.from("credits").select("balance").eq("user_id", user.id).single().then(({ data }) => setCreditBalance(data?.balance || 0));
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ full_name: fullName, bio, location }).eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile updated!" });
      await refreshProfile();
      setEditOpen(false);
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

  const handleShareProfile = () => {
    const url = `${window.location.origin}/profile/${user?.id}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied!", description: "Profile link copied to clipboard." });
  };

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "User";
  const initials = displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <AppLayout>
      <div className="mx-auto max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4">
          <h1 className="font-display text-xl font-extrabold">{displayName}</h1>
          <div className="flex gap-2">
            <button onClick={signOut} className="rounded-full p-2 hover:bg-secondary">
              <LogOut className="h-5 w-5" />
            </button>
            <button onClick={() => navigate("/settings")} className="rounded-full p-2 hover:bg-secondary">
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Profile info */}
        <div className="px-4 py-4">
          <div className="flex items-center gap-6">
            <div className="relative">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="h-20 w-20 rounded-full object-cover" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-petkeep-orange-light font-display text-2xl font-bold text-primary-foreground">
                  {initials}
                </div>
              )}
              <label className="absolute -bottom-1 -right-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Camera className="h-3.5 w-3.5" />
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploading} />
              </label>
            </div>
            <div className="flex flex-1 justify-around text-center">
              <div>
                <p className="font-display text-lg font-extrabold">{pets.length}</p>
                <p className="text-[10px] text-muted-foreground">Pets</p>
              </div>
              <div>
                <p className="font-display text-lg font-extrabold">{followerCount}</p>
                <p className="text-[10px] text-muted-foreground">Followers</p>
              </div>
              <div>
                <p className="font-display text-lg font-extrabold">{followingCount}</p>
                <p className="text-[10px] text-muted-foreground">Following</p>
              </div>
            </div>
          </div>

          <div className="mt-3">
            <p className="text-sm font-bold">{profile?.bio || "No bio yet"}</p>
            {profile?.location && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <MapPin className="h-3 w-3" /> {profile.location}
              </p>
            )}
            <p className="mt-0.5 text-[10px] rounded-full inline-block bg-petkeep-cream px-2 py-0.5 font-bold capitalize text-foreground">
              {profile?.role || "owner"}
            </p>
          </div>

          {/* Action buttons */}
          <div className="mt-3 flex gap-2">
            <button onClick={() => setEditOpen(true)} className="petkeep-gradient flex-1 rounded-xl py-2 text-sm font-bold text-primary-foreground">
              Edit Profile
            </button>
            <button onClick={handleShareProfile} className="flex-1 rounded-xl bg-secondary py-2 text-sm font-bold text-secondary-foreground">
              Share Profile
            </button>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 gap-3 px-4 pb-4">
          <div className="rounded-2xl bg-petkeep-mint-light p-3">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-petkeep-mint" />
              <span className="text-xs font-bold text-petkeep-mint">Credits</span>
            </div>
            <p className="mt-1 font-display text-xl font-extrabold text-foreground">{creditBalance.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">💎 PetKeep Points</p>
          </div>
          <div className="rounded-2xl bg-petkeep-cream p-3">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-primary" />
              <span className="text-xs font-bold text-primary">Rating</span>
            </div>
            <p className="mt-1 font-display text-xl font-extrabold text-foreground">—</p>
            <p className="text-[10px] text-muted-foreground">⭐ No reviews yet</p>
          </div>
        </div>

        {/* My Pets */}
        <div className="px-4 pb-4">
          <h3 className="font-display text-base font-bold">My Pets</h3>
          <div className="mt-2 flex gap-3 overflow-x-auto pb-1">
            {pets.map((pet) => (
              <div key={pet.id} className="flex items-center gap-2 rounded-xl bg-card px-3 py-2 petkeep-card-shadow shrink-0">
                {pet.photo_url ? (
                  <img src={pet.photo_url} alt={pet.name} className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <span className="text-lg">🐾</span>
                )}
                <div>
                  <p className="text-xs font-bold">{pet.name}</p>
                  <p className="text-[10px] text-muted-foreground">{pet.breed || "Unknown breed"}</p>
                </div>
              </div>
            ))}
            <button className="flex items-center justify-center rounded-xl border-2 border-dashed border-border px-4 text-sm text-muted-foreground hover:border-primary hover:text-primary shrink-0">
              + Add
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex border-t border-border">
          <button className="flex-1 border-b-2 border-foreground py-3 flex items-center justify-center">
            <Grid3X3 className="h-5 w-5" />
          </button>
          <button className="flex-1 py-3 flex items-center justify-center text-muted-foreground">
            <Bookmark className="h-5 w-5" />
          </button>
          <button className="flex-1 py-3 flex items-center justify-center text-muted-foreground">
            <Heart className="h-5 w-5" />
          </button>
        </div>

        {/* Grid placeholder */}
        <div className="grid grid-cols-3 gap-0.5">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="aspect-square bg-secondary flex items-center justify-center text-2xl">
              {["🐕", "🐱", "🐶", "🌳", "🐾", "🦴", "🐕", "🐱", "🎀"][i]}
            </div>
          ))}
        </div>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Bio</Label>
              <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell us about yourself..." rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City, Country" />
            </div>
            <Button onClick={handleSaveProfile} className="w-full petkeep-gradient text-primary-foreground font-bold" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default ProfilePage;
