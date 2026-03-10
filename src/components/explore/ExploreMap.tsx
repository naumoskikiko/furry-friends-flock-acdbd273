import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const emojiIcon = (emoji: string) =>
  L.divIcon({
    html: `<div style="font-size:24px;display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:50%;background:white;box-shadow:0 2px 8px rgba(0,0,0,0.2);">${emoji}</div>`,
    className: "",
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  name: string;
  type: string;
  emoji: string;
  rating?: number;
  distance?: string;
}

interface ExploreMapProps {
  markers: MapMarker[];
  center: [number, number];
  onMarkerClick?: (marker: MapMarker) => void;
}

const ExploreMap = ({ markers, center, onMarkerClick }: ExploreMapProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center,
      zoom: 14,
      zoomControl: false,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    }).addTo(map);
    markersLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update center
  useEffect(() => {
    mapRef.current?.setView(center);
  }, [center]);

  // Update markers
  useEffect(() => {
    const layer = markersLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    markers.forEach((m) => {
      const marker = L.marker([m.lat, m.lng], { icon: emojiIcon(m.emoji) });
      marker.bindPopup(
        `<div style="text-align:center"><b>${m.name}</b><br/><span style="color:#888">${m.type}</span>${m.rating ? `<br/>⭐ ${m.rating}` : ""}${m.distance ? `<br/>${m.distance}` : ""}</div>`
      );
      if (onMarkerClick) {
        marker.on("click", () => onMarkerClick(m));
      }
      layer.addLayer(marker);
    });
  }, [markers, onMarkerClick]);

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-2xl"
      style={{ height: "45vh", width: "100%" }}
    />
  );
};

export default ExploreMap;
