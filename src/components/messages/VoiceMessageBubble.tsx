import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface VoiceMessageBubbleProps {
  /** Legacy: a publicly-readable URL stored on older messages. */
  audioUrl?: string;
  /** New: storage path inside the private `voice-messages` bucket. */
  audioPath?: string;
  duration: number;
  isMine: boolean;
  playingId: string | null;
  messageId: string;
  onPlay: (id: string) => void;
  onStop: () => void;
}

const VoiceMessageBubble = ({
  audioUrl, audioPath, duration, isMine, playingId, messageId, onPlay, onStop,
}: VoiceMessageBubbleProps) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const rafRef = useRef<number>();

  const isActive = playingId === messageId;

  // Stop if another message starts playing
  useEffect(() => {
    if (!isActive && isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, [isActive, isPlaying]);

  const updateProgress = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.duration && isFinite(audio.duration)) {
      setProgress(audio.currentTime / audio.duration);
      setCurrentTime(audio.currentTime);
    }
    if (!audio.paused) {
      rafRef.current = requestAnimationFrame(updateProgress);
    }
  }, []);

  const togglePlay = async () => {
    if (!audioRef.current) {
      // Resolve the playable URL: prefer signed URL from the private bucket;
      // fall back to legacy public URL stored on older messages.
      let src = audioUrl ?? "";
      if (!src && audioPath) {
        const { data, error } = await supabase
          .storage
          .from("voice-messages")
          .createSignedUrl(audioPath, 60 * 10); // 10-minute signed URL
        if (error || !data?.signedUrl) {
          return; // can't play — silently bail
        }
        src = data.signedUrl;
      }
      if (!src) return;
      const audio = new Audio(src);
      audioRef.current = audio;
      audio.onended = () => {
        setIsPlaying(false);
        setProgress(0);
        setCurrentTime(0);
        onStop();
      };
    }

    const audio = audioRef.current;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      onStop();
    } else {
      onPlay(messageId);
      try {
        await audio.play();
        setIsPlaying(true);
        rafRef.current = requestAnimationFrame(updateProgress);
      } catch {
        // Playback failed
      }
    }
  };

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  // Generate fake waveform bars
  const bars = 24;
  const waveform = useRef(
    Array.from({ length: bars }, () => 0.2 + Math.random() * 0.8)
  ).current;

  return (
    <div className="flex items-center gap-2.5 min-w-[180px]">
      <button
        onClick={togglePlay}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all active:scale-90 ${
          isMine
            ? "bg-primary-foreground/20 text-primary-foreground"
            : "bg-primary/10 text-primary"
        }`}
      >
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
      </button>

      <div className="flex-1 min-w-0">
        {/* Waveform */}
        <div className="flex items-end gap-[2px] h-6">
          {waveform.map((h, i) => {
            const filled = i / bars <= progress;
            return (
              <div
                key={i}
                className={`w-[3px] rounded-full transition-colors duration-100 ${
                  filled
                    ? isMine
                      ? "bg-primary-foreground/80"
                      : "bg-primary"
                    : isMine
                    ? "bg-primary-foreground/25"
                    : "bg-primary/25"
                }`}
                style={{ height: `${h * 100}%` }}
              />
            );
          })}
        </div>
        {/* Time */}
        <p
          className={`text-[10px] mt-0.5 ${
            isMine ? "text-primary-foreground/60" : "text-muted-foreground"
          }`}
        >
          {isPlaying ? formatTime(currentTime) : formatTime(duration)}
        </p>
      </div>
    </div>
  );
};

export default VoiceMessageBubble;
