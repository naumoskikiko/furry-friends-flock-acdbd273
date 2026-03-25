import { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Image, Video, Camera, Type, Smile, MapPin, Trash2, Plus, Pencil, Crop, Palette, Eraser } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getStoryDrafts, saveStoryDraft, deleteStoryDraft, type StoryDraft } from "@/hooks/useStories";
import { formatDistanceToNow } from "date-fns";
import DraggableOverlay from "./DraggableOverlay";
import DrawingCanvas from "./DrawingCanvas";
import LocationSearch from "./LocationSearch";

interface CreateStoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStoryCreated: () => void;
  pets: any[];
}

const EMOJI_LIST = ["🐶", "🐱", "🐾", "❤️", "🔥", "✨", "🎉", "😍", "🐕", "🐈", "🦜", "🐠", "🐰", "🐹", "😂", "🥺", "💕", "🌈", "⭐", "🎵", "🤩", "💪", "🎀", "🌸"];
const COLORS = ["#ffffff", "#ff3b30", "#ff9500", "#ffcc00", "#34c759", "#007aff", "#5856d6", "#af52de", "#ff2d55", "#000000"];
const FONTS = ["font-sans", "font-serif", "font-mono"];

interface FileItem {
  file: File;
  preview: string;
  mediaType: "image" | "video";
}

interface TextItem {
  id: string;
  text: string;
  color: string;
  font: string;
}

interface EmojiItem {
  id: string;
  emoji: string;
}

type ToolMode = "text" | "sticker" | "location" | "draw" | "crop" | null;

const CreateStoryModal = ({ open, onOpenChange, onStoryCreated, pets }: CreateStoryModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const [files, setFiles] = useState<FileItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [petId, setPetId] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeTool, setActiveTool] = useState<ToolMode>(null);
  const [drafts, setDrafts] = useState<StoryDraft[]>([]);

  // Text overlays
  const [textItems, setTextItems] = useState<TextItem[]>([]);
  const [editingText, setEditingText] = useState("");
  const [textColor, setTextColor] = useState("#ffffff");
  const [textFont, setTextFont] = useState("font-sans");

  // Emoji overlays
  const [emojiItems, setEmojiItems] = useState<EmojiItem[]>([]);

  // Drawing
  const [drawColor, setDrawColor] = useState("#ff3b30");
  const [brushSize, setBrushSize] = useState(4);
  const [erasing, setErasing] = useState(false);

  // Crop
  const [cropActive, setCropActive] = useState(false);
  const [cropScale, setCropScale] = useState(1);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const cropDragRef = useRef({ startX: 0, startY: 0, offsetX: 0, offsetY: 0 });
  const cropPinchRef = useRef({ initialDist: 0, initialScale: 1 });

  useEffect(() => {
    if (open) setDrafts(getStoryDrafts());
  }, [open]);

  const resetForm = () => {
    setFiles([]);
    setActiveIndex(0);
    setCaption("");
    setLocation("");
    setLocationCoords(null);
    setPetId("");
    setShowPreview(false);
    setActiveTool(null);
    setUploadProgress(0);
    setTextItems([]);
    setEmojiItems([]);
    setEditingText("");
    setCropActive(false);
    setCropScale(1);
    setCropOffset({ x: 0, y: 0 });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected || selected.length === 0) return;

    const newItems: FileItem[] = [];
    let processed = 0;

    Array.from(selected).forEach((file) => {
      const isVideo = file.type.startsWith("video/");
      if (isVideo) {
        const video = document.createElement("video");
        video.preload = "metadata";
        video.onloadedmetadata = () => {
          URL.revokeObjectURL(video.src);
          if (video.duration > 60) {
            toast({ title: "Video too long", description: `${file.name} exceeds 60s`, variant: "destructive" });
          } else {
            newItems.push({ file, preview: URL.createObjectURL(file), mediaType: "video" });
          }
          processed++;
          if (processed === selected.length) setFiles((prev) => [...prev, ...newItems]);
        };
        video.src = URL.createObjectURL(file);
      } else {
        newItems.push({ file, preview: URL.createObjectURL(file), mediaType: "image" });
        processed++;
        if (processed === selected.length) setFiles((prev) => [...prev, ...newItems]);
      }
    });
    e.target.value = "";
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    if (activeIndex >= files.length - 1) setActiveIndex(Math.max(0, files.length - 2));
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const addTextItem = () => {
    if (!editingText.trim()) return;
    setTextItems(prev => [...prev, { id: Date.now().toString(), text: editingText.trim(), color: textColor, font: textFont }]);
    setEditingText("");
  };

  const removeTextItem = (id: string) => {
    setTextItems(prev => prev.filter(t => t.id !== id));
  };

  const addEmojiItem = (emoji: string) => {
    setEmojiItems(prev => [...prev, { id: Date.now().toString(), emoji }]);
  };

  const removeEmojiItem = (id: string) => {
    setEmojiItems(prev => prev.filter(e => e.id !== id));
  };

  // Crop gestures
  const handleCropTouchStart = (e: React.TouchEvent) => {
    if (!cropActive) return;
    e.stopPropagation();
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      cropPinchRef.current = { initialDist: Math.sqrt(dx * dx + dy * dy), initialScale: cropScale };
    } else {
      cropDragRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY, offsetX: cropOffset.x, offsetY: cropOffset.y };
    }
  };

  const handleCropTouchMove = (e: React.TouchEvent) => {
    if (!cropActive) return;
    e.stopPropagation();
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const newScale = Math.max(0.5, Math.min(5, cropPinchRef.current.initialScale * (dist / cropPinchRef.current.initialDist)));
      setCropScale(newScale);
    } else if (e.touches.length === 1) {
      const dx = e.touches[0].clientX - cropDragRef.current.startX;
      const dy = e.touches[0].clientY - cropDragRef.current.startY;
      setCropOffset({ x: cropDragRef.current.offsetX + dx, y: cropDragRef.current.offsetY + dy });
    }
  };

  const handleCropMouseDown = (e: React.MouseEvent) => {
    if (!cropActive) return;
    e.stopPropagation();
    e.preventDefault();
    cropDragRef.current = { startX: e.clientX, startY: e.clientY, offsetX: cropOffset.x, offsetY: cropOffset.y };
    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - cropDragRef.current.startX;
      const dy = ev.clientY - cropDragRef.current.startY;
      setCropOffset({ x: cropDragRef.current.offsetX + dx, y: cropDragRef.current.offsetY + dy });
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const handleCropWheel = (e: React.WheelEvent) => {
    if (!cropActive) return;
    e.stopPropagation();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setCropScale(prev => Math.max(0.5, Math.min(5, prev + delta)));
  };

  const handlePublish = async () => {
    if (!user || files.length === 0) return;
    setUploading(true);

    // Serialize overlays as simple text for storage
    const textOverlay = textItems.map(t => t.text).join(" | ");
    const stickerStr = emojiItems.map(e => e.emoji).join("");

    for (let i = 0; i < files.length; i++) {
      setUploadProgress(Math.round(((i) / files.length) * 100));
      const item = files[i];
      const ext = item.file.name.split(".").pop();
      const filePath = `${user.id}/${Date.now()}_${i}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("story-media").upload(filePath, item.file);
      if (uploadErr) {
        toast({ title: "Upload failed", description: uploadErr.message, variant: "destructive" });
        setUploading(false);
        setUploadProgress(0);
        return;
      }
      const { data: { publicUrl } } = supabase.storage.from("story-media").getPublicUrl(filePath);

      const storyData: any = {
        user_id: user.id,
        media_url: publicUrl,
        media_type: item.mediaType,
        caption: i === 0 ? caption : "",
        location: i === 0 ? location : "",
        text_overlay: i === 0 ? textOverlay : "",
        sticker: i === 0 ? stickerStr : "",
        pet_id: petId || null,
      };
      if (i === 0 && locationCoords) {
        storyData.location_lat = locationCoords.lat;
        storyData.location_lng = locationCoords.lng;
      }
      const { error } = await supabase.from("stories").insert(storyData);

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        setUploading(false);
        setUploadProgress(0);
        return;
      }
    }

    setUploadProgress(100);
    setUploading(false);
    toast({ title: files.length > 1 ? `${files.length} stories published!` : "Story published!" });
    resetForm();
    onOpenChange(false);
    onStoryCreated();
  };

  function handleDeleteDraft(draftId: string) {
    deleteStoryDraft(draftId);
    setDrafts(getStoryDrafts());
    toast({ title: "Draft deleted" });
  }

  const toggleTool = (tool: ToolMode) => {
    if (tool === "crop") {
      if (cropActive) {
        setCropActive(false);
        setActiveTool(null);
      } else {
        setCropActive(true);
        setActiveTool("crop");
      }
    } else {
      setCropActive(false);
      setActiveTool(activeTool === tool ? null : tool);
    }
  };

  const currentFile = files[activeIndex];
  const hasFiles = files.length > 0;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else onOpenChange(v); }}>
      <DialogContent className="fixed inset-0 max-w-none w-full h-full m-0 p-0 rounded-none border-none bg-black translate-x-0 translate-y-0 data-[state=open]:slide-in-from-bottom-4 data-[state=closed]:slide-out-to-bottom-4">
        <div className="flex flex-col h-full">
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-3 z-20 bg-black/60 backdrop-blur-sm">
            <button onClick={handleClose} className="text-white p-1">
              <X className="h-6 w-6" />
            </button>
            <span className="text-white font-display font-bold text-sm">
              {hasFiles ? (files.length > 1 ? `${activeIndex + 1}/${files.length}` : "New Story") : "New Story"}
            </span>
            {showPreview ? (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setShowPreview(false)} className="rounded-full border-white/30 text-white">
                  Back
                </Button>
                <Button
                  size="sm"
                  onClick={handlePublish}
                  disabled={uploading}
                  className="petkeep-gradient text-primary-foreground font-bold rounded-full px-5"
                >
                  {uploading ? `${uploadProgress}%` : "Publish"}
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                onClick={() => hasFiles ? setShowPreview(true) : undefined}
                disabled={!hasFiles}
                className="petkeep-gradient text-primary-foreground font-bold rounded-full px-5"
              >
                Preview
              </Button>
            )}
          </div>

          {/* Main preview area */}
          <div
            ref={previewRef}
            className="flex-1 relative overflow-hidden flex items-center justify-center"
            onWheel={handleCropWheel}
          >
            {currentFile ? (
              <>
                {/* Media with crop transforms */}
                <div
                  className="h-full w-full flex items-center justify-center"
                  style={cropActive ? { cursor: "grab" } : undefined}
                  onTouchStart={handleCropTouchStart}
                  onTouchMove={handleCropTouchMove}
                  onMouseDown={handleCropMouseDown}
                >
                  {currentFile.mediaType === "video" ? (
                    <video
                      src={currentFile.preview}
                      className="h-full w-full object-contain"
                      style={{ transform: `scale(${cropScale}) translate(${cropOffset.x / cropScale}px, ${cropOffset.y / cropScale}px)`, transition: "none" }}
                      controls
                      muted
                      autoPlay
                    />
                  ) : (
                    <img
                      src={currentFile.preview}
                      alt="Preview"
                      className="h-full w-full object-contain"
                      style={{ transform: `scale(${cropScale}) translate(${cropOffset.x / cropScale}px, ${cropOffset.y / cropScale}px)`, transition: "none" }}
                      draggable={false}
                    />
                  )}
                </div>

                {/* Crop overlay border */}
                {cropActive && (
                  <div className="absolute inset-0 z-30 pointer-events-none border-2 border-dashed border-white/60 m-4 rounded-lg">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="bg-black/60 text-white text-xs px-3 py-1 rounded-full">Pinch or scroll to zoom • Drag to pan</span>
                    </div>
                  </div>
                )}

                {/* Drawing canvas */}
                <DrawingCanvas
                  canvasRef={drawCanvasRef}
                  width={1080}
                  height={1920}
                  active={activeTool === "draw"}
                  color={drawColor}
                  brushSize={brushSize}
                  erasing={erasing}
                />

                {/* Draggable text overlays */}
                {textItems.map((item) => (
                  <DraggableOverlay key={item.id} onRemove={() => removeTextItem(item.id)} initialX={50} initialY={40}>
                    <span className={`rounded-lg bg-black/60 px-4 py-2 text-lg font-bold ${item.font}`} style={{ color: item.color }}>
                      {item.text}
                    </span>
                  </DraggableOverlay>
                ))}

                {/* Draggable emoji overlays */}
                {emojiItems.map((item) => (
                  <DraggableOverlay key={item.id} onRemove={() => removeEmojiItem(item.id)} initialX={50} initialY={30}>
                    <span className="text-5xl select-none">{item.emoji}</span>
                  </DraggableOverlay>
                ))}

                {/* Location badge */}
                {location && (
                  <DraggableOverlay initialX={20} initialY={10}>
                    <div className="flex items-center gap-1 rounded-full bg-black/50 px-3 py-1 text-xs text-white">
                      <MapPin className="h-3 w-3" /> {location}
                    </div>
                  </DraggableOverlay>
                )}

                {/* Side tool buttons */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-40">
                  <ToolBtn icon={<Type className="h-5 w-5" />} active={activeTool === "text"} onClick={() => toggleTool("text")} />
                  <ToolBtn icon={<Pencil className="h-5 w-5" />} active={activeTool === "draw"} onClick={() => toggleTool("draw")} />
                  <ToolBtn icon={<Smile className="h-5 w-5" />} active={activeTool === "sticker"} onClick={() => toggleTool("sticker")} />
                  <ToolBtn icon={<MapPin className="h-5 w-5" />} active={activeTool === "location"} onClick={() => toggleTool("location")} />
                  <ToolBtn icon={<Crop className="h-5 w-5" />} active={cropActive} onClick={() => toggleTool("crop")} />
                  <button onClick={() => removeFile(activeIndex)} className="rounded-full bg-black/50 p-2.5 text-white/80 hover:text-white transition-colors">
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>

                {/* Active tool panels */}
                {activeTool === "text" && (
                  <div className="absolute bottom-4 inset-x-4 z-40 space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Type text..."
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addTextItem()}
                        className="bg-black/60 border-white/20 text-white placeholder:text-white/50 rounded-full flex-1"
                        autoFocus
                      />
                      <Button size="sm" onClick={addTextItem} className="rounded-full" disabled={!editingText.trim()}>Add</Button>
                    </div>
                    {/* Color picker */}
                    <div className="flex items-center gap-2 justify-center">
                      {COLORS.map(c => (
                        <button
                          key={c}
                          onClick={() => setTextColor(c)}
                          className={`h-6 w-6 rounded-full border-2 transition-transform ${textColor === c ? "border-white scale-125" : "border-transparent"}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    {/* Font picker */}
                    <div className="flex items-center gap-2 justify-center">
                      {FONTS.map(f => (
                        <button
                          key={f}
                          onClick={() => setTextFont(f)}
                          className={`px-3 py-1 rounded-full text-xs text-white transition-colors ${textFont === f ? "bg-primary" : "bg-white/20"} ${f}`}
                        >
                          {f === "font-sans" ? "Sans" : f === "font-serif" ? "Serif" : "Mono"}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {activeTool === "sticker" && (
                  <div className="absolute bottom-4 inset-x-4 z-40 flex flex-wrap gap-2 justify-center bg-black/60 backdrop-blur-sm rounded-2xl p-3 max-h-40 overflow-y-auto">
                    {EMOJI_LIST.map((e) => (
                      <button
                        key={e}
                        onClick={() => addEmojiItem(e)}
                        className="rounded-lg p-2 text-2xl transition-transform hover:scale-125 active:scale-95"
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                )}

                {activeTool === "location" && (
                  <div className="absolute bottom-4 inset-x-4 z-40">
                    <Input
                      placeholder="Add location..."
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="bg-black/60 border-white/20 text-white placeholder:text-white/50 rounded-full"
                      autoFocus
                    />
                  </div>
                )}

                {activeTool === "draw" && (
                  <div className="absolute bottom-4 inset-x-4 z-40 space-y-2">
                    {/* Color + size */}
                    <div className="flex items-center gap-2 justify-center bg-black/60 backdrop-blur-sm rounded-full px-4 py-2">
                      {COLORS.slice(0, 8).map(c => (
                        <button
                          key={c}
                          onClick={() => { setDrawColor(c); setErasing(false); }}
                          className={`h-6 w-6 rounded-full border-2 transition-transform ${drawColor === c && !erasing ? "border-white scale-125" : "border-transparent"}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                      <button
                        onClick={() => setErasing(!erasing)}
                        className={`rounded-full p-1.5 ml-1 transition-colors ${erasing ? "bg-primary text-primary-foreground" : "bg-white/20 text-white"}`}
                      >
                        <Eraser className="h-4 w-4" />
                      </button>
                    </div>
                    {/* Brush size */}
                    <div className="flex items-center gap-3 justify-center">
                      <span className="text-white/60 text-[10px]">Size</span>
                      <input
                        type="range"
                        min={1}
                        max={20}
                        value={brushSize}
                        onChange={(e) => setBrushSize(Number(e.target.value))}
                        className="w-32 accent-primary"
                      />
                      <div className="rounded-full bg-white" style={{ width: brushSize * 2, height: brushSize * 2 }} />
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Empty state — media picker */
              <div className="flex flex-col items-center gap-6 px-6">
                <div className="flex gap-4">
                  <PickerBtn icon={<Image className="h-8 w-8" />} label="Gallery" onClick={() => fileInputRef.current?.click()} />
                  <PickerBtn icon={<Camera className="h-8 w-8" />} label="Camera" onClick={() => fileInputRef.current?.click()} />
                  <PickerBtn icon={<Video className="h-8 w-8" />} label="Video" onClick={() => fileInputRef.current?.click()} />
                </div>
                <p className="text-white/50 text-sm">Select photos or videos for your story</p>

                {drafts.length > 0 && (
                  <div className="w-full max-w-xs">
                    <p className="text-white/60 text-xs font-semibold mb-2">{drafts.length} Draft{drafts.length > 1 ? "s" : ""}</p>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {drafts.map((d) => (
                        <div key={d.id} className="flex items-center gap-3 rounded-xl bg-white/10 p-2">
                          <img src={d.mediaDataUrl} alt="" className="h-10 w-10 rounded-lg object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-white font-medium truncate">{d.caption || "No caption"}</p>
                            <p className="text-[10px] text-white/50">{formatDistanceToNow(d.createdAt, { addSuffix: true })}</p>
                          </div>
                          <button onClick={() => handleDeleteDraft(d.id)} className="p-1 text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleFileSelect} />
          </div>

          {/* Bottom: thumbnail strip + caption */}
          {hasFiles && (
            <div className="bg-black/80 backdrop-blur-sm border-t border-white/10">
              {/* Thumbnails */}
              <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto">
                {files.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveIndex(i)}
                    className={`relative shrink-0 h-12 w-12 rounded-lg overflow-hidden ring-2 transition-all ${i === activeIndex ? "ring-primary scale-105" : "ring-transparent opacity-60"}`}
                  >
                    {item.mediaType === "video" ? (
                      <video src={item.preview} className="h-full w-full object-cover" muted />
                    ) : (
                      <img src={item.preview} alt="" className="h-full w-full object-cover" />
                    )}
                    <span className="absolute top-0.5 left-0.5 bg-black/70 text-white text-[8px] font-bold rounded px-1">{i + 1}</span>
                  </button>
                ))}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="shrink-0 flex h-12 w-12 items-center justify-center rounded-lg border border-dashed border-white/30 text-white/50 hover:text-white hover:border-white/60 transition-colors"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>

              {/* Caption input */}
              <div className="px-4 pb-3 pt-1">
                <Input
                  placeholder="Write a caption..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="bg-white/10 border-white/10 text-white placeholder:text-white/40 rounded-full text-sm"
                />
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

/* Small helper components */
function ToolBtn({ icon, active, onClick }: { icon: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full p-2.5 transition-all ${active ? "bg-primary text-primary-foreground scale-110" : "bg-black/50 text-white/80 hover:text-white"}`}
    >
      {icon}
    </button>
  );
}

function PickerBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 rounded-2xl bg-white/10 p-6 transition-colors hover:bg-white/20 text-white"
    >
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

export default CreateStoryModal;
