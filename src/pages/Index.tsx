import { useState, useEffect, useRef, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import FeedHeader from "@/components/FeedHeader";
import StoriesBar from "@/components/StoriesBar";
import FeedPostCard from "@/components/FeedPostCard";
import BlogFeed from "@/components/blog/BlogFeed";
import FeedSkeleton from "@/components/feed/FeedSkeleton";
import { useFeed } from "@/hooks/useFeed";
import { Loader2, Newspaper, Image } from "lucide-react";

const Index = () => {
  const [activeTab, setActiveTab] = useState<"feed" | "blog">("feed");
  const { posts, loading, hasMore, loadMore, refreshFeed } = useFeed();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [refreshing, setRefreshing] = useState(false);
  const pullStartY = useRef(0);
  const feedRef = useRef<HTMLDivElement>(null);

  // Pull to refresh
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    pullStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(
    async (e: React.TouchEvent) => {
      const pullDistance = e.changedTouches[0].clientY - pullStartY.current;
      if (pullDistance > 100 && window.scrollY <= 0 && activeTab === "feed") {
        setRefreshing(true);
        await refreshFeed();
        setRefreshing(false);
      }
    },
    [activeTab, refreshFeed]
  );

  // Infinite scroll observer
  useEffect(() => {
    if (activeTab !== "feed") return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) loadMore();
      },
      { rootMargin: "200px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, loadMore, activeTab]);

  const showSkeleton = loading && posts.length === 0;

  return (
    <AppLayout>
      <FeedHeader />
      <StoriesBar />

      {/* Feed / Blog toggle */}
      <div className="sticky top-[57px] z-30 border-b border-border bg-card">
        <div className="mx-auto flex max-w-lg">
          <button
            onClick={() => setActiveTab("feed")}
            className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-bold transition-colors ${
              activeTab === "feed"
                ? "border-b-2 border-foreground text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Image className="h-4 w-4" />
            Feed
          </button>
          <button
            onClick={() => setActiveTab("blog")}
            className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-bold transition-colors ${
              activeTab === "blog"
                ? "border-b-2 border-foreground text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Newspaper className="h-4 w-4" />
            Blog
          </button>
        </div>
      </div>

      {/* Content */}
      <div
        ref={feedRef}
        className="mx-auto max-w-lg"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Pull to refresh indicator */}
        {refreshing && (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        )}

        {activeTab === "feed" && (
          <>
            {showSkeleton && <FeedSkeleton />}

            {!showSkeleton && posts.length === 0 && (
              <div className="flex flex-col items-center py-16 text-center">
                <span className="text-4xl">📸</span>
                <p className="mt-3 font-display font-bold">Your feed is empty</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Follow people to see their posts here!
                </p>
                <button
                  onClick={() => (window.location.href = "/explore")}
                  className="mt-4 rounded-full bg-primary px-6 py-2 text-sm font-bold text-primary-foreground"
                >
                  Discover People
                </button>
              </div>
            )}

            {posts.map((post) => (
              <FeedPostCard
                key={post.id}
                post={post}
                onLikeToggle={() => {}}
                onSaveToggle={() => {}}
                onDelete={() => refreshFeed()}
              />
            ))}

            <div ref={sentinelRef} className="h-1" />

            {loading && posts.length > 0 && (
              <div className="flex justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}
          </>
        )}

        {activeTab === "blog" && <BlogFeed />}
      </div>
    </AppLayout>
  );
};

export default Index;
