import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Heart, MessageCircle, Send, Trash2, MoreHorizontal, Bookmark, ChevronLeft, MoreVertical,
  Volume2, VolumeX, Flag, UserMinus, Shield,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { createNotification } from "@/hooks/useNotifications";
import { useCredits } from "@/hooks/useCredits";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import HeartAnimation from "@/components/feed/HeartAnimation";
import SharePostModal from "@/components/messages/SharePostModal";
import LikesListModal from "@/components/feed/LikesListModal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  avatar_url?: string | null;
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
  const { earnCredits } = useCredits();
  const { isAdmin } = useIsAdmin();
  const navigate = useNavigate();

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [likes, setLikes] = useState<Record<string, boolean>>({});
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [heartAnims, setHeartAnims] = useState<Record<string, boolean>>({});

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");

  const [sharePost, setSharePost] = useState<Post | null>(null);
  const [likesListPostId, setLikesListPostId] = useState<string | null>(null);
  const [confirmDeletePost, setConfirmDeletePost] = useState<Post | null>(null);

  const [mutedVideos, setMutedVideos] = useState<Record<string, boolean>>({});

  const lastTapRefs = useRef<Record<string, number>>({});
  const hasScrolledRef = useRef(false);
  const likeInProgressRef = useRef<Record<string, boolean>>({});
  const commentInProgressRef = useRef(false);

  const isVideo = (post: Post) =>
    post.post_type === "video" || (post.image_url && /\.(mp4|mov|webm)$/i.test(post.image_url));

  const goToProfile = (userId: string) => {
    onClose();
    if (user?.id === userId) navigate("/profile");
    else navigate(`/user/${userId}`);
  };

  // Init counts from posts data
  useEffect(() => {
    const lc: Record<string, number> = {};
    const cc: Record<string, number> = {};
    posts.forEach((p) => {
      lc[p.id] = p.likes_count;
      cc[p.id] = p.comments_count;
    });
    setLikeCounts(lc);
    setCommentCounts(cc);
  }, [posts]);

  // Check likes & saves for visible posts
  useEffect(() => {
    if (!user) return;
    const checkStatus = async () => {
      const nearby = posts.slice(
        Math.max(0, currentIndex - 2),
        Math.min(posts.length, currentIndex + 3)
      );
      const toCheckLikes = nearby.filter((p) => likes[p.id] === undefined);
      const toCheckSaves = nearby.filter((p) => saved[p.id] === undefined);

      if (toCheckLikes.length > 0) {
        const { data } = await supabase
          .from("post_likes")
          .select("post_id")
          .eq("user_id", user.id)
          .in("post_id", toCheckLikes.map((p) => p.id));
        const likedSet = new Set(data?.map((d) => d.post_id) || []);
        setLikes((prev) => {
          const next = { ...prev };
          toCheckLikes.forEach((p) => { next[p.id] = likedSet.has(p.id); });
          return next;
        });
      }

      if (toCheckSaves.length > 0) {
        const { data } = await (supabase as any)
          .from("saved_posts")
          .select("post_id")
          .eq("user_id", user.id)
          .in("post_id", toCheckSaves.map((p: Post) => p.id));
        const savedSet = new Set(data?.map((d: any) => d.post_id) || []);
        setSaved((prev) => {
          const next = { ...prev };
          toCheckSaves.forEach((p) => { next[p.id] = savedSet.has(p.id); });
          return next;
        });
      }
    };
    checkStatus();
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

  // Track current index via IntersectionObserver
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const postRefs = Array.from(container.children) as HTMLElement[];
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            const idx = postRefs.indexOf(entry.target as HTMLElement);
            if (idx >= 0) setCurrentIndex(idx);
          }
        }
      },
      { root: container, threshold: 0.5 }
    );
    postRefs.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [posts.length]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Like with optimistic UI, notifications, credits
  const toggleLike = useCallback(async (post: Post) => {
    if (!user || likeInProgressRef.current[post.id]) return;
    likeInProgressRef.current[post.id] = true;

    const wasLiked = likes[post.id];
    const newLiked = !wasLiked;

    setLikes((prev) => ({ ...prev, [post.id]: newLiked }));
    setLikeCounts((prev) => ({ ...prev, [post.id]: newLiked ? (prev[post.id] || 0) + 1 : Math.max(0, (prev[post.id] || 0) - 1) }));
    if (newLiked) setHeartAnims((p) => ({ ...p, [post.id]: true }));

    try {
      if (newLiked) {
        const { error } = await supabase.from("post_likes").insert({ post_id: post.id, user_id: user.id });
        if (error && error.code !== "23505") {
          setLikes((prev) => ({ ...prev, [post.id]: wasLiked }));
          setLikeCounts((prev) => ({ ...prev, [post.id]: Math.max(0, (prev[post.id] || 0) - 1) }));
        } else if (!error) {
          createNotification(user.id, post.user_id, "like", "post", post.id, "liked your post");
          earnCredits("like_given", post.id);
        }
      } else {
        const { error } = await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", user.id);
        if (error) {
          setLikes((prev) => ({ ...prev, [post.id]: wasLiked }));
          setLikeCounts((prev) => ({ ...prev, [post.id]: (prev[post.id] || 0) + 1 }));
        }
      }
      onRefresh();
    } finally {
      likeInProgressRef.current[post.id] = false;
    }
  }, [user, likes, onRefresh, earnCredits]);

  const handleDoubleTap = (post: Post) => {
    const now = Date.now();
    const lastTap = lastTapRefs.current[post.id] || 0;
    if (now - lastTap < 350) {
      if (!likes[post.id]) toggleLike(post);
      else setHeartAnims((p) => ({ ...p, [post.id]: true }));
      lastTapRefs.current[post.id] = 0;
    } else {
      lastTapRefs.current[post.id] = now;
    }
  };

  // Save/Bookmark
  const toggleSave = async (post: Post) => {
    if (!user) return;
    const wasSaved = saved[post.id];
    const newSaved = !wasSaved;
    setSaved((prev) => ({ ...prev, [post.id]: newSaved }));

    if (newSaved) {
      await (supabase as any).from("saved_posts").insert({ post_id: post.id, user_id: user.id });
      // No notification for saves
      toast({ title: "Post saved" });
    } else {
      await (supabase as any).from("saved_posts").delete().eq("post_id", post.id).eq("user_id", user.id);
      toast({ title: "Post unsaved" });
    }
  };

  // Comments
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
    setCommentsPostId(postId);
    setCommentsOpen(true);
    loadComments(postId);
  };

  const addComment = async () => {
    if (!user || !commentsPostId || !newComment.trim() || commentInProgressRef.current) return;
    commentInProgressRef.current = true;
    const content = newComment.trim();
    setNewComment("");

    try {
      const { error } = await supabase.from("post_comments").insert({
        post_id: commentsPostId,
        user_id: user.id,
        content,
      });
      if (error) {
        setNewComment(content);
      } else {
        const post = posts.find((p) => p.id === commentsPostId);
        if (post) {
          createNotification(user.id, post.user_id, "comment", "post", post.id, "commented on your post");
          earnCredits("post_comment");
        }
        setCommentCounts((prev) => ({ ...prev, [commentsPostId]: (prev[commentsPostId] || 0) + 1 }));
        loadComments(commentsPostId);
        onRefresh();
      }
    } finally {
      commentInProgressRef.current = false;
    }
  };

  const deleteComment = async (commentId: string) => {
    if (!commentsPostId) return;
    const { error } = await supabase.from("post_comments").delete().eq("id", commentId);
    if (!error) {
      setCommentCounts((prev) => ({ ...prev, [commentsPostId]: Math.max(0, (prev[commentsPostId] || 0) - 1) }));
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      toast({ title: "Comment deleted" });
      onRefresh();
    }
  };

  const canDeleteComment = (c: Comment) =>
    user && (user.id === c.user_id || (commentsPostId && user.id === posts.find((p) => p.id === commentsPostId)?.user_id) || isAdmin);

  // Delete post
  const handleDeletePost = async () => {
    if (!confirmDeletePost) return;
    await supabase.from("posts").delete().eq("id", confirmDeletePost.id);
    onRefresh();
    const isOwner = user?.id === confirmDeletePost.user_id;
    toast({ title: isAdmin && !isOwner ? "Post removed by admin" : "Post deleted" });
    setConfirmDeletePost(null);
    if (posts.length <= 1) onClose();
  };

  // Unfollow
  const handleUnfollow = async (post: Post) => {
    if (!user) return;
    await supabase.from("followers").delete().eq("follower_id", user.id).eq("following_id", post.user_id);
    toast({ title: "Unfollowed" });
  };

  const copyPostLink = (post: Post) => {
    navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
    toast({ title: "Link copied!" });
  };

  const profileName = ownerProfile?.full_name || "User";
  const profileUsername = ownerProfile?.username || "user";
  const profileAvatar = ownerProfile?.avatar_url;
  const profileInitials = profileName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const renderCaption = (caption: string) => {
    const parts = caption.split(/(#\w+)/g);
    return parts.map((part, i) =>
      part.startsWith("#") ? (
        <span key={i} className="text-primary">{part}</span>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="relative z-10 flex items-center px-2 py-2.5 bg-background safe-area-top border-b border-border">
        <button onClick={onClose} className="rounded-full p-2 text-foreground hover:bg-secondary">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <div className="flex-1 text-center">
          <p className="text-foreground text-base font-bold leading-tight">Posts</p>
          <p className="text-muted-foreground text-xs">{profileUsername}</p>
        </div>
        <div className="w-10" />
      </div>

      {/* Scrollable feed */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto bg-background"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {posts.map((post, idx) => {
          const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: true });
          const isOwner = user?.id === post.user_id;
          const postLikeCount = likeCounts[post.id] ?? post.likes_count;
          const postCommentCount = commentCounts[post.id] ?? post.comments_count;
          const isSaved = saved[post.id] || false;
          const isLiked = likes[post.id] || false;

          return (
            <article key={post.id} className="border-b border-border bg-card">
              {/* Per-post header */}
              <div className="flex items-center justify-between px-4 py-3">
                <button
                  onClick={() => goToProfile(ownerProfile?.user_id || post.user_id)}
                  className="flex items-center gap-2.5"
                >
                  {profileAvatar ? (
                    <img src={profileAvatar} alt="" className="h-9 w-9 rounded-full object-cover ring-1 ring-border" loading="lazy" decoding="async" />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-[10px] font-bold text-primary-foreground">
                      {profileInitials}
                    </div>
                  )}
                  <span className="text-foreground text-sm font-semibold">{profileUsername}</span>
                </button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-1 text-muted-foreground hover:text-foreground">
                      <MoreHorizontal className="h-5 w-5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setSharePost(post)}>Send to chat</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => copyPostLink(post)}>Copy link</DropdownMenuItem>
                    {isOwner ? (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => setConfirmDeletePost(post)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </>
                    ) : (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleUnfollow(post)}>
                          <UserMinus className="mr-2 h-4 w-4" /> Unfollow
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Flag className="mr-2 h-4 w-4" /> Report
                        </DropdownMenuItem>
                        {isAdmin && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => setConfirmDeletePost(post)}>
                              <Shield className="mr-2 h-4 w-4" /> Delete (Admin)
                            </DropdownMenuItem>
                          </>
                        )}
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Media */}
              <div className="relative w-full bg-secondary select-none" onClick={() => handleDoubleTap(post)}>
                {post.image_url ? (
                  isVideo(post) ? (
                    <>
                      <video
                        src={post.image_url}
                        className="w-full max-h-[600px] object-contain"
                        controls={false}
                        playsInline
                        loop
                        muted={mutedVideos[post.id] !== false}
                        preload="metadata"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMutedVideos((prev) => ({ ...prev, [post.id]: prev[post.id] === false ? true : false }));
                        }}
                        className="absolute bottom-3 right-3 rounded-full bg-foreground/60 p-1.5 text-background"
                      >
                        {mutedVideos[post.id] === false ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                      </button>
                    </>
                  ) : (
                    <img src={post.image_url}
                      alt=""
                      className="w-full max-h-[600px] object-contain"
                      loading={Math.abs(idx - startIndex) <= 2 ? "eager" : "lazy"}
                      draggable={false} decoding="async" />
                  )
                ) : (
                  <div className="w-full py-12 flex items-center justify-center">
                    <p className="text-foreground text-lg px-6 text-center">{post.caption}</p>
                  </div>
                )}
                <HeartAnimation
                  show={heartAnims[post.id] || false}
                  onComplete={() => setHeartAnims((p) => ({ ...p, [post.id]: false }))}
                />
              </div>

              {/* Action row */}
              <div className="flex items-center justify-between px-4 py-2">
                <div className="flex items-center gap-4">
                  <button onClick={() => toggleLike(post)} className="transition-transform active:scale-90">
                    <Heart className={`h-6 w-6 ${isLiked ? "fill-red-500 text-red-500" : "text-foreground"}`} />
                  </button>
                  <button onClick={() => openComments(post.id)}>
                    <MessageCircle className="h-6 w-6 text-foreground" />
                  </button>
                  <button onClick={() => setSharePost(post)}>
                    <Send className="h-5 w-5 text-foreground" />
                  </button>
                </div>
                <button onClick={() => toggleSave(post)}>
                  <Bookmark className={`h-6 w-6 ${isSaved ? "fill-foreground text-foreground" : "text-foreground"}`} />
                </button>
              </div>

              {/* Info */}
              <div className="px-4 pb-3">
                <button onClick={() => setLikesListPostId(post.id)} className="text-sm font-bold hover:underline">
                  {postLikeCount.toLocaleString()} likes
                </button>

                {post.caption && (
                  <p className="text-foreground text-sm mt-1 leading-snug">
                    <span className="font-bold">{profileUsername}</span>{" "}
                    {renderCaption(post.caption)}
                  </p>
                )}

                {post.location && (
                  <p className="text-muted-foreground text-xs mt-0.5">📍 {post.location}</p>
                )}

                {postCommentCount > 0 && (
                  <button
                    onClick={() => openComments(post.id)}
                    className="text-muted-foreground text-xs mt-1 block"
                  >
                    View all {postCommentCount} comments
                  </button>
                )}

                <p className="text-muted-foreground text-[10px] mt-1.5 pb-1 uppercase tracking-wide">
                  {timeAgo}
                </p>
              </div>
            </article>
          );
        })}
      </div>

      {/* Likes List Modal */}
      <LikesListModal
        open={!!likesListPostId}
        onOpenChange={(open) => { if (!open) setLikesListPostId(null); }}
        postId={likesListPostId || ""}
      />

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
                    <img src={c.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover" loading="lazy" decoding="async" />
                  ) : (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-[9px] font-bold">
                      {(c.username || "U")[0].toUpperCase()}
                    </div>
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <button onClick={() => { setCommentsOpen(false); goToProfile(c.user_id); }} className="font-bold hover:underline">
                      {c.username}
                    </button>{" "}
                    {c.content}
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

      {/* Share Post Modal */}
      {sharePost && (
        <SharePostModal
          postId={sharePost.id}
          imageUrl={sharePost.image_url}
          caption={sharePost.caption}
          username={profileUsername}
          onClose={() => setSharePost(null)}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!confirmDeletePost} onOpenChange={(open) => { if (!open) setConfirmDeletePost(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this post?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDeletePost && isAdmin && user?.id !== confirmDeletePost.user_id
                ? "You are deleting this post as an admin. This action cannot be undone."
                : "Are you sure you want to delete this post? This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePost} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PostScrollViewer;
