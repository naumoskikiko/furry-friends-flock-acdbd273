import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
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

const RecenterMap = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
};

const ExploreMap = ({ markers, center, onMarkerClick }: ExploreMapProps) => {
  return (
    <div className="relative overflow-hidden rounded-2xl" style={{ height: "45vh" }}>
      <MapContainer
        center={center}
        zoom={14}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%", borderRadius: "1rem" }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <RecenterMap center={center} />
        {markers.map((m) => (
          <Marker
            key={m.id}
            position={[m.lat, m.lng]}
            icon={emojiIcon(m.emoji)}
            eventHandlers={{ click: () => onMarkerClick?.(m) }}
          >
            <Popup>
              <div className="text-center">
                <p className="font-bold text-sm">{m.name}</p>
                <p className="text-xs text-gray-500">{m.type}</p>
                {m.rating && <p className="text-xs">⭐ {m.rating}</p>}
                {m.distance && <p className="text-xs">{m.distance}</p>}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default ExploreMap;
