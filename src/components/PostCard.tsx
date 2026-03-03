import { useState } from "react";
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, BadgeCheck, GraduationCap, Store } from "lucide-react";
import type { FeedPost } from "@/data/mockData";

const badgeIcons = {
  sitter: <BadgeCheck className="h-3.5 w-3.5 text-primary" />,
  student: <GraduationCap className="h-3.5 w-3.5 text-accent" />,
  store: <Store className="h-3.5 w-3.5 text-petkeep-mint" />,
};

const PostCard = ({ post }: { post: FeedPost }) => {
  const [liked, setLiked] = useState(post.liked);
  const [likes, setLikes] = useState(post.likes);
  const [saved, setSaved] = useState(false);

  const toggleLike = () => {
    setLiked(!liked);
    setLikes(liked ? likes - 1 : likes + 1);
  };

  return (
    <article className="border-b border-border bg-card animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-petkeep-orange-light font-display text-xs font-bold text-primary-foreground">
            {post.user.avatar}
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="text-sm font-bold">{post.user.name}</span>
              {post.user.badge && badgeIcons[post.user.badge]}
            </div>
            {post.pet && (
              <span className="text-xs text-muted-foreground">
                {post.pet.name} • {post.pet.breed}
              </span>
            )}
          </div>
        </div>
        <button className="p-1 text-muted-foreground">
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </div>

      {/* Image */}
      <div className="aspect-square w-full overflow-hidden">
        <img
          src={post.image}
          alt={post.caption}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-4">
          <button onClick={toggleLike} className="transition-transform active:scale-90">
            <Heart
              className={`h-6 w-6 ${liked ? "fill-primary text-primary animate-heart-pop" : "text-foreground"}`}
            />
          </button>
          <button>
            <MessageCircle className="h-6 w-6 text-foreground" />
          </button>
          <button>
            <Send className="h-5 w-5 text-foreground" />
          </button>
        </div>
        <button onClick={() => setSaved(!saved)}>
          <Bookmark className={`h-6 w-6 ${saved ? "fill-foreground text-foreground" : "text-foreground"}`} />
        </button>
      </div>

      {/* Info */}
      <div className="px-4 pb-3">
        <p className="text-sm font-bold">{likes.toLocaleString()} likes</p>
        <p className="mt-1 text-sm">
          <span className="font-bold">{post.user.name}</span>{" "}
          {post.caption}
        </p>
        {post.hashtags.length > 0 && (
          <p className="mt-1 text-sm text-primary">
            {post.hashtags.map((t) => `#${t}`).join(" ")}
          </p>
        )}
        <button className="mt-1 text-xs text-muted-foreground">
          View all {post.comments} comments
        </button>
        <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
          {post.timeAgo} ago
        </p>
      </div>
    </article>
  );
};

export default PostCard;
