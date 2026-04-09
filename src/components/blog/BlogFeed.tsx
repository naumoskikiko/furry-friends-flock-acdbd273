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
  
  { value: "adoption", label: "🏠 Adoption" },
  { value: "pet-lifestyle", label: "🐾 Lifestyle" },
];

interface BlogFeedProps {
  openBlogId?: string;
}

const BlogFeed = ({ openBlogId }: BlogFeedProps) => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<BlogPostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("all");
  const [selectedPost, setSelectedPost] = useState<BlogPostData | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [openedDeepLink, setOpenedDeepLink] = useState(false);

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
    const meetupIds = rawPosts.filter((p: any) => p.post_type === "meetup").map((p: any) => p.id);

    const batchPromises: Promise<any>[] = [
      supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", userIds as string[]),
      user ? (supabase as any).from("blog_likes").select("blog_post_id").eq("user_id", user.id).in("blog_post_id", postIds) : Promise.resolve({ data: [] }),
      user ? (supabase as any).from("blog_saves").select("blog_post_id").eq("user_id", user.id).in("blog_post_id", postIds) : Promise.resolve({ data: [] }),
    ];

    // Fetch participant counts for meetup posts
    if (meetupIds.length > 0) {
      batchPromises.push(
        (supabase as any).from("blog_event_participants").select("blog_post_id").in("blog_post_id", meetupIds)
      );
      if (user) {
        batchPromises.push(
          (supabase as any).from("blog_event_participants").select("blog_post_id").eq("user_id", user.id).in("blog_post_id", meetupIds)
        );
      }
    }

    const results = await Promise.all(batchPromises);
    const [profilesRes, likesRes, savesRes] = results;
    const participantsRes = meetupIds.length > 0 ? results[3] : { data: [] };
    const joinedRes = meetupIds.length > 0 && user ? results[4] : { data: [] };

    const profileMap = new Map(profilesRes.data?.map((p: any) => [p.user_id, p]) || []);
    const likedSet = new Set((likesRes.data || []).map((l: any) => l.blog_post_id));
    const savedSet = new Set((savesRes.data || []).map((s: any) => s.blog_post_id));
    const joinedSet = new Set((joinedRes?.data || []).map((j: any) => j.blog_post_id));

    // Count participants per post
    const participantCounts = new Map<string, number>();
    for (const p of (participantsRes?.data || [])) {
      participantCounts.set(p.blog_post_id, (participantCounts.get(p.blog_post_id) || 0) + 1);
    }

    const enriched: BlogPostData[] = rawPosts.map((p: any) => {
      const profile = profileMap.get(p.user_id) as any;
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
        post_type: p.post_type || "article",
        status: p.status || "active",
        event_date: p.event_date,
        event_start_time: p.event_start_time,
        event_end_time: p.event_end_time,
        event_location: p.event_location,
        event_max_participants: p.event_max_participants,
        event_pet_types: p.event_pet_types,
        participants_count: participantCounts.get(p.id) || 0,
        is_joined: joinedSet.has(p.id),
      };
    });

    // Active MeetUP posts always appear first, ended ones go to normal position
    const sorted = [...enriched].sort((a, b) => {
      const aIsMeetup = (a.post_type === "meetup" && a.status !== "ended") ? 1 : 0;
      const bIsMeetup = (b.post_type === "meetup" && b.status !== "ended") ? 1 : 0;
      if (aIsMeetup !== bIsMeetup) return bIsMeetup - aIsMeetup;
      return 0;
    });

    setPosts(sorted);
    setLoading(false);
  }, [user, category]);

  useEffect(() => {
    fetchBlogs();
  }, [fetchBlogs]);

  // Deep-link: auto-open a blog post by id (from chat share)
  useEffect(() => {
    if (!openBlogId || openedDeepLink || loading || posts.length === 0) return;
    const target = posts.find((p) => p.id === openBlogId);
    if (target) {
      setSelectedPost(target);
      setOpenedDeepLink(true);
    } else if (!loading) {
      // Post not in current category filter — fetch directly
      (async () => {
        const { data } = await (supabase as any).from("blog_posts").select("*").eq("id", openBlogId).single();
        if (data) {
          const profileRes = await supabase.from("profiles").select("full_name, avatar_url").eq("user_id", data.user_id).single();
          const blogPost: BlogPostData = {
            ...data,
            preview_text: data.preview_text || "",
            tags: data.tags || [],
            username: profileRes.data?.full_name || "User",
            avatar_url: profileRes.data?.avatar_url || null,
            is_liked: false,
            is_saved: false,
            post_type: data.post_type || "article",
            participants_count: 0,
            is_joined: false,
          };
          setSelectedPost(blogPost);
        }
        setOpenedDeepLink(true);
      })();
    }
  }, [openBlogId, openedDeepLink, loading, posts]);

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
          <p className="text-sm font-bold">Write a post or create a MeetUP</p>
          <p className="text-[10px] text-muted-foreground">Share knowledge or organize a pet event</p>
        </div>
      </button>

      {/* Blog posts */}
      <div className="mt-3">
        {loading && posts.length === 0 && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        {!loading && posts.length === 0 && (
          <div className="flex flex-col items-center py-12 text-center">
            <span className="text-4xl">📝</span>
            <p className="mt-3 font-display font-bold">No posts yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Be the first to share your pet knowledge!</p>
          </div>
        )}

        {posts.map((post) => (
          <BlogCard key={post.id} post={post} onOpen={setSelectedPost} />
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
