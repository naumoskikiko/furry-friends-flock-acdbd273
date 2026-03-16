import { ReactNode, forwardRef, useRef, useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import BottomNav from "./BottomNav";

const TAB_PATHS = ["/", "/explore", "/marketplace", "/care", "/messages", "/profile"];
const scrollCache: Record<string, number> = {};

/** Check if an element or any ancestor is horizontally scrollable */
function isInsideHorizontalScroller(el: EventTarget | null): boolean {
  let node = el as HTMLElement | null;
  while (node) {
    if (node.scrollWidth > node.clientWidth + 4) {
      const style = window.getComputedStyle(node);
      const overflow = style.overflowX;
      if (overflow === "auto" || overflow === "scroll" || node.classList.contains("overflow-x-auto") || node.classList.contains("scrollbar-hide")) {
        return true;
      }
    }
    node = node.parentElement;
  }
  return false;
}

const AppLayout = forwardRef<HTMLDivElement, { children: ReactNode }>(({ children }, ref) => {
  const location = useLocation();
  const navigate = useNavigate();
  const touchRef = useRef({ x: 0, y: 0, time: 0, blocked: false });
  const prevPathRef = useRef(location.pathname);
  const [slideClass, setSlideClass] = useState("");
  const currentIndex = TAB_PATHS.indexOf(location.pathname);
  const isTabPage = currentIndex !== -1;

  // Determine slide direction & restore scroll on tab change
  useEffect(() => {
    if (!isTabPage) return;
    const prevIndex = TAB_PATHS.indexOf(prevPathRef.current);
    if (prevIndex !== -1 && prevIndex !== currentIndex) {
      const dir = currentIndex > prevIndex ? "swipe-slide-from-right" : "swipe-slide-from-left";
      setSlideClass(dir);
      const t = setTimeout(() => setSlideClass(""), 280);
      const cached = scrollCache[location.pathname];
      requestAnimationFrame(() => window.scrollTo(0, cached ?? 0));
      prevPathRef.current = location.pathname;
      return () => clearTimeout(t);
    }
    prevPathRef.current = location.pathname;
  }, [location.pathname, currentIndex, isTabPage]);

  const saveScroll = useCallback(() => {
    if (TAB_PATHS.includes(location.pathname)) {
      scrollCache[location.pathname] = window.scrollY;
    }
  }, [location.pathname]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const blocked = isInsideHorizontalScroller(e.target);
    touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, time: Date.now(), blocked };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!isTabPage || touchRef.current.blocked) return;
    const startX = touchRef.current.x;
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - touchRef.current.y;
    const dt = Date.now() - touchRef.current.time;
    const screenWidth = window.innerWidth;
    const EDGE_ZONE = 30;
    const startedFromLeftEdge = startX < EDGE_ZONE;
    const startedFromRightEdge = startX > screenWidth - EDGE_ZONE;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.8 && dt < 400) {
      if (dx < 0 && startedFromRightEdge && currentIndex < TAB_PATHS.length - 1) {
        saveScroll();
        navigate(TAB_PATHS[currentIndex + 1]);
      } else if (dx > 0 && startedFromLeftEdge && currentIndex > 0) {
        saveScroll();
        navigate(TAB_PATHS[currentIndex - 1]);
      }
    }
  }, [isTabPage, currentIndex, navigate, saveScroll]);

  return (
    <div
      ref={ref}
      className="min-h-screen bg-background overflow-x-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <main className={`pb-20 ${slideClass}`}>{children}</main>
      <BottomNav onBeforeNavigate={saveScroll} />
    </div>
  );
});

AppLayout.displayName = "AppLayout";

export default AppLayout;
