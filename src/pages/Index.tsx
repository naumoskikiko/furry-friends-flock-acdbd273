import { useState, useEffect, useRef } from "react";
import AppLayout from "@/components/AppLayout";
import FeedHeader from "@/components/FeedHeader";
import StoriesBar from "@/components/StoriesBar";
import FeedPostCard from "@/components/FeedPostCard";
import BlogFeed from "@/components/blog/BlogFeed";
import { useFeed } from "@/hooks/useFeed";
import { Loader2, Newspaper, Image } from "lucide-react";

const Index = () => {
  const [activeTab, setActiveTab] = useState<"feed" | "blog">("feed");
  const { posts, loading, hasMore, loadMore, refreshFeed } = useFeed();
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Infinite scroll observer for feed
  useEffect(() => {
    if (activeTab !== "feed") return;
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
  }, [hasMore, loading, loadMore, activeTab]);

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
      <div className="mx-auto max-w-lg">
        {activeTab === "feed" && (
          <>
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
                onLikeToggle={() => {}}
                onSaveToggle={() => {}}
                onDelete={() => refreshFeed()}
              />
            ))}

            <div ref={sentinelRef} className="h-1" />

            {loading && (
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
