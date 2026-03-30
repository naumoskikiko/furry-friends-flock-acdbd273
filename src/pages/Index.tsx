import { useState, useCallback } from "react";
import { useTabRefresh } from "@/hooks/useTabRefresh";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import PullToRefreshIndicator from "@/components/PullToRefreshIndicator";
import { useNavigate, useSearchParams } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import FeedHeader from "@/components/FeedHeader";
import StoriesBar from "@/components/StoriesBar";
import FeedPostCard from "@/components/FeedPostCard";
import BlogFeed from "@/components/blog/BlogFeed";
import FeedSkeleton from "@/components/feed/FeedSkeleton";
import PeopleYouMayKnow from "@/components/feed/PeopleYouMayKnow";
import { useFeed } from "@/hooks/useFeed";
import InfiniteScrollSentinel from "@/components/InfiniteScrollSentinel";
import { Newspaper, Image } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<"feed" | "blog">(() => searchParams.get("blog") ? "blog" : "feed");
  const openBlogId = searchParams.get("blog") || undefined;
  const { posts, loading, hasMore, loadMore, refreshFeed } = useFeed();
  

  const refreshAll = useCallback(async () => {
    await refreshFeed();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [refreshFeed]);

  useTabRefresh("/", refreshAll);

  const { refreshing, pullDistance, handleTouchStart, handleTouchMove, handleTouchEnd } =
    usePullToRefresh({ onRefresh: refreshAll });

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
        className="mx-auto max-w-lg"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <PullToRefreshIndicator refreshing={refreshing} pullDistance={pullDistance} />

        {activeTab === "feed" && (
          <>
            {showSkeleton && <FeedSkeleton />}

            {!showSkeleton && posts.length === 0 && (
              <div className="flex flex-col items-center py-8 text-center">
                <PeopleYouMayKnow />
                <p className="mt-4 text-sm text-muted-foreground">
                  Start following people to see posts here!
                </p>
                <button
                  onClick={() => navigate("/explore?focus=search")}
                  className="mt-3 rounded-full bg-primary px-6 py-2 text-sm font-bold text-primary-foreground"
                >
                  Discover More
                </button>
              </div>
            )}

            {posts.map((post, index) => (
              <div key={post.id}>
                <FeedPostCard
                  post={post}
                  onLikeToggle={() => {}}
                  onSaveToggle={() => {}}
                  onDelete={() => refreshFeed()}
                />
                {(index + 1) % 12 === 0 && <PeopleYouMayKnow />}
              </div>
            ))}

            {posts.length > 0 && posts.length % 12 !== 0 && <PeopleYouMayKnow />}

            <InfiniteScrollSentinel loading={loading} hasMore={hasMore} onLoadMore={loadMore} itemCount={posts.length} />
          </>
        )}

        {activeTab === "blog" && <BlogFeed openBlogId={openBlogId} />}
      </div>
    </AppLayout>
  );
};

export default Index;
