import { useEffect, useRef, useState, useCallback } from "react";
import { X, Navigation, Loader2, Compass, LocateFixed, Footprints, RotateCcw, RotateCw } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface StoryLocationMapProps {
  open: boolean;
  onClose: () => void;
  locationName: string;
  lat: number;
  lng: number;
}

function formatDistance(meters: number) {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatDuration(seconds: number) {
  if (seconds < 60) return "< 1 min";
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem ? `${hrs} h ${rem} min` : `${hrs} h`;
}

const StoryLocationMap = ({ open, onClose, locationName, lat, lng }: StoryLocationMapProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const routeShadowRef = useRef<L.Polyline | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [routeShown, setRouteShown] = useState(false);
  const [routeInfo, setRouteInfo] = useState<{ distance: number; duration: number } | null>(null);
  const [mapBearing, setMapBearing] = useState(0);

  const destinationIcon = L.divIcon({
    html: `<div style="display:flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:50%;background:hsl(25,90%,55%);box-shadow:0 3px 12px rgba(0,0,0,0.35);border:3px solid white;">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
    </div>`,
    className: "",
    iconSize: [40, 40],
    iconAnchor: [20, 40],
  });

  const userIcon = L.divIcon({
    html: `<div style="display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:50%;background:hsl(210,100%,50%);box-shadow:0 0 0 6px rgba(59,130,246,0.25),0 3px 12px rgba(0,0,0,0.35);border:3px solid white;">
      <div style="width:12px;height:12px;border-radius:50%;background:white;"></div>
    </div>`,
    className: "",
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });

  // Initialize map with leaflet-rotate
  useEffect(() => {
    if (!open || !containerRef.current) return;

    const timer = setTimeout(async () => {
      if (mapRef.current || !containerRef.current) return;

      // Dynamically import leaflet-rotate only for this map
      await import("leaflet-rotate");

      const map = L.map(containerRef.current!, {
        center: [lat, lng],
        zoom: 15,
        zoomControl: false,
        attributionControl: false,
        rotate: true,
        bearing: 0,
        touchRotate: true,
        shiftKeyRotate: true,
        rotateControl: false,
      } as any);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
      L.marker([lat, lng], { icon: destinationIcon }).addTo(map);

      map.on("rotate", () => {
        const bearing = (map as any).getBearing?.() ?? 0;
        setMapBearing(bearing);
      });

      mapRef.current = map;
      setTimeout(() => map.invalidateSize(), 100);
    }, 50);

    return () => {
      clearTimeout(timer);
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      routeLayerRef.current = null;
      routeShadowRef.current = null;
      userMarkerRef.current = null;
      setRouteShown(false);
      setLoadingRoute(false);
      setRouteInfo(null);
      setMapBearing(0);
    };
  }, [open, lat, lng]);

  const drawRoute = useCallback(
    async (userLat: number, userLng: number) => {
      if (!mapRef.current) return;

      try {
        const res = await fetch(
          `https://router.project-osrm.org/route/v1/foot/${userLng},${userLat};${lng},${lat}?overview=full&geometries=geojson&steps=true`
        );
        const data = await res.json();

        if (!data.routes?.[0]?.geometry?.coordinates || !mapRef.current) return;

        const coords: [number, number][] = data.routes[0].geometry.coordinates.map(
          (c: [number, number]) => [c[1], c[0]] as [number, number]
        );

        const route = data.routes[0];
        setRouteInfo({ distance: route.distance, duration: route.duration });

        // Remove old layers
        if (routeShadowRef.current && mapRef.current) mapRef.current.removeLayer(routeShadowRef.current);
        if (routeLayerRef.current && mapRef.current) mapRef.current.removeLayer(routeLayerRef.current);

        // Shadow line for depth
        routeShadowRef.current = L.polyline(coords, {
          color: "rgba(0,0,0,0.15)",
          weight: 9,
          lineCap: "round",
          lineJoin: "round",
        }).addTo(mapRef.current);

        // Main route line
        routeLayerRef.current = L.polyline(coords, {
          color: "hsl(210,100%,50%)",
          weight: 5,
          opacity: 0.9,
          lineCap: "round",
          lineJoin: "round",
          smoothFactor: 1,
        }).addTo(mapRef.current);

        // Update user marker position
        if (userMarkerRef.current) {
          userMarkerRef.current.setLatLng([userLat, userLng]);
        } else {
          userMarkerRef.current = L.marker([userLat, userLng], { icon: userIcon }).addTo(mapRef.current!);
        }
      } catch {
        // Silently fail on route update
      }
    },
    [lat, lng]
  );

  const showRoute = useCallback(async () => {
    if (!mapRef.current) return;

    if (routeShown) {
      if (routeLayerRef.current) { mapRef.current.removeLayer(routeLayerRef.current); routeLayerRef.current = null; }
      if (routeShadowRef.current) { mapRef.current.removeLayer(routeShadowRef.current); routeShadowRef.current = null; }
      if (userMarkerRef.current) { mapRef.current.removeLayer(userMarkerRef.current); userMarkerRef.current = null; }
      if (watchIdRef.current !== null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
      mapRef.current.setView([lat, lng], 15);
      setRouteShown(false);
      setRouteInfo(null);
      return;
    }

    setLoadingRoute(true);

    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });

      const userLat = pos.coords.latitude;
      const userLng = pos.coords.longitude;

      await drawRoute(userLat, userLng);

      if (mapRef.current) {
        const bounds = L.latLngBounds([[userLat, userLng], [lat, lng]]);
        mapRef.current.fitBounds(bounds, { padding: [60, 80] });
      }

      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = navigator.geolocation.watchPosition(
        (p) => { drawRoute(p.coords.latitude, p.coords.longitude); },
        () => {},
        { enableHighAccuracy: true, maximumAge: 5000 }
      );

      setRouteShown(true);
    } catch {
      window.open(
        `https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=${lat},${lng}&travelmode=walking`,
        "_blank"
      );
    } finally {
      setLoadingRoute(false);
    }
  }, [lat, lng, routeShown, drawRoute]);

  const recenterToUser = useCallback(() => {
    if (!mapRef.current || !userMarkerRef.current) return;
    const pos = userMarkerRef.current.getLatLng();
    mapRef.current.flyTo(pos, 16, { duration: 0.6 });
  }, []);

  const rotateLeft = useCallback(() => {
    if (!mapRef.current) return;
    const current = (mapRef.current as any).getBearing?.() ?? 0;
    (mapRef.current as any).setBearing?.(current - 30);
  }, []);

  const rotateRight = useCallback(() => {
    if (!mapRef.current) return;
    const current = (mapRef.current as any).getBearing?.() ?? 0;
    (mapRef.current as any).setBearing?.(current + 30);
  }, []);

  const resetNorth = useCallback(() => {
    if (!mapRef.current) return;
    (mapRef.current as any).setBearing?.(0);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-background flex flex-col animate-fade-in">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3 bg-card border-b border-border safe-area-top">
        <button onClick={onClose} className="rounded-full p-2 hover:bg-secondary transition-colors">
          <X className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold truncate">{locationName}</p>
          <p className="text-[11px] text-muted-foreground">
            {routeShown ? "Navigation active" : "Story location"}
          </p>
        </div>
        <button
          onClick={showRoute}
          disabled={loadingRoute}
          className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-60 transition-all active:scale-95"
        >
          {loadingRoute ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : routeShown ? (
            <X className="h-3.5 w-3.5" />
          ) : (
            <Footprints className="h-3.5 w-3.5" />
          )}
          {routeShown ? "Stop" : "Walk"}
        </button>
      </div>

      {/* Route info bar */}
      {routeInfo && routeShown && (
        <div className="flex items-center justify-center gap-4 px-4 py-2.5 bg-primary/10 border-b border-border">
          <div className="flex items-center gap-1.5">
            <Footprints className="h-4 w-4 text-primary" />
            <span className="text-sm font-bold text-foreground">{formatDistance(routeInfo.distance)}</span>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-1.5">
            <Navigation className="h-4 w-4 text-primary" />
            <span className="text-sm font-bold text-foreground">{formatDuration(routeInfo.duration)}</span>
            <span className="text-xs text-muted-foreground">walk</span>
          </div>
        </div>
      )}

      {/* Map */}
      <div className="flex-1 relative">
        <div ref={containerRef} className="absolute inset-0" />

        {/* Map controls */}
        <div className="absolute top-3 right-3 z-[400] flex flex-col gap-2">
          <button
            onClick={rotateLeft}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-card/95 shadow-lg border border-border backdrop-blur-sm transition-all active:scale-90"
            aria-label="Rotate left"
          >
            <RotateCcw className="h-4 w-4 text-foreground" />
          </button>

          <button
            onClick={resetNorth}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-card/95 shadow-lg border border-border backdrop-blur-sm transition-all active:scale-90"
            aria-label="Reset north"
          >
            <Compass
              className="h-5 w-5 text-foreground transition-transform duration-300"
              style={{ transform: `rotate(${-mapBearing}deg)` }}
            />
          </button>

          <button
            onClick={rotateRight}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-card/95 shadow-lg border border-border backdrop-blur-sm transition-all active:scale-90"
            aria-label="Rotate right"
          >
            <RotateCw className="h-4 w-4 text-foreground" />
          </button>

          {routeShown && (
            <button
              onClick={recenterToUser}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-card/95 shadow-lg border border-border backdrop-blur-sm transition-all active:scale-90"
              aria-label="Recenter"
            >
              <LocateFixed className="h-5 w-5 text-primary" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default StoryLocationMap;
