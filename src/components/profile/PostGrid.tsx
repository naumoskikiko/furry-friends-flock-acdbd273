import { useState, useRef, useCallback, useEffect } from "react";
import { Heart, MessageCircle, Trash2, Send, Play, MoreVertical, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import HeartAnimation from "@/components/feed/HeartAnimation";

interface Post {
  id: string;
  user_id: string;
  caption: string;
  image_url: string | null;
  location: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  pet_id: string | null;
  post_type?: string;
}

interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  username?: string;
  avatar_url?: string;
}

interface PostGridProps {
  posts: Post[];
  onRefresh: () => void;
}

const PostGrid = ({ posts, onRefresh }: PostGridProps) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likes, setLikes] = useState<Record<string, boolean>>({});
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showHeartAnim, setShowHeartAnim] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Drag-to-close state
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ y: 0, time: 0 });
  const touchStartXRef = useRef(0);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const lastTapRef = useRef(0);

  const selectedPost = viewerOpen ? posts[currentIndex] : null;
  const isVideo = (post: Post) => post.post_type === "video" || (post.image_url && /\.(mp4|mov|webm)$/i.test(post.image_url));

  // Auto-hide controls
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  useEffect(() => {
    if (viewerOpen) resetControlsTimer();
    return () => { if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current); };
  }, [viewerOpen, currentIndex, resetControlsTimer]);

  const openPost = async (index: number) => {
    setCurrentIndex(index);
    setViewerOpen(true);
    setCommentsOpen(false);
    setImageLoaded(false);
    setDragY(0);
    const post = posts[index];
    if (user) {
      const { data } = await supabase.from("post_likes").select("id").eq("post_id", post.id).eq("user_id", user.id);
      setLikes((prev) => ({ ...prev, [post.id]: (data?.length || 0) > 0 }));
    }
  };

  const closeViewer = () => {
    setViewerOpen(false);
    setDragY(0);
    setIsDragging(false);
    setCommentsOpen(false);
  };

  const goTo = (dir: -1 | 1) => {
    const next = currentIndex + dir;
    if (next >= 0 && next < posts.length) {
      setCurrentIndex(next);
      setImageLoaded(false);
      setCommentsOpen(false);
      const post = posts[next];
      if (user) {
        supabase.from("post_likes").select("id").eq("post_id", post.id).eq("user_id", user.id)
          .then(({ data }) => setLikes((prev) => ({ ...prev, [post.id]: (data?.length || 0) > 0 })));
      }
    }
  };

  // Touch handlers for swipe & drag
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    dragStartRef.current = { y: touch.clientY, time: Date.now() };
    touchStartXRef.current = touch.clientX;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    const dy = touch.clientY - dragStartRef.current.y;
    if (dy > 0) setDragY(dy); // Only drag downward
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const touch = e.changedTouches[0];
    const dy = touch.clientY - dragStartRef.current.y;
    const dx = touch.clientX - touchStartXRef.current;
    const dt = Date.now() - dragStartRef.current.time;

    setIsDragging(false);

    // Drag-to-close: if dragged down enough
    if (dy > 120) {
      closeViewer();
      return;
    }

    // Swipe horizontal: fast flick
    if (dt < 300 && Math.abs(dx) > 50 && Math.abs(dy) < 80) {
      if (dx < -50) goTo(1);
      else if (dx > 50) goTo(-1);
      setDragY(0);
      return;
    }

    // Snap back
    setDragY(0);
  };

  // Single tap / double tap
  const handleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      // Double tap → like
      handleDoubleTapLike();
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
      // Single tap → toggle controls
      setTimeout(() => {
        if (Date.now() - lastTapRef.current >= 280) {
          resetControlsTimer();
        }
      }, 310);
    }
  };

  const handleDoubleTapLike = async () => {
    if (!user || !selectedPost || likes[selectedPost.id]) {
      setShowHeartAnim(true);
      return;
    }
    setShowHeartAnim(true);
    setLikes((prev) => ({ ...prev, [selectedPost.id]: true }));
    await supabase.from("post_likes").insert({ post_id: selectedPost.id, user_id: user.id });
    onRefresh();
  };

  const toggleLike = async () => {
    if (!user || !selectedPost) return;
    const isLiked = likes[selectedPost.id];
    if (isLiked) {
      await supabase.from("post_likes").delete().eq("post_id", selectedPost.id).eq("user_id", user.id);
    } else {
      setShowHeartAnim(true);
      await supabase.from("post_likes").insert({ post_id: selectedPost.id, user_id: user.id });
    }
    setLikes((prev) => ({ ...prev, [selectedPost.id]: !isLiked }));
    onRefresh();
  };

  const loadComments = async (postId: string) => {
    const { data } = await supabase.from("post_comments").select("*").eq("post_id", postId).order("created_at", { ascending: true });
    if (data && data.length > 0) {
      const userIds = [...new Set(data.map((c) => c.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", userIds);
      const pMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);
      setComments(data.map((c) => ({ ...c, username: pMap.get(c.user_id)?.full_name || "User", avatar_url: pMap.get(c.user_id)?.avatar_url || null })));
    } else {
      setComments([]);
    }
  };

  const openCommentsPanel = () => {
    if (!selectedPost) return;
    setCommentsOpen(true);
    loadComments(selectedPost.id);
    resetControlsTimer();
  };

  const addComment = async () => {
    if (!user || !selectedPost || !newComment.trim()) return;
    await supabase.from("post_comments").insert({ post_id: selectedPost.id, user_id: user.id, content: newComment.trim() });
    setNewComment("");
    loadComments(selectedPost.id);
    onRefresh();
  };

  const deleteComment = async (commentId: string) => {
    if (!selectedPost) return;
    await supabase.from("post_comments").delete().eq("id", commentId);
    loadComments(selectedPost.id);
    onRefresh();
    toast({ title: "Comment deleted" });
  };

  const deletePost = async () => {
    if (!selectedPost) return;
    await supabase.from("posts").delete().eq("id", selectedPost.id);
    closeViewer();
    onRefresh();
    toast({ title: "Post deleted" });
  };

  const sharePost = () => {
    if (!selectedPost) return;
    navigator.clipboard.writeText(`${window.location.origin}/post/${selectedPost.id}`);
    toast({ title: "Link copied!" });
  };

  const canDeleteComment = (c: Comment) => user && (user.id === c.user_id || user.id === selectedPost?.user_id);

  // Computed drag values
  const dragScale = Math.max(0.85, 1 - dragY / 600);
  const bgOpacity = Math.max(0, 1 - dragY / 300);

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <span className="text-4xl">📸</span>
        <p className="mt-2 text-sm font-semibold text-muted-foreground">No posts yet</p>
        <p className="text-xs text-muted-foreground">Share your first moment!</p>
      </div>
    );
  }

  return (
    <>
      {/* Grid */}
      <div className="grid grid-cols-3 gap-0.5">
        {posts.map((post, idx) => (
          <button key={post.id} onClick={() => openPost(idx)} className="aspect-square overflow-hidden bg-secondary relative">
            {post.image_url ? (
              isVideo(post) ? (
                <>
                  <video src={post.image_url} className="h-full w-full object-cover" muted preload="metadata" />
                  <div className="absolute inset-0 flex items-center justify-center bg-foreground/10">
                    <Play className="h-8 w-8 text-background fill-background" />
                  </div>
                </>
              ) : (
                <img src={post.image_url} alt="" className="h-full w-full object-cover" loading="lazy" />
              )
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-secondary p-2">
                <p className="text-xs text-muted-foreground line-clamp-3">{post.caption}</p>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Fullscreen Viewer */}
      {viewerOpen && selectedPost && (
        <div
          className="fixed inset-0 z-50 flex flex-col"
          style={{ backgroundColor: `rgba(0,0,0,${bgOpacity})` }}
        >
          {/* Image area with gestures */}
          <div
            className="flex-1 flex items-center justify-center relative overflow-hidden"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onClick={handleTap}
          >
            <div
              className="relative w-full h-full flex items-center justify-center will-change-transform"
              style={{
                transform: `translateY(${dragY}px) scale(${dragScale})`,
                transition: isDragging ? "none" : "transform 0.25s cubic-bezier(0.2, 0, 0, 1)",
              }}
            >
              {selectedPost.image_url && (
                isVideo(selectedPost) ? (
                  <video
                    src={selectedPost.image_url}
                    controls
                    autoPlay
                    muted
                    playsInline
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <>
                    {/* Blur placeholder */}
                    {!imageLoaded && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="h-16 w-16 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      </div>
                    )}
                    <img
                      src={selectedPost.image_url}
                      alt=""
                      className={`max-w-full max-h-full object-contain transition-opacity duration-300 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
                      onLoad={() => setImageLoaded(true)}
                      draggable={false}
                    />
                  </>
                )
              )}
              {!selectedPost.image_url && (
                <div className="bg-card rounded-2xl p-6 mx-4 max-w-sm">
                  <p className="text-foreground text-lg">{selectedPost.caption}</p>
                </div>
              )}

              {/* Heart animation */}
              <HeartAnimation show={showHeartAnim} onComplete={() => setShowHeartAnim(false)} />
            </div>

            {/* Nav arrows (desktop fallback) */}
            {currentIndex > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); goTo(-1); }}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 text-white backdrop-blur-sm opacity-60 hover:opacity-100 transition-opacity hidden sm:flex"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            {currentIndex < posts.length - 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); goTo(1); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 text-white backdrop-blur-sm opacity-60 hover:opacity-100 transition-opacity hidden sm:flex"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Controls overlay — auto-hide */}
          <div
            className={`absolute inset-x-0 top-0 transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          >
            {/* Top bar */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent">
              <p className="text-white text-sm font-semibold">
                {currentIndex + 1} / {posts.length}
              </p>
              <button onClick={closeViewer} className="p-2 rounded-full bg-black/40 text-white backdrop-blur-sm">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Bottom controls */}
          <div
            className={`absolute inset-x-0 bottom-0 transition-opacity duration-300 ${showControls && !commentsOpen ? "opacity-100" : commentsOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          >
            {!commentsOpen ? (
              <div className="bg-gradient-to-t from-black/70 to-transparent p-4 pb-6">
                {/* Caption */}
                {selectedPost.caption && (
                  <p className="text-white text-sm mb-3 line-clamp-2">{selectedPost.caption}</p>
                )}
                {selectedPost.location && (
                  <p className="text-white/70 text-xs mb-3">📍 {selectedPost.location}</p>
                )}
                {/* Action buttons */}
                <div className="flex items-center gap-5">
                  <button onClick={toggleLike} className="transition-transform active:scale-90">
                    <Heart className={`h-7 w-7 ${likes[selectedPost.id] ? "fill-red-500 text-red-500" : "text-white"}`} />
                  </button>
                  <button onClick={openCommentsPanel}>
                    <MessageCircle className="h-7 w-7 text-white" />
                  </button>
                  <button onClick={sharePost}>
                    <Send className="h-6 w-6 text-white" />
                  </button>
                  <div className="flex-1" />
                  {user?.id === selectedPost.user_id && (
                    <button onClick={deletePost} className="p-2">
                      <Trash2 className="h-5 w-5 text-white/70" />
                    </button>
                  )}
                </div>
                {/* Swipe hint dots */}
                <div className="flex justify-center gap-1 mt-3">
                  {posts.slice(Math.max(0, currentIndex - 3), Math.min(posts.length, currentIndex + 4)).map((_, i) => {
                    const actualIdx = Math.max(0, currentIndex - 3) + i;
                    return (
                      <div
                        key={actualIdx}
                        className={`h-1 rounded-full transition-all duration-200 ${actualIdx === currentIndex ? "w-4 bg-white" : "w-1 bg-white/40"}`}
                      />
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Comments panel */
              <div className="bg-card rounded-t-2xl max-h-[55vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-3 border-b border-border">
                  <h3 className="font-display font-bold text-sm">Comments</h3>
                  <button onClick={() => setCommentsOpen(false)} className="p-1 text-muted-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3 min-h-[100px]">
                  {comments.length === 0 && (
                    <p className="py-6 text-center text-sm text-muted-foreground">No comments yet</p>
                  )}
                  {comments.map((c) => (
                    <div key={c.id} className="flex items-start gap-2">
                      {c.avatar_url ? (
                        <img src={c.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-[9px] font-bold">
                          {(c.username || "U")[0].toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="font-bold">{c.username}</span> {c.content}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</p>
                      </div>
                      {canDeleteComment(c) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="shrink-0 p-0.5 text-muted-foreground hover:text-foreground">
                              <MoreVertical className="h-3.5 w-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="text-destructive" onClick={() => deleteComment(c.id)}>Delete</DropdownMenuItem>
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
                  <Button size="sm" onClick={addComment} disabled={!newComment.trim()}>Post</Button>
                </div>
              </div>
            )}
          </div>

          {/* Drag hint bar */}
          {showControls && !commentsOpen && (
            <div className="absolute top-14 left-1/2 -translate-x-1/2">
              <div className="h-1 w-8 rounded-full bg-white/40" />
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default PostGrid;
