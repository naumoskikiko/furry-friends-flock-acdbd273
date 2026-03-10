import { useState, useRef } from "react";
import { X, Image, Plus, Trash2 } from "lucide-react";
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
  { value: "grooming", label: "Grooming", icon: "✂️" },
  { value: "adoption", label: "Adoption", icon: "🏠" },
  { value: "pet-lifestyle", label: "Pet Lifestyle", icon: "🐾" },
];

interface CreateBlogModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBlogCreated: () => void;
}

const CreateBlogModal = ({ open, onOpenChange, onBlogCreated }: CreateBlogModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("pet-lifestyle");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  const resetForm = () => {
    setTitle("");
    setContent("");
    setCategory("pet-lifestyle");
    setTags([]);
    setTagInput("");
    setCoverFile(null);
    setCoverPreview(null);
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

  const handlePublish = async () => {
    if (!user || !title.trim() || !content.trim()) {
      toast({ title: "Please fill in title and content", variant: "destructive" });
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

    const { error } = await (supabase as any).from("blog_posts").insert({
      user_id: user.id,
      title: title.trim(),
      content: content.trim(),
      cover_image: coverUrl,
      preview_text: previewText,
      category,
      tags,
    });

    setPublishing(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Blog post published!" });
      resetForm();
      onOpenChange(false);
      onBlogCreated();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <button onClick={() => onOpenChange(false)}>
            <X className="h-5 w-5" />
          </button>
          <h2 className="font-display font-bold">New Blog Post</h2>
          <Button
            size="sm"
            onClick={handlePublish}
            disabled={publishing || !title.trim() || !content.trim()}
            className="petkeep-gradient text-primary-foreground font-bold"
          >
            {publishing ? "..." : "Publish"}
          </Button>
        </div>

        <div className="space-y-4 p-4">
          {/* Cover image */}
          <div>
            <Label className="text-xs font-bold text-muted-foreground">Cover Image</Label>
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
                <span className="text-sm">Add cover image</span>
              </button>
            )}
            <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverSelect} />
          </div>

          {/* Title */}
          <div>
            <Label className="text-xs font-bold text-muted-foreground">Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Your blog post title..."
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

          {/* Content */}
          <div>
            <Label className="text-xs font-bold text-muted-foreground">Content</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your article here... Use paragraphs to organize your content."
              className="mt-1 min-h-[200px] resize-none"
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
