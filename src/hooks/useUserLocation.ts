import { useState, useEffect, useRef, useCallback } from "react";
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

  const ensurePermission = useCallback(async () => {
    if (grantedRef.current) return true;
    try {
      const status = await (navigator as any).permissions?.query?.({ name: "geolocation" });
      if (status?.state === "granted") {
        grantedRef.current = true;
        return true;
      }
    } catch {
      /* permissions API unsupported — fall through to rationale */
    }
    const allowed = await request();
    grantedRef.current = allowed;
    return allowed;
  }, [request]);

  const requestLocation = useCallback(async () => {
    if (!("geolocation" in navigator)) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    const allowed = await ensurePermission();
    if (!allowed) {
      setError("Enable location to use this feature");
      return;
    }

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
      },
      (err) => {
        setLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setError("Enable location to use this feature");
        } else {
          setError("Unable to get your location");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [ensurePermission]);

  const startWatching = useCallback(async () => {
    if (!("geolocation" in navigator) || watchIdRef.current !== null) return;
    const allowed = await ensurePermission();
    if (!allowed) return;

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
  }, [ensurePermission]);

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopWatching();
  }, [stopWatching]);

  const PermissionDialog = () => <PermissionPrompt {...promptProps} />;

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
