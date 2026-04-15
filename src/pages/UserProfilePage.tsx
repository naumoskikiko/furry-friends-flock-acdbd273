import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, MapPin, Grid3X3, UserPlus, UserCheck, MessageCircle,
  Share2, BadgeCheck, PawPrint, Tag, Star, ChevronRight, Briefcase, AlertTriangle, Lock, Clock,
} from "lucide-react";
import PostGrid from "@/components/profile/PostGrid";
import PetCard from "@/components/profile/PetCard";
import PetProfileModal from "@/components/profile/PetProfileModal";
import FollowListModal from "@/components/profile/FollowListModal";
import ProfileShareModal from "@/components/profile/ProfileShareModal";
import { getOrCreateConversation } from "@/hooks/useMessages";
import { createNotification } from "@/hooks/useNotifications";
import { animalTypes } from "@/data/petBreeds";
import ReportModal from "@/components/ReportModal";

type TabType = "posts" | "pets" | "tagged";

const UserProfilePage = () => {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [pets, setPets] = useState<any[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [petCount, setPetCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("posts");
  const [viewPet, setViewPet] = useState<any>(null);

  // Privacy state
  const [isPrivate, setIsPrivate] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [targetSettings, setTargetSettings] = useState<any>(null);
  const [followRequestStatus, setFollowRequestStatus] = useState<string | null>(null);

  // Provider / Business data
  const [providerData, setProviderData] = useState<any>(null);
  const [businessData, setBusinessData] = useState<any>(null);

  // Follow list
  const [followListOpen, setFollowListOpen] = useState(false);
  const [followListType, setFollowListType] = useState<"followers" | "following">("followers");

  // Share modal
  const [shareOpen, setShareOpen] = useState(false);
  const [showReport, setShowReport] = useState(false);

  // Swipe tabs
  const tabTouchRef = useRef({ x: 0, time: 0 });
  const tabs: TabType[] = ["posts", "pets", "tagged"];

  const fetchProfile = useCallback(async () => {
    if (!username) return;
    setLoading(true);

    const cleanUsername = username.startsWith("@") ? username.slice(1) : username;
    let profileData: any = null;

    const { data: byUsername } = await supabase
      .from("profiles")
      .select("*")
      .eq("username", cleanUsername)
      .single();

    if (byUsername) {
      profileData = byUsername;
    } else {
      const { data: byId } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", cleanUsername)
        .single();
      profileData = byId;
    }

    if (!profileData) {
      setLoading(false);
      return;
    }

    // Check if blocked
    if (user) {
      const { data: blockCheck } = await supabase
        .from("blocked_users")
        .select("id")
        .or(`and(blocker_id.eq.${profileData.user_id},blocked_id.eq.${user.id}),and(blocker_id.eq.${user.id},blocked_id.eq.${profileData.user_id})`)
        .limit(1);
      
      if (blockCheck && blockCheck.length > 0) {
        setIsBlocked(true);
        setProfile(profileData);
        setLoading(false);
        return;
      }
    }

    setProfile(profileData);

    // Fetch privacy settings
    const { data: settingsData } = await supabase
      .from("user_settings")
      .select("private_account, show_in_search, show_rating_publicly, show_activity_status, messaging_access")
      .eq("user_id", profileData.user_id)
      .single();
    
    setTargetSettings(settingsData);
    const privateAccount = settingsData?.private_account || false;
    setIsPrivate(privateAccount);

    const [followers, following, providerRes, businessRes] = await Promise.all([
      supabase.from("followers").select("id", { count: "exact", head: true }).eq("following_id", profileData.user_id),
      supabase.from("followers").select("id", { count: "exact", head: true }).eq("follower_id", profileData.user_id),
      supabase.from("care_providers").select("*").eq("user_id", profileData.user_id).eq("is_suspended", false).eq("is_banned", false).maybeSingle(),
      supabase.from("business_profiles").select("*").eq("user_id", profileData.user_id).eq("is_suspended", false).maybeSingle(),
    ]);

    setFollowerCount(followers.count || 0);
    setFollowingCount(following.count || 0);
    setProviderData(providerRes.data || null);
    setBusinessData(businessRes.data || null);

    let currentlyFollowing = false;
    if (user && user.id !== profileData.user_id) {
      const { data: followCheck } = await supabase
        .from("followers")
        .select("id")
        .eq("follower_id", user.id)
        .eq("following_id", profileData.user_id)
        .maybeSingle();
      currentlyFollowing = !!followCheck;
      setIsFollowing(currentlyFollowing);

      // Check follow request status for private accounts
      if (privateAccount && !currentlyFollowing) {
        const { data: reqCheck } = await supabase
          .from("follow_requests")
          .select("status")
          .eq("requester_id", user.id)
          .eq("target_id", profileData.user_id)
          .maybeSingle();
        setFollowRequestStatus(reqCheck?.status || null);
      }
    }

    // Only load posts/pets if profile is public OR viewer is following
    if (!privateAccount || currentlyFollowing || (user && user.id === profileData.user_id)) {
      const [postsRes, petsRes] = await Promise.all([
        supabase.from("posts").select("*").eq("user_id", profileData.user_id).order("created_at", { ascending: false }),
        supabase.from("pets").select("*").eq("owner_id", profileData.user_id),
      ]);
      setPosts(postsRes.data || []);
      setPets(petsRes.data || []);
      setPetCount(petsRes.data?.length || 0);
    } else {
      setPosts([]);
      setPets([]);
      const { data: petsCount } = await supabase.from("pets").select("id", { count: "exact", head: true }).eq("owner_id", profileData.user_id);
      setPetCount(petsCount?.length || 0);
    }

    setLoading(false);
  }, [username, user]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  useEffect(() => {
    if (profile && user && profile.user_id === user.id) {
      navigate("/profile", { replace: true });
    }
  }, [profile, user, navigate]);

  const handleFollow = async () => {
    if (!user || !profile) return;

    if (isFollowing) {
      await supabase.from("followers").delete().eq("follower_id", user.id).eq("following_id", profile.user_id);
      setIsFollowing(false);
      setFollowerCount((c) => c - 1);
    } else if (isPrivate) {
      // Send follow request
      if (followRequestStatus === "pending") {
        // Cancel request
        await supabase.from("follow_requests").delete().eq("requester_id", user.id).eq("target_id", profile.user_id);
        setFollowRequestStatus(null);
        toast({ title: "Follow request cancelled" });
      } else {
        await supabase.from("follow_requests").insert({ requester_id: user.id, target_id: profile.user_id });
        setFollowRequestStatus("pending");
        createNotification(user.id, profile.user_id, "follow_request", "profile", profile.user_id, "requested to follow you");
        toast({ title: "Follow request sent" });
      }
    } else {
      await supabase.from("followers").insert({ follower_id: user.id, following_id: profile.user_id });
      setIsFollowing(true);
      setFollowerCount((c) => c + 1);
      createNotification(user.id, profile.user_id, "follow", "profile", profile.user_id, "started following you");
    }
  };

  const handleMessage = async () => {
    if (!user || !profile) return;

    // Check messaging access
    if (targetSettings?.messaging_access === "booked_only") {
      // Check if current user has a booking/order with this user
      const [bookingCheck, orderCheck] = await Promise.all([
        supabase.from("care_bookings").select("id").or(`and(user_id.eq.${user.id},provider_id.in.(select id from care_providers where user_id='${profile.user_id}')),and(user_id.eq.${profile.user_id},provider_id.in.(select id from care_providers where user_id='${user.id}'))`).limit(1),
        supabase.from("orders").select("id").eq("buyer_id", user.id).limit(1),
      ]);

      const hasRelationship = (bookingCheck.data?.length || 0) > 0 || (orderCheck.data?.length || 0) > 0;
      if (!hasRelationship) {
        toast({ title: "Cannot message", description: "This user only accepts messages from users they've done business with.", variant: "destructive" });
        return;
      }
    }

    try {
      const convId = await getOrCreateConversation(profile.user_id);
      navigate(`/messages?conversation=${convId}&userId=${profile.user_id}`);
    } catch {
      toast({ title: "Error", description: "Could not open chat", variant: "destructive" });
    }
  };

  const handleShare = () => {
    setShareOpen(true);
  };

  const openFollowList = (type: "followers" | "following") => {
    setFollowListType(type);
    setFollowListOpen(true);
  };

  // Tab swipe handlers
  const handleTabTouchStart = (e: React.TouchEvent) => {
    tabTouchRef.current = { x: e.touches[0].clientX, time: Date.now() };
  };
  const handleTabTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - tabTouchRef.current.x;
    const dt = Date.now() - tabTouchRef.current.time;
    if (dt < 400 && Math.abs(dx) > 60) {
      const idx = tabs.indexOf(activeTab);
      if (dx < 0 && idx < tabs.length - 1) setActiveTab(tabs[idx + 1]);
      if (dx > 0 && idx > 0) setActiveTab(tabs[idx - 1]);
    }
  };

  const canViewContent = !isPrivate || isFollowing || (user && profile && user.id === profile.user_id);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </AppLayout>
    );
  }

  if (isBlocked) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <span className="text-5xl mb-4">🚫</span>
          <h2 className="text-lg font-bold">Profile unavailable</h2>
          <p className="text-sm text-muted-foreground mt-1">You can't view this profile.</p>
          <button onClick={() => navigate(-1)} className="mt-4 text-sm font-semibold text-primary">Go back</button>
        </div>
      </AppLayout>
    );
  }

  if (!profile) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <span className="text-5xl mb-4">👤</span>
          <h2 className="text-lg font-bold">User not found</h2>
          <p className="text-sm text-muted-foreground mt-1">This profile doesn't exist.</p>
          <button onClick={() => navigate(-1)} className="mt-4 text-sm font-semibold text-primary">Go back</button>
        </div>
      </AppLayout>
    );
  }

  const displayName = profile.full_name || "User";
  const initials = displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  // Follow button label
  const getFollowButton = () => {
    if (isFollowing) return { label: "Following", icon: <UserCheck className="h-4 w-4" />, style: "bg-secondary text-secondary-foreground" };
    if (isPrivate && followRequestStatus === "pending") return { label: "Requested", icon: <Clock className="h-4 w-4" />, style: "bg-secondary text-secondary-foreground" };
    return { label: "Follow", icon: <UserPlus className="h-4 w-4" />, style: "petkeep-gradient text-primary-foreground" };
  };

  const followBtn = getFollowButton();

  return (
    <AppLayout>
      <div className="mx-auto max-w-lg animate-fade-in">
        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-2">
          <button onClick={() => navigate(-1)} className="rounded-full p-1.5 hover:bg-secondary transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-display text-lg font-extrabold flex items-center gap-1.5">
            @{profile.username || profile.user_id.slice(0, 8)}
            {profile.role === "verified" && <BadgeCheck className="h-4.5 w-4.5 text-primary" />}
            {isPrivate && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
          </h1>
        </div>

        {/* Profile header - Instagram style */}
        <div className="px-4 pt-2">
          <div className="flex items-start gap-5">
            {/* Avatar */}
            <div className="shrink-0">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Avatar"
                  className="h-20 w-20 rounded-full object-cover ring-2 ring-primary/20"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent font-display text-2xl font-bold text-primary-foreground">
                  {initials}
                </div>
              )}
            </div>

            {/* Stats row */}
            <div className="flex-1 flex justify-around pt-2">
              <div className="text-center">
                <p className="font-display text-lg font-extrabold">{canViewContent ? posts.length : "—"}</p>
                <p className="text-[10px] text-muted-foreground">Posts</p>
              </div>
              <div className="text-center">
                <p className="font-display text-lg font-extrabold">{petCount}</p>
                <p className="text-[10px] text-muted-foreground">Pets</p>
              </div>
              <button onClick={() => openFollowList("followers")} className="text-center">
                <p className="font-display text-lg font-extrabold">{followerCount}</p>
                <p className="text-[10px] text-muted-foreground">Followers</p>
              </button>
              <button onClick={() => openFollowList("following")} className="text-center">
                <p className="font-display text-lg font-extrabold">{followingCount}</p>
                <p className="text-[10px] text-muted-foreground">Following</p>
              </button>
            </div>
          </div>

          {/* Name, bio, location */}
          <div className="mt-3">
            <p className="font-display text-sm font-extrabold">{displayName}</p>
            {canViewContent && profile.bio && <p className="mt-0.5 text-sm text-foreground">{profile.bio}</p>}
            {profile.location && (
              <p className="mt-0.5 text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {profile.location}
              </p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-3 px-4 flex gap-2">
          <button
            onClick={handleFollow}
            className={`flex-1 rounded-xl py-2 text-sm font-bold flex items-center justify-center gap-1.5 transition-all active:scale-[0.97] ${followBtn.style}`}
          >
            {followBtn.icon} {followBtn.label}
          </button>
          <button
            onClick={handleMessage}
            className="flex-1 rounded-xl py-2 text-sm font-bold flex items-center justify-center gap-1.5 bg-secondary text-secondary-foreground transition-all active:scale-[0.97]"
          >
            <MessageCircle className="h-4 w-4" /> Message
          </button>
          <button
            onClick={handleShare}
            className="rounded-xl py-2 px-3.5 text-sm font-bold flex items-center justify-center bg-secondary text-secondary-foreground transition-all active:scale-[0.97]"
          >
            <Share2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowReport(true)}
            className="rounded-xl py-2 px-3.5 text-sm font-bold flex items-center justify-center bg-secondary text-destructive transition-all active:scale-[0.97]"
          >
            <AlertTriangle className="h-4 w-4" />
          </button>
        </div>

        {/* Private account gate */}
        {!canViewContent && (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-muted-foreground/30 mb-4">
              <Lock className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="text-base font-bold">This account is private</p>
            <p className="text-sm text-muted-foreground mt-1">Follow this account to see their posts and pets.</p>
          </div>
        )}

        {/* Content visible only if allowed */}
        {canViewContent && (
          <>
            {/* Provider card */}
            {providerData && (
              <button
                onClick={() => navigate(`/provider/${providerData.id}`)}
                className="mx-4 mt-3 flex items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left transition-all active:scale-[0.98]"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Briefcase className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{providerData.business_name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {targetSettings?.show_rating_publicly !== false && (
                      <span className="flex items-center gap-0.5">
                        <Star className="h-3 w-3 fill-primary text-primary" />
                        {Number(providerData.avg_rating).toFixed(1)}
                      </span>
                    )}
                    <span>({providerData.total_reviews} reviews)</span>
                    {providerData.is_verified && <BadgeCheck className="h-3 w-3 text-primary" />}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            )}

            {/* Business card */}
            {businessData && (
              <button
                onClick={() => navigate(`/store/${businessData.id}`)}
                className="mx-4 mt-3 flex items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left transition-all active:scale-[0.98]"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  {businessData.logo_url ? (
                    <img src={businessData.logo_url} alt="" className="h-10 w-10 rounded-xl object-cover" />
                  ) : (
                    <Briefcase className="h-5 w-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{businessData.business_name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {targetSettings?.show_rating_publicly !== false && (
                      <span className="flex items-center gap-0.5">
                        <Star className="h-3 w-3 fill-primary text-primary" />
                        {Number(businessData.avg_rating).toFixed(1)}
                      </span>
                    )}
                    <span>({businessData.total_reviews} reviews)</span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            )}

            {/* Pet highlights row */}
            {pets.length > 0 && (
              <div className="mt-3 px-4">
                <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-1">
                  {pets.map((pet) => (
                    <PetCard key={pet.id} pet={pet} onClick={setViewPet} />
                  ))}
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="flex border-b border-border mt-3">
              <button
                onClick={() => setActiveTab("posts")}
                className={`flex-1 py-3 flex items-center justify-center transition-colors ${
                  activeTab === "posts" ? "border-b-2 border-foreground" : "text-muted-foreground"
                }`}
              >
                <Grid3X3 className="h-5 w-5" />
              </button>
              <button
                onClick={() => setActiveTab("pets")}
                className={`flex-1 py-3 flex items-center justify-center transition-colors ${
                  activeTab === "pets" ? "border-b-2 border-foreground" : "text-muted-foreground"
                }`}
              >
                <PawPrint className="h-5 w-5" />
              </button>
              <button
                onClick={() => setActiveTab("tagged")}
                className={`flex-1 py-3 flex items-center justify-center transition-colors ${
                  activeTab === "tagged" ? "border-b-2 border-foreground" : "text-muted-foreground"
                }`}
              >
                <Tag className="h-5 w-5" />
              </button>
            </div>

            {/* Tab content */}
            <div
              onTouchStart={handleTabTouchStart}
              onTouchEnd={handleTabTouchEnd}
              className="min-h-[30vh]"
            >
              {activeTab === "posts" && (
                <div className="animate-fade-in">
                  {posts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <Grid3X3 className="h-12 w-12 text-muted-foreground/30 mb-3" />
                      <p className="text-sm font-semibold text-muted-foreground">No posts yet</p>
                    </div>
                  ) : (
                    <PostGrid
                      posts={posts}
                      onRefresh={fetchProfile}
                      ownerProfile={{
                        avatar_url: profile?.avatar_url,
                        full_name: profile?.full_name,
                        username: profile?.username || profile?.user_id,
                        user_id: profile?.user_id,
                      }}
                    />
                  )}
                </div>
              )}

              {activeTab === "pets" && (
                <div className="animate-fade-in px-4 py-4">
                  {pets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <PawPrint className="h-12 w-12 text-muted-foreground/30 mb-3" />
                      <p className="text-sm font-semibold text-muted-foreground">No pets added yet</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {pets.map((pet) => {
                        const emoji = animalTypes.find(a => a.value === pet.animal_type)?.emoji || "🐾";
                        return (
                          <button
                            key={pet.id}
                            onClick={() => setViewPet(pet)}
                            className="rounded-2xl border border-border bg-card overflow-hidden text-left transition-all active:scale-[0.97]"
                          >
                            {pet.photo_url ? (
                              <img src={pet.photo_url} alt={pet.name} className="w-full aspect-square object-cover" />
                            ) : (
                              <div className="w-full aspect-square bg-secondary flex items-center justify-center text-4xl">
                                {emoji}
                              </div>
                            )}
                            <div className="p-3">
                              <p className="font-display text-sm font-bold truncate">{pet.name}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {pet.breed || pet.animal_type}
                                {pet.age ? ` · ${pet.age}` : ""}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "tagged" && (
                <div className="animate-fade-in flex flex-col items-center justify-center py-16 text-center">
                  <Tag className="h-12 w-12 text-muted-foreground/30 mb-3" />
                  <p className="text-sm font-semibold text-muted-foreground">No tagged posts</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Pet profile modal */}
      {viewPet && (
        <PetProfileModal
          pet={viewPet}
          open={!!viewPet}
          onOpenChange={(open) => !open && setViewPet(null)}
          isOwner={false}
          onEdit={() => {}}
          onDelete={() => {}}
        />
      )}

      {/* Follow list modal */}
      {profile && (
        <FollowListModal
          open={followListOpen}
          onOpenChange={setFollowListOpen}
          userId={profile.user_id}
          type={followListType}
        />
      )}

      {/* Share modal */}
      {shareOpen && profile && (
        <ProfileShareModal
          profile={{
            user_id: profile.user_id,
            full_name: profile.full_name,
            username: profile.username,
            avatar_url: profile.avatar_url,
          }}
          onClose={() => setShareOpen(false)}
        />
      )}

      <ReportModal
        open={showReport}
        onOpenChange={setShowReport}
        reportedUserId={profile?.user_id}
        contentType="user"
      />
    </AppLayout>
  );
};

export default UserProfilePage;
