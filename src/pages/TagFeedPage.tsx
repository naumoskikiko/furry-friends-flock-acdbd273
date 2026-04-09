import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Hash } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PostGrid from "@/components/profile/PostGrid";
import BlogCard, { type BlogPostData } from "@/components/blog/BlogCard";
import BlogArticleViewer from "@/components/blog/BlogArticleViewer";

const TagFeedPage = () => {
  const { tag } = useParams<{ tag: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [articles, setArticles] = useState<BlogPostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | "posts" | "articles">("all");
  const [selectedArticle, setSelectedArticle] = useState<BlogPostData | null>(null);
  const [articleViewerOpen, setArticleViewerOpen] = useState(false);

  const decodedTag = decodeURIComponent(tag || "");

  useEffect(() => {
    if (decodedTag) fetchTagContent();
  }, [decodedTag, user]);

  const fetchTagContent = async () => {
    if (!decodedTag) return;
    setLoading(true);

    // Search posts where caption contains the tag
    const { data: postData } = await supabase
      .from("posts")
      .select("*")
      .ilike("caption", `%#${decodedTag}%`)
      .order("created_at", { ascending: false });

    setPosts(postData || []);

    // Search blog_posts where tags array contains the tag
    const { data: blogData } = await supabase
      .from("blog_posts")
      .select("*")
      .contains("tags", [decodedTag])
      .order("created_at", { ascending: false });

    if (blogData && blogData.length > 0) {
      const userIds = [...new Set(blogData.map((b) => b.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", userIds);
      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

      let likedSet = new Set<string>();
      let savedSet = new Set<string>();
      if (user) {
        const blogIds = blogData.map((b) => b.id);
        const [likesRes, savesRes] = await Promise.all([
          (supabase as any).from("blog_likes").select("blog_post_id").eq("user_id", user.id).in("blog_post_id", blogIds),
          (supabase as any).from("blog_saves").select("blog_post_id").eq("user_id", user.id).in("blog_post_id", blogIds),
        ]);
        likedSet = new Set(likesRes.data?.map((l: any) => l.blog_post_id) || []);
        savedSet = new Set(savesRes.data?.map((s: any) => s.blog_post_id) || []);
      }

      setArticles(
        blogData.map((b) => ({
          id: b.id,
          user_id: b.user_id,
          title: b.title,
          cover_image: b.cover_image,
          content: b.content,
          preview_text: b.preview_text || b.content?.slice(0, 120) || "",
          category: b.category,
          tags: b.tags || [],
          likes_count: b.likes_count,
          comments_count: b.comments_count,
          created_at: b.created_at,
          username: profileMap.get(b.user_id)?.full_name || "Unknown",
          avatar_url: profileMap.get(b.user_id)?.avatar_url || null,
          is_liked: likedSet.has(b.id),
          is_saved: savedSet.has(b.id),
          post_type: b.post_type,
          event_date: b.event_date,
          event_start_time: b.event_start_time,
          event_end_time: b.event_end_time,
          event_location: b.event_location,
          event_max_participants: b.event_max_participants,
          event_pet_types: b.event_pet_types,
        }))
      );
    } else {
      setArticles([]);
    }

    setLoading(false);
  };

  const filteredPosts = tab === "articles" ? [] : posts;
  const filteredArticles = tab === "posts" ? [] : articles;
  const totalCount = posts.length + articles.length;

  return (
    <AppLayout>
      <div className="mx-auto max-w-lg">
        {/* Header */}
        <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-background/95 backdrop-blur-sm px-4 py-3">
          <button onClick={() => navigate(-1)} className="rounded-full p-1 hover:bg-secondary transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-1.5">
            <Hash className="h-5 w-5 text-primary" />
            <h1 className="font-display text-lg font-extrabold">{decodedTag}</h1>
          </div>
          <span className="ml-auto text-xs text-muted-foreground">{totalCount} results</span>
        </div>

        {/* Filter tabs */}
        <div className="flex border-b border-border">
          {(["all", "posts", "articles"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-xs font-bold capitalize transition-colors ${
                tab === t ? "border-b-2 border-foreground text-foreground" : "text-muted-foreground"
              }`}
            >
              {t} ({t === "all" ? totalCount : t === "posts" ? posts.length : articles.length})
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <span className="text-sm text-muted-foreground">Loading...</span>
          </div>
        ) : totalCount === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <Hash className="h-12 w-12 text-muted-foreground/40" />
            <p className="mt-3 text-sm font-semibold text-muted-foreground">
              No content for #{decodedTag} yet
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Be the first to use this tag!
            </p>
          </div>
        ) : (
          <div>
            {/* Posts grid */}
            {filteredPosts.length > 0 && (
              <div>
                {tab === "all" && (
                  <p className="px-4 pt-3 pb-1 text-xs font-bold text-muted-foreground uppercase tracking-wider">Posts</p>
                )}
                <PostGrid posts={filteredPosts} onRefresh={fetchTagContent} />
              </div>
            )}

            {/* Articles */}
            {filteredArticles.length > 0 && (
              <div>
                {tab === "all" && (
                  <p className="px-4 pt-4 pb-1 text-xs font-bold text-muted-foreground uppercase tracking-wider">Articles</p>
                )}
                {filteredArticles.map((article) => (
                  <BlogCard
                    key={article.id}
                    post={article}
                    onOpen={(p) => {
                      setSelectedArticle(p);
                      setArticleViewerOpen(true);
                    }}
                    onLikeChange={() => {}}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <BlogArticleViewer
        post={selectedArticle}
        open={articleViewerOpen}
        onOpenChange={(open) => {
          setArticleViewerOpen(open);
          if (!open) setSelectedArticle(null);
        }}
        onRefresh={fetchTagContent}
      />
    </AppLayout>
  );
};

export default TagFeedPage;
