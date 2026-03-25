import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Camera, Video, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useCredits } from "@/hooks/useCredits";
import VideoPostEditor, { type VideoEditResult } from "./VideoPostEditor";
import PhotoPostEditor from "./PhotoPostEditor";
import PostLocationSearch from "./PostLocationSearch";

interface CreatePostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPostCreated: () => void;
  pets: any[];
}

const CreatePostModal = ({ open, onOpenChange, onPostCreated, pets }: CreatePostModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { earnCredits } = useCredits();
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [petId, setPetId] = useState<string | null>(null);
  const [mediaUrl, setMediaUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);

  // Editors
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [showVideoEditor, setShowVideoEditor] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [showPhotoEditor, setShowPhotoEditor] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const isVideo = file.type.startsWith("video/");

    if (isVideo) {
      const video = document.createElement("video");
      video.preload = "metadata";
      const url = URL.createObjectURL(file);
      video.src = url;
      await new Promise(resolve => { video.onloadedmetadata = resolve; });
      if (video.duration > 120) {
        toast({ title: "Video too long", description: "Maximum 2 minutes allowed.", variant: "destructive" });
        URL.revokeObjectURL(url);
        return;
      }
      URL.revokeObjectURL(url);
      setVideoFile(file);
      setShowVideoEditor(true);
      return;
    }

    // Open photo editor
    setPhotoFile(file);
    setShowPhotoEditor(true);
  };

  const handlePhotoEditDone = async (result: { editedBlob: Blob; previewUrl: string }) => {
    setShowPhotoEditor(false);
    setPhotoFile(null);
    setUploading(true);

    try {
      const filePath = `${user!.id}/${Date.now()}-edited.jpg`;
      const file = new File([result.editedBlob], "edited.jpg", { type: "image/jpeg" });
      const { error } = await supabase.storage.from("post-images").upload(filePath, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("post-images").getPublicUrl(filePath);
      setMediaUrl(publicUrl);
      setMediaType("image");
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleVideoEditDone = async (result: VideoEditResult) => {
    setShowVideoEditor(false);
    setUploading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const formData = new FormData();
      formData.append("video", result.processedFile);
      formData.append("cover", new File([result.coverImage], "cover.jpg", { type: "image/jpeg" }));
      formData.append("trimStart", result.trimStart.toString());
      formData.append("trimEnd", result.trimEnd.toString());
      formData.append("aspectRatio", result.aspectRatio);

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/process-video`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: formData,
        }
      );

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Processing failed");
      }

      const data = await response.json();
      setMediaUrl(data.videoUrl);
      setCoverUrl(data.coverUrl || "");
      setMediaType("video");
      toast({ title: "Video ready!" });
    } catch (err: any) {
      toast({ title: "Video processing failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handlePost = async () => {
    if (!user) return;
    if (!caption.trim() && !mediaUrl) {
      toast({ title: "Add a photo/video or caption", variant: "destructive" });
      return;
    }
    setPosting(true);
    const { error } = await supabase.from("posts").insert({
      user_id: user.id,
      caption,
      image_url: mediaUrl || null,
      location,
      latitude: locationLat,
      longitude: locationLng,
      pet_id: petId,
      post_type: mediaType,
    } as any);
    setPosting(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Posted!" });
      earnCredits("create_post");
      resetForm();
      onPostCreated();
      onOpenChange(false);
    }
  };

  const resetForm = () => {
    setCaption("");
    setLocation("");
    setLocationLat(null);
    setLocationLng(null);
    setPetId(null);
    setMediaUrl("");
    setCoverUrl("");
    setMediaType("image");
    setVideoFile(null);
    setPhotoFile(null);
  };

  const removeMedia = () => {
    setMediaUrl("");
    setCoverUrl("");
    setMediaType("image");
    setVideoFile(null);
    setPhotoFile(null);
  };

  // Full-screen editors
  if (showVideoEditor && videoFile) {
    return (
      <VideoPostEditor
        videoFile={videoFile}
        onClose={() => { setShowVideoEditor(false); setVideoFile(null); }}
        onDone={handleVideoEditDone}
      />
    );
  }

  if (showPhotoEditor && photoFile) {
    return (
      <PhotoPostEditor
        imageFile={photoFile}
        onClose={() => { setShowPhotoEditor(false); setPhotoFile(null); }}
        onDone={handlePhotoEditDone}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Post</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {mediaUrl ? (
            <div className="relative">
              {mediaType === "video" ? (
                <div className="relative">
                  {coverUrl ? (
                    <img src={coverUrl} alt="Cover" className="w-full aspect-square rounded-xl object-cover" />
                  ) : (
                    <video ref={videoRef} src={mediaUrl} controls muted className="w-full aspect-square rounded-xl object-cover" />
                  )}
                  <div className="absolute top-2 left-2 bg-primary/90 text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Video className="h-3 w-3" /> VIDEO
                  </div>
                </div>
              ) : (
                <img src={mediaUrl} alt="Post" className="w-full aspect-square rounded-xl object-cover" />
              )}
              <button onClick={removeMedia} className="absolute top-2 right-2 bg-destructive/90 text-destructive-foreground text-xs font-bold px-2 py-1 rounded-full">
                Remove
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <label className="block cursor-pointer">
                <div className="flex aspect-square w-full items-center justify-center rounded-xl border-2 border-dashed border-border bg-secondary/50 hover:border-primary transition-colors">
                  <div className="text-center p-2">
                    <Camera className="mx-auto h-7 w-7 text-muted-foreground" />
                    <p className="mt-1.5 text-xs font-medium text-muted-foreground">{uploading ? "Uploading..." : "Photo"}</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">JPG, PNG, WEBP</p>
                  </div>
                </div>
                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleMediaUpload} disabled={uploading} />
              </label>
              <label className="block cursor-pointer">
                <div className="flex aspect-square w-full items-center justify-center rounded-xl border-2 border-dashed border-border bg-secondary/50 hover:border-primary transition-colors">
                  <div className="text-center p-2">
                    {uploading ? <Loader2 className="mx-auto h-7 w-7 text-muted-foreground animate-spin" /> : <Video className="mx-auto h-7 w-7 text-muted-foreground" />}
                    <p className="mt-1.5 text-xs font-medium text-muted-foreground">{uploading ? "Processing..." : "Video"}</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">MP4, MOV, WEBM</p>
                  </div>
                </div>
                <input type="file" accept="video/mp4,video/quicktime,video/webm" className="hidden" onChange={handleMediaUpload} disabled={uploading} />
              </label>
            </div>
          )}

          <Textarea placeholder="Write a caption..." value={caption} onChange={(e) => setCaption(e.target.value)} rows={3} />

          <PostLocationSearch
            value={location}
            onChange={(name, lat, lng) => { setLocation(name); setLocationLat(lat); setLocationLng(lng); }}
            onClear={() => { setLocation(""); setLocationLat(null); setLocationLng(null); }}
          />

          {pets.length > 0 && (
            <div className="space-y-2">
              <Label>Tag a pet</Label>
              <div className="flex flex-wrap gap-2">
                {pets.map(pet => (
                  <button
                    key={pet.id}
                    onClick={() => setPetId(petId === pet.id ? null : pet.id)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                      petId === pet.id ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    🐾 {pet.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Button onClick={handlePost} className="w-full petkeep-gradient text-primary-foreground font-bold" disabled={posting || uploading}>
            {posting ? "Posting..." : uploading ? "Processing..." : "Share Post"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePostModal;
