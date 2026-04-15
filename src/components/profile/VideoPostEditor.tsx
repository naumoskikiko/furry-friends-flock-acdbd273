import { useState, useRef, useEffect, useCallback } from "react";
import {
  ChevronLeft, Play, Pause, Scissors, Image, Square, RectangleVertical,
  RectangleHorizontal, Volume2, VolumeX, Check, RotateCcw, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

type AspectRatio = "1:1" | "4:5" | "16:9" | "original";

interface VideoPostEditorProps {
  videoFile: File;
  onClose: () => void;
  onDone: (result: VideoEditResult) => void;
}

export interface VideoEditResult {
  processedFile: File;
  coverImage: Blob;
  trimStart: number;
  trimEnd: number;
  aspectRatio: AspectRatio;
  duration: number;
}

type EditorStep = "edit" | "cover" | "preview";

const ASPECT_RATIOS: { key: AspectRatio; label: string; icon: any; ratio: number | null }[] = [
  { key: "original", label: "Original", icon: RectangleHorizontal, ratio: null },
  { key: "1:1", label: "1:1", icon: Square, ratio: 1 },
  { key: "4:5", label: "4:5", icon: RectangleVertical, ratio: 4 / 5 },
  { key: "16:9", label: "16:9", icon: RectangleHorizontal, ratio: 16 / 9 },
];

const VideoPostEditor = ({ videoFile, onClose, onDone }: VideoPostEditorProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const [step, setStep] = useState<EditorStep>("edit");
  const [videoUrl, setVideoUrl] = useState("");
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);

  // Trim
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);

  // Aspect ratio
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("original");

  // Cover
  const [coverTime, setCoverTime] = useState(0);
  const [coverBlob, setCoverBlob] = useState<Blob | null>(null);
  const [coverPreview, setCoverPreview] = useState("");

  // Thumbnails for timeline
  const [thumbnails, setThumbnails] = useState<string[]>([]);

  // Processing
  const [processing, setProcessing] = useState(false);

  // Natural dimensions
  const [videoDimensions, setVideoDimensions] = useState({ w: 0, h: 0 });

  // Init video
  useEffect(() => {
    const url = URL.createObjectURL(videoFile);
    setVideoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [videoFile]);

  const MAX_DURATION = 60;

  const onLoadedMetadata = () => {
    const v = videoRef.current;
    if (!v) return;
    setDuration(v.duration);
    setTrimEnd(Math.min(v.duration, MAX_DURATION));
    setCoverTime(0);
    setVideoDimensions({ w: v.videoWidth, h: v.videoHeight });
    generateThumbnails(v);
    extractCoverFrame(0);
  };

  // Generate timeline thumbnails
  const generateThumbnails = async (video: HTMLVideoElement) => {
    const count = Math.min(10, Math.max(5, Math.floor(video.duration)));
    const canvas = document.createElement("canvas");
    canvas.width = 80;
    canvas.height = 80;
    const ctx = canvas.getContext("2d")!;
    const thumbs: string[] = [];

    for (let i = 0; i < count; i++) {
      const time = (video.duration / count) * i;
      video.currentTime = time;
      await new Promise<void>((r) => { video.onseeked = () => r(); });
      ctx.drawImage(video, 0, 0, 80, 80);
      thumbs.push(canvas.toDataURL("image/jpeg", 0.5));
    }

    setThumbnails(thumbs);
    video.currentTime = 0;
  };

  // Extract cover frame
  const extractCoverFrame = useCallback((time: number) => {
    const v = videoRef.current;
    if (!v) return;

    const doExtract = () => {
      const canvas = document.createElement("canvas");
      canvas.width = v.videoWidth;
      canvas.height = v.videoHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(v, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          setCoverBlob(blob);
          setCoverPreview(URL.createObjectURL(blob));
        }
      }, "image/jpeg", 0.9);
    };

    if (Math.abs(v.currentTime - time) > 0.1) {
      v.currentTime = time;
      v.onseeked = doExtract;
    } else {
      doExtract();
    }
  }, []);

  // Playback - respect trim bounds
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const onTimeUpdate = () => {
      setCurrentTime(v.currentTime);
      if (v.currentTime >= trimEnd) {
        v.pause();
        v.currentTime = trimStart;
        setPlaying(false);
      }
    };

    v.addEventListener("timeupdate", onTimeUpdate);
    return () => v.removeEventListener("timeupdate", onTimeUpdate);
  }, [trimStart, trimEnd]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (playing) {
      v.pause();
      setPlaying(false);
    } else {
      if (v.currentTime < trimStart || v.currentTime >= trimEnd) {
        v.currentTime = trimStart;
      }
      v.play();
      setPlaying(true);
    }
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(!muted);
  };

  // Handle trim handle drag
  const handleTrimDrag = (type: "start" | "end", clientX: number) => {
    const timeline = timelineRef.current;
    if (!timeline || !duration) return;
    const rect = timeline.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const time = pct * duration;

    if (type === "start") {
      const newStart = Math.max(0, Math.min(time, trimEnd - 1));
      // Ensure trimmed clip doesn't exceed max duration
      if (trimEnd - newStart > MAX_DURATION) return;
      setTrimStart(newStart);
    } else {
      const newEnd = Math.min(duration, Math.max(time, trimStart + 1));
      // Ensure trimmed clip doesn't exceed max duration
      if (newEnd - trimStart > MAX_DURATION) return;
      setTrimEnd(newEnd);
    }
  };

  // Get display style for aspect ratio crop
  const getVideoStyle = () => {
    if (aspectRatio === "original" || !videoDimensions.w) return {};
    const ar = ASPECT_RATIOS.find((a) => a.key === aspectRatio)?.ratio;
    if (!ar) return {};
    return { aspectRatio: `${ar}`, objectFit: "cover" as const };
  };

  const getContainerStyle = () => {
    if (aspectRatio === "original" || !videoDimensions.w) return {};
    const ar = ASPECT_RATIOS.find((a) => a.key === aspectRatio)?.ratio;
    if (!ar) return {};
    return { aspectRatio: `${ar}` };
  };

  // Handle Done
  const handleDone = async () => {
    if (!coverBlob) {
      extractCoverFrame(coverTime);
      return;
    }
    setProcessing(true);

    try {
      onDone({
        processedFile: videoFile,
        coverImage: coverBlob,
        trimStart,
        trimEnd,
        aspectRatio,
        duration: trimEnd - trimStart,
      });
    } catch (err) {
      console.error("Processing error:", err);
    } finally {
      setProcessing(false);
    }
  };

  const trimDuration = trimEnd - trimStart;
  const formatTime = (t: number) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 z-[70] bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border safe-area-top">
        <button onClick={onClose} className="p-2 text-foreground hover:bg-secondary rounded-full">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h2 className="text-sm font-bold text-foreground">
          {step === "edit" ? "Edit Video" : step === "cover" ? "Choose Cover" : "Preview"}
        </h2>
        {step === "edit" ? (
          <button
            onClick={() => { setStep("cover"); extractCoverFrame(coverTime); }}
            className="text-sm font-bold text-primary px-3 py-1"
          >
            Next
          </button>
        ) : step === "cover" ? (
          <button
            onClick={() => setStep("preview")}
            className="text-sm font-bold text-primary px-3 py-1"
          >
            Next
          </button>
        ) : (
          <button
            onClick={handleDone}
            disabled={processing}
            className="text-sm font-bold text-primary px-3 py-1 disabled:opacity-50"
          >
            {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Done"}
          </button>
        )}
      </div>

      {/* === EDIT STEP === */}
      {step === "edit" && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Video preview */}
          <div className="flex-1 flex items-center justify-center bg-secondary/30 relative overflow-hidden px-4">
            <div
              className="relative overflow-hidden rounded-lg max-w-full max-h-full"
              style={getContainerStyle()}
            >
              <video
                ref={videoRef}
                src={videoUrl}
                onLoadedMetadata={onLoadedMetadata}
                muted={muted}
                playsInline
                className="w-full h-full object-cover"
                style={getVideoStyle()}
              />
              {/* Play/pause overlay */}
              <button
                onClick={togglePlay}
                className="absolute inset-0 flex items-center justify-center bg-black/10 active:bg-black/20 transition-colors"
              >
                {!playing && (
                  <div className="w-14 h-14 rounded-full bg-foreground/70 flex items-center justify-center">
                    <Play className="h-7 w-7 text-background fill-background ml-0.5" />
                  </div>
                )}
              </button>
              {/* Mute button */}
              <button
                onClick={toggleMute}
                className="absolute bottom-3 right-3 rounded-full bg-foreground/60 p-2 text-background"
              >
                {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Timeline & trim */}
          <div className="bg-card border-t border-border px-4 py-3 space-y-3">
            {/* Current time */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{formatTime(trimStart)}</span>
              <span className="font-semibold text-foreground">
                <Scissors className="h-3 w-3 inline mr-1" />
                {formatTime(trimDuration)}
              </span>
              <span>{formatTime(trimEnd)}</span>
            </div>

            {/* Thumbnail timeline with trim handles */}
            <div
              ref={timelineRef}
              className="relative h-14 rounded-lg overflow-hidden select-none"
              onPointerDown={(e) => {
                const rect = timelineRef.current!.getBoundingClientRect();
                const pct = (e.clientX - rect.left) / rect.width;
                const time = pct * duration;
                // Seek to position
                if (videoRef.current) {
                  videoRef.current.currentTime = time;
                  setCurrentTime(time);
                }
              }}
            >
              {/* Thumbnails */}
              <div className="flex h-full">
                {thumbnails.length > 0
                  ? thumbnails.map((t, i) => (
                      <img key={i} src={t} className="h-full flex-1 object-cover" alt="" />
                    ))
                  : <div className="w-full h-full bg-secondary" />
                }
              </div>

              {/* Dimmed outside trim */}
              <div
                className="absolute top-0 left-0 h-full bg-background/70"
                style={{ width: `${(trimStart / duration) * 100}%` }}
              />
              <div
                className="absolute top-0 right-0 h-full bg-background/70"
                style={{ width: `${((duration - trimEnd) / duration) * 100}%` }}
              />

              {/* Trim frame */}
              <div
                className="absolute top-0 h-full border-2 border-primary rounded"
                style={{
                  left: `${(trimStart / duration) * 100}%`,
                  width: `${((trimEnd - trimStart) / duration) * 100}%`,
                }}
              />

              {/* Left handle */}
              <div
                className="absolute top-0 h-full w-4 bg-primary rounded-l cursor-col-resize flex items-center justify-center touch-none"
                style={{ left: `calc(${(trimStart / duration) * 100}% - 8px)` }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  const onMove = (ev: PointerEvent) => handleTrimDrag("start", ev.clientX);
                  const onUp = () => {
                    document.removeEventListener("pointermove", onMove);
                    document.removeEventListener("pointerup", onUp);
                  };
                  document.addEventListener("pointermove", onMove);
                  document.addEventListener("pointerup", onUp);
                }}
              >
                <div className="w-0.5 h-5 bg-primary-foreground rounded-full" />
              </div>

              {/* Right handle */}
              <div
                className="absolute top-0 h-full w-4 bg-primary rounded-r cursor-col-resize flex items-center justify-center touch-none"
                style={{ left: `calc(${(trimEnd / duration) * 100}% - 8px)` }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  const onMove = (ev: PointerEvent) => handleTrimDrag("end", ev.clientX);
                  const onUp = () => {
                    document.removeEventListener("pointermove", onMove);
                    document.removeEventListener("pointerup", onUp);
                  };
                  document.addEventListener("pointermove", onMove);
                  document.addEventListener("pointerup", onUp);
                }}
              >
                <div className="w-0.5 h-5 bg-primary-foreground rounded-full" />
              </div>

              {/* Playhead */}
              <div
                className="absolute top-0 w-0.5 h-full bg-foreground z-10"
                style={{ left: `${(currentTime / duration) * 100}%` }}
              />
            </div>

            {/* Aspect ratio picker */}
            <div className="flex items-center gap-1 justify-center">
              {ASPECT_RATIOS.map((ar) => {
                const Icon = ar.icon;
                return (
                  <button
                    key={ar.key}
                    onClick={() => setAspectRatio(ar.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      aspectRatio === ar.key
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {ar.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* === COVER STEP === */}
      {step === "cover" && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 flex items-center justify-center bg-secondary/30 p-6">
            {coverPreview ? (
              <img src={coverPreview} alt="Cover" className="max-h-full max-w-full rounded-lg object-contain shadow-lg" />
            ) : (
              <div className="w-48 h-48 bg-secondary rounded-lg flex items-center justify-center">
                <Image className="h-10 w-10 text-muted-foreground" />
              </div>
            )}
          </div>

          <div className="bg-card border-t border-border px-4 py-4 space-y-3">
            <p className="text-xs text-muted-foreground text-center">
              Drag to choose your cover frame
            </p>

            {/* Scrubber for cover selection */}
            <div className="relative h-14 rounded-lg overflow-hidden">
              <div className="flex h-full">
                {thumbnails.length > 0
                  ? thumbnails.map((t, i) => (
                      <img key={i} src={t} className="h-full flex-1 object-cover" alt="" />
                    ))
                  : <div className="w-full h-full bg-secondary" />
                }
              </div>

              {/* Selection indicator */}
              <div
                className="absolute top-0 w-1 h-full bg-primary z-10"
                style={{ left: `${duration ? (coverTime / duration) * 100 : 0}%` }}
              />

              {/* Drag area */}
              <div
                className="absolute inset-0 cursor-pointer touch-none"
                onPointerDown={(e) => {
                  const update = (ev: PointerEvent) => {
                    const rect = (e.target as HTMLElement).closest(".relative")!.getBoundingClientRect();
                    const pct = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
                    const time = pct * duration;
                    setCoverTime(time);
                    extractCoverFrame(time);
                  };
                  update(e.nativeEvent as any);
                  const onMove = (ev: PointerEvent) => update(ev);
                  const onUp = () => {
                    document.removeEventListener("pointermove", onMove);
                    document.removeEventListener("pointerup", onUp);
                  };
                  document.addEventListener("pointermove", onMove);
                  document.addEventListener("pointerup", onUp);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* === PREVIEW STEP === */}
      {step === "preview" && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 flex items-center justify-center bg-secondary/30 p-4 relative">
            <div className="relative overflow-hidden rounded-lg max-w-full max-h-full" style={getContainerStyle()}>
              <video
                src={videoUrl}
                ref={(el) => {
                  if (el) {
                    el.currentTime = trimStart;
                    el.muted = muted;
                  }
                }}
                controls
                playsInline
                className="w-full h-full object-cover"
                style={getVideoStyle()}
              />
            </div>
          </div>

          <div className="bg-card border-t border-border px-4 py-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Duration</span>
              <span className="font-medium text-foreground">{formatTime(trimDuration)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Aspect ratio</span>
              <span className="font-medium text-foreground">{aspectRatio === "original" ? "Original" : aspectRatio}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Cover</span>
              {coverPreview && (
                <img src={coverPreview} alt="" className="w-10 h-10 rounded object-cover" />
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setStep("edit")}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Re-edit
              </Button>
              <Button
                className="flex-1 petkeep-gradient text-primary-foreground font-bold"
                onClick={handleDone}
                disabled={processing}
              >
                {processing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                {processing ? "Processing..." : "Use Video"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden canvas for frame extraction */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default VideoPostEditor;
