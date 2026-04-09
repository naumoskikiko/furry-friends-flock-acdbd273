import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";

interface Props {
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  /** Root margin for triggering early (default: "200px") */
  rootMargin?: string;
  /** Total items loaded — hides "end" message if 0 */
  itemCount?: number;
  /** Custom end-of-list message */
  endMessage?: string;
}

const InfiniteScrollSentinel = ({ loading, hasMore, onLoadMore, rootMargin = "200px", itemCount = 1, endMessage = "No more content" }: Props) => {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) onLoadMore();
      },
      { rootMargin }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, onLoadMore, rootMargin]);

  return (
    <>
      <div ref={sentinelRef} className="h-1" />
      {loading && itemCount > 0 && (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      )}
      {!hasMore && itemCount > 0 && !loading && (
        <div className="flex justify-center py-6">
          <p className="text-xs text-muted-foreground">No more content</p>
        </div>
      )}
    </>
  );
};

export default InfiniteScrollSentinel;
