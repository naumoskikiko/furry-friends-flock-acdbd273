import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Settings, Grid3X3, Bookmark, Heart, Star, MapPin, CreditCard, Camera, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import AddPetFlow from "@/components/profile/AddPetFlow";
import CreatePostModal from "@/components/profile/CreatePostModal";
import PostGrid from "@/components/profile/PostGrid";
import PetCard from "@/components/profile/PetCard";
import PetProfileModal from "@/components/profile/PetProfileModal";
import LikedPostsGrid from "@/components/profile/LikedPostsGrid";
import CreateStoryModal from "@/components/stories/CreateStoryModal";
import StoryViewer from "@/components/stories/StoryViewer";
import { useStories } from "@/hooks/useStories";

const ProfilePage = () => {
  const { user, profile, refreshProfile } = useAuth();
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
  const [posts, setPosts] = useState<any[]>([]);

  const [addPetOpen, setAddPetOpen] = useState(false);
  const [editPet, setEditPet] = useState<any>(null);
  const [createPostOpen, setCreatePostOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"posts" | "saved" | "liked">("posts");

  const [viewPet, setViewPet] = useState<any>(null);
  const [createStoryOpen, setCreateStoryOpen] = useState(false);
  const [storyViewerOpen, setStoryViewerOpen] = useState(false);

  const { storyGroups, hasOwnStory, refreshStories } = useStories();

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setBio(profile.bio || "");
      setLocation(profile.location || "");
    }
  }, [profile]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    const [followers, following, petsRes, creditsRes, postsRes] = await Promise.all([
      supabase.from("followers").select("id", { count: "exact", head: true }).eq("following_id", user.id),
      supabase.from("followers").select("id", { count: "exact", head: true }).eq("follower_id", user.id),
      supabase.from("pets").select("*").eq("owner_id", user.id),
      supabase.from("credits").select("balance").eq("user_id", user.id).single(),
      supabase.from("posts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);
    setFollowerCount(followers.count || 0);
    setFollowingCount(following.count || 0);
    setPets(petsRes.data || []);
    setCreditBalance(creditsRes.data?.balance || 0);
    setPosts(postsRes.data || []);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

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

  const handleDeletePet = async (petId: string) => {
    await supabase.from("pets").delete().eq("id", petId);
    fetchData();
    toast({ title: "Pet removed" });
  };

  const handleShareProfile = () => {
    const url = `${window.location.origin}/profile/${user?.id}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied!", description: "Profile link copied to clipboard." });
  };

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "User";
  const username = user?.email?.split("@")[0] || "user";
  const initials = displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <AppLayout>
      <div className="mx-auto max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4">
          <button onClick={() => setCreatePostOpen(true)} className="rounded-full p-2 hover:bg-secondary">
            <Plus className="h-5 w-5" />
          </button>
          <h1 className="font-display text-lg font-extrabold">@{username}</h1>
          <button onClick={() => navigate("/settings")} className="rounded-full p-2 hover:bg-secondary">
            <Settings className="h-5 w-5" />
          </button>
        </div>

        {/* Centered profile info */}
        <div className="flex flex-col items-center px-4 pt-4">
          <div className="relative">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="h-24 w-24 rounded-full object-cover ring-4 ring-primary/20" />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary to-petkeep-orange-light font-display text-3xl font-bold text-primary-foreground ring-4 ring-primary/20">
                {initials}
              </div>
            )}
            <label className="absolute -bottom-1 -right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
              <Camera className="h-4 w-4" />
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploading} />
            </label>
          </div>

          <h2 className="mt-3 font-display text-xl font-extrabold">{displayName}</h2>
          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Star className="h-3 w-3 text-primary fill-primary" /> — reviews
          </div>
          {profile?.location && (
            <p className="mt-0.5 text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {profile.location}
            </p>
          )}
          <p className="mt-1 text-sm text-center max-w-xs">{profile?.bio || "No bio yet"}</p>
          <span className="mt-1 text-[10px] rounded-full bg-petkeep-cream px-2 py-0.5 font-bold capitalize text-foreground">
            {profile?.role || "owner"}
          </span>
        </div>

        {/* Stats row */}
        <div className="mt-4 flex justify-center gap-8">
          <div className="text-center">
            <p className="font-display text-lg font-extrabold">{posts.length}</p>
            <p className="text-[10px] text-muted-foreground">Posts</p>
          </div>
          <div className="text-center">
            <p className="font-display text-lg font-extrabold">{followerCount}</p>
            <p className="text-[10px] text-muted-foreground">Followers</p>
          </div>
          <div className="text-center">
            <p className="font-display text-lg font-extrabold">{followingCount}</p>
            <p className="text-[10px] text-muted-foreground">Following</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-3 flex gap-2 px-4">
          <button onClick={() => setEditOpen(true)} className="petkeep-gradient flex-1 rounded-xl py-2 text-sm font-bold text-primary-foreground">
            Edit Profile
          </button>
          <button onClick={handleShareProfile} className="flex-1 rounded-xl bg-secondary py-2 text-sm font-bold text-secondary-foreground">
            Share Profile
          </button>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 gap-3 px-4 py-4">
          <div className="rounded-2xl bg-petkeep-mint-light p-3">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-accent" />
              <span className="text-xs font-bold text-accent">Credits</span>
            </div>
            <p className="mt-1 font-display text-xl font-extrabold">{creditBalance.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">💎 PetKeep Points</p>
          </div>
          <div className="rounded-2xl bg-petkeep-cream p-3">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-primary" />
              <span className="text-xs font-bold text-primary">Rating</span>
            </div>
            <p className="mt-1 font-display text-xl font-extrabold">—</p>
            <p className="text-[10px] text-muted-foreground">⭐ No reviews yet</p>
          </div>
        </div>

        {/* My Pets - circular icons */}
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-bold">My Pets</h3>
            <button
              onClick={() => { setEditPet(null); setAddPetOpen(true); }}
              className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground"
            >
              + Add Pet
            </button>
          </div>
          <div className="mt-2 flex gap-4 overflow-x-auto pb-1">
            {pets.map((pet) => (
              <PetCard key={pet.id} pet={pet} onClick={setViewPet} />
            ))}
            {pets.length === 0 && (
              <p className="py-4 text-sm text-muted-foreground">No pets added yet. Tap "Add Pet" to get started!</p>
            )}
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex border-t border-border">
          <button
            onClick={() => setActiveTab("posts")}
            className={`flex-1 py-3 flex items-center justify-center ${activeTab === "posts" ? "border-b-2 border-foreground" : "text-muted-foreground"}`}
          >
            <Grid3X3 className="h-5 w-5" />
          </button>
          <button
            onClick={() => setActiveTab("saved")}
            className={`flex-1 py-3 flex items-center justify-center ${activeTab === "saved" ? "border-b-2 border-foreground" : "text-muted-foreground"}`}
          >
            <Bookmark className="h-5 w-5" />
          </button>
          <button
            onClick={() => setActiveTab("liked")}
            className={`flex-1 py-3 flex items-center justify-center ${activeTab === "liked" ? "border-b-2 border-foreground" : "text-muted-foreground"}`}
          >
            <Heart className="h-5 w-5" />
          </button>
        </div>

        {/* Post grid */}
        {activeTab === "posts" && <PostGrid posts={posts} onRefresh={fetchData} />}
        {activeTab === "saved" && (
          <div className="flex flex-col items-center py-12">
            <Bookmark className="h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">Saved posts coming soon</p>
          </div>
        )}
        {activeTab === "liked" && <LikedPostsGrid />}
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Profile</DialogTitle></DialogHeader>
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

      {/* Pet Profile Modal */}
      <PetProfileModal
        pet={viewPet}
        open={!!viewPet}
        onOpenChange={(v) => { if (!v) setViewPet(null); }}
        isOwner={true}
        onEdit={(p) => { setEditPet(p); setAddPetOpen(true); }}
        onDelete={handleDeletePet}
      />

      {/* Add/Edit Pet Flow */}
      <AddPetFlow open={addPetOpen} onOpenChange={setAddPetOpen} onPetAdded={fetchData} editPet={editPet} />

      {/* Create Post Modal */}
      <CreatePostModal open={createPostOpen} onOpenChange={setCreatePostOpen} onPostCreated={fetchData} pets={pets} />
    </AppLayout>
  );
};

export default ProfilePage;
