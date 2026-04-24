import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { createMapMarkerIcon } from "@/lib/mapMarkerIcon";

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
}

const ExploreMap = ({ markers, center, onMarkerClick }: ExploreMapProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

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
      const marker = L.marker([m.lat, m.lng], { icon: createMapMarkerIcon(m.type) });

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

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-2xl"
      style={{ height: "45vh", width: "100%" }}
    />
  );
};

export default ExploreMap;
