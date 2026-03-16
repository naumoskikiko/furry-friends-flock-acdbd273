import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Image, Video, Camera, Type, Smile, MapPin, Trash2, Plus, Pencil, Crop } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getStoryDrafts, saveStoryDraft, deleteStoryDraft, type StoryDraft } from "@/hooks/useStories";
import { formatDistanceToNow } from "date-fns";

interface CreateStoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStoryCreated: () => void;
  pets: any[];
}

const EMOJI_LIST = ["🐶", "🐱", "🐾", "❤️", "🔥", "✨", "🎉", "😍", "🐕", "🐈", "🦜", "🐠", "🐰", "🐹"];

interface FileItem {
  file: File;
  preview: string;
  mediaType: "image" | "video";
}

type ToolMode = "text" | "sticker" | "location" | "draw" | null;

const CreateStoryModal = ({ open, onOpenChange, onStoryCreated, pets }: CreateStoryModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<FileItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [textOverlay, setTextOverlay] = useState("");
  const [sticker, setSticker] = useState("");
  const [petId, setPetId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeTool, setActiveTool] = useState<ToolMode>(null);
  const [drafts, setDrafts] = useState<StoryDraft[]>([]);

  useEffect(() => {
    if (open) setDrafts(getStoryDrafts());
  }, [open]);

  const resetForm = () => {
    setFiles([]);
    setActiveIndex(0);
    setCaption("");
    setLocation("");
    setTextOverlay("");
    setSticker("");
    setPetId("");
    setActiveTool(null);
    setUploadProgress(0);
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

  const handlePublish = async () => {
    if (!user || files.length === 0) return;
    setUploading(true);

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

      const { error } = await supabase.from("stories").insert({
        user_id: user.id,
        media_url: publicUrl,
        media_type: item.mediaType,
        caption: i === 0 ? caption : "",
        location: i === 0 ? location : "",
        text_overlay: i === 0 ? textOverlay : "",
        sticker: i === 0 ? sticker : "",
        pet_id: petId || null,
      });

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
            <Button
              size="sm"
              onClick={handlePublish}
              disabled={!hasFiles || uploading}
              className="petkeep-gradient text-primary-foreground font-bold rounded-full px-5"
            >
              {uploading ? `${uploadProgress}%` : "Share"}
            </Button>
          </div>

          {/* Main preview area — takes all available space */}
          <div className="flex-1 relative overflow-hidden flex items-center justify-center">
            {currentFile ? (
              <>
                {currentFile.mediaType === "video" ? (
                  <video src={currentFile.preview} className="h-full w-full object-contain" controls muted autoPlay />
                ) : (
                  <img src={currentFile.preview} alt="Preview" className="h-full w-full object-contain" />
                )}

                {/* Overlays */}
                {textOverlay && activeIndex === 0 && (
                  <div className="absolute inset-x-0 bottom-28 text-center pointer-events-none">
                    <span className="rounded-lg bg-black/60 px-4 py-2 text-lg font-bold text-white">
                      {textOverlay}
                    </span>
                  </div>
                )}
                {sticker && activeIndex === 0 && (
                  <div className="absolute right-6 top-6 text-5xl pointer-events-none">{sticker}</div>
                )}
                {location && activeIndex === 0 && (
                  <div className="absolute left-4 top-4 flex items-center gap-1 rounded-full bg-black/50 px-3 py-1 text-xs text-white pointer-events-none">
                    <MapPin className="h-3 w-3" /> {location}
                  </div>
                )}

                {/* Side tool buttons */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-10">
                  <ToolBtn icon={<Type className="h-5 w-5" />} active={activeTool === "text"} onClick={() => setActiveTool(activeTool === "text" ? null : "text")} />
                  <ToolBtn icon={<Pencil className="h-5 w-5" />} active={activeTool === "draw"} onClick={() => setActiveTool(activeTool === "draw" ? null : "draw")} />
                  <ToolBtn icon={<Smile className="h-5 w-5" />} active={activeTool === "sticker"} onClick={() => setActiveTool(activeTool === "sticker" ? null : "sticker")} />
                  <ToolBtn icon={<MapPin className="h-5 w-5" />} active={activeTool === "location"} onClick={() => setActiveTool(activeTool === "location" ? null : "location")} />
                  <ToolBtn icon={<Crop className="h-5 w-5" />} active={false} onClick={() => toast({ title: "Crop coming soon" })} />
                  <button onClick={() => removeFile(activeIndex)} className="rounded-full bg-black/50 p-2.5 text-white/80 hover:text-white transition-colors">
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>

                {/* Active tool panel */}
                {activeTool === "text" && (
                  <div className="absolute bottom-4 inset-x-4 z-10">
                    <Input
                      placeholder="Add text overlay..."
                      value={textOverlay}
                      onChange={(e) => setTextOverlay(e.target.value)}
                      className="bg-black/60 border-white/20 text-white placeholder:text-white/50 rounded-full"
                      autoFocus
                    />
                  </div>
                )}
                {activeTool === "sticker" && (
                  <div className="absolute bottom-4 inset-x-4 z-10 flex flex-wrap gap-2 justify-center bg-black/60 backdrop-blur-sm rounded-2xl p-3">
                    {EMOJI_LIST.map((e) => (
                      <button key={e} onClick={() => { setSticker(sticker === e ? "" : e); setActiveTool(null); }} className={`rounded-lg p-2 text-2xl transition-transform hover:scale-125 ${sticker === e ? "bg-primary/30 ring-2 ring-primary" : ""}`}>
                        {e}
                      </button>
                    ))}
                  </div>
                )}
                {activeTool === "location" && (
                  <div className="absolute bottom-4 inset-x-4 z-10">
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
                  <div className="absolute bottom-4 inset-x-4 z-10 text-center">
                    <span className="text-white/70 text-sm bg-black/60 rounded-full px-4 py-2">Draw tool coming soon</span>
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
