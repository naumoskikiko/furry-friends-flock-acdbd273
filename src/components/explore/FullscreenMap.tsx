import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  ArrowLeft, Search, SlidersHorizontal, Plus, Minus, Crosshair,
  MapPin, Star, ChevronUp, ChevronDown, X,
} from "lucide-react";
import type { MapMarker } from "@/components/explore/ExploreMap";
import type { NearbyItem } from "@/components/explore/NearbySection";

const emojiIcon = (emoji: string, active = false) =>
  L.divIcon({
    html: `<div style="font-size:${active ? 28 : 24}px;display:flex;align-items:center;justify-content:center;width:${active ? 44 : 36}px;height:${active ? 44 : 36}px;border-radius:50%;background:white;box-shadow:0 2px 10px rgba(0,0,0,${active ? 0.35 : 0.2});${active ? "border:2px solid hsl(25,90%,55%);" : ""}">${emoji}</div>`,
    className: "",
    iconSize: [active ? 44 : 36, active ? 44 : 36],
    iconAnchor: [active ? 22 : 18, active ? 22 : 18],
  });

interface FullscreenMapProps {
  open: boolean;
  onClose: () => void;
  markers: MapMarker[];
  center: [number, number];
  nearbyItems: NearbyItem[];
  findMyPet: boolean;
}

const FullscreenMap = ({ open, onClose, markers, center, nearbyItems, findMyPet }: FullscreenMapProps) => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const leafletMarkersRef = useRef<Map<string, L.Marker>>(new Map());

  const [searchQuery, setSearchQuery] = useState("");
  const [panelExpanded, setPanelExpanded] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);

  const filteredMarkers = searchQuery.trim()
    ? markers.filter(
        (m) =>
          m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.type.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : markers;

  const filteredNearby = searchQuery.trim()
    ? nearbyItems.filter(
        (n) =>
          n.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          n.type.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : nearbyItems;

  // Init map
  useEffect(() => {
    if (!open || !containerRef.current) return;

    // Small delay to let the DOM settle
    const timer = setTimeout(() => {
      if (mapRef.current || !containerRef.current) return;

      const map = L.map(containerRef.current, {
        center,
        zoom: 14,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
      }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;

      // Invalidate size after render
      setTimeout(() => map.invalidateSize(), 100);
    }, 50);

    return () => {
      clearTimeout(timer);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        leafletMarkersRef.current.clear();
      }
    };
  }, [open]);

  // Update center
  useEffect(() => {
    if (mapRef.current && open) {
      mapRef.current.setView(center, mapRef.current.getZoom());
    }
  }, [center, open]);

  // Update markers
  useEffect(() => {
    const layer = markersLayerRef.current;
    if (!layer || !open) return;
    layer.clearLayers();
    leafletMarkersRef.current.clear();

    filteredMarkers.forEach((m) => {
      const isSelected = selectedMarker?.id === m.id;
      const marker = L.marker([m.lat, m.lng], { icon: emojiIcon(m.emoji, isSelected) });

      const imgHtml = m.image_url
        ? `<img src="${m.image_url}" style="width:100%;height:80px;object-fit:cover;border-radius:8px 8px 0 0;margin-bottom:6px;" />`
        : "";
      const descHtml = m.description
        ? `<p style="color:#666;font-size:11px;margin:4px 0 8px;">${m.description.slice(0, 80)}${m.description.length > 80 ? "…" : ""}</p>`
        : "";

      marker.bindPopup(
        `<div style="text-align:center;min-width:160px;max-width:220px;">
          ${imgHtml}
          <b style="font-size:13px;">${m.name}</b><br/>
          <span style="color:#888;font-size:11px;">${m.type}</span>
          ${descHtml}
          ${m.rating ? `<span style="font-size:11px;">⭐ ${m.rating}</span>` : ""}
          ${m.distance ? `<span style="font-size:11px;margin-left:6px;">📍 ${m.distance}</span>` : ""}
          <br/><a href="/place/${m.id}" style="display:inline-block;margin-top:8px;padding:4px 14px;background:hsl(25,90%,55%);color:white;border-radius:8px;font-size:11px;font-weight:700;text-decoration:none;">View Details</a>
        </div>`,
        { maxWidth: 240 }
      );

      marker.on("click", () => {
        setSelectedMarker(m);
      });

      layer.addLayer(marker);
      leafletMarkersRef.current.set(m.id, marker);
    });
  }, [filteredMarkers, open, selectedMarker]);

  const handleZoomIn = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();

  const handleCenterOnMe = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const latlng: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          mapRef.current?.setView(latlng, 15);
        },
        () => {}
      );
    }
  };

  const handleNearbyClick = useCallback((item: NearbyItem) => {
    // Find corresponding marker
    const marker = filteredMarkers.find((m) => m.id === item.id);
    if (marker && mapRef.current) {
      mapRef.current.setView([marker.lat, marker.lng], 16);
      const leafletMarker = leafletMarkersRef.current.get(marker.id);
      if (leafletMarker) {
        leafletMarker.openPopup();
      }
      setSelectedMarker(marker);
    }
  }, [filteredMarkers]);

  const handleViewDetails = (id: string) => {
    onClose();
    navigate(`/place/${id}`);
  };

  // Touch handling for bottom panel
  const panelRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartY.current - e.changedTouches[0].clientY;
    if (diff > 50) setPanelExpanded(true);
    if (diff < -50) setPanelExpanded(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-background flex flex-col">
      {/* Top bar */}
      <div className="relative z-10 flex items-center gap-2 bg-card/95 px-3 py-2.5 backdrop-blur-md border-b border-border safe-area-top">
        <button onClick={onClose} className="rounded-full p-2 hover:bg-secondary shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex flex-1 items-center gap-2 rounded-xl bg-secondary px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search on map..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground font-body"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")}>
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Map container */}
      <div className="flex-1 relative">
        <div ref={containerRef} className="absolute inset-0" />

        {/* Map controls */}
        <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
          <button
            onClick={handleZoomIn}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-lg border border-border"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-lg border border-border"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            onClick={handleCenterOnMe}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-lg border border-border"
          >
            <Crosshair className="h-4 w-4 text-primary" />
          </button>
        </div>

        {/* Find My Pet badge */}
        {findMyPet && (
          <div className="absolute top-3 left-3 z-[1000] rounded-full bg-accent/90 px-3 py-1.5 shadow-lg">
            <p className="text-[11px] font-bold text-accent-foreground">🐾 Find My Pet Active</p>
          </div>
        )}

        {/* Selected marker quick card */}
        {selectedMarker && (
          <div className="absolute bottom-[calc(env(safe-area-inset-bottom,0px)+140px)] left-3 right-3 z-[1000]">
            <div className="rounded-2xl bg-card p-3 shadow-xl border border-border flex gap-3 items-center">
              {selectedMarker.image_url ? (
                <img
                  src={selectedMarker.image_url}
                  alt=""
                  className="h-14 w-14 rounded-xl object-cover shrink-0"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-secondary text-2xl shrink-0">
                  {selectedMarker.emoji}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{selectedMarker.name}</p>
                <p className="text-xs text-muted-foreground">{selectedMarker.type}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {selectedMarker.rating ? (
                    <span className="flex items-center gap-0.5 text-xs">
                      <Star className="h-3 w-3 fill-petkeep-orange text-petkeep-orange" />
                      {selectedMarker.rating}
                    </span>
                  ) : null}
                  {selectedMarker.distance && (
                    <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {selectedMarker.distance}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-1.5 shrink-0">
                <button
                  onClick={() => handleViewDetails(selectedMarker.id)}
                  className="petkeep-gradient rounded-lg px-3 py-1.5 text-[11px] font-bold text-primary-foreground"
                >
                  Details
                </button>
                <button
                  onClick={() => setSelectedMarker(null)}
                  className="rounded-lg bg-secondary px-3 py-1.5 text-[11px] font-semibold text-secondary-foreground"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom panel */}
      <div
        ref={panelRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`relative z-10 bg-card border-t border-border rounded-t-2xl transition-all duration-300 safe-area-bottom ${
          panelExpanded ? "max-h-[60vh]" : "max-h-[140px]"
        } overflow-hidden`}
      >
        {/* Drag handle */}
        <div className="flex justify-center py-2 cursor-grab" onClick={() => setPanelExpanded(!panelExpanded)}>
          <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
        </div>

        <div className="flex items-center justify-between px-4 pb-2">
          <h3 className="font-display text-sm font-bold">Nearby Places</h3>
          <button onClick={() => setPanelExpanded(!panelExpanded)} className="p-1">
            {panelExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </div>

        <div className="overflow-y-auto px-4 pb-4" style={{ maxHeight: panelExpanded ? "calc(60vh - 60px)" : "80px" }}>
          {filteredNearby.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-3">No nearby places found</p>
          )}
          {filteredNearby.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNearbyClick(item)}
              className="flex w-full items-center gap-3 rounded-xl py-2 px-1 hover:bg-secondary/50 transition-colors text-left"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-base shrink-0">
                {item.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{item.name}</p>
                <p className="text-[11px] text-muted-foreground">{item.type}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                  <Star className="h-3 w-3 fill-petkeep-orange text-petkeep-orange" />
                  {item.rating}
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                  <MapPin className="h-3 w-3" />
                  {item.distance}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FullscreenMap;
