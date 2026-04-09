import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Heart, MessageCircle, Share2, Bookmark, BookmarkCheck,
  MoreVertical, Send, MapPin, Calendar, Clock, Users, PawPrint, Trash2,
  Star, ThumbsUp, CheckCircle2, MessageSquare, Pencil, AlertTriangle,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { Input } from "@/components/ui/input";
import ClickableTag from "@/components/ui/ClickableTag";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useCredits } from "@/hooks/useCredits";
import { createNotification } from "@/hooks/useNotifications";
import type { BlogPostData } from "./BlogCard";
import EditBlogModal from "./EditBlogModal";
import ReportModal from "@/components/ReportModal";
const fromTable = (table: string) => (supabase as any).from(table);

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
  is_helpful: boolean;
}

interface Participant {
  user_id: string;
  full_name: string;
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
  const { earnCredits } = useCredits();
  const navigate = useNavigate();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [saved, setSaved] = useState(false);
  const [readProgress, setReadProgress] = useState(0);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);
  const [participantsCount, setParticipantsCount] = useState(0);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isMeetup = post?.post_type === "meetup";

  // Determine if meetup has ended
  const isMeetupEnded = (() => {
    if (!isMeetup || !post) return false;
    if ((post as any).status === "ended") return true;
    if (post.event_date && post.event_end_time) {
      const endDateTime = new Date(`${post.event_date}T${post.event_end_time}`);
      return endDateTime <= new Date();
    }
    if (post.event_date) {
      const eventDay = new Date(post.event_date + "T23:59:59");
      return eventDay <= new Date();
    }
    return false;
  })();

  useEffect(() => {
    if (post && open) {
      setUnavailable(false);
      // Verify the post still exists in DB (handles auto-deleted meetups)
      (async () => {
        const { data } = await fromTable("blog_posts").select("id").eq("id", post.id).maybeSingle();
        if (!data) {
          setUnavailable(true);
          return;
        }
      })();
      setLiked(post.is_liked);
      setLikesCount(post.likes_count);
      setJoined(post.is_joined || false);
      setParticipantsCount(post.participants_count || 0);
      loadComments();
      checkSaved();
      setReadProgress(0);
      if (post.post_type === "meetup") {
        loadParticipants();
      }
    }
  }, [post, open]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollTop = el.scrollTop;
    const scrollHeight = el.scrollHeight - el.clientHeight;
    if (scrollHeight > 0) {
      setReadProgress(Math.min(1, scrollTop / scrollHeight));
    }
  }, []);

  const loadParticipants = async () => {
    if (!post) return;
    const { data } = await fromTable("blog_event_participants")
      .select("user_id")
      .eq("blog_post_id", post.id);
    if (data && data.length > 0) {
      const userIds = data.map((d: any) => d.user_id);
      setParticipantsCount(userIds.length);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", userIds as string[]);
      setParticipants(
        (profiles || []).map((p) => ({
          user_id: p.user_id,
          full_name: p.full_name,
          avatar_url: p.avatar_url,
        }))
      );
    } else {
      setParticipants([]);
      setParticipantsCount(0);
    }
  };

  const checkSaved = async () => {
    if (!user || !post) return;
    const { data } = await fromTable("blog_saves")
      .select("id")
      .eq("blog_post_id", post.id)
      .eq("user_id", user.id)
      .maybeSingle();
    setSaved(!!data);
  };

  const loadComments = async () => {
    if (!post) return;
    const { data } = await fromTable("blog_comments")
      .select("*")
      .eq("blog_post_id", post.id)
      .order("created_at", { ascending: true });

    if (data && data.length > 0) {
      const userIds = [...new Set(data.map((c: any) => c.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, username")
        .in("user_id", userIds as string[]);
      const pMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);
      setComments(
        data.map((c: any) => ({
          id: c.id,
          user_id: c.user_id,
          content: c.content,
          created_at: c.created_at,
          username: pMap.get(c.user_id)?.full_name || "User",
          avatar_url: pMap.get(c.user_id)?.avatar_url || null,
          is_helpful: c.is_helpful || false,
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
  };

  const deleteComment = async (commentId: string) => {
    if (!post) return;
    await fromTable("blog_comments").delete().eq("id", commentId);
    await fromTable("blog_posts").update({ comments_count: Math.max(0, (post.comments_count || 0) - 1) }).eq("id", post.id);
    setComments((prev) => prev.filter((c) => c.id !== commentId));
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
      toast({ title: "Saved" });
    }
  };

  const toggleJoin = async () => {
    if (!user || !post) return;
    if (post.event_max_participants && participantsCount >= post.event_max_participants && !joined) {
      toast({ title: "Event is full", variant: "destructive" });
      return;
    }
    const newJoined = !joined;
    setJoined(newJoined);
    setParticipantsCount((c) => newJoined ? c + 1 : Math.max(0, c - 1));
    if (newJoined) {
      await fromTable("blog_event_participants").insert({ blog_post_id: post.id, user_id: user.id });
      // Auto-join meetup chat
      try {
        await (supabase as any).rpc("join_meetup_chat", { _blog_post_id: post.id, _user_id: user.id });
      } catch {}
      toast({ title: "You joined the event! 🎉" });
    } else {
      await fromTable("blog_event_participants").delete().eq("blog_post_id", post.id).eq("user_id", user.id);
      // Auto-leave meetup chat
      try {
        const { error } = await (supabase as any).rpc("leave_meetup_chat", { _blog_post_id: post.id, _user_id: user.id });
        if (error) console.error("leave_meetup_chat error:", error);
      } catch (e) { console.error("leave_meetup_chat exception:", e); }
      toast({ title: "Left the event" });
    }
    loadParticipants();
  };

  const openMeetupChat = () => {
    if (!post) return;
    onOpenChange(false);
    navigate(`/messages?meetup=${post.id}`);
  };

  const handleShareArticle = async () => {
    const url = `${window.location.origin}/?article=${post?.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: post?.title, url });
      } catch {
        // User cancelled or share failed, fallback to copy
        await copyToClipboard(url);
      }
    } else {
      await copyToClipboard(url);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Link copied!" });
    } catch {
      // Fallback for insecure contexts
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      toast({ title: "Link copied!" });
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

  const deleteArticle = async () => {
    if (!user || !post) return;
    setDeleting(true);

    // For meetups, also clean up conversation
    if (isMeetup && (post as any).conversation_id) {
      try {
        await fromTable("messages").delete().eq("conversation_id", (post as any).conversation_id);
        await fromTable("conversation_participants").delete().eq("conversation_id", (post as any).conversation_id);
        await fromTable("conversations").delete().eq("id", (post as any).conversation_id);
      } catch (e) {
        console.error("Error cleaning up meetup conversation:", e);
      }
    }

    // Delete related data first
    await Promise.all([
      fromTable("blog_comments").delete().eq("blog_post_id", post.id),
      fromTable("blog_likes").delete().eq("blog_post_id", post.id),
      fromTable("blog_saves").delete().eq("blog_post_id", post.id),
      fromTable("blog_event_participants").delete().eq("blog_post_id", post.id),
    ]);
    await fromTable("blog_posts").delete().eq("id", post.id).eq("user_id", user.id);
    setDeleting(false);
    setShowDeleteConfirm(false);
    onOpenChange(false);
    onRefresh();
    toast({ title: isMeetup ? "Meetup deleted" : "Article deleted" });
  };

  const isOwner = user?.id === post?.user_id;
  const isQuestion = post?.post_type === "question";

  const hasHelpfulAnswer = comments.some((c) => c.is_helpful);

  const markHelpful = async (comment: Comment) => {
    if (!user || !post || !isOwner || comment.user_id === user.id) return;
    if (comment.is_helpful) return;
    if (hasHelpfulAnswer) {
      toast({ title: "A helpful answer has already been selected", variant: "destructive" });
      return;
    }

    // Update is_helpful in DB
    const { error } = await fromTable("blog_comments")
      .update({ is_helpful: true })
      .eq("id", comment.id);

    if (error) {
      toast({ title: "Failed to mark as helpful", variant: "destructive" });
      return;
    }

    // Award credits directly to the answer author (not current user)
    const creditAmount = 0.5;
    let credited = false;
    try {
      // Check duplicate
      const { data: existing } = await fromTable("credit_daily_log")
        .select("id")
        .eq("user_id", comment.user_id)
        .eq("action_type", "helpful_blog_answer")
        .eq("source_id", comment.id)
        .limit(1);

      if (!existing || existing.length === 0) {
        await fromTable("credit_daily_log").insert({
          user_id: comment.user_id,
          action_type: "helpful_blog_answer",
          credits_earned: creditAmount,
          source_id: comment.id,
        });

        // Upsert credits balance
        const { data: bal } = await supabase.from("credits")
          .select("balance")
          .eq("user_id", comment.user_id)
          .maybeSingle();

        if (bal) {
          await supabase.from("credits")
            .update({ balance: bal.balance + creditAmount, updated_at: new Date().toISOString() })
            .eq("user_id", comment.user_id);
        }

        await supabase.from("credit_transactions").insert({
          user_id: comment.user_id,
          amount: creditAmount,
          type: "earn",
          description: "Earned from helpful blog answer",
        });

        credited = true;
      }
    } catch {}

    // Notify the answer author (actorId = current user, userId = answer author)
    try {
      await createNotification(
        user.id,
        comment.user_id,
        "credit",
        "blog",
        post.id,
        credited ? "Your answer was marked helpful! You earned 0.5 credits ⭐" : "Your answer was marked as helpful! ⭐"
      );
    } catch {}

    setComments((prev) =>
      prev.map((c) => (c.id === comment.id ? { ...c, is_helpful: true } : c))
    );

    toast({ title: credited ? "Marked as helpful — credits awarded! ⭐" : "Marked as helpful ⭐" });
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

  if (unavailable) {
    return (
      <div className="fixed inset-0 z-[100] bg-background flex flex-col">
        <div className="shrink-0 z-[115] relative flex items-center border-b border-border bg-background px-4 py-3">
          <button onClick={() => { onOpenChange(false); onRefresh(); }} className="rounded-full p-1.5 hover:bg-secondary transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center space-y-3">
            <div className="text-4xl">📍</div>
            <h2 className="text-lg font-bold">This meetup is no longer available</h2>
            <p className="text-sm text-muted-foreground">It may have ended and been removed automatically.</p>
            <Button variant="outline" onClick={() => { onOpenChange(false); onRefresh(); }}>Go Back</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="fixed inset-0 z-[100] bg-background flex flex-col">
      {/* Reading progress bar */}
      <div className="absolute top-0 left-0 right-0 z-[110] h-[3px] bg-secondary pointer-events-none">
        <div
          className="h-full bg-primary transition-[width] duration-100 ease-out"
          style={{ width: `${readProgress * 100}%` }}
        />
      </div>

      {/* Fixed header */}
      <div className="shrink-0 z-[115] relative flex items-center justify-between border-b border-border bg-background px-4 py-3">
        <button onClick={() => onOpenChange(false)} className="rounded-full p-1.5 hover:bg-secondary transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-1">
          {isMeetup && (
            <span className="text-[10px] font-bold text-primary-foreground px-2 py-0.5 rounded-full bg-primary mr-1">
              📍 MeetUP
            </span>
          )}
          <span className="text-[10px] font-semibold text-primary px-2 py-0.5 rounded-full bg-primary/10">
            {cat.icon} {cat.label}
          </span>
        </div>
        {isOwner ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-full p-1.5 hover:bg-secondary transition-colors">
                <MoreVertical className="h-5 w-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!isMeetupEnded && (
                <DropdownMenuItem
                  className="gap-2"
                  onClick={() => setShowEditModal(true)}
                >
                  <Pencil className="h-4 w-4" /> Edit {isMeetup ? "Meetup" : isQuestion ? "Question" : "Article"}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                className="text-destructive gap-2"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="h-4 w-4" /> Delete {isMeetup ? "Meetup" : isQuestion ? "Question" : "Article"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : user && user.id !== post.user_id ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-full p-1.5 hover:bg-secondary transition-colors">
                <MoreVertical className="h-5 w-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="text-destructive gap-2" onClick={() => setShowReport(true)}>
                <AlertTriangle className="h-4 w-4" /> Report
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="w-5" />
        )}
      </div>

      {/* Scrollable content */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto overscroll-contain scrollbar-hide">
        {/* Cover image */}
        {post.cover_image && (
          <button onClick={() => setFullscreenImage(post.cover_image)} className="w-full">
            <img src={post.cover_image} alt={post.title} className="w-full aspect-[16/9] object-cover" />
          </button>
        )}

        <article className="px-5 pb-8 max-w-[640px] mx-auto">
          {/* Title */}
          <h1 className="mt-6 font-display text-[26px] sm:text-3xl font-extrabold leading-[1.25] tracking-tight text-foreground">
            {post.title}
          </h1>

          {/* Author meta */}
          <div className="mt-4 flex items-center gap-3">
            <button onClick={() => goToProfile(post.user_id)}>
              {post.avatar_url ? (
                <img src={post.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-sm font-bold text-primary-foreground">
                  {initials}
                </div>
              )}
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

          {/* MeetUP Event Info Card */}
          {isMeetup && (
            <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-3">
              <p className="text-sm font-bold text-primary flex items-center gap-1.5">
                <MapPin className="h-4 w-4" /> Event Details
              </p>

              {post.event_date && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-primary shrink-0" />
                  <span className="font-semibold">
                    {format(new Date(post.event_date), "EEEE, MMMM d, yyyy")}
                  </span>
                </div>
              )}

              {post.event_start_time && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-primary shrink-0" />
                  <span>
                    {post.event_start_time.slice(0, 5)} — {post.event_end_time?.slice(0, 5)}
                  </span>
                </div>
              )}

              {post.event_location && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-primary shrink-0" />
                  <span>{post.event_location}</span>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-primary shrink-0" />
                <span className="font-semibold">{participantsCount}</span> going
                {post.event_max_participants && (
                  <span className="text-muted-foreground">· {post.event_max_participants} max</span>
                )}
              </div>

              {post.event_pet_types && post.event_pet_types.length > 0 && (
                <div className="flex items-start gap-2">
                  <PawPrint className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div className="flex flex-wrap gap-1">
                    {post.event_pet_types.map((pt) => (
                      <span key={pt} className="rounded-full bg-background px-2.5 py-0.5 text-[11px] font-medium border border-border">
                        {pt}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Ended banner */}
              {isMeetupEnded && (
                <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-center">
                  <p className="text-sm font-bold text-destructive">This meetup has ended</p>
                </div>
              )}

              {/* Join button */}
              {!isMeetupEnded ? (
                <button
                  onClick={toggleJoin}
                  className={`w-full rounded-xl py-3 text-sm font-bold transition-all active:scale-[0.98] ${
                    joined
                      ? "bg-primary/10 text-primary border-2 border-primary"
                      : "bg-primary text-primary-foreground shadow-md"
                  }`}
                >
                  {joined ? "✓ You're Going — Tap to Leave" : "Join This Event"}
                </button>
              ) : (
                <button
                  disabled
                  className="w-full rounded-xl py-3 text-sm font-bold bg-muted text-muted-foreground cursor-not-allowed"
                >
                  Event Ended
                </button>
              )}

              {/* Open Chat button — only visible when joined */}
              {joined && (
                <button
                  onClick={openMeetupChat}
                  className="w-full rounded-xl py-3 text-sm font-bold transition-all active:scale-[0.98] bg-secondary text-foreground border border-border flex items-center justify-center gap-2"
                >
                  <MessageSquare className="h-4 w-4" />
                  {isMeetupEnded ? "View MeetUP Chat" : "Open MeetUP Chat"}
                </button>
              )}
            </div>
          )}

          {/* Divider */}
          <div className="my-6 border-t border-border" />

          {/* Content */}
          <div className="space-y-5">
            {paragraphs.map((p, i) => (
              <p key={i} className="text-[17px] sm:text-lg leading-[1.85] text-foreground/90 break-words">
                {p}
              </p>
            ))}
          </div>

          {/* Participants list (MeetUP only) */}
          {isMeetup && participants.length > 0 && (
            <div className="mt-8">
              <h3 className="font-display text-base font-bold mb-3 flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Participants ({participants.length})
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {participants.map((p) => (
                  <button
                    key={p.user_id}
                    onClick={() => goToProfile(p.user_id)}
                    className="flex items-center gap-2.5 rounded-xl bg-secondary/50 px-3 py-2.5 hover:bg-secondary transition-colors"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={p.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-[10px] font-bold text-primary">
                        {p.full_name?.[0]?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-semibold truncate">{p.full_name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <ClickableTag
                  key={tag}
                  tag={tag}
                  className="rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-foreground/70"
                />
              ))}
            </div>
          )}

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
              {saved ? <BookmarkCheck className="h-5 w-5 text-primary fill-primary" /> : <Bookmark className="h-5 w-5 text-muted-foreground" />}
            </button>
            <button onClick={handleShareArticle} className="transition-transform active:scale-90">
              <Share2 className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>

          {/* Comments / Answers section */}
          <div className="mt-6">
            <h3 className="font-display text-base font-bold mb-4">
              {isQuestion ? `Answers (${comments.length})` : `Comments (${comments.length})`}
            </h3>

            {comments.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {isQuestion ? "No answers yet. Be the first to help!" : "No comments yet. Be the first to share your thoughts!"}
              </p>
            )}

            <div className="space-y-4">
              {/* Sort: helpful answers first */}
              {[...comments].sort((a, b) => (b.is_helpful ? 1 : 0) - (a.is_helpful ? 1 : 0)).map((c) => (
                <div
                  key={c.id}
                  className={`flex items-start gap-3 ${c.is_helpful ? "relative" : ""}`}
                >
                  {/* Helpful highlight border */}
                  {c.is_helpful && (
                    <div className="absolute -left-2 top-0 bottom-0 w-1 rounded-full bg-accent" />
                  )}
                  <button onClick={() => goToProfile(c.user_id)} className="shrink-0">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={c.avatar_url || undefined} />
                      <AvatarFallback className="bg-secondary text-[10px] font-bold">
                        {c.username[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                  <div className={`min-w-0 flex-1 rounded-2xl px-3.5 py-2.5 ${c.is_helpful ? "bg-accent/10 border border-accent/20" : "bg-secondary/50"}`}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button onClick={() => goToProfile(c.user_id)} className="text-xs font-bold hover:underline">
                        {c.username}
                      </button>
                      {c.is_helpful && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold text-accent">
                          <Star className="h-3 w-3 fill-accent" /> Helpful Answer
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="mt-1 text-sm leading-relaxed">{c.content}</p>

                    {/* "This was helpful" button — only for question owner, not on own comments */}
                    {isQuestion && isOwner && c.user_id !== user?.id && !c.is_helpful && !hasHelpfulAnswer && (
                      <button
                        onClick={() => markHelpful(c)}
                        className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-[11px] font-semibold text-muted-foreground hover:text-accent hover:bg-accent/10 transition-colors active:scale-95"
                      >
                        <ThumbsUp className="h-3.5 w-3.5" />
                        This was helpful
                      </button>
                    )}

                    {/* Already marked */}
                    {isQuestion && c.is_helpful && isOwner && (
                      <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-accent">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Marked as Helpful ✅
                      </div>
                    )}
                  </div>
                  {canDeleteComment(c) && (
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
                  )}
                </div>
              ))}
            </div>

            {/* Comment input */}
            <div className="mt-4 flex gap-2 sticky bottom-0 bg-background py-3">
              <Input
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="flex-1 rounded-full text-sm"
                onKeyDown={(e) => e.key === "Enter" && addComment()}
              />
              <Button size="sm" onClick={addComment} disabled={!newComment.trim()} className="rounded-full px-4">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </article>
      </div>

      {/* Fullscreen image viewer */}
      {fullscreenImage && (
        <div className="fixed inset-0 z-[120] bg-black flex items-center justify-center" onClick={() => setFullscreenImage(null)}>
          <button className="absolute top-4 right-4 text-white z-10">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <img src={fullscreenImage} alt="" className="max-h-full max-w-full object-contain" />
        </div>
      )}
    </div>

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this {isMeetup ? "meetup and its chat" : isQuestion ? "question" : "article"} along with all related data (comments, likes, etc.). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteArticle}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {post && (
        <EditBlogModal
          post={post}
          open={showEditModal}
          onOpenChange={setShowEditModal}
          onUpdated={() => {
            onOpenChange(false);
            onRefresh();
          }}
        />
      )}

      <ReportModal
        open={showReport}
        onOpenChange={setShowReport}
        reportedUserId={post?.user_id}
        contentId={post?.id}
        contentType={post?.post_type === "meetup" ? "meetup" : post?.post_type === "question" ? "question" : "article"}
      />
    </>
  );
};

export default BlogArticleViewer;
