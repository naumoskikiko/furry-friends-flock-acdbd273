import { useState, useEffect } from "react";
import { Bookmark } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PostGrid from "./PostGrid";

const SavedPostsGrid = () => {
  const { user } = useAuth();
  const [savedPosts, setSavedPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSavedPosts = async () => {
    if (!user) return;
    setLoading(true);
    const { data: saves } = await (supabase as any)
      .from("saved_posts")
      .select("post_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (saves && saves.length > 0) {
      const postIds = saves.map((s: any) => s.post_id);
      const { data: posts } = await supabase.from("posts").select("*").in("id", postIds);
      const postMap = new Map(posts?.map((p) => [p.id, p]) || []);
      setSavedPosts(postIds.map((id: string) => postMap.get(id)).filter(Boolean));
    } else {
      setSavedPosts([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchSavedPosts(); }, [user]);

  if (loading) {
    return <div className="flex justify-center py-12"><span className="text-sm text-muted-foreground">Loading...</span></div>;
  }

  if (savedPosts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Bookmark className="h-8 w-8 text-muted-foreground" />
        <p className="mt-2 text-sm font-semibold text-muted-foreground">No saved posts yet</p>
      </div>
    );
  }

  return <PostGrid posts={savedPosts} onRefresh={fetchSavedPosts} />;
};

export default SavedPostsGrid;
