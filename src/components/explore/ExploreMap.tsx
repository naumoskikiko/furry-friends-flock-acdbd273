import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { createUserLocationIcon } from "@/lib/userLocationMarker";

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
  image_url?: string;
  description?: string;
}

interface ExploreMapProps {
  markers: MapMarker[];
  center: [number, number];
  onMarkerClick?: (marker: MapMarker) => void;
  /** When provided, renders a pulsing blue dot at the user's GPS position. */
  userLocation?: { lat: number; lng: number } | null;
}

const ExploreMap = ({ markers, center, onMarkerClick, userLocation }: ExploreMapProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center,
      zoom: 14,
      zoomControl: false,
      attributionControl: false,
      rotate: false,
      rotateControl: false,
    } as any);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    }).addTo(map);
    markersLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    // Tiles can render at the wrong size when the container is laid out lazily
    // (e.g. inside <Suspense> or a hidden tab). Force Leaflet to recalculate.
    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    // Preserve current zoom when re-centering, otherwise the map flashes back to zoom 14
    // every time the user's GPS fix updates the center prop.
    const map = mapRef.current;
    if (!map) return;
    map.setView(center, map.getZoom());
  }, [center]);

  useEffect(() => {
    const layer = markersLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    markers.forEach((m) => {
      const marker = L.marker([m.lat, m.lng], { icon: emojiIcon(m.emoji) });

      const imgHtml = m.image_url
        ? `<img src="${m.image_url}" style="width:100%;height:80px;object-fit:cover;border-radius:8px 8px 0 0;margin-bottom:6px;" />`
        : "";
      const descHtml = m.description
        ? `<p style="color:#666;font-size:11px;margin:4px 0;">${m.description.slice(0, 80)}${m.description.length > 80 ? "…" : ""}</p>`
        : "";

      marker.bindPopup(
        `<div style="text-align:center;min-width:160px;max-width:200px;">
          ${imgHtml}
          <b style="font-size:13px;">${m.name}</b><br/>
          <span style="color:#888;font-size:11px;">${m.type}</span>
          ${descHtml}
          ${m.rating ? `<span style="font-size:11px;">⭐ ${m.rating}</span>` : ""}
          ${m.distance ? `<span style="font-size:11px;margin-left:6px;">📍 ${m.distance}</span>` : ""}
        </div>`,
        { maxWidth: 220 }
      );
      if (onMarkerClick) {
        marker.on("click", () => onMarkerClick(m));
      }
      layer.addLayer(marker);
    });
  }, [markers, onMarkerClick]);

  // Render the pulsing blue "you are here" dot whenever a fresh GPS fix arrives.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userLocation) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng]);
    } else {
      userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], {
        icon: createUserLocationIcon(),
        zIndexOffset: 1000,
        interactive: false,
      }).addTo(map);
    }

    return () => {
      if (userMarkerRef.current && !mapRef.current) {
        userMarkerRef.current = null;
      }
    };
  }, [userLocation]);

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-2xl"
      style={{ height: "45vh", width: "100%" }}
    />
  );
};

export default ExploreMap;
