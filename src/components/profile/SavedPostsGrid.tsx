import { useState, useEffect } from "react";
import { Bookmark, Newspaper, Image } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PostGrid from "./PostGrid";

const SavedPostsGrid = () => {
  const { user } = useAuth();
  const [savedPosts, setSavedPosts] = useState<any[]>([]);
  const [savedBlogs, setSavedBlogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"posts" | "blogs">("posts");

  const fetchSaved = async () => {
    if (!user) return;
    setLoading(true);

    const [postsRes, blogsRes] = await Promise.all([
      supabase
        .from("saved_posts")
        .select("post_id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("blog_saves")
        .select("blog_post_id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

    // Fetch saved posts
    if (postsRes.data && postsRes.data.length > 0) {
      const postIds = postsRes.data.map((s) => s.post_id);
      const { data: posts } = await supabase.from("posts").select("*").in("id", postIds);
      const postMap = new Map(posts?.map((p) => [p.id, p]) || []);
      setSavedPosts(postIds.map((id) => postMap.get(id)).filter(Boolean));
    } else {
      setSavedPosts([]);
    }

    // Fetch saved blogs
    if (blogsRes.data && blogsRes.data.length > 0) {
      const blogIds = blogsRes.data.map((s) => s.blog_post_id);
      const { data: blogs } = await supabase.from("blog_posts").select("*").in("id", blogIds);
      if (blogs && blogs.length > 0) {
        const userIds = [...new Set(blogs.map((b) => b.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url")
          .in("user_id", userIds);
        const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);
        const blogMap = new Map(
          blogs.map((b) => [b.id, { ...b, author: profileMap.get(b.user_id) }])
        );
        const ordered = blogIds.map((id) => blogMap.get(id)).filter(Boolean);
        setSavedBlogs(ordered);
      } else {
        setSavedBlogs([]);
      }
    } else {
      setSavedBlogs([]);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchSaved();
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  return (
    <div>
      {/* Sub-tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setTab("posts")}
          className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-bold transition-colors ${
            tab === "posts"
              ? "border-b-2 border-foreground text-foreground"
              : "text-muted-foreground"
          }`}
        >
          <Image className="h-3.5 w-3.5" />
          Posts ({savedPosts.length})
        </button>
        <button
          onClick={() => setTab("blogs")}
          className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-bold transition-colors ${
            tab === "blogs"
              ? "border-b-2 border-foreground text-foreground"
              : "text-muted-foreground"
          }`}
        >
          <Newspaper className="h-3.5 w-3.5" />
          Articles ({savedBlogs.length})
        </button>
      </div>

      {tab === "posts" && (
        <>
          {savedPosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bookmark className="h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm font-semibold text-muted-foreground">
                No saved posts yet
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Tap the bookmark icon on posts to save them here
              </p>
            </div>
          ) : (
            <PostGrid posts={savedPosts} onRefresh={fetchSaved} />
          )}
        </>
      )}

      {tab === "blogs" && (
        <>
          {savedBlogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Newspaper className="h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm font-semibold text-muted-foreground">
                No saved articles yet
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Save blog articles to read them later
              </p>
            </div>
          ) : (
            <div className="space-y-3 p-4">
              {savedBlogs.map((blog: any) => (
                <div
                  key={blog.id}
                  className="flex gap-3 rounded-xl border border-border bg-card p-3"
                >
                  {blog.cover_image && (
                    <img
                      src={blog.cover_image}
                      alt=""
                      className="h-20 w-20 shrink-0 rounded-lg object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <h4 className="font-display text-sm font-bold leading-tight line-clamp-2">
                      {blog.title}
                    </h4>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {blog.author?.full_name || "Unknown"}
                    </p>
                    {blog.preview_text && (
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                        {blog.preview_text}
                      </p>
                    )}
                    <span className="mt-1 inline-block rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold capitalize text-secondary-foreground">
                      {blog.category?.replace("-", " ")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SavedPostsGrid;
