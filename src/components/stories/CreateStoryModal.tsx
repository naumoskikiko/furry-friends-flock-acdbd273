import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, Image, Video, Camera, MapPin, Type, Smile, FileEdit, Trash2, Plus, Check } from "lucide-react";
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
  const [showTools, setShowTools] = useState<"text" | "sticker" | "location" | "pet" | null>(null);
  const [showDrafts, setShowDrafts] = useState(false);
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
    setShowTools(null);
    setShowDrafts(false);
    setUploadProgress(0);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected || selected.length === 0) return;
    setShowDrafts(false);

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
            toast({ title: "Video too long", description: `${file.name} exceeds 60s, skipped`, variant: "destructive" });
          } else {
            newItems.push({ file, preview: URL.createObjectURL(file), mediaType: "video" });
          }
          processed++;
          if (processed === selected.length) {
            setFiles((prev) => [...prev, ...newItems]);
          }
        };
        video.src = URL.createObjectURL(file);
      } else {
        newItems.push({ file, preview: URL.createObjectURL(file), mediaType: "image" });
        processed++;
        if (processed === selected.length) {
          setFiles((prev) => [...prev, ...newItems]);
        }
      }
    });

    // Reset input so same files can be re-selected
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

  const currentFile = files[activeIndex];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else onOpenChange(v); }}>
      <DialogContent className="max-w-md p-0 overflow-hidden bg-background">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <button onClick={handleClose}>
            <X className="h-5 w-5" />
          </button>
          <h2 className="font-display font-bold">
            {files.length > 1 ? `New Stories (${files.length})` : "New Story"}
          </h2>
          <Button
            size="sm"
            onClick={handlePublish}
            disabled={files.length === 0 || uploading}
            className="petkeep-gradient text-primary-foreground font-bold"
          >
            {uploading ? `${uploadProgress}%` : "Share"}
          </Button>
        </div>

        {/* Preview area */}
        <div className="relative aspect-[9/16] max-h-[400px] bg-muted flex items-center justify-center overflow-hidden">
          {currentFile ? (
            <>
              {currentFile.mediaType === "video" ? (
                <video src={currentFile.preview} className="h-full w-full object-cover" controls muted />
              ) : (
                <img src={currentFile.preview} alt="Preview" className="h-full w-full object-cover" />
              )}
              {textOverlay && activeIndex === 0 && (
                <div className="absolute inset-x-0 bottom-20 text-center">
                  <span className="rounded-lg bg-black/60 px-4 py-2 text-lg font-bold text-white">
                    {textOverlay}
                  </span>
                </div>
              )}
              {sticker && activeIndex === 0 && (
                <div className="absolute right-4 top-4 text-4xl">{sticker}</div>
              )}
              {location && activeIndex === 0 && (
                <div className="absolute left-4 top-4 flex items-center gap-1 rounded-full bg-black/50 px-3 py-1 text-xs text-white">
                  <MapPin className="h-3 w-3" /> {location}
                </div>
              )}
              {/* Remove button */}
              <button
                onClick={() => removeFile(activeIndex)}
                className="absolute right-3 top-3 z-10 rounded-full bg-black/50 p-1.5 text-white"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="flex gap-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center gap-2 rounded-2xl bg-secondary p-6 transition-colors hover:bg-secondary/80"
                >
                  <Image className="h-8 w-8 text-primary" />
                  <span className="text-xs font-medium">Photo</span>
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center gap-2 rounded-2xl bg-secondary p-6 transition-colors hover:bg-secondary/80"
                >
                  <Video className="h-8 w-8 text-primary" />
                  <span className="text-xs font-medium">Video</span>
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center gap-2 rounded-2xl bg-secondary p-6 transition-colors hover:bg-secondary/80"
                >
                  <Camera className="h-8 w-8 text-primary" />
                  <span className="text-xs font-medium">Camera</span>
                </button>
              </div>
              <p className="text-sm text-muted-foreground">Select photos or videos for stories</p>

              {/* Drafts section */}
              {drafts.length > 0 && (
                <div className="w-full px-4">
                  <button
                    onClick={() => setShowDrafts(!showDrafts)}
                    className="flex items-center gap-2 text-sm font-semibold text-primary"
                  >
                    <FileEdit className="h-4 w-4" />
                    {drafts.length} Draft{drafts.length > 1 ? "s" : ""}
                  </button>
                  {showDrafts && (
                    <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                      {drafts.map((d) => (
                        <div key={d.id} className="flex items-center gap-3 rounded-xl bg-secondary p-2">
                          <img
                            src={d.mediaDataUrl}
                            alt=""
                            className="h-12 w-12 rounded-lg object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{d.caption || "No caption"}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {formatDistanceToNow(d.createdAt, { addSuffix: true })}
                            </p>
                          </div>
                          <button
                            onClick={() => handleDeleteDraft(d.id)}
                            className="p-1 text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>

        {/* Thumbnail strip for multi-select */}
        {files.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto border-t border-border">
            {files.map((item, i) => (
              <button
                key={i}
                onClick={() => setActiveIndex(i)}
                className={`relative shrink-0 h-14 w-14 rounded-lg overflow-hidden ring-2 transition-all ${
                  i === activeIndex ? "ring-primary" : "ring-transparent"
                }`}
              >
                {item.mediaType === "video" ? (
                  <video src={item.preview} className="h-full w-full object-cover" muted />
                ) : (
                  <img src={item.preview} alt="" className="h-full w-full object-cover" />
                )}
                <span className="absolute top-0.5 left-0.5 bg-black/60 text-white text-[9px] font-bold rounded px-1">
                  {i + 1}
                </span>
              </button>
            ))}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="shrink-0 flex h-14 w-14 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 text-muted-foreground hover:bg-secondary transition-colors"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Tools bar */}
        {files.length > 0 && (
          <div className="border-t border-border">
            <div className="flex justify-around py-2">
              <button onClick={() => setShowTools(showTools === "text" ? null : "text")} className={`flex flex-col items-center gap-0.5 p-2 rounded-lg ${showTools === "text" ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}>
                <Type className="h-5 w-5" /><span className="text-[10px]">Text</span>
              </button>
              <button onClick={() => setShowTools(showTools === "sticker" ? null : "sticker")} className={`flex flex-col items-center gap-0.5 p-2 rounded-lg ${showTools === "sticker" ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}>
                <Smile className="h-5 w-5" /><span className="text-[10px]">Sticker</span>
              </button>
              <button onClick={() => setShowTools(showTools === "location" ? null : "location")} className={`flex flex-col items-center gap-0.5 p-2 rounded-lg ${showTools === "location" ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}>
                <MapPin className="h-5 w-5" /><span className="text-[10px]">Location</span>
              </button>
              {pets.length > 0 && (
                <button onClick={() => setShowTools(showTools === "pet" ? null : "pet")} className={`flex flex-col items-center gap-0.5 p-2 rounded-lg ${showTools === "pet" ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}>
                  <span className="text-lg">🐾</span><span className="text-[10px]">Pet</span>
                </button>
              )}
            </div>

            {showTools === "text" && (
              <div className="px-4 pb-3">
                <Input placeholder="Add text overlay..." value={textOverlay} onChange={(e) => setTextOverlay(e.target.value)} />
              </div>
            )}
            {showTools === "sticker" && (
              <div className="flex flex-wrap gap-2 px-4 pb-3">
                {EMOJI_LIST.map((e) => (
                  <button key={e} onClick={() => setSticker(sticker === e ? "" : e)} className={`rounded-lg p-2 text-2xl ${sticker === e ? "bg-primary/20 ring-2 ring-primary" : "hover:bg-secondary"}`}>
                    {e}
                  </button>
                ))}
              </div>
            )}
            {showTools === "location" && (
              <div className="px-4 pb-3">
                <Input placeholder="Add location..." value={location} onChange={(e) => setLocation(e.target.value)} />
              </div>
            )}
            {showTools === "pet" && (
              <div className="flex gap-2 overflow-x-auto px-4 pb-3">
                {pets.map((pet: any) => (
                  <button
                    key={pet.id}
                    onClick={() => setPetId(petId === pet.id ? "" : pet.id)}
                    className={`flex flex-col items-center gap-1 rounded-xl p-2 ${petId === pet.id ? "bg-primary/20 ring-2 ring-primary" : "hover:bg-secondary"}`}
                  >
                    {pet.photo_url ? (
                      <img src={pet.photo_url} className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-lg">🐾</div>
                    )}
                    <span className="text-[10px] font-medium">{pet.name}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Caption */}
            <div className="px-4 pb-3">
              <Textarea placeholder="Write a caption..." value={caption} onChange={(e) => setCaption(e.target.value)} rows={2} className="resize-none" />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );

  function handleDeleteDraft(draftId: string) {
    deleteStoryDraft(draftId);
    setDrafts(getStoryDrafts());
    toast({ title: "Draft deleted" });
  }
};

export default CreateStoryModal;
