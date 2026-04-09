import { useRef, useState, useCallback } from "react";

interface PullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  /** Minimum pull distance in px to trigger refresh (default: 100) */
  threshold?: number;
  /** Cooldown in ms between refreshes (default: 1500) */
  cooldown?: number;
  /**
   * Optional ref to a scrollable container.
   * When provided, checks container.scrollTop instead of window.scrollY
   * so pull-to-refresh only triggers when the container (not the page) is at top.
   */
  containerRef?: React.RefObject<HTMLElement>;
}

/**
 * Universal pull-to-refresh hook.
 * Returns touch handlers + refreshing state + pull progress.
 */
export const usePullToRefresh = ({
  onRefresh,
  threshold = 100,
  cooldown = 1500,
  containerRef,
}: PullToRefreshOptions) => {
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const pullStartY = useRef(0);
  const isPulling = useRef(false);
  const lastRefreshTime = useRef(0);

  const isAtTop = useCallback(() => {
    if (containerRef?.current) {
      return containerRef.current.scrollTop <= 0;
    }
    return window.scrollY <= 0;
  }, [containerRef]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isAtTop() && !refreshing) {
      pullStartY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  }, [refreshing, isAtTop]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling.current || refreshing) return;
    const dy = e.touches[0].clientY - pullStartY.current;
    if (dy > 0 && isAtTop()) {
      // Dampen the pull (feels more natural)
      setPullDistance(Math.min(dy * 0.4, threshold * 1.4));
    } else {
      setPullDistance(0);
    }
  }, [refreshing, threshold, isAtTop]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current) return;
    isPulling.current = false;

    const now = Date.now();
    if (pullDistance >= threshold * 0.4 && now - lastRefreshTime.current > cooldown) {
      lastRefreshTime.current = now;
      setRefreshing(true);
      setPullDistance(0);
      try {
        await onRefresh();
      } catch {
        // Error handled silently — pages can show their own toasts
      } finally {
        setRefreshing(false);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, threshold, cooldown, onRefresh]);

  return {
    refreshing,
    pullDistance,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
};
