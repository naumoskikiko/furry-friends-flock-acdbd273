import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { App as CapApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";

/**
 * Native Android back-button handling.
 *
 * Google Play *requires* the hardware back button to navigate back through the
 * app's history (and exit on the root tab) instead of immediately closing the
 * app. We wire the Capacitor `App.backButton` event to React Router and only
 * call `App.exitApp()` when we're at a top-level tab with no history to pop.
 *
 * Safe to mount unconditionally: on web/iOS the listener is a no-op.
 */
const ROOT_TABS = new Set([
  "/",
  "/explore",
  "/marketplace",
  "/care",
  "/messages",
  "/profile",
]);

export function useNativeBackButton() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let removeListener: (() => void) | undefined;
    let cancelled = false;

    CapApp.addListener("backButton", ({ canGoBack }) => {
      if (cancelled) return;
      // At a root tab with no history → defer to OS (exit app).
      if (ROOT_TABS.has(location.pathname) && !canGoBack) {
        CapApp.exitApp();
        return;
      }
      // Otherwise pop one entry from React Router history.
      navigate(-1);
    }).then((handle) => {
      removeListener = () => handle.remove();
    });

    return () => {
      cancelled = true;
      removeListener?.();
    };
  }, [navigate, location.pathname]);
}
