import { ReactNode, forwardRef, useRef, useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import BottomNav from "./BottomNav";

const TAB_PATHS = ["/", "/explore", "/marketplace", "/care", "/messages", "/profile"];
const scrollCache: Record<string, number> = {};

const AppLayout = forwardRef<HTMLDivElement, { children: ReactNode }>(({ children }, ref) => {
  const location = useLocation();
  const navigate = useNavigate();
  const touchRef = useRef({ x: 0, y: 0, time: 0 });
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
      // Restore scroll
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
    touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, time: Date.now() };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!isTabPage) return;
    const dx = e.changedTouches[0].clientX - touchRef.current.x;
    const dy = e.changedTouches[0].clientY - touchRef.current.y;
    const dt = Date.now() - touchRef.current.time;
    // Only trigger on clear horizontal swipe: fast, horizontal-dominant
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.8 && dt < 400) {
      if (dx < 0 && currentIndex < TAB_PATHS.length - 1) {
        saveScroll();
        navigate(TAB_PATHS[currentIndex + 1]);
      } else if (dx > 0 && currentIndex > 0) {
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
