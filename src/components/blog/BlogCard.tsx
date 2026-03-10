import { useState } from "react";
import { Heart, MessageCircle, Send, Bookmark, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const CATEGORY_META: Record<string, { label: string; icon: string }> = {
  "pet-training": { label: "Pet Training", icon: "🎓" },
  "pet-health": { label: "Pet Health", icon: "🏥" },
  "nutrition": { label: "Nutrition", icon: "🍖" },
  "grooming": { label: "Grooming", icon: "✂️" },
  "adoption": { label: "Adoption", icon: "🏠" },
  "pet-lifestyle": { label: "Pet Lifestyle", icon: "🐾" },
};

export interface BlogPostData {
  id: string;
  user_id: string;
  title: string;
  cover_image: string | null;
  content: string;
  preview_text: string;
  category: string;
  tags: string[];
  likes_count: number;
  comments_count: number;
  created_at: string;
  username: string;
  avatar_url: string | null;
  is_liked: boolean;
  is_saved: boolean;
}

interface BlogCardProps {
  post: BlogPostData;
  onOpen: (post: BlogPostData) => void;
  onLikeChange: () => void;
}

const BlogCard = ({ post, onOpen, onLikeChange }: BlogCardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [liked, setLiked] = useState(post.is_liked);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [saved, setSaved] = useState(post.is_saved);

  const cat = CATEGORY_META[post.category] || { label: post.category, icon: "📝" };
  const initials = post.username.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const readTime = Math.max(1, Math.ceil(post.content.length / 1000));

  const toggleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    const newLiked = !liked;
    setLiked(newLiked);
    setLikesCount((c) => newLiked ? c + 1 : Math.max(0, c - 1));

    if (newLiked) {
      await (supabase as any).from("blog_likes").insert({ blog_post_id: post.id, user_id: user.id });
      await (supabase as any).from("blog_posts").update({ likes_count: likesCount + 1 }).eq("id", post.id);
    } else {
      await (supabase as any).from("blog_likes").delete().eq("blog_post_id", post.id).eq("user_id", user.id);
      await (supabase as any).from("blog_posts").update({ likes_count: Math.max(0, likesCount - 1) }).eq("id", post.id);
    }
    onLikeChange();
  };

  const toggleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    const newSaved = !saved;
    setSaved(newSaved);
    if (newSaved) {
      await (supabase as any).from("blog_saves").insert({ blog_post_id: post.id, user_id: user.id });
      toast({ title: "Blog saved" });
    } else {
      await (supabase as any).from("blog_saves").delete().eq("blog_post_id", post.id).eq("user_id", user.id);
      toast({ title: "Blog unsaved" });
    }
  };

  const share = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`${window.location.origin}/blog/${post.id}`);
    toast({ title: "Link copied!" });
  };

  return (
    <article
      onClick={() => onOpen(post)}
      className="cursor-pointer border-b border-border bg-card transition-colors hover:bg-secondary/30"
    >
      {/* Cover image */}
      {post.cover_image && (
        <div className="aspect-video w-full overflow-hidden">
          <img src={post.cover_image} alt={post.title} className="h-full w-full object-cover" loading="lazy" />
        </div>
      )}

      <div className="px-4 py-3">
        {/* Category badge */}
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-primary">
            {cat.icon} {cat.label}
          </span>
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Clock className="h-3 w-3" /> {readTime} min read
          </span>
        </div>

        {/* Title */}
        <h3 className="mt-2 font-display text-base font-extrabold leading-tight line-clamp-2">
          {post.title}
        </h3>

        {/* Preview */}
        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{post.preview_text}</p>

        {/* Author row */}
        <div className="mt-3 flex items-center gap-2">
          {post.avatar_url ? (
            <img src={post.avatar_url} alt="" className="h-6 w-6 rounded-full object-cover" />
          ) : (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-primary to-petkeep-orange-light text-[8px] font-bold text-primary-foreground">
              {initials}
            </div>
          )}
          <span className="text-xs font-medium">{post.username}</span>
          <span className="text-[10px] text-muted-foreground">
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
          </span>
        </div>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {post.tags.map((tag) => (
              <span key={tag} className="text-[10px] text-primary font-medium">#{tag}</span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={toggleLike} className="flex items-center gap-1 transition-transform active:scale-90">
              <Heart className={`h-5 w-5 ${liked ? "fill-primary text-primary" : "text-muted-foreground"}`} />
              <span className="text-xs text-muted-foreground">{likesCount}</span>
            </button>
            <button onClick={(e) => { e.stopPropagation(); onOpen(post); }} className="flex items-center gap-1">
              <MessageCircle className="h-5 w-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{post.comments_count}</span>
            </button>
            <button onClick={share}>
              <Send className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          <button onClick={toggleSave}>
            <Bookmark className={`h-5 w-5 ${saved ? "fill-foreground text-foreground" : "text-muted-foreground"}`} />
          </button>
        </div>
      </div>
    </article>
  );
};

export default BlogCard;
