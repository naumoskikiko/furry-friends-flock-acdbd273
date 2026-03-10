import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, MapPin, Grid3X3, Star, UserPlus, UserCheck, MessageCircle } from "lucide-react";
import PostGrid from "@/components/profile/PostGrid";
import { getOrCreateConversation } from "@/hooks/useMessages";

const UserProfilePage = () => {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!username) return;
    setLoading(true);

    // Try by username first, then by user_id
    let profileData: any = null;
    const cleanUsername = username.startsWith("@") ? username.slice(1) : username;

    const { data: byUsername } = await supabase
      .from("profiles")
      .select("*")
      .eq("username", cleanUsername)
      .single();

    if (byUsername) {
      profileData = byUsername;
    } else {
      // Try by user_id
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

    setProfile(profileData);

    const [followers, following, postsRes] = await Promise.all([
      supabase.from("followers").select("id", { count: "exact", head: true }).eq("following_id", profileData.user_id),
      supabase.from("followers").select("id", { count: "exact", head: true }).eq("follower_id", profileData.user_id),
      supabase.from("posts").select("*").eq("user_id", profileData.user_id).order("created_at", { ascending: false }),
    ]);

    setFollowerCount(followers.count || 0);
    setFollowingCount(following.count || 0);
    setPosts(postsRes.data || []);

    if (user && user.id !== profileData.user_id) {
      const { data: followCheck } = await supabase
        .from("followers")
        .select("id")
        .eq("follower_id", user.id)
        .eq("following_id", profileData.user_id)
        .maybeSingle();
      setIsFollowing(!!followCheck);
    }

    setLoading(false);
  }, [username, user]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const handleFollow = async () => {
    if (!user || !profile) return;
    if (isFollowing) {
      await supabase.from("followers").delete().eq("follower_id", user.id).eq("following_id", profile.user_id);
      setIsFollowing(false);
      setFollowerCount((c) => c - 1);
    } else {
      await supabase.from("followers").insert({ follower_id: user.id, following_id: profile.user_id });
      setIsFollowing(true);
      setFollowerCount((c) => c + 1);
    }
  };

  // If this is the current user's profile, redirect
  useEffect(() => {
    if (profile && user && profile.user_id === user.id) {
      navigate("/profile", { replace: true });
    }
  }, [profile, user, navigate]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
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

  return (
    <AppLayout>
      <div className="mx-auto max-w-lg">
        <div className="flex items-center gap-3 px-4 pt-4">
          <button onClick={() => navigate(-1)} className="rounded-full p-1.5 hover:bg-secondary">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-display text-lg font-extrabold">
            @{profile.username || profile.user_id.slice(0, 8)}
          </h1>
        </div>

        <div className="flex flex-col items-center px-4 pt-4">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="Avatar" className="h-24 w-24 rounded-full object-cover" />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent font-display text-3xl font-bold text-primary-foreground">
              {initials}
            </div>
          )}
          <h2 className="mt-3 font-display text-xl font-extrabold">{displayName}</h2>
          {profile.location && (
            <p className="mt-0.5 text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {profile.location}
            </p>
          )}
          <p className="mt-1 text-sm text-center max-w-xs">{profile.bio || "No bio yet"}</p>
        </div>

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

        <div className="mt-3 px-4">
          <button
            onClick={handleFollow}
            className={`w-full rounded-xl py-2.5 text-sm font-bold flex items-center justify-center gap-2 ${
              isFollowing
                ? "bg-secondary text-secondary-foreground"
                : "petkeep-gradient text-primary-foreground"
            }`}
          >
            {isFollowing ? <><UserCheck className="h-4 w-4" /> Following</> : <><UserPlus className="h-4 w-4" /> Follow</>}
          </button>
        </div>

        <div className="flex border-t border-border mt-4">
          <div className="flex-1 py-3 flex items-center justify-center border-b-2 border-foreground">
            <Grid3X3 className="h-5 w-5" />
          </div>
        </div>

        <PostGrid posts={posts} onRefresh={fetchProfile} />
      </div>
    </AppLayout>
  );
};

export default UserProfilePage;
