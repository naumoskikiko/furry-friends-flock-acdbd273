import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Heart, MessageCircle, Share2, Bookmark, BookmarkCheck, MoreVertical, Link2, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger } from
"@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { BlogPostData } from "./BlogCard";

const fromTable = (table: string) => (supabase as any).from(table);

const CATEGORY_META: Record<string, {label: string;icon: string;}> = {
  "pet-training": { label: "Pet Training", icon: "🎓" },
  "pet-health": { label: "Pet Health", icon: "🏥" },
  "nutrition": { label: "Nutrition", icon: "🍖" },
  "grooming": { label: "Grooming", icon: "✂️" },
  "adoption": { label: "Adoption", icon: "🏠" },
  "pet-lifestyle": { label: "Pet Lifestyle", icon: "🐾" }
};

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  username: string;
  avatar_url: string | null;
}

interface BlogArticleViewerProps {
  post: BlogPostData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh: () => void;
}

const BlogArticleViewer = ({ post, open, onOpenChange, onRefresh }: BlogArticleViewerProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [saved, setSaved] = useState(false);
  const [readProgress, setReadProgress] = useState(0);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (post && open) {
      setLiked(post.is_liked);
      setLikesCount(post.likes_count);
      loadComments();
      checkSaved();
      setReadProgress(0);
    }
  }, [post, open]);

  // Reading progress bar
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollTop = el.scrollTop;
    const scrollHeight = el.scrollHeight - el.clientHeight;
    if (scrollHeight > 0) {
      setReadProgress(Math.min(1, scrollTop / scrollHeight));
    }
  }, []);

  const checkSaved = async () => {
    if (!user || !post) return;
    const { data } = await fromTable("blog_saves").
    select("id").
    eq("blog_post_id", post.id).
    eq("user_id", user.id).
    maybeSingle();
    setSaved(!!data);
  };

  const loadComments = async () => {
    if (!post) return;
    const { data } = await fromTable("blog_comments").
    select("*").
    eq("blog_post_id", post.id).
    order("created_at", { ascending: true });

    if (data && data.length > 0) {
      const userIds = [...new Set(data.map((c: any) => c.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, avatar_url, username").in("user_id", userIds as string[]);
      const pMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);
      setComments(
        data.map((c: any) => ({
          id: c.id,
          user_id: c.user_id,
          content: c.content,
          created_at: c.created_at,
          username: pMap.get(c.user_id)?.full_name || "User",
          avatar_url: pMap.get(c.user_id)?.avatar_url || null
        }))
      );
    } else {
      setComments([]);
    }
  };

  const addComment = async () => {
    if (!user || !post || !newComment.trim()) return;
    await fromTable("blog_comments").insert({ blog_post_id: post.id, user_id: user.id, content: newComment.trim() });
    await fromTable("blog_posts").update({ comments_count: (post.comments_count || 0) + 1 }).eq("id", post.id);
    setNewComment("");
    loadComments();
    onRefresh();
  };

  const deleteComment = async (commentId: string) => {
    if (!post) return;
    await fromTable("blog_comments").delete().eq("id", commentId);
    await fromTable("blog_posts").update({ comments_count: Math.max(0, (post.comments_count || 0) - 1) }).eq("id", post.id);
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    onRefresh();
    toast({ title: "Comment deleted" });
  };

  const toggleLike = async () => {
    if (!user || !post) return;
    const newLiked = !liked;
    setLiked(newLiked);
    setLikesCount((c) => newLiked ? c + 1 : Math.max(0, c - 1));
    if (newLiked) {
      await fromTable("blog_likes").insert({ blog_post_id: post.id, user_id: user.id });
      await fromTable("blog_posts").update({ likes_count: likesCount + 1 }).eq("id", post.id);
    } else {
      await fromTable("blog_likes").delete().eq("blog_post_id", post.id).eq("user_id", user.id);
      await fromTable("blog_posts").update({ likes_count: Math.max(0, likesCount - 1) }).eq("id", post.id);
    }
    onRefresh();
  };

  const toggleSave = async () => {
    if (!user || !post) return;
    if (saved) {
      await fromTable("blog_saves").delete().eq("blog_post_id", post.id).eq("user_id", user.id);
      setSaved(false);
      toast({ title: "Removed from saved" });
    } else {
      await fromTable("blog_saves").insert({ blog_post_id: post.id, user_id: user.id });
      setSaved(true);
      toast({ title: "Article saved" });
    }
  };

  const handleShareArticle = () => {
    const url = `${window.location.origin}/?article=${post?.id}`;
    if (navigator.share) {
      navigator.share({ title: post?.title, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      toast({ title: "Article link copied!" });
    }
  };

  const goToProfile = (userId: string) => {
    onOpenChange(false);
    if (user?.id === userId) {
      navigate("/profile");
    } else {
      navigate(`/user/${userId}`);
    }
  };

  const canDeleteComment = (c: Comment) => {
    if (!user || !post) return false;
    return user.id === c.user_id || user.id === post.user_id;
  };

  if (!post || !open) return null;

  const cat = CATEGORY_META[post.category] || { label: post.category, icon: "📝" };
  const initials = post.username.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const readTime = Math.max(1, Math.ceil(post.content.length / 1000));
  const paragraphs = post.content.split("\n").filter((p) => p.trim());

  return (
    <div className="fixed inset-0 z-[100] bg-background">
      {/* Reading progress bar */}
      <div className="fixed top-0 left-0 right-0 z-[110] h-[3px] bg-secondary">
        <div
          className="h-full bg-primary transition-[width] duration-100 ease-out"
          style={{ width: `${readProgress * 100}%` }} />
        
      </div>

      {/* Sticky header */}
      <div className="sticky top-0 z-[105] flex items-center justify-between border-b border-border bg-background/95 backdrop-blur-sm px-4 py-3">
        <button onClick={() => onOpenChange(false)} className="rounded-full p-1 hover:bg-secondary transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-semibold text-primary px-2 py-0.5 rounded-full bg-primary/10">
            {cat.icon} {cat.label}
          </span>
        </div>
        










        
      </div>

      {/* Scrollable content */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="h-[calc(100vh-53px)] overflow-y-auto overscroll-contain scroll-smooth">
        
        {/* Cover image */}
        {post.cover_image &&
        <button
          onClick={() => setFullscreenImage(post.cover_image)}
          className="w-full">
          
            <img
            src={post.cover_image}
            alt={post.title}
            className="w-full aspect-[16/9] object-cover" />
          
          </button>
        }

        {/* Article body - centered, readable width */}
        <article className="px-5 pb-8 max-w-[640px] mx-auto">
          {/* Title */}
          <h1 className="mt-6 font-display text-2xl font-extrabold leading-tight tracking-tight">
            {post.title}
          </h1>

          {/* Author meta */}
          <div className="mt-4 flex items-center gap-3">
            <button onClick={() => goToProfile(post.user_id)}>
              {post.avatar_url ?
              <img src={post.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" /> :

              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-sm font-bold text-primary-foreground">
                  {initials}
                </div>
              }
            </button>
            <div>
              <button onClick={() => goToProfile(post.user_id)} className="text-sm font-bold hover:underline">
                {post.username}
              </button>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })} · {readTime} min read
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="my-6 border-t border-border" />

          {/* Content — better typography */}
          <div className="space-y-4">
            {paragraphs.map((p, i) =>
            <p key={i} className="text-[15px] leading-[1.8] text-foreground/90">
                {p}
              </p>
            )}
          </div>

          {/* Tags */}
          {post.tags && post.tags.length > 0 &&
          <div className="mt-8 flex flex-wrap gap-2">
              {post.tags.map((tag) =>
            <span key={tag} className="rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-foreground/70">
                  #{tag}
                </span>
            )}
            </div>
          }

          {/* Interaction bar */}
          <div className="mt-8 flex items-center gap-5 border-y border-border py-4">
            <button onClick={toggleLike} className="flex items-center gap-1.5 transition-transform active:scale-90">
              <Heart className={`h-5 w-5 ${liked ? "fill-primary text-primary" : "text-muted-foreground"}`} />
              <span className="text-sm font-medium">{likesCount}</span>
            </button>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <MessageCircle className="h-5 w-5" />
              <span className="text-sm font-medium">{comments.length}</span>
            </div>
            <div className="flex-1" />
            <button onClick={toggleSave} className="transition-transform active:scale-90">
              {saved ?
              <BookmarkCheck className="h-5 w-5 text-primary fill-primary" /> :

              <Bookmark className="h-5 w-5 text-muted-foreground" />
              }
            </button>
            <button onClick={handleShareArticle} className="transition-transform active:scale-90">
              <Share2 className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>

          {/* Comments section */}
          <div className="mt-6">
            <h3 className="font-display text-base font-bold mb-4">
              Comments ({comments.length})
            </h3>

            {comments.length === 0 &&
            <p className="text-sm text-muted-foreground py-4 text-center">No comments yet. Be the first to share your thoughts!</p>
            }

            <div className="space-y-4">
              {comments.map((c) =>
              <div key={c.id} className="flex items-start gap-3">
                  <button onClick={() => goToProfile(c.user_id)} className="shrink-0">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={c.avatar_url || undefined} />
                      <AvatarFallback className="bg-secondary text-[10px] font-bold">
                        {c.username[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                  <div className="min-w-0 flex-1 rounded-2xl bg-secondary/50 px-3.5 py-2.5">
                    <div className="flex items-center gap-2">
                      <button onClick={() => goToProfile(c.user_id)} className="text-xs font-bold hover:underline">
                        {c.username}
                      </button>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="mt-1 text-sm leading-relaxed">{c.content}</p>
                  </div>
                  {canDeleteComment(c) &&
                <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="shrink-0 p-1 text-muted-foreground hover:text-foreground mt-2">
                          <MoreVertical className="h-3.5 w-3.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="text-destructive" onClick={() => deleteComment(c.id)}>
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                }
                </div>
              )}
            </div>

            {/* Comment input */}
            <div className="mt-4 flex gap-2 sticky bottom-0 bg-background py-3">
              <Input
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="flex-1 rounded-full text-sm"
                onKeyDown={(e) => e.key === "Enter" && addComment()} />
              
              <Button
                size="sm"
                onClick={addComment}
                disabled={!newComment.trim()}
                className="rounded-full px-4">
                
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </article>
      </div>

      {/* Fullscreen image viewer */}
      {fullscreenImage &&
      <div
        className="fixed inset-0 z-[120] bg-black flex items-center justify-center"
        onClick={() => setFullscreenImage(null)}>
        
          <button className="absolute top-4 right-4 text-white z-10">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <img src={fullscreenImage} alt="" className="max-h-full max-w-full object-contain" />
        </div>
      }
    </div>);

};

export default BlogArticleViewer;