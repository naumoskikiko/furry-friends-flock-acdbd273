import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface CreatePostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPostCreated: () => void;
  pets: any[];
}

const CreatePostModal = ({ open, onOpenChange, onPostCreated, pets }: CreatePostModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [petId, setPetId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const filePath = `${user.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("post-images").upload(filePath, file);
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from("post-images").getPublicUrl(filePath);
    setImageUrl(publicUrl);
    setUploading(false);
  };

  const handlePost = async () => {
    if (!user) return;
    if (!caption.trim() && !imageUrl) {
      toast({ title: "Add a photo or caption", variant: "destructive" });
      return;
    }
    setPosting(true);
    const { error } = await supabase.from("posts").insert({
      user_id: user.id,
      caption,
      image_url: imageUrl || null,
      location,
      pet_id: petId,
    });
    setPosting(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Posted!" });
      setCaption("");
      setLocation("");
      setPetId(null);
      setImageUrl("");
      onPostCreated();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Post</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Image upload */}
          <label className="block cursor-pointer">
            {imageUrl ? (
              <img src={imageUrl} alt="Post" className="w-full aspect-square rounded-xl object-cover" />
            ) : (
              <div className="flex aspect-square w-full items-center justify-center rounded-xl border-2 border-dashed border-border bg-secondary/50 hover:border-primary transition-colors">
                <div className="text-center">
                  <Camera className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-2 text-sm font-medium text-muted-foreground">
                    {uploading ? "Uploading..." : "Upload Photo"}
                  </p>
                </div>
              </div>
            )}
            <input type="file" accept="image/*,video/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
          </label>

          <Textarea
            placeholder="Write a caption..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={3}
          />

          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Add location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="flex-1"
            />
          </div>

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
            {posting ? "Posting..." : "Share Post"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePostModal;
