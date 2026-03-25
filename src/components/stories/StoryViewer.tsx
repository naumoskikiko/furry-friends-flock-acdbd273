import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { X, MapPin, Heart, MessageCircle, Send, Eye, BarChart3, ChevronDown, Trash2, MoreVertical } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useToast } from "@/hooks/use-toast";
import StoryLocationMap from "./StoryLocationMap";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export interface StoryItem {
  id: string;
  user_id: string;
  media_url: string;
  media_type: string;
  caption: string;
  location: string;
  text_overlay: string;
  sticker: string;
  created_at: string;
  likes_count: number;
  is_liked: boolean;
}

export interface StoryGroup {
  user_id: string;
  username: string;
  avatar_url: string | null;
  initials: string;
  stories: StoryItem[];
}

interface StoryViewerProps {
  groups: StoryGroup[];
  initialGroupIndex: number;
  open: boolean;
  onClose: () => void;
  onLike?: (storyId: string) => void;
  onUnlike?: (storyId: string) => void;
  onReply?: (storyId: string, storyOwnerId: string, mediaUrl: string, replyText: string) => void;
  onShare?: (storyId: string, mediaUrl: string) => void;
  onView?: (storyId: string) => void;
  onDelete?: (storyId: string) => void;
}

const STORY_DURATION = 5000;
const TAP_THRESHOLD = 10;
const SWIPE_THRESHOLD = 60;
const LONG_PRESS_MS = 200;

const StoryViewer = ({
  groups, initialGroupIndex, open, onClose,
  onLike, onUnlike, onReply, onShare, onView, onDelete,
}: StoryViewerProps) => {
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [showReply, setShowReply] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(false);

  // Pull-down state
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Timer refs
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const elapsedRef = useRef<number>(0);

  // Gesture refs
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHoldingRef = useRef(false);
  const gestureActiveRef = useRef<"none" | "drag-down" | "swipe-h">("none");

  // Video ref
  const videoRef = useRef<HTMLVideoElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const group = groups[groupIndex];
  const story = group?.stories[storyIndex];
  const isVideo = story?.media_type === "video";
  const isMine = story?.user_id === user?.id;

  // Compute whether timer should be frozen
  const timerFrozen = paused || showReply || isDragging || isHoldingRef.current || insightsOpen || confirmDeleteOpen || showMenu;

  // Record view
  useEffect(() => {
    if (story && onView && !isMine) onView(story.id);
  }, [story?.id]);

  // --- Navigation ---
  const goNext = useCallback(() => {
    if (!group) return;
    if (storyIndex < group.stories.length - 1) {
      setStoryIndex(s => s + 1);
    } else if (groupIndex < groups.length - 1) {
      setGroupIndex(g => g + 1);
      setStoryIndex(0);
    } else {
      onClose();
    }
  }, [group, storyIndex, groupIndex, groups.length, onClose]);

  const goPrev = useCallback(() => {
    if (storyIndex > 0) {
      setStoryIndex(s => s - 1);
    } else if (groupIndex > 0) {
      setGroupIndex(g => g - 1);
      const prevGroup = groups[groupIndex - 1];
      setStoryIndex(prevGroup ? prevGroup.stories.length - 1 : 0);
    }
  }, [storyIndex, groupIndex, groups]);

  const goNextGroup = useCallback(() => {
    if (groupIndex < groups.length - 1) {
      setGroupIndex(g => g + 1);
      setStoryIndex(0);
    } else {
      onClose();
    }
  }, [groupIndex, groups.length, onClose]);

  const goPrevGroup = useCallback(() => {
    if (groupIndex > 0) {
      setGroupIndex(g => g - 1);
      setStoryIndex(0);
    }
  }, [groupIndex]);

  // --- Timer ---
  const pauseTimer = useCallback(() => {
    elapsedRef.current += Date.now() - startTimeRef.current;
    cancelAnimationFrame(rafRef.current);
  }, []);

  useEffect(() => {
    if (!open || !story || isVideo || timerFrozen) {
      cancelAnimationFrame(rafRef.current);
      return;
    }

    startTimeRef.current = Date.now();

    const animate = () => {
      const elapsed = elapsedRef.current + (Date.now() - startTimeRef.current);
      const pct = Math.min(elapsed / STORY_DURATION, 1);
      setProgress(pct);
      if (pct < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        elapsedRef.current = 0;
        goNext();
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [open, story?.id, isVideo, timerFrozen, goNext]);

  // Reset on story change
  useEffect(() => {
    elapsedRef.current = 0;
    setProgress(0);
    setPaused(false);
    setShowReply(false);
    setReplyText("");
    setInsightsOpen(false);
    setShowMenu(false);
    isHoldingRef.current = false;
  }, [groupIndex, storyIndex]);

  // Sync initial group
  useEffect(() => {
    setGroupIndex(initialGroupIndex);
    setStoryIndex(0);
  }, [initialGroupIndex]);

  // Pause/resume video
  useEffect(() => {
    if (!videoRef.current || !isVideo) return;
    if (timerFrozen) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(() => {});
    }
  }, [timerFrozen, isVideo]);

  // --- Gesture handlers ---
  const handleTouchStart = (e: React.TouchEvent) => {
    if (showReply || insightsOpen) return;
    const { clientX, clientY } = e.touches[0];
    touchStartRef.current = { x: clientX, y: clientY, time: Date.now() };
    gestureActiveRef.current = "none";
    isHoldingRef.current = false;

    longPressTimerRef.current = setTimeout(() => {
      isHoldingRef.current = true;
      pauseTimer();
      setPaused(true);
    }, LONG_PRESS_MS);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (showReply || insightsOpen) return;
    const { clientX, clientY } = e.touches[0];
    const dx = clientX - touchStartRef.current.x;
    const dy = clientY - touchStartRef.current.y;

    if (Math.abs(dx) > TAP_THRESHOLD || Math.abs(dy) > TAP_THRESHOLD) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }

    if (isHoldingRef.current) return;

    if (gestureActiveRef.current === "none" && (Math.abs(dx) > 15 || Math.abs(dy) > 15)) {
      if (Math.abs(dy) > Math.abs(dx) && dy > 0) {
        gestureActiveRef.current = "drag-down";
        pauseTimer();
        setIsDragging(true);
      } else if (Math.abs(dx) > Math.abs(dy)) {
        gestureActiveRef.current = "swipe-h";
      }
    }

    if (gestureActiveRef.current === "drag-down") {
      setDragY(Math.max(0, dy));
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (showReply || insightsOpen) return;

    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    const { clientX, clientY } = e.changedTouches[0];
    const dx = clientX - touchStartRef.current.x;
    const dy = clientY - touchStartRef.current.y;
    const dt = Date.now() - touchStartRef.current.time;

    if (isHoldingRef.current) {
      isHoldingRef.current = false;
      setPaused(false);
      gestureActiveRef.current = "none";
      return;
    }

    if (gestureActiveRef.current === "drag-down") {
      if (dragY > 120) onClose();
      setDragY(0);
      setIsDragging(false);
      gestureActiveRef.current = "none";
      return;
    }

    if (gestureActiveRef.current === "swipe-h" && Math.abs(dx) > SWIPE_THRESHOLD && dt < 500) {
      if (dx < 0) goNextGroup();
      else goPrevGroup();
      gestureActiveRef.current = "none";
      return;
    }

    gestureActiveRef.current = "none";

    if (Math.abs(dx) < TAP_THRESHOLD && Math.abs(dy) < TAP_THRESHOLD && dt < 300) {
      const screenW = window.innerWidth;
      if (clientX < screenW * 0.3) goPrev();
      else if (clientX > screenW * 0.7) goNext();
    }
  };

  // Mouse fallback
  const handleMouseDown = (e: React.MouseEvent) => {
    if (showReply || insightsOpen) return;
    touchStartRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
    gestureActiveRef.current = "none";
    isHoldingRef.current = false;

    longPressTimerRef.current = setTimeout(() => {
      isHoldingRef.current = true;
      pauseTimer();
      setPaused(true);
    }, LONG_PRESS_MS);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (showReply || insightsOpen) return;
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (isHoldingRef.current) {
      isHoldingRef.current = false;
      setPaused(false);
      return;
    }

    const dx = e.clientX - touchStartRef.current.x;
    const dy = e.clientY - touchStartRef.current.y;
    const dt = Date.now() - touchStartRef.current.time;

    if (Math.abs(dx) < TAP_THRESHOLD && Math.abs(dy) < TAP_THRESHOLD && dt < 300) {
      const screenW = window.innerWidth;
      if (e.clientX < screenW * 0.3) goPrev();
      else if (e.clientX > screenW * 0.7) goNext();
    }
  };

  // --- Actions ---
  const handleLike = () => {
    if (!story) return;
    story.is_liked ? onUnlike?.(story.id) : onLike?.(story.id);
  };

  const handleReplyOpen = () => {
    pauseTimer();
    setPaused(true);
    setShowReply(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleReplySend = () => {
    if (!replyText.trim() || !story || !group) return;
    onReply?.(story.id, group.user_id, story.media_url, replyText.trim());
    setReplyText("");
    setShowReply(false);
    setPaused(false);
  };

  const handleShare = () => {
    if (!story) return;
    onShare?.(story.id, story.media_url);
  };

  const handleDeleteStory = async () => {
    if (!story) return;
    await supabase.from("stories").delete().eq("id", story.id);
    toast({ title: isMine ? "Story deleted" : "Story removed by admin" });
    setConfirmDeleteOpen(false);

    // Call parent callback for optimistic removal
    onDelete?.(story.id);

    // Navigate: if more stories in group, go to next; otherwise close or next group
    if (group.stories.length > 1) {
      // Story will be removed from array by parent, adjust index
      if (storyIndex >= group.stories.length - 1) {
        setStoryIndex(Math.max(0, storyIndex - 1));
      }
    } else if (groupIndex < groups.length - 1) {
      setGroupIndex(g => g + 1);
      setStoryIndex(0);
    } else {
      onClose();
    }
  };

  const handleVideoEnd = () => goNext();

  const toggleInsights = () => {
    setInsightsOpen(prev => !prev);
  };

  if (!open || !group || !story) return null;

  const dragOpacity = Math.max(0.2, 1 - dragY / 400);
  const dragScale = Math.max(0.85, 1 - dragY / 1500);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ backgroundColor: `rgba(0,0,0,${dragOpacity})` }}
    >
      <div
        className="relative h-full w-full max-w-lg mx-auto select-none"
        style={{
          transform: `translateY(${dragY}px) scale(${dragScale})`,
          transition: isDragging ? "none" : "transform 0.3s ease-out",
          borderRadius: dragY > 0 ? "1.5rem" : "0",
          overflow: "hidden",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
      >
        {/* Top buttons */}
        <div className="absolute right-4 top-4 z-[80] flex items-center gap-2 pointer-events-auto" onMouseDown={e => e.stopPropagation()} onMouseUp={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()} onTouchEnd={e => e.stopPropagation()}>
          {(isMine || isAdmin) && (
            <div className="relative z-[81] pointer-events-auto">
              <button
                type="button"
                aria-label="Open story menu"
                onClick={(e) => { e.stopPropagation(); setShowMenu((prev) => !prev); }}
                className="pointer-events-auto text-white/80 transition-colors hover:text-white"
              >
                <MoreVertical className="h-5 w-5" />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-8 z-[90] w-40 overflow-hidden rounded-xl border border-white/10 bg-black/90 shadow-xl backdrop-blur-md pointer-events-auto">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setShowMenu(false); setConfirmDeleteOpen(true); }}
                    className="flex w-full items-center gap-2.5 px-4 py-3 text-sm text-destructive transition-colors hover:bg-white/10"
                  >
                    <Trash2 className="h-4 w-4" /> Delete Story
                  </button>
                </div>
              )}
            </div>
          )}
          <button
            type="button"
            aria-label="Close story viewer"
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="pointer-events-auto text-white"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Progress bars */}
        <div className="absolute left-0 right-0 top-0 z-50 flex gap-1 p-2">
          {group.stories.map((_, i) => (
            <div key={i} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30">
              <div
                className="h-full bg-white"
                style={{
                  width: `${i < storyIndex ? 100 : i === storyIndex ? progress * 100 : 0}%`,
                  transition: i === storyIndex ? "none" : "width 0.2s",
                }}
              />
            </div>
          ))}
        </div>

        {/* User info */}
        <div className="absolute left-0 right-0 top-4 z-50 flex items-center gap-3 px-4 pt-4">
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); navigate(user?.id === group.user_id ? "/profile" : `/user/${group.user_id}`); }}
            className="flex items-center gap-3"
          >
            {group.avatar_url ? (
              <img src={group.avatar_url} className="h-8 w-8 rounded-full object-cover ring-2 ring-white/50" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {group.initials}
              </div>
            )}
            <span className="text-sm font-bold text-white">{group.username}</span>
          </button>
          <span className="text-xs text-white/60">{formatDistanceToNow(new Date(story.created_at), { addSuffix: true })}</span>
          {group.stories.length > 1 && (
            <span className="ml-auto text-[10px] text-white/50 font-medium mr-16">
              {storyIndex + 1}/{group.stories.length}
            </span>
          )}
        </div>

        {/* Media */}
        <div className="relative h-full w-full bg-black">
          {isVideo ? (
            <video
              ref={videoRef}
              key={story.id}
              src={story.media_url}
              className="h-full w-full object-contain"
              autoPlay
              playsInline
              onEnded={handleVideoEnd}
            />
          ) : (
            <img key={story.id} src={story.media_url} alt="" className="h-full w-full object-contain" loading="eager" />
          )}

          {/* Overlays */}
          {story.text_overlay && (
            <div className="absolute inset-x-0 bottom-40 z-30 text-center pointer-events-none">
              <span className="rounded-lg bg-black/60 px-4 py-2 text-lg font-bold text-white">
                {story.text_overlay}
              </span>
            </div>
          )}
          {story.sticker && (
            <div className="absolute right-6 top-24 z-30 text-5xl pointer-events-none">{story.sticker}</div>
          )}
          {story.location && (
            <div className="absolute left-4 top-20 z-30 flex items-center gap-1 rounded-full bg-black/50 px-3 py-1 text-xs text-white pointer-events-none">
              <MapPin className="h-3 w-3" /> {story.location}
            </div>
          )}
          {story.caption && !showReply && (
            <div className="absolute inset-x-0 bottom-28 z-30 px-6 text-center pointer-events-none">
              <p className="text-sm text-white drop-shadow-lg">{story.caption}</p>
            </div>
          )}

          {/* Paused indicator */}
          {paused && !showReply && !insightsOpen && (
            <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
              <div className="rounded-full bg-black/40 p-4 backdrop-blur-sm">
                <div className="flex gap-1.5">
                  <div className="h-6 w-2 rounded-sm bg-white" />
                  <div className="h-6 w-2 rounded-sm bg-white" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Interaction bar (other users) */}
        {!isMine && (
          <div className="absolute bottom-0 left-0 right-0 z-50">
            {showReply ? (
              <div className="flex items-center gap-2 bg-black/80 px-4 py-3 backdrop-blur-sm">
                <input
                  ref={inputRef}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleReplySend()}
                  placeholder={`Reply to ${group.username}...`}
                  className="flex-1 rounded-full bg-white/10 px-4 py-2.5 text-sm text-white placeholder:text-white/40 outline-none"
                />
                <button
                  onClick={handleReplySend}
                  disabled={!replyText.trim()}
                  className="rounded-full bg-primary p-2.5 text-primary-foreground disabled:opacity-40"
                >
                  <Send className="h-4 w-4" />
                </button>
                <button onClick={() => { setShowReply(false); setPaused(false); }} className="text-white/60 text-xs ml-1">
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-8 bg-gradient-to-t from-black/60 to-transparent px-4 py-5 pb-8">
                <button onClick={(e) => { e.stopPropagation(); handleLike(); }} className="flex flex-col items-center gap-1">
                  <Heart
                    className={`h-6 w-6 transition-transform active:scale-125 ${
                      story.is_liked ? "fill-red-500 text-red-500" : "text-white"
                    }`}
                  />
                  <span className="text-[10px] text-white/80">
                    {story.likes_count > 0 ? story.likes_count : "Like"}
                  </span>
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleReplyOpen(); }} className="flex flex-col items-center gap-1">
                  <MessageCircle className="h-6 w-6 text-white" />
                  <span className="text-[10px] text-white/80">Reply</span>
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleShare(); }} className="flex flex-col items-center gap-1">
                  <Send className="h-6 w-6 text-white" />
                  <span className="text-[10px] text-white/80">Share</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Own story: analytics */}
        {isMine && (
          <StoryAnalyticsPanel
            storyId={story.id}
            likesCount={story.likes_count}
            expanded={insightsOpen}
            onToggle={toggleInsights}
          />
        )}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={confirmDeleteOpen} onOpenChange={(v) => { setConfirmDeleteOpen(v); if (!v) setShowMenu(false); }}>
        <AlertDialogContent className="z-[200]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this story?</AlertDialogTitle>
            <AlertDialogDescription>
              {isAdmin && !isMine
                ? "You are deleting this story as an admin. This action cannot be undone."
                : "Are you sure you want to delete this story? This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteStory} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Close menu on outside click */}
      {showMenu && (
        <div className="fixed inset-0 z-[101]" onClick={() => setShowMenu(false)} />
      )}
    </div>
  );
};

const fromTable = (table: string) => (supabase as any).from(table);

// --- Story Analytics Panel ---
interface AnalyticsData {
  views: { user_id: string; full_name: string; avatar_url: string | null; viewed_at: string }[];
  likesCount: number;
  viewsCount: number;
}

const StoryAnalyticsPanel = ({
  storyId,
  likesCount,
  expanded,
  onToggle,
}: {
  storyId: string;
  likesCount: number;
  expanded: boolean;
  onToggle: () => void;
}) => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchAnalytics = async () => {
    if (data) { onToggle(); return; }
    setLoading(true);
    onToggle();

    const { data: views } = await fromTable("story_views")
      .select("user_id, viewed_at")
      .eq("story_id", storyId)
      .order("viewed_at", { ascending: false });

    const viewerIds = (views || []).map((v: any) => v.user_id);
    let profileMap = new Map<string, any>();
    if (viewerIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", viewerIds);
      profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));
    }

    const enrichedViews = (views || []).map((v: any) => {
      const p = profileMap.get(v.user_id);
      return {
        user_id: v.user_id,
        full_name: p?.full_name || "User",
        avatar_url: p?.avatar_url || null,
        viewed_at: v.viewed_at,
      };
    });

    setData({ views: enrichedViews, likesCount, viewsCount: enrichedViews.length });
    setLoading(false);
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 z-50">
      <button
        onClick={(e) => { e.stopPropagation(); fetchAnalytics(); }}
        className="mx-auto mb-2 flex items-center gap-2 rounded-full bg-black/60 px-4 py-2 text-white backdrop-blur-sm"
      >
        <BarChart3 className="h-4 w-4" />
        <span className="text-xs font-semibold">Story Insights</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded && (
        <div className="mx-2 mb-2 rounded-2xl bg-black/80 p-4 backdrop-blur-md text-white max-h-60 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
            </div>
          ) : data ? (
            <>
              <div className="flex justify-around mb-4">
                <div className="flex flex-col items-center gap-0.5">
                  <Eye className="h-5 w-5 text-white/80" />
                  <span className="text-lg font-bold">{data.viewsCount}</span>
                  <span className="text-[10px] text-white/60">Views</span>
                </div>
                <div className="flex flex-col items-center gap-0.5">
                  <Heart className="h-5 w-5 text-red-400" />
                  <span className="text-lg font-bold">{data.likesCount}</span>
                  <span className="text-[10px] text-white/60">Likes</span>
                </div>
              </div>

              {data.views.length > 0 ? (
                <div>
                  <p className="text-[11px] font-semibold text-white/60 uppercase mb-2">Viewed by</p>
                  <div className="space-y-2">
                    {data.views.map((v) => {
                      const initials = v.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
                      return (
                        <div key={v.user_id} className="flex items-center gap-2.5">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={v.avatar_url || undefined} />
                            <AvatarFallback className="bg-white/20 text-[10px] font-bold text-white">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold truncate">{v.full_name}</p>
                          </div>
                          <span className="text-[10px] text-white/40">
                            {formatDistanceToNow(new Date(v.viewed_at), { addSuffix: true })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-center text-xs text-white/50 py-2">No views yet</p>
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default StoryViewer;
