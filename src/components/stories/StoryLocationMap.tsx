import { useEffect, useRef } from "react";
import { X, Navigation } from "lucide-react";
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

      // Custom pin
      const pinIcon = L.divIcon({
        html: `<div style="display:flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:50%;background:hsl(25,90%,55%);box-shadow:0 3px 12px rgba(0,0,0,0.35);border:3px solid white;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        </div>`,
        className: "",
        iconSize: [40, 40],
        iconAnchor: [20, 40],
      });

      L.marker([lat, lng], { icon: pinIcon }).addTo(map);

      mapRef.current = map;
      setTimeout(() => map.invalidateSize(), 100);
    }, 50);

    return () => {
      clearTimeout(timer);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [open, lat, lng]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-background flex flex-col animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-card border-b border-border safe-area-top">
        <button onClick={onClose} className="rounded-full p-2 hover:bg-secondary">
          <X className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold truncate">{locationName}</p>
          <p className="text-[11px] text-muted-foreground">Story location</p>
        </div>
        <button
          onClick={() => {
            window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, "_blank");
          }}
          className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
        >
          <Navigation className="h-3.5 w-3.5" /> Directions
        </button>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <div ref={containerRef} className="absolute inset-0" />
      </div>
    </div>
  );
};

export default StoryLocationMap;
