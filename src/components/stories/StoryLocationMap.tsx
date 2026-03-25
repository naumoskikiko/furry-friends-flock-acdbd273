import { useEffect, useRef, useState, useCallback } from "react";
import { X, Navigation, Loader2 } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface StoryLocationMapProps {
  open: boolean;
  onClose: () => void;
  locationName: string;
  lat: number;
  lng: number;
}

const StoryLocationMap = ({ open, onClose, locationName, lat, lng }: StoryLocationMapProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [routeShown, setRouteShown] = useState(false);

  const destinationIcon = L.divIcon({
    html: `<div style="display:flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:50%;background:hsl(25,90%,55%);box-shadow:0 3px 12px rgba(0,0,0,0.35);border:3px solid white;">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
    </div>`,
    className: "",
    iconSize: [40, 40],
    iconAnchor: [20, 40],
  });

  const userIcon = L.divIcon({
    html: `<div style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;background:hsl(210,100%,50%);box-shadow:0 0 0 4px rgba(59,130,246,0.3),0 3px 12px rgba(0,0,0,0.35);border:3px solid white;">
      <div style="width:10px;height:10px;border-radius:50%;background:white;"></div>
    </div>`,
    className: "",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

  useEffect(() => {
    if (!open || !containerRef.current) return;

    const timer = setTimeout(() => {
      if (mapRef.current || !containerRef.current) return;

      const map = L.map(containerRef.current, {
        center: [lat, lng],
        zoom: 15,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
      L.marker([lat, lng], { icon: destinationIcon }).addTo(map);

      mapRef.current = map;
      setTimeout(() => map.invalidateSize(), 100);
    }, 50);

    return () => {
      clearTimeout(timer);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      routeLayerRef.current = null;
      userMarkerRef.current = null;
      setRouteShown(false);
      setLoadingRoute(false);
    };
  }, [open, lat, lng]);

  const showRoute = useCallback(async () => {
    if (!mapRef.current) return;

    if (routeShown) {
      // Clear route
      if (routeLayerRef.current) {
        mapRef.current.removeLayer(routeLayerRef.current);
        routeLayerRef.current = null;
      }
      if (userMarkerRef.current) {
        mapRef.current.removeLayer(userMarkerRef.current);
        userMarkerRef.current = null;
      }
      mapRef.current.setView([lat, lng], 15);
      setRouteShown(false);
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

      // Fetch route from OSRM
      const res = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${userLng},${userLat};${lng},${lat}?overview=full&geometries=geojson`
      );
      const data = await res.json();

      if (!data.routes?.[0]?.geometry?.coordinates || !mapRef.current) {
        throw new Error("No route found");
      }

      const coords: [number, number][] = data.routes[0].geometry.coordinates.map(
        (c: [number, number]) => [c[1], c[0]] as [number, number]
      );

      // Add user marker
      if (userMarkerRef.current) mapRef.current.removeLayer(userMarkerRef.current);
      userMarkerRef.current = L.marker([userLat, userLng], { icon: userIcon }).addTo(mapRef.current);

      // Draw route
      if (routeLayerRef.current) mapRef.current.removeLayer(routeLayerRef.current);
      routeLayerRef.current = L.polyline(coords, {
        color: "hsl(210,100%,50%)",
        weight: 5,
        opacity: 0.8,
        smoothFactor: 1,
      }).addTo(mapRef.current);

      // Fit bounds to show full route
      const bounds = L.latLngBounds([
        [userLat, userLng],
        [lat, lng],
      ]);
      mapRef.current.fitBounds(bounds, { padding: [60, 60] });

      setRouteShown(true);
    } catch {
      // Fallback: open Google Maps directions
      window.open(
        `https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=${lat},${lng}`,
        "_blank"
      );
    } finally {
      setLoadingRoute(false);
    }
  }, [lat, lng, routeShown]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-background flex flex-col animate-fade-in">
      <div className="flex items-center gap-3 px-4 py-3 bg-card border-b border-border safe-area-top">
        <button onClick={onClose} className="rounded-full p-2 hover:bg-secondary">
          <X className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold truncate">{locationName}</p>
          <p className="text-[11px] text-muted-foreground">
            {routeShown ? "Route shown" : "Story location"}
          </p>
        </div>
        <button
          onClick={showRoute}
          disabled={loadingRoute}
          className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-60"
        >
          {loadingRoute ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Navigation className="h-3.5 w-3.5" />
          )}
          {routeShown ? "Clear" : "Directions"}
        </button>
      </div>

      <div className="flex-1 relative">
        <div ref={containerRef} className="absolute inset-0" />
      </div>
    </div>
  );
};

export default StoryLocationMap;
