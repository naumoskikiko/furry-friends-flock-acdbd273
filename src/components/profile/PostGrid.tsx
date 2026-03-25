import { useState } from "react";
import { Play } from "lucide-react";
import PostScrollViewer from "@/components/profile/PostScrollViewer";

interface Post {
  id: string;
  user_id: string;
  caption: string;
  image_url: string | null;
  location: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  pet_id: string | null;
  post_type?: string;
}

interface PostGridProps {
  posts: Post[];
  onRefresh: () => void;
  ownerProfile?: {
    avatar_url?: string | null;
    full_name?: string;
    username?: string;
    user_id?: string;
  } | null;
}

const PostGrid = ({ posts, onRefresh, ownerProfile }: PostGridProps) => {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [startIndex, setStartIndex] = useState(0);

  const isVideo = (post: Post) =>
    post.post_type === "video" || (post.image_url && /\.(mp4|mov|webm)$/i.test(post.image_url));

  const openPost = (index: number) => {
    setStartIndex(index);
    setViewerOpen(true);
  };

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <span className="text-4xl">📸</span>
        <p className="mt-2 text-sm font-semibold text-muted-foreground">No posts yet</p>
        <p className="text-xs text-muted-foreground">Share your first moment!</p>
      </div>
    );
  }

  return (
    <>
      {/* Grid */}
      <div className="grid grid-cols-3 gap-0.5">
        {posts.map((post, idx) => (
          <button
            key={post.id}
            onClick={() => openPost(idx)}
            className="aspect-square overflow-hidden bg-secondary relative"
          >
            {post.image_url ? (
              isVideo(post) ? (
                <>
                  <video
                    src={post.image_url}
                    className="h-full w-full object-cover"
                    muted
                    preload="metadata"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-foreground/10">
                    <Play className="h-8 w-8 text-background fill-background" />
                  </div>
                </>
              ) : (
                <img
                  src={post.image_url}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              )
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-secondary p-2">
                <p className="text-xs text-muted-foreground line-clamp-3">{post.caption}</p>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Scroll Viewer */}
      {viewerOpen && (
        <PostScrollViewer
          posts={posts}
          startIndex={startIndex}
          onClose={() => setViewerOpen(false)}
          onRefresh={onRefresh}
          ownerProfile={ownerProfile}
        />
      )}
    </>
  );
};

export default PostGrid;
