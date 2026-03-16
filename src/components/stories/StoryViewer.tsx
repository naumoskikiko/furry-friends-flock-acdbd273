import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { X, ChevronLeft, ChevronRight, MapPin, Pause, Play, Heart, MessageCircle, Send, Eye, BarChart3, ChevronDown } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
}

const STORY_DURATION = 5000;

const StoryViewer = ({
  groups, initialGroupIndex, open, onClose,
  onLike, onUnlike, onReply, onShare, onView,
}: StoryViewerProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [showReply, setShowReply] = useState(false);
  const timerRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const elapsedRef = useRef<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const group = groups[groupIndex];
  const story = group?.stories[storyIndex];
  const isVideo = story?.media_type === "video";
  const isMine = story?.user_id === user?.id;

  // Record view when story changes
  useEffect(() => {
    if (story && onView && !isMine) {
      onView(story.id);
    }
  }, [story?.id]);

  const goNext = useCallback(() => {
    if (!group) return;
    if (storyIndex < group.stories.length - 1) {
      setStoryIndex((s) => s + 1);
      setProgress(0);
    } else if (groupIndex < groups.length - 1) {
      setGroupIndex((g) => g + 1);
      setStoryIndex(0);
      setProgress(0);
    } else {
      onClose();
    }
  }, [group, storyIndex, groupIndex, groups.length, onClose]);

  const goPrev = useCallback(() => {
    if (storyIndex > 0) {
      setStoryIndex((s) => s - 1);
      setProgress(0);
    } else if (groupIndex > 0) {
      setGroupIndex((g) => g - 1);
      setStoryIndex(0);
      setProgress(0);
    }
  }, [storyIndex, groupIndex]);

  useEffect(() => {
    if (!open || !story || isVideo || paused || showReply) return;

    startTimeRef.current = Date.now();

    const animate = () => {
      const elapsed = elapsedRef.current + (Date.now() - startTimeRef.current);
      const pct = Math.min(elapsed / STORY_DURATION, 1);
      setProgress(pct);
      if (pct < 1) {
        timerRef.current = requestAnimationFrame(animate);
      } else {
        elapsedRef.current = 0;
        goNext();
      }
    };

    timerRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(timerRef.current);
  }, [open, story, isVideo, paused, goNext, showReply]);

  useEffect(() => {
    elapsedRef.current = 0;
    setProgress(0);
    setPaused(false);
    setShowReply(false);
    setReplyText("");
  }, [groupIndex, storyIndex]);

  useEffect(() => {
    setGroupIndex(initialGroupIndex);
    setStoryIndex(0);
  }, [initialGroupIndex]);

  const handlePauseToggle = () => {
    if (showReply) return;
    if (paused) {
      setPaused(false);
    } else {
      elapsedRef.current += Date.now() - startTimeRef.current;
      cancelAnimationFrame(timerRef.current);
      setPaused(true);
    }
  };

  const handleVideoEnd = () => goNext();

  const handleLike = () => {
    if (!story) return;
    if (story.is_liked) {
      onUnlike?.(story.id);
    } else {
      onLike?.(story.id);
    }
  };

  const handleReplyOpen = () => {
    elapsedRef.current += Date.now() - startTimeRef.current;
    cancelAnimationFrame(timerRef.current);
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

  if (!open || !group || !story) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black">
      {/* Close */}
      <button onClick={onClose} className="absolute right-4 top-4 z-50 text-white">
        <X className="h-6 w-6" />
      </button>

      {/* Left/Right tap zones */}
      {!showReply && (
        <>
          <button onClick={goPrev} className="absolute left-0 top-0 z-40 h-full w-1/4" />
          <button onClick={goNext} className="absolute right-0 top-0 z-40 h-full w-1/4" />
          {/* Center hold-to-pause zone */}
          <div
            onMouseDown={() => {
              elapsedRef.current += Date.now() - startTimeRef.current;
              cancelAnimationFrame(timerRef.current);
              setPaused(true);
            }}
            onMouseUp={() => setPaused(false)}
            onMouseLeave={() => { if (paused) setPaused(false); }}
            onTouchStart={() => {
              elapsedRef.current += Date.now() - startTimeRef.current;
              cancelAnimationFrame(timerRef.current);
              setPaused(true);
            }}
            onTouchEnd={() => setPaused(false)}
            className="absolute left-1/4 top-0 z-40 h-[calc(100%-120px)] w-1/2 cursor-pointer"
          />
        </>
      )}

      {/* Progress bars */}
      <div className="absolute left-0 right-0 top-0 z-50 flex gap-1 p-2">
        {group.stories.map((_, i) => (
          <div key={i} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30">
            <div
              className="h-full bg-white transition-none"
              style={{
                width: `${i < storyIndex ? 100 : i === storyIndex ? progress * 100 : 0}%`,
              }}
            />
          </div>
        ))}
      </div>

      {/* User info */}
      <div className="absolute left-0 right-0 top-4 z-50 flex items-center gap-3 px-4 pt-4">
        <button onClick={() => { onClose(); navigate(user?.id === group.user_id ? "/profile" : `/user/${group.user_id}`); }} className="flex items-center gap-3">
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
        {paused && !showReply && <Pause className="ml-auto h-4 w-4 text-white/60" />}
      </div>

      {/* Media */}
      <div className="relative h-full w-full">
        {isVideo ? (
          <video
            key={story.id}
            src={story.media_url}
            className="h-full w-full object-contain"
            autoPlay
            muted={false}
            playsInline
            onEnded={handleVideoEnd}
          />
        ) : (
          <img key={story.id} src={story.media_url} alt="" className="h-full w-full object-contain" />
        )}

        {/* Overlays */}
        {story.text_overlay && (
          <div className="absolute inset-x-0 bottom-40 z-30 text-center">
            <span className="rounded-lg bg-black/60 px-4 py-2 text-lg font-bold text-white">
              {story.text_overlay}
            </span>
          </div>
        )}
        {story.sticker && (
          <div className="absolute right-6 top-24 z-30 text-5xl">{story.sticker}</div>
        )}
        {story.location && (
          <div className="absolute left-4 top-20 z-30 flex items-center gap-1 rounded-full bg-black/50 px-3 py-1 text-xs text-white">
            <MapPin className="h-3 w-3" /> {story.location}
          </div>
        )}
        {story.caption && !showReply && (
          <div className="absolute inset-x-0 bottom-28 z-30 px-6 text-center">
            <p className="text-sm text-white drop-shadow-lg">{story.caption}</p>
          </div>
        )}
      </div>

      {/* Interaction bar */}
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
              <button onClick={handleLike} className="flex flex-col items-center gap-1">
                <Heart
                  className={`h-6 w-6 transition-transform active:scale-125 ${
                    story.is_liked ? "fill-red-500 text-red-500" : "text-white"
                  }`}
                />
                <span className="text-[10px] text-white/80">
                  {story.likes_count > 0 ? story.likes_count : "Like"}
                </span>
              </button>
              <button onClick={handleReplyOpen} className="flex flex-col items-center gap-1">
                <MessageCircle className="h-6 w-6 text-white" />
                <span className="text-[10px] text-white/80">Reply</span>
              </button>
              <button onClick={handleShare} className="flex flex-col items-center gap-1">
                <Send className="h-6 w-6 text-white" />
                <span className="text-[10px] text-white/80">Share</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Own story: analytics panel */}
      {isMine && (
        <StoryAnalyticsPanel storyId={story.id} likesCount={story.likes_count} />
      )}
    </div>
  );
};

const fromTable = (table: string) => (supabase as any).from(table);

// --- Story Analytics Panel (for own stories) ---
interface AnalyticsData {
  views: { user_id: string; full_name: string; avatar_url: string | null; viewed_at: string }[];
  likesCount: number;
  viewsCount: number;
}

const StoryAnalyticsPanel = ({ storyId, likesCount }: { storyId: string; likesCount: number }) => {
  const [expanded, setExpanded] = useState(false);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchAnalytics = async () => {
    if (data) { setExpanded(!expanded); return; }
    setLoading(true);
    setExpanded(true);

    // Fetch views with profile info
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

    setData({
      views: enrichedViews,
      likesCount,
      viewsCount: enrichedViews.length,
    });
    setLoading(false);
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 z-50">
      {/* Toggle button */}
      <button
        onClick={fetchAnalytics}
        className="mx-auto mb-2 flex items-center gap-2 rounded-full bg-black/60 px-4 py-2 text-white backdrop-blur-sm"
      >
        <BarChart3 className="h-4 w-4" />
        <span className="text-xs font-semibold">Story Insights</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {/* Analytics panel */}
      {expanded && (
        <div className="mx-2 mb-2 rounded-2xl bg-black/80 p-4 backdrop-blur-md text-white max-h-60 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
            </div>
          ) : data ? (
            <>
              {/* Stats row */}
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

              {/* Viewer list */}
              {data.views.length > 0 && (
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
              )}

              {data.views.length === 0 && (
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
