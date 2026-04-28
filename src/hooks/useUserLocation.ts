import { useState, useEffect, useRef, useCallback, createElement } from "react";
import { usePermissionPrompt } from "@/hooks/usePermissionPrompt";
import { PermissionPrompt } from "@/components/permissions/PermissionPrompt";

interface UserLocation {
  lat: number;
  lng: number;
  accuracy: number;
}

export const useUserLocation = () => {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const grantedRef = useRef(false);
  const { request, promptProps } = usePermissionPrompt("location");

  // INTERNAL: actually invoke the browser geolocation API. Must be called
  // synchronously from a user gesture on iOS WebKit / Capacitor — any
  // intervening `await` drops the gesture-permission token and the call
  // silently no-ops, leaving the blue dot invisible forever.
  const fireGetCurrentPosition = useCallback(() => {
    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setLoading(false);
        // Kick off continuous updates now that we have a confirmed grant.
        if (watchIdRef.current === null && "geolocation" in navigator) {
          watchIdRef.current = navigator.geolocation.watchPosition(
            (p) => {
              setLocation({
                lat: p.coords.latitude,
                lng: p.coords.longitude,
                accuracy: p.coords.accuracy,
              });
            },
            () => {},
            { enableHighAccuracy: true, maximumAge: 5000 }
          );
        }
      },
      (err) => {
        setLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          grantedRef.current = false;
          setError("Enable location to use this feature");
        } else {
          setError("Unable to get your location");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  const requestLocation = useCallback(async () => {
    if (!("geolocation" in navigator)) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    // Fast path — permission already granted: call the geolocation API
    // SYNCHRONOUSLY (no await above this line in the click stack) so iOS
    // accepts it. We optimistically check the cached grant flag first;
    // if it's not set, try the synchronous Permissions API check.
    let alreadyGranted = grantedRef.current;
    if (!alreadyGranted) {
      try {
        const status = await (navigator as any).permissions?.query?.({ name: "geolocation" });
        if (status?.state === "granted") {
          grantedRef.current = true;
          alreadyGranted = true;
        }
      } catch { /* unsupported — fall through */ }
    }

    if (alreadyGranted) {
      fireGetCurrentPosition();
      return;
    }

    // Cold path — show our rationale, then on Allow ask the OS. iOS will
    // present its own native prompt here; once the user taps Allow, the
    // resulting getCurrentPosition is itself initiated from the OS dialog
    // dismissal which iOS treats as a continuation of the gesture.
    const allowed = await request();
    grantedRef.current = allowed;
    if (!allowed) {
      setError("Enable location to use this feature");
      return;
    }
    fireGetCurrentPosition();
  }, [request, fireGetCurrentPosition]);

  const startWatching = useCallback(async () => {
    if (!("geolocation" in navigator) || watchIdRef.current !== null) return;
    // Only attach a watcher silently if permission is already granted —
    // never trigger a cold OS prompt from a non-gesture mount effect.
    try {
      const status = await (navigator as any).permissions?.query?.({ name: "geolocation" });
      if (status?.state !== "granted") return;
    } catch {
      return;
    }
    grantedRef.current = true;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
  }, []);

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopWatching();
  }, [stopWatching]);

  const PermissionDialog = () => createElement(PermissionPrompt, promptProps);

  return {
    location,
    error,
    loading,
    requestLocation,
    startWatching,
    stopWatching,
    PermissionDialog,
  };
};
