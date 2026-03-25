import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Heart, MessageCircle, Send, Trash2, X, MoreVertical,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import HeartAnimation from "@/components/feed/HeartAnimation";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

interface PostScrollViewerProps {
  posts: Post[];
  startIndex: number;
  onClose: () => void;
  onRefresh: () => void;
  ownerProfile?: {
    avatar_url?: string | null;
    full_name?: string;
    username?: string;
    user_id?: string;
  } | null;
}

const PostScrollViewer = ({ posts, startIndex, onClose, onRefresh, ownerProfile }: PostScrollViewerProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [likes, setLikes] = useState<Record<string, boolean>>({});
  const [heartAnims, setHeartAnims] = useState<Record<string, boolean>>({});
  const [commentsOpenFor, setCommentsOpenFor] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const lastTapRefs = useRef<Record<string, number>>({});
  const hasScrolledRef = useRef(false);

  const isVideo = (post: Post) =>
    post.post_type === "video" || (post.image_url && /\.(mp4|mov|webm)$/i.test(post.image_url));

  // Check likes for visible posts
  useEffect(() => {
    if (!user) return;
    const checkLikes = async () => {
      const nearby = posts.slice(
        Math.max(0, currentIndex - 2),
        Math.min(posts.length, currentIndex + 3)
      );
      const toCheck = nearby.filter((p) => likes[p.id] === undefined);
      if (toCheck.length === 0) return;

      const { data } = await supabase
        .from("post_likes")
        .select("post_id")
        .eq("user_id", user.id)
        .in("post_id", toCheck.map((p) => p.id));

      const likedSet = new Set(data?.map((d) => d.post_id) || []);
      setLikes((prev) => {
        const next = { ...prev };
        toCheck.forEach((p) => {
          next[p.id] = likedSet.has(p.id);
        });
        return next;
      });
    };
    checkLikes();
  }, [currentIndex, user, posts]);

  // Scroll to start index on mount
  useEffect(() => {
    if (hasScrolledRef.current) return;
    const container = scrollContainerRef.current;
    if (!container) return;
    requestAnimationFrame(() => {
      const target = container.children[startIndex] as HTMLElement;
      if (target) {
        container.scrollTo({ top: target.offsetTop, behavior: "instant" as ScrollBehavior });
        hasScrolledRef.current = true;
      }
    });
  }, [startIndex]);

  // Track current index from scroll
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const scrollTop = container.scrollTop;
        const height = container.clientHeight;
        const idx = Math.round(scrollTop / height);
        setCurrentIndex(Math.min(Math.max(idx, 0), posts.length - 1));
        ticking = false;
      });
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, [posts.length]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const toggleLike = async (post: Post) => {
    if (!user) return;
    const isLiked = likes[post.id];
    if (isLiked) {
      await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", user.id);
    } else {
      setHeartAnims((p) => ({ ...p, [post.id]: true }));
      await supabase.from("post_likes").insert({ post_id: post.id, user_id: user.id });
    }
    setLikes((prev) => ({ ...prev, [post.id]: !isLiked }));
    onRefresh();
  };

  const handleDoubleTap = (post: Post) => {
    const now = Date.now();
    const lastTap = lastTapRefs.current[post.id] || 0;
    if (now - lastTap < 350) {
      if (!likes[post.id]) {
        toggleLike(post);
      } else {
        setHeartAnims((p) => ({ ...p, [post.id]: true }));
      }
      lastTapRefs.current[post.id] = 0;
    } else {
      lastTapRefs.current[post.id] = now;
    }
  };

  const loadComments = async (postId: string) => {
    const { data } = await supabase
      .from("post_comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (data && data.length > 0) {
      const userIds = [...new Set(data.map((c) => c.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", userIds);
      const pMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);
      setComments(
        data.map((c) => ({
          ...c,
          username: pMap.get(c.user_id)?.full_name || "User",
          avatar_url: pMap.get(c.user_id)?.avatar_url || null,
        }))
      );
    } else {
      setComments([]);
    }
  };

  const openComments = (postId: string) => {
    setCommentsOpenFor(postId);
    loadComments(postId);
  };

  const addComment = async () => {
    if (!user || !commentsOpenFor || !newComment.trim()) return;
    await supabase.from("post_comments").insert({
      post_id: commentsOpenFor,
      user_id: user.id,
      content: newComment.trim(),
    });
    setNewComment("");
    loadComments(commentsOpenFor);
    onRefresh();
  };

  const deletePost = async (post: Post) => {
    await supabase.from("posts").delete().eq("id", post.id);
    onRefresh();
    toast({ title: "Post deleted" });
    if (posts.length <= 1) onClose();
  };

  const sharePost = (post: Post) => {
    navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
    toast({ title: "Link copied!" });
  };

  const profileName = ownerProfile?.full_name || "User";
  const profileAvatar = ownerProfile?.avatar_url;
  const profileInitials = profileName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="relative z-10 flex items-center gap-3 px-3 py-2.5 bg-card border-b border-border safe-area-top">
        <button onClick={onClose} className="rounded-full p-2 hover:bg-secondary">
          <X className="h-5 w-5" />
        </button>
        <button
          onClick={() => {
            onClose();
            if (ownerProfile?.user_id && user?.id !== ownerProfile.user_id) {
              navigate(`/user/${ownerProfile.username || ownerProfile.user_id}`);
            }
          }}
          className="flex items-center gap-2"
        >
          {profileAvatar ? (
            <img src={profileAvatar} alt="" className="h-7 w-7 rounded-full object-cover" />
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-[10px] font-bold text-primary-foreground">
              {profileInitials}
            </div>
          )}
          <span className="text-sm font-bold">{profileName}</span>
        </button>
        <div className="flex-1" />
        <span className="text-xs text-muted-foreground">
          {currentIndex + 1} / {posts.length}
        </span>
      </div>

      {/* Scrollable posts */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-scroll snap-y snap-mandatory"
        style={{ scrollSnapType: "y mandatory", WebkitOverflowScrolling: "touch" }}
      >
        {posts.map((post, idx) => {
          const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: true });

          return (
            <div
              key={post.id}
              className="snap-start snap-always w-full flex flex-col"
              style={{ minHeight: "calc(100vh - 49px)", height: "calc(100vh - 49px)" }}
            >
              {/* Media area */}
              <div
                className="flex-1 relative flex items-center justify-center bg-secondary overflow-hidden"
                onClick={() => handleDoubleTap(post)}
              >
                {post.image_url ? (
                  isVideo(post) ? (
                    <video
                      src={post.image_url}
                      controls
                      playsInline
                      muted
                      className="max-w-full max-h-full object-contain"
                    />
                  ) : (
                    <img
                      src={post.image_url}
                      alt=""
                      className="max-w-full max-h-full object-contain"
                      loading={Math.abs(idx - startIndex) <= 2 ? "eager" : "lazy"}
                      draggable={false}
                    />
                  )
                ) : (
                  <div className="bg-card rounded-2xl p-6 mx-4 max-w-sm">
                    <p className="text-foreground text-lg">{post.caption}</p>
                  </div>
                )}

                <HeartAnimation
                  show={heartAnims[post.id] || false}
                  onComplete={() => setHeartAnims((p) => ({ ...p, [post.id]: false }))}
                />
              </div>

              {/* Actions & info */}
              <div className="bg-card px-4 py-2.5 border-t border-border safe-area-bottom">
                <div className="flex items-center gap-5 mb-1.5">
                  <button onClick={() => toggleLike(post)} className="transition-transform active:scale-90">
                    <Heart
                      className={`h-6 w-6 ${likes[post.id] ? "fill-red-500 text-red-500" : "text-foreground"}`}
                    />
                  </button>
                  <button onClick={() => openComments(post.id)}>
                    <MessageCircle className="h-6 w-6 text-foreground" />
                  </button>
                  <button onClick={() => sharePost(post)}>
                    <Send className="h-5 w-5 text-foreground" />
                  </button>
                  <div className="flex-1" />
                  {user?.id === post.user_id && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1 text-muted-foreground">
                          <MoreVertical className="h-5 w-5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => deletePost(post)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                <p className="text-xs font-bold">{post.likes_count} likes</p>
                {post.caption && (
                  <p className="text-xs mt-0.5 line-clamp-2">
                    <span className="font-bold">{profileName}</span> {post.caption}
                  </p>
                )}
                {post.location && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">📍 {post.location}</p>
                )}
                <button
                  onClick={() => openComments(post.id)}
                  className="text-[10px] text-muted-foreground mt-0.5"
                >
                  {post.comments_count > 0
                    ? `View all ${post.comments_count} comments`
                    : "Add a comment..."}
                </button>
                <p className="text-[9px] text-muted-foreground mt-0.5 uppercase tracking-wide">
                  {timeAgo}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Comments sheet */}
      {commentsOpenFor && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end" onClick={() => setCommentsOpenFor(null)}>
          <div className="absolute inset-0 bg-foreground/40" />
          <div
            className="relative bg-card rounded-t-2xl max-h-[65vh] flex flex-col animate-slide-up safe-area-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-3 border-b border-border">
              <h3 className="font-display font-bold text-sm">Comments</h3>
              <button onClick={() => setCommentsOpenFor(null)} className="p-1 text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3 min-h-[80px]">
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
                    <p className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  {user && (user.id === c.user_id || user.id === posts[currentIndex]?.user_id) && (
                    <button
                      onClick={async () => {
                        await supabase.from("post_comments").delete().eq("id", c.id);
                        loadComments(commentsOpenFor);
                        onRefresh();
                        toast({ title: "Comment deleted" });
                      }}
                      className="p-1 text-muted-foreground"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 p-3 border-t border-border">
              <Input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addComment()}
                placeholder="Add a comment..."
                className="flex-1 text-sm"
              />
              <button
                onClick={addComment}
                disabled={!newComment.trim()}
                className="text-sm font-bold text-primary disabled:opacity-40"
              >
                Post
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostScrollViewer;
