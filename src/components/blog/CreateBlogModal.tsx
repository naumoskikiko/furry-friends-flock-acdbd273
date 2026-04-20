import { useState, useRef } from "react";
import { X, Image, Plus, Trash2, MapPin, Calendar, Clock, Users, PawPrint } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const BLOG_CATEGORIES = [
  { value: "pet-training", label: "Pet Training", icon: "🎓" },
  { value: "pet-health", label: "Pet Health", icon: "🏥" },
  { value: "nutrition", label: "Nutrition", icon: "🍖" },
  
  { value: "adoption", label: "Adoption", icon: "🏠" },
  { value: "pet-lifestyle", label: "Pet Lifestyle", icon: "🐾" },
];

const POST_TYPES = [
  { value: "article", label: "Article", icon: "📝", desc: "Write a blog post" },
  { value: "question", label: "Question", icon: "❓", desc: "Ask the community" },
  { value: "meetup", label: "MeetUP", icon: "📍", desc: "Create a pet event" },
];

const PET_TYPES = ["Dogs", "Cats", "Birds", "Rabbits", "Fish", "Reptiles", "All Pets"];

interface CreateBlogModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBlogCreated: () => void;
}

const CreateBlogModal = ({ open, onOpenChange, onBlogCreated }: CreateBlogModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [postType, setPostType] = useState<"article" | "question" | "meetup">("article");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("pet-lifestyle");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  // MeetUP fields
  const [eventDate, setEventDate] = useState("");
  const [eventStartTime, setEventStartTime] = useState("");
  const [eventEndTime, setEventEndTime] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [eventMaxParticipants, setEventMaxParticipants] = useState("");
  const [selectedPetTypes, setSelectedPetTypes] = useState<string[]>([]);

  const resetForm = () => {
    setPostType("article");
    setTitle("");
    setContent("");
    setCategory("pet-lifestyle");
    setTags([]);
    setTagInput("");
    setCoverFile(null);
    setCoverPreview(null);
    setEventDate("");
    setEventStartTime("");
    setEventEndTime("");
    setEventLocation("");
    setEventMaxParticipants("");
    setSelectedPetTypes([]);
  };

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
    if (postType === "meetup") {
      return !!(eventDate && eventStartTime && eventEndTime && eventLocation.trim());
    }
    return true;
  };

  const handlePublish = async () => {
    if (!user || !isFormValid()) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    setPublishing(true);

    let coverUrl: string | null = null;
    if (coverFile) {
      const ext = coverFile.name.split(".").pop();
      const filePath = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("blog-images").upload(filePath, coverFile);
      if (uploadErr) {
        toast({ title: "Upload failed", description: uploadErr.message, variant: "destructive" });
        setPublishing(false);
        return;
      }
      const { data: { publicUrl } } = supabase.storage.from("blog-images").getPublicUrl(filePath);
      coverUrl = publicUrl;
    }

    const previewText = content.slice(0, 150).replace(/\n/g, " ") + (content.length > 150 ? "..." : "");

    const insertData: any = {
      user_id: user.id,
      title: title.trim(),
      content: content.trim(),
      cover_image: coverUrl,
      preview_text: previewText,
      category,
      tags,
      post_type: postType,
    };

    if (postType === "meetup") {
      insertData.event_date = eventDate;
      insertData.event_start_time = eventStartTime;
      insertData.event_end_time = eventEndTime;
      insertData.event_location = eventLocation.trim();
      insertData.event_pet_types = selectedPetTypes;
      if (eventMaxParticipants) {
        insertData.event_max_participants = parseInt(eventMaxParticipants);
      }
    }

    const { data, error } = await (supabase as any).from("blog_posts").insert(insertData).select("id").single();

    if (error) {
      setPublishing(false);
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    // Auto-create meetup group chat
    if (postType === "meetup" && data?.id) {
      try {
        await (supabase as any).rpc("create_meetup_chat", {
          _blog_post_id: data.id,
          _meetup_title: title.trim(),
        });
      } catch (chatErr) {
        console.error("Failed to create meetup chat:", chatErr);
      }
    }

    setPublishing(false);
    toast({ title: postType === "meetup" ? "MeetUP event created! 🎉" : "Blog post published!" });
    resetForm();
    onOpenChange(false);
    onBlogCreated();
  };

  const isMeetup = postType === "meetup";

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <button onClick={() => onOpenChange(false)}>
            <X className="h-5 w-5" />
          </button>
          <h2 className="font-display font-bold">
            {isMeetup ? "New MeetUP Event" : postType === "question" ? "Ask a Question" : "New Blog Post"}
          </h2>
          <Button
            size="sm"
            onClick={handlePublish}
            disabled={publishing || !isFormValid()}
            className="petkeep-gradient text-primary-foreground font-bold"
          >
            {publishing ? "..." : isMeetup ? "Create" : "Publish"}
          </Button>
        </div>

        <div className="space-y-4 p-4">
          {/* Post type selector */}
          <div>
            <Label className="text-xs font-bold text-muted-foreground">Post Type</Label>
            <div className="mt-1 grid grid-cols-3 gap-2">
              {POST_TYPES.map((pt) => (
                <button
                  key={pt.value}
                  onClick={() => setPostType(pt.value as any)}
                  className={`flex flex-col items-center gap-1 rounded-xl border-2 px-2 py-3 text-center transition-all ${
                    postType === pt.value
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <span className="text-xl">{pt.icon}</span>
                  <span className="text-[11px] font-bold">{pt.label}</span>
                  <span className="text-[9px] text-muted-foreground leading-tight">{pt.desc}</span>
                </button>
              ))}
            </div>
          </div>

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
              placeholder={isMeetup ? "Dog Owners Meetup at City Park" : "Your blog post title..."}
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

              {/* Date */}
              <div>
                <Label className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Date *
                </Label>
                <Input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="mt-1"
                />
              </div>

              {/* Time */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Start *
                  </Label>
                  <Input
                    type="time"
                    value={eventStartTime}
                    onChange={(e) => setEventStartTime(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" /> End *
                  </Label>
                  <Input
                    type="time"
                    value={eventEndTime}
                    onChange={(e) => setEventEndTime(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <Label className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> Location *
                </Label>
                <Input
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                  placeholder="City Park, Main St..."
                  className="mt-1"
                />
              </div>

              {/* Max Participants */}
              <div>
                <Label className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" /> Max Participants (optional)
                </Label>
                <Input
                  type="number"
                  value={eventMaxParticipants}
                  onChange={(e) => setEventMaxParticipants(e.target.value)}
                  placeholder="No limit"
                  min="2"
                  className="mt-1"
                />
              </div>

              {/* Pet Types */}
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
              placeholder={
                isMeetup
                  ? "Describe your event, what to bring, meeting point details..."
                  : postType === "question"
                  ? "Describe your question in detail..."
                  : "Write your article here... Use paragraphs to organize your content."
              }
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

export default CreateBlogModal;
