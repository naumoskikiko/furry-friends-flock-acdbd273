import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft } from "lucide-react";
import FeedPostCard from "@/components/FeedPostCard";
import type { FeedPostData } from "@/hooks/useFeed";

const PostDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [post, setPost] = useState<FeedPostData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !user) return;

    const fetchPost = async () => {
      setLoading(true);
      const { data: rawPost } = await supabase
        .from("posts")
        .select("*")
        .eq("id", id)
        .single();

      if (!rawPost) { setLoading(false); return; }

      const [profileRes, petRes, likeRes, saveRes] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name, avatar_url, role").eq("user_id", rawPost.user_id).single(),
        rawPost.pet_id ? supabase.from("pets").select("name, breed").eq("id", rawPost.pet_id).single() : { data: null },
        supabase.from("post_likes").select("id").eq("post_id", id).eq("user_id", user.id).maybeSingle(),
        (supabase as any).from("saved_posts").select("id").eq("post_id", id).eq("user_id", user.id).maybeSingle(),
      ]);

      const profile = profileRes.data;
      const pet = petRes.data;

      setPost({
        id: rawPost.id,
        user_id: rawPost.user_id,
        caption: rawPost.caption,
        image_url: rawPost.image_url,
        post_type: rawPost.post_type,
        location: rawPost.location,
        latitude: (rawPost as any).latitude ?? null,
        longitude: (rawPost as any).longitude ?? null,
        likes_count: rawPost.likes_count,
        comments_count: rawPost.comments_count,
        created_at: rawPost.created_at,
        pet_id: rawPost.pet_id,
        username: profile?.full_name || "User",
        avatar_url: profile?.avatar_url || null,
        user_role: profile?.role || "owner",
        pet_name: pet?.name || null,
        pet_breed: pet?.breed || null,
        is_liked: !!likeRes.data,
        is_saved: !!saveRes.data,
      });
      setLoading(false);
    };

    fetchPost();
  }, [id, user]);

  return (
    <div className="min-h-screen bg-background">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="rounded-full p-1.5 hover:bg-secondary">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-display font-bold text-lg">Post</h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : !post ? (
        <div className="text-center py-20 text-muted-foreground">Post not found</div>
      ) : (
        <FeedPostCard
          post={post}
          onLikeToggle={(_id, _liked, _count) => {}}
          onSaveToggle={() => {}}
          onDelete={() => navigate(-1)}
        />
      )}
    </div>
  );
};

export default PostDetailPage;
