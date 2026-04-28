import { useState, useEffect, useRef, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { Geolocation, type Position } from "@capacitor/geolocation";

interface UserLocation {
  lat: number;
  lng: number;
  accuracy: number;
}

type WatchHandle =
  | { platform: "web"; id: number }
  | { platform: "native"; id: string };

const isNativeLocation = () => Capacitor.isNativePlatform();

export const useUserLocation = () => {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const watchRef = useRef<WatchHandle | null>(null);

  const updateLocation = useCallback((coords: Pick<GeolocationCoordinates, "latitude" | "longitude" | "accuracy">) => {
    setLocation({
      lat: coords.latitude,
      lng: coords.longitude,
      accuracy: coords.accuracy,
    });
  }, []);

  const startNativeWatch = useCallback(async () => {
    if (watchRef.current) return;

    const id = await Geolocation.watchPosition(
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000, minimumUpdateInterval: 3000 },
      (position: Position | null) => {
        if (position) updateLocation(position.coords);
      }
    );
    watchRef.current = { platform: "native", id };
  }, [updateLocation]);

  const startWebWatch = useCallback(() => {
    if (!("geolocation" in navigator) || watchRef.current) return;

    const id = navigator.geolocation.watchPosition(
      (pos) => updateLocation(pos.coords),
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
    watchRef.current = { platform: "web", id };
  }, [updateLocation]);

  // INTERNAL: actually invoke the browser geolocation API. Must be called
  // synchronously from a user gesture on iOS WebKit / Capacitor — any
  // intervening `await` drops the gesture-permission token and the call
  // silently no-ops, leaving the blue dot invisible forever.
  const fireWebGetCurrentPosition = useCallback((): Promise<boolean> => new Promise((resolve) => {
    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        updateLocation(pos.coords);
        setLoading(false);
        startWebWatch();
        resolve(true);
      },
      (err) => {
        setLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setError("Enable location to use this feature");
        } else {
          setError("Unable to get your location");
        }
        resolve(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }), [startWebWatch, updateLocation]);

  const fireNativeGetCurrentPosition = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
      updateLocation(pos.coords);
      setLoading(false);
      void startNativeWatch();
      return true;
    } catch {
      setLoading(false);
      setError("Enable location to use this feature");
      return false;
    }
  }, [startNativeWatch, updateLocation]);

  const requestLocation = useCallback(() => {
    if (isNativeLocation()) {
      return fireNativeGetCurrentPosition();
    }

    if (!("geolocation" in navigator)) {
      setError("Geolocation is not supported by your browser");
      return Promise.resolve(false);
    }

    // Call the browser API directly from the click stack so mobile Safari keeps
    // the user-gesture permission token and shows the OS location prompt.
    return fireWebGetCurrentPosition();
  }, [fireNativeGetCurrentPosition, fireWebGetCurrentPosition]);

  const startWatching = useCallback(async () => {
    if (watchRef.current) return;

    if (isNativeLocation()) {
      try {
        const status = await Geolocation.checkPermissions();
        if (status.location !== "granted") return;
        await startNativeWatch();
      } catch {
        return;
      }
      return;
    }

    if (!("geolocation" in navigator)) return;
    // Only attach a watcher silently if permission is already granted —
    // never trigger a cold OS prompt from a non-gesture mount effect.
    try {
      const status = await (navigator as any).permissions?.query?.({ name: "geolocation" });
      if (status?.state !== "granted") return;
    } catch {
      return;
    }
    startWebWatch();
  }, [startNativeWatch, startWebWatch]);

  const stopWatching = useCallback(() => {
    const watch = watchRef.current;
    if (!watch) return;

    if (watch.platform === "native") {
      void Geolocation.clearWatch({ id: watch.id });
    } else if ("geolocation" in navigator) {
      navigator.geolocation.clearWatch(watch.id);
    }
    watchRef.current = null;
  }, []);

  useEffect(() => {
    return () => stopWatching();
  }, [stopWatching]);

  const PermissionDialog = () => null;

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
