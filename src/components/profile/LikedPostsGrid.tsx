import { useState, useEffect } from "react";
import { Heart, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PostGrid from "./PostGrid";

const LikedPostsGrid = () => {
  const { user } = useAuth();
  const [likedPosts, setLikedPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLikedPosts = async () => {
    if (!user) return;
    setLoading(true);
    const { data: likes } = await supabase
      .from("post_likes")
      .select("post_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (likes && likes.length > 0) {
      const postIds = likes.map(l => l.post_id);
      const { data: posts } = await supabase
        .from("posts")
        .select("*")
        .in("id", postIds);
      // Maintain liked order
      const postMap = new Map(posts?.map(p => [p.id, p]) || []);
      setLikedPosts(postIds.map(id => postMap.get(id)).filter(Boolean));
    } else {
      setLikedPosts([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchLikedPosts(); }, [user]);

  if (loading) {
    return <div className="flex justify-center py-12"><span className="text-sm text-muted-foreground">Loading...</span></div>;
  }

  if (likedPosts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Heart className="h-8 w-8 text-muted-foreground" />
        <p className="mt-2 text-sm font-semibold text-muted-foreground">No liked posts yet</p>
      </div>
    );
  }

  return <PostGrid posts={likedPosts} onRefresh={fetchLikedPosts} />;
};

export default LikedPostsGrid;
