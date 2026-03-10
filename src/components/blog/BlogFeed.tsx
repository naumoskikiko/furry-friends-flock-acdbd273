import { useState, useEffect, useCallback } from "react";
import { Loader2, PenSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import BlogCard, { type BlogPostData } from "./BlogCard";
import BlogArticleViewer from "./BlogArticleViewer";
import CreateBlogModal from "./CreateBlogModal";

const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "pet-training", label: "🎓 Training" },
  { value: "pet-health", label: "🏥 Health" },
  { value: "nutrition", label: "🍖 Nutrition" },
  { value: "grooming", label: "✂️ Grooming" },
  { value: "adoption", label: "🏠 Adoption" },
  { value: "pet-lifestyle", label: "🐾 Lifestyle" },
];

const BlogFeed = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<BlogPostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("all");
  const [selectedPost, setSelectedPost] = useState<BlogPostData | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const fetchBlogs = useCallback(async () => {
    setLoading(true);
    let query = (supabase as any)
      .from("blog_posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (category !== "all") {
      query = query.eq("category", category);
    }

    const { data: rawPosts } = await query;
    if (!rawPosts || rawPosts.length === 0) {
      setPosts([]);
      setLoading(false);
      return;
    }

    const userIds = [...new Set(rawPosts.map((p: any) => p.user_id))];
    const postIds = rawPosts.map((p: any) => p.id);

    const [profilesRes, likesRes, savesRes] = await Promise.all([
      supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", userIds as string[]),
      user ? (supabase as any).from("blog_likes").select("blog_post_id").eq("user_id", user.id).in("blog_post_id", postIds) : { data: [] },
      user ? (supabase as any).from("blog_saves").select("blog_post_id").eq("user_id", user.id).in("blog_post_id", postIds) : { data: [] },
    ]);

    const profileMap = new Map(profilesRes.data?.map((p) => [p.user_id, p]) || []);
    const likedSet = new Set((likesRes.data || []).map((l: any) => l.blog_post_id));
    const savedSet = new Set((savesRes.data || []).map((s: any) => s.blog_post_id));

    const enriched: BlogPostData[] = rawPosts.map((p: any) => {
      const profile = profileMap.get(p.user_id);
      return {
        id: p.id,
        user_id: p.user_id,
        title: p.title,
        cover_image: p.cover_image,
        content: p.content,
        preview_text: p.preview_text || "",
        category: p.category,
        tags: p.tags || [],
        likes_count: p.likes_count,
        comments_count: p.comments_count,
        created_at: p.created_at,
        username: profile?.full_name || "User",
        avatar_url: profile?.avatar_url || null,
        is_liked: likedSet.has(p.id),
        is_saved: savedSet.has(p.id),
      };
    });

    setPosts(enriched);
    setLoading(false);
  }, [user, category]);

  useEffect(() => {
    fetchBlogs();
  }, [fetchBlogs]);

  return (
    <div>
      {/* Category filter */}
      <div className="border-b border-border bg-card px-4 py-2">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategory(cat.value)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                category === cat.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Create blog CTA */}
      <button
        onClick={() => setCreateOpen(true)}
        className="mx-4 mt-3 flex w-[calc(100%-2rem)] items-center gap-3 rounded-2xl border border-dashed border-border bg-card p-3 transition-colors hover:border-primary hover:bg-primary/5"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <PenSquare className="h-5 w-5 text-primary" />
        </div>
        <div className="text-left">
          <p className="text-sm font-bold">Write a blog post</p>
          <p className="text-[10px] text-muted-foreground">Share your pet knowledge with the community</p>
        </div>
      </button>

      {/* Blog posts */}
      <div className="mt-3">
        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        {!loading && posts.length === 0 && (
          <div className="flex flex-col items-center py-12 text-center">
            <span className="text-4xl">📝</span>
            <p className="mt-3 font-display font-bold">No blog posts yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Be the first to share your pet knowledge!</p>
          </div>
        )}

        {posts.map((post) => (
          <BlogCard key={post.id} post={post} onOpen={setSelectedPost} onLikeChange={fetchBlogs} />
        ))}
      </div>

      {/* Article viewer */}
      <BlogArticleViewer
        post={selectedPost}
        open={!!selectedPost}
        onOpenChange={(v) => { if (!v) setSelectedPost(null); }}
        onRefresh={fetchBlogs}
      />

      {/* Create blog modal */}
      <CreateBlogModal open={createOpen} onOpenChange={setCreateOpen} onBlogCreated={fetchBlogs} />
    </div>
  );
};

export default BlogFeed;
