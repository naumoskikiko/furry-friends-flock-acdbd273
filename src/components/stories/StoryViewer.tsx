import { useState, useEffect, useRef, useCallback } from "react";
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
          <button onClick={goPrev} className="absolute left-0 top-0 z-40 h-full w-1/3" />
          <button onClick={goNext} className="absolute right-0 top-0 z-40 h-full w-1/3" />
          <button
            onMouseDown={handlePauseToggle}
            onTouchStart={handlePauseToggle}
            className="absolute left-1/3 top-0 z-40 h-[calc(100%-120px)] w-1/3"
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
        {group.avatar_url ? (
          <img src={group.avatar_url} className="h-8 w-8 rounded-full object-cover ring-2 ring-white/50" />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {group.initials}
          </div>
        )}
        <span className="text-sm font-bold text-white">{group.username}</span>
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

      {/* Own story: show like count */}
      {isMine && story.likes_count > 0 && (
        <div className="absolute bottom-6 left-0 right-0 z-50 flex justify-center">
          <div className="flex items-center gap-1.5 rounded-full bg-black/50 px-4 py-2 text-white">
            <Heart className="h-4 w-4 fill-red-500 text-red-500" />
            <span className="text-xs font-semibold">{story.likes_count} {story.likes_count === 1 ? "like" : "likes"}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoryViewer;
