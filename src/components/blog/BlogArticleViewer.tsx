import { useState, useEffect } from "react";
import { X, Heart, Send, ArrowLeft, MoreVertical } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { BlogPostData } from "./BlogCard";

const CATEGORY_META: Record<string, { label: string; icon: string }> = {
  "pet-training": { label: "Pet Training", icon: "🎓" },
  "pet-health": { label: "Pet Health", icon: "🏥" },
  "nutrition": { label: "Nutrition", icon: "🍖" },
  "grooming": { label: "Grooming", icon: "✂️" },
  "adoption": { label: "Adoption", icon: "🏠" },
  "pet-lifestyle": { label: "Pet Lifestyle", icon: "🐾" },
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
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);

  useEffect(() => {
    if (post && open) {
      setLiked(post.is_liked);
      setLikesCount(post.likes_count);
      loadComments();
    }
  }, [post, open]);

  const loadComments = async () => {
    if (!post) return;
    const { data } = await (supabase as any)
      .from("blog_comments")
      .select("*")
      .eq("blog_post_id", post.id)
      .order("created_at", { ascending: true });

    if (data && data.length > 0) {
      const userIds = [...new Set(data.map((c: any) => c.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", userIds as string[]);
      const pMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);
      setComments(
        data.map((c: any) => ({
          id: c.id,
          user_id: c.user_id,
          content: c.content,
          created_at: c.created_at,
          username: pMap.get(c.user_id)?.full_name || "User",
          avatar_url: pMap.get(c.user_id)?.avatar_url || null,
        }))
      );
    } else {
      setComments([]);
    }
  };

  const addComment = async () => {
    if (!user || !post || !newComment.trim()) return;
    await (supabase as any).from("blog_comments").insert({ blog_post_id: post.id, user_id: user.id, content: newComment.trim() });
    await (supabase as any).from("blog_posts").update({ comments_count: (post.comments_count || 0) + 1 }).eq("id", post.id);
    setNewComment("");
    loadComments();
    onRefresh();
  };

  const deleteComment = async (commentId: string) => {
    if (!post) return;
    await (supabase as any).from("blog_comments").delete().eq("id", commentId);
    await (supabase as any).from("blog_posts").update({ comments_count: Math.max(0, (post.comments_count || 0) - 1) }).eq("id", post.id);
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
      await (supabase as any).from("blog_likes").insert({ blog_post_id: post.id, user_id: user.id });
      await (supabase as any).from("blog_posts").update({ likes_count: likesCount + 1 }).eq("id", post.id);
    } else {
      await (supabase as any).from("blog_likes").delete().eq("blog_post_id", post.id).eq("user_id", user.id);
      await (supabase as any).from("blog_posts").update({ likes_count: Math.max(0, likesCount - 1) }).eq("id", post.id);
    }
    onRefresh();
  };

  const canDeleteComment = (c: Comment) => {
    if (!user || !post) return false;
    return user.id === c.user_id || user.id === post.user_id;
  };

  if (!post) return null;

  const cat = CATEGORY_META[post.category] || { label: post.category, icon: "📝" };
  const initials = post.username.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const readTime = Math.max(1, Math.ceil(post.content.length / 1000));

  // Render content paragraphs
  const paragraphs = post.content.split("\n").filter((p) => p.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[95vh] overflow-y-auto p-0">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background px-4 py-3">
          <button onClick={() => onOpenChange(false)}>
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="font-display text-sm font-bold">Article</span>
          <button onClick={toggleLike} className="transition-transform active:scale-90">
            <Heart className={`h-5 w-5 ${liked ? "fill-primary text-primary" : "text-foreground"}`} />
          </button>
        </div>

        {/* Cover */}
        {post.cover_image && (
          <img src={post.cover_image} alt={post.title} className="w-full aspect-video object-cover" />
        )}

        <div className="px-4 py-4">
          {/* Category */}
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-primary">
            {cat.icon} {cat.label}
          </span>

          {/* Title */}
          <h1 className="mt-3 font-display text-xl font-extrabold leading-tight">{post.title}</h1>

          {/* Author */}
          <div className="mt-3 flex items-center gap-2 border-b border-border pb-3">
            {post.avatar_url ? (
              <img src={post.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-petkeep-orange-light text-xs font-bold text-primary-foreground">
                {initials}
              </div>
            )}
            <div>
              <p className="text-sm font-bold">{post.username}</p>
              <p className="text-[10px] text-muted-foreground">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })} · {readTime} min read
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="mt-4 space-y-3">
            {paragraphs.map((p, i) => (
              <p key={i} className="text-sm leading-relaxed">{p}</p>
            ))}
          </div>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {post.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-primary">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Stats */}
          <div className="mt-4 flex items-center gap-4 border-t border-border pt-3">
            <button onClick={toggleLike} className="flex items-center gap-1">
              <Heart className={`h-5 w-5 ${liked ? "fill-primary text-primary" : "text-muted-foreground"}`} />
              <span className="text-xs">{likesCount}</span>
            </button>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              💬 {comments.length} comments
            </span>
          </div>

          {/* Comments */}
          <div className="mt-4 space-y-3">
            <h4 className="font-display text-sm font-bold">Comments</h4>
            {comments.length === 0 && (
              <p className="text-xs text-muted-foreground">No comments yet. Be the first!</p>
            )}
            {comments.map((c) => (
              <div key={c.id} className="flex items-start gap-2">
                {c.avatar_url ? (
                  <img src={c.avatar_url} alt="" className="h-6 w-6 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-[8px] font-bold">
                    {c.username[0]?.toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs">
                    <span className="font-bold">{c.username}</span> {c.content}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                  </p>
                </div>
                {canDeleteComment(c) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="shrink-0 p-0.5 text-muted-foreground hover:text-foreground">
                        <MoreVertical className="h-3.5 w-3.5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem className="text-destructive" onClick={() => deleteComment(c.id)}>
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            ))}

            <div className="flex gap-2">
              <Input
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="flex-1 text-sm"
                onKeyDown={(e) => e.key === "Enter" && addComment()}
              />
              <Button size="sm" onClick={addComment} disabled={!newComment.trim()}>
                Post
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BlogArticleViewer;
