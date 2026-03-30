import { useEffect } from "react";

/**
 * Listens for double-tap refresh events from BottomNav.
 * @param path - The route path this page corresponds to (e.g. "/", "/explore")
 * @param onRefresh - Callback to execute on double-tap refresh
 */
export const useTabRefresh = (path: string, onRefresh: () => void) => {
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.path === path) {
        onRefresh();
      }
    };
    window.addEventListener("tab-refresh", handler);
    return () => window.removeEventListener("tab-refresh", handler);
  }, [path, onRefresh]);
};
