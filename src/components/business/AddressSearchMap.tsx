import { useState, useEffect, useRef, useCallback } from "react";
import { Search, MapPin, Navigation, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface AddressResult {
  display_name: string;
  lat: string;
  lon: string;
}

interface Props {
  latitude: number | null;
  longitude: number | null;
  onLocationChange: (lat: number, lng: number, address?: string) => void;
}

const NOMINATIM_URL = "https://nominatim.openstreetmap.org";

const AddressSearchMap = ({ latitude, longitude, onLocationChange }: Props) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AddressResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [detectingGPS, setDetectingGPS] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  const defaultCenter: [number, number] = [41.9981, 21.4254]; // Skopje
  const center: [number, number] = latitude && longitude ? [latitude, longitude] : defaultCenter;

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;

    const map = L.map(mapRef.current, {
      center,
      zoom: latitude ? 15 : 12,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);

    // Add draggable marker if we have coords
    if (latitude && longitude) {
      const marker = L.marker([latitude, longitude], { draggable: true }).addTo(map);
      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        onLocationChange(pos.lat, pos.lng);
        // Reverse geocode the new position
        reverseGeocode(pos.lat, pos.lng);
      });
      markerRef.current = marker;
    }

    // Click to place marker
    map.on("click", (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
        marker.on("dragend", () => {
          const pos = marker.getLatLng();
          onLocationChange(pos.lat, pos.lng);
          reverseGeocode(pos.lat, pos.lng);
        });
        markerRef.current = marker;
      }
      onLocationChange(lat, lng);
      reverseGeocode(lat, lng);
    });

    leafletMap.current = map;

    return () => {
      map.remove();
      leafletMap.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update marker when coords change externally
  useEffect(() => {
    if (!leafletMap.current || !latitude || !longitude) return;
    const pos: [number, number] = [latitude, longitude];
    leafletMap.current.setView(pos, 15);
    if (markerRef.current) {
      markerRef.current.setLatLng(pos);
    } else {
      const marker = L.marker(pos, { draggable: true }).addTo(leafletMap.current);
      marker.on("dragend", () => {
        const p = marker.getLatLng();
        onLocationChange(p.lat, p.lng);
        reverseGeocode(p.lat, p.lng);
      });
      markerRef.current = marker;
    }
  }, [latitude, longitude]);

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `${NOMINATIM_URL}/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = await res.json();
      if (data.display_name) {
        setQuery(data.display_name);
      }
    } catch {
      // Silently fail
    }
  };

  const searchAddress = useCallback(async (q: string) => {
    if (q.length < 3) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(
        `${NOMINATIM_URL}/search?format=json&q=${encodeURIComponent(q)}&limit=5&countrycodes=mk`,
        { headers: { "Accept-Language": "en" } }
      );
      const data: AddressResult[] = await res.json();
      setResults(data);
      setShowResults(true);
    } catch {
      setResults([]);
    }
    setSearching(false);
  }, []);

  const handleInputChange = (value: string) => {
    setQuery(value);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => searchAddress(value), 400);
  };

  const selectResult = (result: AddressResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    setQuery(result.display_name);
    setShowResults(false);
    setResults([]);
    onLocationChange(lat, lng, result.display_name);

    if (leafletMap.current) {
      leafletMap.current.setView([lat, lng], 16);
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        const marker = L.marker([lat, lng], { draggable: true }).addTo(leafletMap.current);
        marker.on("dragend", () => {
          const p = marker.getLatLng();
          onLocationChange(p.lat, p.lng);
          reverseGeocode(p.lat, p.lng);
        });
        markerRef.current = marker;
      }
    }
  };

  const handleDetectGPS = () => {
    if (!("geolocation" in navigator)) return;
    setDetectingGPS(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        onLocationChange(lat, lng);
        reverseGeocode(lat, lng);
        setDetectingGPS(false);
      },
      () => setDetectingGPS(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-2">
      {/* Address search */}
      <div className="relative">
        <div className="flex items-center gap-1.5 rounded-xl bg-secondary px-3 py-2">
          <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <input
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => results.length > 0 && setShowResults(true)}
            placeholder="Search address..."
            className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
          />
          {query && (
            <button onClick={() => { setQuery(""); setResults([]); setShowResults(false); }}>
              <X className="h-3 w-3 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Results dropdown */}
        {showResults && results.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl bg-card border border-border shadow-lg max-h-40 overflow-y-auto">
            {results.map((r, i) => (
              <button
                key={i}
                onClick={() => selectResult(r)}
                className="w-full text-left px-3 py-2 text-xs hover:bg-secondary transition-colors flex items-start gap-2 border-b border-border last:border-0"
              >
                <MapPin className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                <span className="line-clamp-2">{r.display_name}</span>
              </button>
            ))}
          </div>
        )}
        {showResults && searching && (
          <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl bg-card border border-border shadow-lg p-3 text-center">
            <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full mx-auto" />
          </div>
        )}
      </div>

      {/* GPS button */}
      <Button variant="outline" size="sm" className="w-full text-xs" onClick={handleDetectGPS} disabled={detectingGPS}>
        <Navigation className="h-3 w-3 mr-1.5" /> {detectingGPS ? "Detecting..." : "Use Current GPS Location"}
      </Button>

      {/* Map preview */}
      <div className="rounded-xl overflow-hidden border border-border" style={{ height: 200 }}>
        <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
      </div>

      <p className="text-[10px] text-muted-foreground text-center">
        Tap the map or drag the pin to adjust your store location
      </p>

      {/* Coordinates display */}
      {latitude && longitude && (
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground justify-center">
          <MapPin className="h-3 w-3 text-primary" />
          <span>{Number(latitude).toFixed(6)}, {Number(longitude).toFixed(6)}</span>
        </div>
      )}
    </div>
  );
};

export default AddressSearchMap;
