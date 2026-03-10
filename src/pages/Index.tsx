import { useEffect, useRef, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import FeedHeader from "@/components/FeedHeader";
import StoriesBar from "@/components/StoriesBar";
import FeedPostCard from "@/components/FeedPostCard";
import { useFeed } from "@/hooks/useFeed";
import { Loader2 } from "lucide-react";

const Index = () => {
  const { posts, loading, hasMore, loadMore, refreshFeed } = useFeed();
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Infinite scroll observer
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMore();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, loadMore]);

  const handleLikeToggle = (postId: string, isLiked: boolean) => {
    // Already handled optimistically in FeedPostCard + realtime
  };

  const handleSaveToggle = (postId: string, isSaved: boolean) => {
    // Handled in FeedPostCard
  };

  const handleDelete = (postId: string) => {
    refreshFeed();
  };

  return (
    <AppLayout>
      <FeedHeader />
      <StoriesBar />
      <div className="mx-auto max-w-lg">
        {posts.length === 0 && !loading && (
          <div className="flex flex-col items-center py-16 text-center">
            <span className="text-4xl">📸</span>
            <p className="mt-3 font-display font-bold">Your feed is empty</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Follow other pet owners to see their posts here!
            </p>
          </div>
        )}

        {posts.map((post) => (
          <FeedPostCard
            key={post.id}
            post={post}
            onLikeToggle={handleLikeToggle}
            onSaveToggle={handleSaveToggle}
            onDelete={handleDelete}
          />
        ))}

        {/* Infinite scroll sentinel */}
        <div ref={sentinelRef} className="h-1" />

        {loading && (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Index;
