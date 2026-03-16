import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  MoreHorizontal,
  MoreVertical,
  Volume2,
  VolumeX,
  Flag,
  UserMinus,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { createNotification } from "@/hooks/useNotifications";
import { useCredits } from "@/hooks/useCredits";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import HeartAnimation from "@/components/feed/HeartAnimation";
import LikesListModal from "@/components/feed/LikesListModal";
import SharePostModal from "@/components/messages/SharePostModal";
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
  const { earnCredits } = useCredits();
  const navigate = useNavigate();

  const goToProfile = (userId: string) => {
    if (user?.id === userId) {
      navigate("/profile");
    } else {
      navigate(`/user/${userId}`);
    }
  };

  const [liked, setLiked] = useState(post.is_liked);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [saved, setSaved] = useState(post.is_saved);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [commentsCount, setCommentsCount] = useState(post.comments_count);
  const [showHeartAnim, setShowHeartAnim] = useState(false);
  const [likesListOpen, setLikesListOpen] = useState(false);
  const [muted, setMuted] = useState(true);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  const lastTapRef = useRef(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaContainerRef = useRef<HTMLDivElement>(null);
  const likeInProgressRef = useRef(false);
  const commentInProgressRef = useRef(false);

  // Sync from parent props when they change (e.g. realtime updates)
  useEffect(() => { setLiked(post.is_liked); }, [post.is_liked]);
  useEffect(() => { setLikesCount(post.likes_count); }, [post.likes_count]);
  useEffect(() => { setCommentsCount(post.comments_count); }, [post.comments_count]);
  useEffect(() => { setSaved(post.is_saved); }, [post.is_saved]);

  const isVideo = post.post_type === "video" || (post.image_url && /\.(mp4|mov|webm)$/i.test(post.image_url));
  const initials = post.username.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: true });

  // Video autoplay on visibility
  useEffect(() => {
    if (!isVideo || !videoRef.current) return;
    const video = videoRef.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [isVideo]);

  // Unified like handler with mutex to prevent race conditions
  const toggleLike = useCallback(async () => {
    if (!user || likeInProgressRef.current) return;
    likeInProgressRef.current = true;

    const wasLiked = liked;
    const newLiked = !wasLiked;

    // Optimistic UI update
    setLiked(newLiked);
    setLikesCount((c) => newLiked ? c + 1 : Math.max(0, c - 1));
    if (newLiked) setShowHeartAnim(true);

    try {
      if (newLiked) {
        // Insert like — unique constraint prevents duplicates; ignore conflict
        const { error } = await supabase.from("post_likes").insert({ post_id: post.id, user_id: user.id });
        if (error) {
          // Duplicate or other error — revert
          if (error.code !== "23505") {
            setLiked(wasLiked);
            setLikesCount((c) => Math.max(0, c - 1));
            console.error("Like insert error:", error.message);
          }
          // 23505 = unique violation = already liked, keep UI as liked
        } else {
          // Success — send notification & credit
          createNotification(user.id, post.user_id, "like", "post", post.id, "liked your post");
          if (user.id !== post.user_id) {
            earnCredits("post_like_received", post.id);
          }
        }
      } else {
        // Remove like
        const { error } = await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", user.id);
        if (error) {
          // Revert on failure
          setLiked(wasLiked);
          setLikesCount((c) => c + 1);
          console.error("Like delete error:", error.message);
        }
      }
      // DB trigger updates posts.likes_count automatically — no manual update needed
      onLikeToggle(post.id, newLiked);
    } finally {
      likeInProgressRef.current = false;
    }
  }, [user, liked, post.id, post.user_id, onLikeToggle, earnCredits]);

  // Double-tap to like (only likes, doesn't unlike)
  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 350) {
      if (!liked) toggleLike();
      else setShowHeartAnim(true); // Already liked, just show animation
    }
    lastTapRef.current = now;
  }, [liked, toggleLike]);

  const toggleSave = async () => {
    if (!user) return;
    const newSaved = !saved;
    setSaved(newSaved);
    if (newSaved) {
      await (supabase as any).from("saved_posts").insert({ post_id: post.id, user_id: user.id });
      createNotification(user.id, post.user_id, "save", "post", post.id, "saved your post");
      toast({ title: "Post saved" });
    } else {
      await (supabase as any).from("saved_posts").delete().eq("post_id", post.id).eq("user_id", user.id);
      toast({ title: "Post unsaved" });
    }
    onSaveToggle(post.id, newSaved);
  };

  const sharePost = () => setShareModalOpen(true);

  const copyPostLink = () => {
    const url = `${window.location.origin}/post/${post.id}`;
    navigator.clipboard.writeText(url);
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
    if (!user || !newComment.trim() || commentInProgressRef.current) return;
    commentInProgressRef.current = true;

    const content = newComment.trim();
    setNewComment("");

    try {
      const { error } = await supabase.from("post_comments").insert({
        post_id: post.id,
        user_id: user.id,
        content,
      });

      if (error) {
        console.error("Comment insert error:", error.message);
        setNewComment(content); // Restore on failure
      } else {
        // DB trigger updates posts.comments_count automatically
        setCommentsCount((c) => c + 1);
        createNotification(user.id, post.user_id, "comment", "post", post.id, "commented on your post");
        earnCredits("post_comment");
        // Refresh comments list
        openComments();
      }
    } finally {
      commentInProgressRef.current = false;
    }
  };

  const deleteComment = async (commentId: string) => {
    const { error } = await supabase.from("post_comments").delete().eq("id", commentId);
    if (!error) {
      // DB trigger updates posts.comments_count automatically
      setCommentsCount((c) => Math.max(0, c - 1));
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      toast({ title: "Comment deleted" });
    }
  };

  const canDeleteComment = (c: Comment) => user && (user.id === c.user_id || user.id === post.user_id);

  const handleDeletePost = async () => {
    await supabase.from("posts").delete().eq("id", post.id);
    onDelete?.(post.id);
    toast({ title: "Post deleted" });
  };

  const handleUnfollow = async () => {
    if (!user) return;
    await supabase.from("followers").delete().eq("follower_id", user.id).eq("following_id", post.user_id);
    toast({ title: `Unfollowed ${post.username}` });
  };

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

  const isOwner = user?.id === post.user_id;

  return (
    <article className="border-b border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <button className="flex items-center gap-3" onClick={() => goToProfile(post.user_id)}>
          {post.avatar_url ? (
            <img src={post.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-petkeep-orange-light font-display text-xs font-bold text-primary-foreground">
              {initials}
            </div>
          )}
          <div className="text-left">
            <span className="text-sm font-bold">{post.username}</span>
            {post.pet_name && (
              <p className="text-xs text-muted-foreground">
                {post.pet_name}{post.pet_breed ? ` • ${post.pet_breed}` : ""}
              </p>
            )}
          </div>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1 text-muted-foreground">
              <MoreHorizontal className="h-5 w-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={sharePost}>Send to chat</DropdownMenuItem>
            <DropdownMenuItem onClick={copyPostLink}>Copy link</DropdownMenuItem>
            {isOwner ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={handleDeletePost}>
                  Delete Post
                </DropdownMenuItem>
              </>
            ) : (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleUnfollow}>
                  <UserMinus className="mr-2 h-4 w-4" /> Unfollow
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Flag className="mr-2 h-4 w-4" /> Report
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content with double-tap */}
      {post.image_url && (
        <div
          ref={mediaContainerRef}
          className="relative aspect-square w-full overflow-hidden select-none"
          onClick={handleDoubleTap}
        >
          {isVideo ? (
            <>
              <video
                ref={videoRef}
                src={post.image_url}
                className="h-full w-full object-cover"
                muted={muted}
                playsInline
                loop
                preload="metadata"
              />
              <button
                onClick={(e) => { e.stopPropagation(); setMuted(!muted); }}
                className="absolute bottom-3 right-3 rounded-full bg-foreground/60 p-1.5 text-background"
              >
                {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
            </>
          ) : (
            <img src={post.image_url} alt="" className="h-full w-full object-cover" loading="lazy" />
          )}
          <HeartAnimation show={showHeartAnim} onComplete={() => setShowHeartAnim(false)} />
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
        <button onClick={() => setLikesListOpen(true)} className="text-sm font-bold hover:underline">
          {likesCount.toLocaleString()} likes
        </button>
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

      {/* Likes List Modal */}
      <LikesListModal open={likesListOpen} onOpenChange={setLikesListOpen} postId={post.id} />

      {/* Share Post Modal */}
      {shareModalOpen && (
        <SharePostModal
          postId={post.id}
          imageUrl={post.image_url}
          caption={post.caption}
          username={post.username}
          onClose={() => setShareModalOpen(false)}
        />
      )}

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
                <button onClick={() => { setCommentsOpen(false); goToProfile(c.user_id); }} className="shrink-0">
                  {c.avatar_url ? (
                    <img src={c.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-[9px] font-bold">
                      {c.username[0]?.toUpperCase()}
                    </div>
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <button onClick={() => { setCommentsOpen(false); goToProfile(c.user_id); }} className="font-bold hover:underline">{c.username}</button> {c.content}
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
