import { useEffect, useState } from "react";

/**
 * Tracks the device's online/offline state.
 *
 * Listens to the browser `online`/`offline` events. On Capacitor native builds
 * those events fire too (the WebView mirrors network reachability), so this
 * works on iOS/Android without an extra plugin.
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState<boolean>(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return online;
}
