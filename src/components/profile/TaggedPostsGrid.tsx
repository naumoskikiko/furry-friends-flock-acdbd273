import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Tag } from "lucide-react";

interface TaggedPostsGridProps {
  userId: string;
}

const TaggedPostsGrid = ({ userId }: TaggedPostsGridProps) => {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      // Get post IDs where this user is tagged
      const { data: tags } = await (supabase as any)
        .from("post_tags")
        .select("post_id")
        .eq("tagged_user_id", userId)
        .eq("status", "approved");

      if (!tags || tags.length === 0) {
        setPosts([]);
        setLoading(false);
        return;
      }

      const postIds = tags.map((t: any) => t.post_id);
      const { data: postsData } = await supabase
        .from("posts")
        .select("id, image_url, post_type")
        .in("id", postIds)
        .order("created_at", { ascending: false });

      setPosts(postsData || []);
      setLoading(false);
    };
    fetch();
  }, [userId]);

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-0.5 p-0.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="aspect-square bg-secondary animate-pulse" />
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Tag className="h-12 w-12 text-muted-foreground/30 mb-3" />
        <p className="text-sm font-semibold text-muted-foreground">No tagged posts</p>
        <p className="text-xs text-muted-foreground mt-1">Posts you're tagged in will appear here</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-0.5 p-0.5">
      {posts.map(post => (
        <button
          key={post.id}
          onClick={() => navigate(`/post/${post.id}`)}
          className="relative aspect-square overflow-hidden bg-secondary"
        >
          {post.image_url ? (
            post.post_type === "video" ? (
              <video src={post.image_url} className="h-full w-full object-cover" muted preload="metadata" />
            ) : (
              <img src={post.image_url} alt="" className="h-full w-full object-cover" loading="lazy" />
            )
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-secondary text-muted-foreground text-xs">
              Text
            </div>
          )}
        </button>
      ))}
    </div>
  );
};

export default TaggedPostsGrid;
