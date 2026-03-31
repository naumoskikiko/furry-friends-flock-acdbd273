import { useState, useRef, useEffect } from "react";
import { X, Image, Trash2, MapPin, Calendar, Clock, Users, PawPrint, Plus } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { BlogPostData } from "./BlogCard";

const fromTable = (table: string) => (supabase as any).from(table);

const BLOG_CATEGORIES = [
  { value: "pet-training", label: "Pet Training", icon: "🎓" },
  { value: "pet-health", label: "Pet Health", icon: "🏥" },
  { value: "nutrition", label: "Nutrition", icon: "🍖" },
  { value: "adoption", label: "Adoption", icon: "🏠" },
  { value: "pet-lifestyle", label: "Pet Lifestyle", icon: "🐾" },
];

const PET_TYPES = ["Dogs", "Cats", "Birds", "Rabbits", "Fish", "Reptiles", "All Pets"];

interface EditBlogModalProps {
  post: BlogPostData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}

const EditBlogModal = ({ post, open, onOpenChange, onUpdated }: EditBlogModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("pet-lifestyle");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  // Meetup fields
  const [eventDate, setEventDate] = useState("");
  const [eventStartTime, setEventStartTime] = useState("");
  const [eventEndTime, setEventEndTime] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [eventMaxParticipants, setEventMaxParticipants] = useState("");
  const [selectedPetTypes, setSelectedPetTypes] = useState<string[]>([]);

  const isMeetup = post.post_type === "meetup";
  const isQuestion = post.post_type === "question";

  // Pre-fill form when opening
  useEffect(() => {
    if (open && post) {
      setTitle(post.title);
      setContent(post.content);
      setCategory(post.category);
      setTags(post.tags || []);
      setCoverPreview(post.cover_image || null);
      setCoverFile(null);
      setTagInput("");

      if (isMeetup) {
        setEventDate(post.event_date || "");
        setEventStartTime(post.event_start_time?.slice(0, 5) || "");
        setEventEndTime(post.event_end_time?.slice(0, 5) || "");
        setEventLocation(post.event_location || "");
        setEventMaxParticipants(post.event_max_participants?.toString() || "");
        setSelectedPetTypes(post.event_pet_types || []);
      }
    }
  }, [open, post]);

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t) && tags.length < 5) {
      setTags([...tags, t]);
      setTagInput("");
    }
  };

  const togglePetType = (pt: string) => {
    setSelectedPetTypes((prev) =>
      prev.includes(pt) ? prev.filter((p) => p !== pt) : [...prev, pt]
    );
  };

  const isFormValid = () => {
    if (!title.trim() || !content.trim()) return false;
    if (isMeetup) {
      return !!(eventDate && eventStartTime && eventEndTime && eventLocation.trim());
    }
    return true;
  };

  const handleSave = async () => {
    if (!user || !isFormValid()) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    setSaving(true);

    let coverUrl = coverPreview;

    // Upload new cover if changed
    if (coverFile) {
      const ext = coverFile.name.split(".").pop();
      const filePath = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("blog-images").upload(filePath, coverFile);
      if (uploadErr) {
        toast({ title: "Upload failed", description: uploadErr.message, variant: "destructive" });
        setSaving(false);
        return;
      }
      const { data: { publicUrl } } = supabase.storage.from("blog-images").getPublicUrl(filePath);
      coverUrl = publicUrl;
    }

    const previewText = content.slice(0, 150).replace(/\n/g, " ") + (content.length > 150 ? "..." : "");

    const updateData: any = {
      title: title.trim(),
      content: content.trim(),
      cover_image: coverUrl,
      preview_text: previewText,
      category,
      tags,
      updated_at: new Date().toISOString(),
    };

    if (isMeetup) {
      updateData.event_date = eventDate;
      updateData.event_start_time = eventStartTime;
      updateData.event_end_time = eventEndTime;
      updateData.event_location = eventLocation.trim();
      updateData.event_pet_types = selectedPetTypes;
      updateData.event_max_participants = eventMaxParticipants ? parseInt(eventMaxParticipants) : null;
    }

    const { error } = await fromTable("blog_posts")
      .update(updateData)
      .eq("id", post.id)
      .eq("user_id", user.id);

    setSaving(false);

    if (error) {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Changes saved ✓" });
    onOpenChange(false);
    onUpdated();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <button onClick={() => onOpenChange(false)}>
            <X className="h-5 w-5" />
          </button>
          <h2 className="font-display font-bold">
            Edit {isMeetup ? "MeetUP" : isQuestion ? "Question" : "Article"}
          </h2>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || !isFormValid()}
            className="petkeep-gradient text-primary-foreground font-bold"
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>

        <div className="space-y-4 p-4">
          {/* Cover image */}
          <div>
            <Label className="text-xs font-bold text-muted-foreground">
              {isMeetup ? "Event Image" : "Cover Image"}
            </Label>
            {coverPreview ? (
              <div className="relative mt-1">
                <img src={coverPreview} alt="" className="w-full h-40 rounded-xl object-cover" />
                <button
                  onClick={() => { setCoverFile(null); setCoverPreview(null); }}
                  className="absolute right-2 top-2 rounded-full bg-black/50 p-1 text-white"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => coverInputRef.current?.click()}
                className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-8 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                <Image className="h-5 w-5" />
                <span className="text-sm">Add {isMeetup ? "event" : "cover"} image</span>
              </button>
            )}
            <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverSelect} />
          </div>

          {/* Title */}
          <div>
            <Label className="text-xs font-bold text-muted-foreground">
              {isMeetup ? "Event Title *" : "Title *"}
            </Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 font-display text-lg font-bold"
            />
          </div>

          {/* Category */}
          <div>
            <Label className="text-xs font-bold text-muted-foreground">Category</Label>
            <div className="mt-1 flex flex-wrap gap-2">
              {BLOG_CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setCategory(cat.value)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    category === cat.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
                >
                  {cat.icon} {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* MeetUP-specific fields */}
          {isMeetup && (
            <div className="space-y-3 rounded-2xl border border-primary/20 bg-primary/5 p-3">
              <p className="text-xs font-bold text-primary flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" /> Event Details
              </p>

              <div>
                <Label className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Date *
                </Label>
                <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="mt-1" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Start *
                  </Label>
                  <Input type="time" value={eventStartTime} onChange={(e) => setEventStartTime(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" /> End *
                  </Label>
                  <Input type="time" value={eventEndTime} onChange={(e) => setEventEndTime(e.target.value)} className="mt-1" />
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> Location *
                </Label>
                <Input value={eventLocation} onChange={(e) => setEventLocation(e.target.value)} className="mt-1" />
              </div>

              <div>
                <Label className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" /> Max Participants (optional)
                </Label>
                <Input type="number" value={eventMaxParticipants} onChange={(e) => setEventMaxParticipants(e.target.value)} min="2" className="mt-1" />
              </div>

              <div>
                <Label className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                  <PawPrint className="h-3 w-3" /> Pet Types Allowed
                </Label>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {PET_TYPES.map((pt) => (
                    <button
                      key={pt}
                      onClick={() => togglePetType(pt)}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                        selectedPetTypes.includes(pt)
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground"
                      }`}
                    >
                      {pt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Content */}
          <div>
            <Label className="text-xs font-bold text-muted-foreground">
              {isMeetup ? "Description *" : "Content *"}
            </Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="mt-1 min-h-[150px] resize-none"
            />
          </div>

          {/* Tags */}
          <div>
            <Label className="text-xs font-bold text-muted-foreground">Tags (max 5)</Label>
            <div className="mt-1 flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Add a tag..."
                className="flex-1"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
              />
              <Button size="sm" variant="outline" onClick={addTag} disabled={tags.length >= 5}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => setTags(tags.filter((t) => t !== tag))}
                  >
                    #{tag} ×
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditBlogModal;
