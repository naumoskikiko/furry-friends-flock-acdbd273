import { useState } from "react";
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  MoreHorizontal,
  Play,
  Trash2,
  MoreVertical,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { FeedPostData } from "@/hooks/useFeed";

interface FeedPostCardProps {
  post: FeedPostData;
  onLikeToggle: (postId: string, isLiked: boolean) => void;
  onSaveToggle: (postId: string, isSaved: boolean) => void;
  onDelete?: (postId: string) => void;
}

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  username: string;
  avatar_url: string | null;
}

const FeedPostCard = ({ post, onLikeToggle, onSaveToggle, onDelete }: FeedPostCardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [liked, setLiked] = useState(post.is_liked);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [saved, setSaved] = useState(post.is_saved);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [commentsCount, setCommentsCount] = useState(post.comments_count);

  const isVideo = post.post_type === "video" || (post.image_url && /\.(mp4|mov|webm)$/i.test(post.image_url));
  const initials = post.username.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: true });

  const toggleLike = async () => {
    if (!user) return;
    const newLiked = !liked;
    setLiked(newLiked);
    setLikesCount((c) => (newLiked ? c + 1 : Math.max(0, c - 1)));

    if (newLiked) {
      await supabase.from("post_likes").insert({ post_id: post.id, user_id: user.id });
      await supabase.from("posts").update({ likes_count: likesCount + 1 }).eq("id", post.id);
    } else {
      await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", user.id);
      await supabase.from("posts").update({ likes_count: Math.max(0, likesCount - 1) }).eq("id", post.id);
    }
    onLikeToggle(post.id, newLiked);
  };

  const toggleSave = async () => {
    if (!user) return;
    const newSaved = !saved;
    setSaved(newSaved);

    if (newSaved) {
      await supabase.from("saved_posts").insert({ post_id: post.id, user_id: user.id });
      toast({ title: "Post saved" });
    } else {
      await supabase.from("saved_posts").delete().eq("post_id", post.id).eq("user_id", user.id);
      toast({ title: "Post unsaved" });
    }
    onSaveToggle(post.id, newSaved);
  };

  const sharePost = () => {
    navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
    toast({ title: "Link copied!" });
  };

  const openComments = async () => {
    setCommentsOpen(true);
    const { data } = await supabase
      .from("post_comments")
      .select("*")
      .eq("post_id", post.id)
      .order("created_at", { ascending: true });

    if (data && data.length > 0) {
      const userIds = [...new Set(data.map((c) => c.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", userIds);
      const pMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);
      setComments(
        data.map((c) => ({
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
    if (!user || !newComment.trim()) return;
    await supabase.from("post_comments").insert({ post_id: post.id, user_id: user.id, content: newComment.trim() });
    await supabase.from("posts").update({ comments_count: commentsCount + 1 }).eq("id", post.id);
    setCommentsCount((c) => c + 1);
    setNewComment("");
    openComments();
  };

  const deleteComment = async (commentId: string) => {
    await supabase.from("post_comments").delete().eq("id", commentId);
    await supabase.from("posts").update({ comments_count: Math.max(0, commentsCount - 1) }).eq("id", post.id);
    setCommentsCount((c) => Math.max(0, c - 1));
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    toast({ title: "Comment deleted" });
  };

  const canDeleteComment = (c: Comment) => {
    if (!user) return false;
    return user.id === c.user_id || user.id === post.user_id;
  };

  const handleDeletePost = async () => {
    await supabase.from("posts").delete().eq("id", post.id);
    onDelete?.(post.id);
    toast({ title: "Post deleted" });
  };

  // Extract hashtags from caption
  const renderCaption = () => {
    if (!post.caption) return null;
    const parts = post.caption.split(/(#\w+)/g);
    return parts.map((part, i) =>
      part.startsWith("#") ? (
        <span key={i} className="text-primary">{part}</span>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  return (
    <article className="border-b border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          {post.avatar_url ? (
            <img src={post.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-petkeep-orange-light font-display text-xs font-bold text-primary-foreground">
              {initials}
            </div>
          )}
          <div>
            <span className="text-sm font-bold">{post.username}</span>
            {post.pet_name && (
              <p className="text-xs text-muted-foreground">
                {post.pet_name}{post.pet_breed ? ` • ${post.pet_breed}` : ""}
              </p>
            )}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1 text-muted-foreground">
              <MoreHorizontal className="h-5 w-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={sharePost}>Share</DropdownMenuItem>
            {user?.id === post.user_id && (
              <DropdownMenuItem className="text-destructive" onClick={handleDeletePost}>
                Delete Post
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content */}
      {post.image_url && (
        <div className="aspect-square w-full overflow-hidden">
          {isVideo ? (
            <video
              src={post.image_url}
              className="h-full w-full object-cover"
              controls
              muted
              playsInline
              preload="metadata"
            />
          ) : (
            <img src={post.image_url} alt="" className="h-full w-full object-cover" loading="lazy" />
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-4">
          <button onClick={toggleLike} className="transition-transform active:scale-90">
            <Heart className={`h-6 w-6 ${liked ? "fill-primary text-primary" : "text-foreground"}`} />
          </button>
          <button onClick={openComments}>
            <MessageCircle className="h-6 w-6 text-foreground" />
          </button>
          <button onClick={sharePost}>
            <Send className="h-5 w-5 text-foreground" />
          </button>
        </div>
        <button onClick={toggleSave}>
          <Bookmark className={`h-6 w-6 ${saved ? "fill-foreground text-foreground" : "text-foreground"}`} />
        </button>
      </div>

      {/* Info */}
      <div className="px-4 pb-3">
        <p className="text-sm font-bold">{likesCount.toLocaleString()} likes</p>
        {post.caption && (
          <p className="mt-1 text-sm">
            <span className="font-bold">{post.username}</span>{" "}
            {renderCaption()}
          </p>
        )}
        {post.location && (
          <p className="mt-0.5 text-xs text-muted-foreground">📍 {post.location}</p>
        )}
        {commentsCount > 0 && (
          <button onClick={openComments} className="mt-1 text-xs text-muted-foreground">
            View all {commentsCount} comments
          </button>
        )}
        <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">{timeAgo}</p>
      </div>

      {/* Comments Dialog */}
      <Dialog open={commentsOpen} onOpenChange={setCommentsOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden max-h-[80vh]">
          <div className="border-b border-border p-4">
            <h3 className="font-display font-bold text-center">Comments</h3>
          </div>
          <div className="max-h-[50vh] overflow-y-auto px-4 py-2 space-y-3">
            {comments.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">No comments yet</p>
            )}
            {comments.map((c) => (
              <div key={c.id} className="flex items-start gap-2">
                {c.avatar_url ? (
                  <img src={c.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-[9px] font-bold">
                    {c.username[0]?.toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
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
          </div>
          <div className="border-t border-border p-3 flex gap-2">
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
        </DialogContent>
      </Dialog>
    </article>
  );
};

export default FeedPostCard;
