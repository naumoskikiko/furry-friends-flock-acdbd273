import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackScreen } from "@/lib/analytics";

/**
 * Fires a `screen_view` analytics event whenever the route changes.
 *
 * Mounted once near the router root. Respects the user's analytics opt-out
 * automatically — `trackScreen` short-circuits when disabled.
 *
 * We pass the *path pattern* rather than full URL to avoid leaking ids/usernames
 * into analytics. e.g. `/user/janedoe` becomes `/user/:slug`.
 */
function normalizePath(pathname: string): string {
  return (
    pathname
      // UUIDs
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ":id")
      // numeric ids
      .replace(/\/\d+(?=\/|$)/g, "/:id")
      // /user/<handle> → /user/:slug
      .replace(/^\/user\/[^/]+/i, "/user/:slug")
      .replace(/^\/store\/[^/]+/i, "/store/:slug")
      .replace(/^\/provider\/[^/]+/i, "/provider/:slug")
      .replace(/^\/tag\/[^/]+/i, "/tag/:slug") || "/"
  );
}

export default function AnalyticsRouteTracker() {
  const { pathname } = useLocation();
  useEffect(() => {
    trackScreen(normalizePath(pathname));
  }, [pathname]);
  return null;
}
