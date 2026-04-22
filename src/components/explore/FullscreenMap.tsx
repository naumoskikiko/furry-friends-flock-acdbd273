import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  ArrowLeft, Search, Plus, Minus, Crosshair,
  MapPin, Star, ChevronUp, ChevronDown, X, ChevronRight,
} from "lucide-react";
import type { MapMarker } from "@/components/explore/ExploreMap";
import type { NearbyItem } from "@/components/explore/NearbySection";
import { useUserLocation } from "@/hooks/useUserLocation";
import { createUserLocationIcon } from "@/lib/userLocationMarker";
import { toast } from "sonner";

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
  const { location: userLocation, error: locationError, loading: locationLoading, requestLocation, startWatching, stopWatching, PermissionDialog: LocationPermissionDialog } = useUserLocation();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const leafletMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const userMarkerRef = useRef<L.Marker | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [panelExpanded, setPanelExpanded] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const prevSelectedRef = useRef<string | null>(null);
  const followingRef = useRef(false);

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

    const timer = setTimeout(() => {
      if (mapRef.current || !containerRef.current) return;

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

      // Stop following when user interacts with map
      map.on('dragstart', () => {
        followingRef.current = false;
        setIsFollowing(false);
      });

      setTimeout(() => map.invalidateSize(), 100);
      setMapReady(true);
    }, 50);

    return () => {
      clearTimeout(timer);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        leafletMarkersRef.current.clear();
        setMapReady(false);
      }
    };
  }, [open]);

  // Update center
  useEffect(() => {
    if (mapRef.current && open) {
      mapRef.current.setView(center, mapRef.current.getZoom());
    }
  }, [center, open]);

  // Update markers (no selectedMarker dependency)
  useEffect(() => {
    const layer = markersLayerRef.current;
    if (!layer || !mapReady) return;
    layer.clearLayers();
    leafletMarkersRef.current.clear();

    filteredMarkers.forEach((m) => {
      const marker = L.marker([m.lat, m.lng], { icon: emojiIcon(m.emoji, false) });

      marker.on("click", () => {
        setSelectedMarker(m);
      });

      layer.addLayer(marker);
      leafletMarkersRef.current.set(m.id, marker);
    });
  }, [filteredMarkers, mapReady]);

  // Update selected marker icon without re-creating all markers
  useEffect(() => {
    const prevId = prevSelectedRef.current;
    const newId = selectedMarker?.id || null;

    if (prevId && prevId !== newId) {
      const prevLeaflet = leafletMarkersRef.current.get(prevId);
      const prevData = filteredMarkers.find((m) => m.id === prevId);
      if (prevLeaflet && prevData) {
        prevLeaflet.setIcon(emojiIcon(prevData.emoji, false));
      }
    }

    if (newId) {
      const newLeaflet = leafletMarkersRef.current.get(newId);
      const newData = filteredMarkers.find((m) => m.id === newId);
      if (newLeaflet && newData) {
        newLeaflet.setIcon(emojiIcon(newData.emoji, true));
      }
    }

    prevSelectedRef.current = newId;
  }, [selectedMarker, filteredMarkers]);

  const handleZoomIn = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();

  const handleCenterOnMe = () => {
    followingRef.current = true;
    setIsFollowing(true);
    requestLocation();
    startWatching();
  };

  // React to location updates - place/move the blue dot
  useEffect(() => {
    if (!userLocation || !mapRef.current) return;
    const map = mapRef.current;

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng]);
    } else {
      userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], {
        icon: createUserLocationIcon(),
        zIndexOffset: 1000,
        interactive: false,
      }).addTo(map);
    }

    // Only fly to user location if following mode is active
    if (followingRef.current) {
      map.flyTo([userLocation.lat, userLocation.lng], 16, {
        animate: true,
        duration: 1,
      });
    }
  }, [userLocation]);

  // Show error toast
  useEffect(() => {
    if (locationError) {
      toast.error(locationError);
    }
  }, [locationError]);

  // Cleanup on close
  useEffect(() => {
    if (!open) {
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
      stopWatching();
    }
  }, [open, stopWatching]);

  const handleNearbyClick = useCallback((item: NearbyItem) => {
    const marker = filteredMarkers.find((m) => m.id === item.id);
    if (marker && mapRef.current) {
      mapRef.current.setView([marker.lat, marker.lng], 16);
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
            disabled={locationLoading}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-lg border border-border"
          >
            {locationLoading ? (
              <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              <Crosshair className="h-4 w-4 text-primary" />
            )}
          </button>
        </div>

        {/* Following indicator */}
        {isFollowing && (
          <div className="absolute top-3 left-3 z-[1000] rounded-full bg-primary/90 px-3 py-1.5 shadow-lg flex items-center gap-1.5 animate-in fade-in duration-200">
            <Crosshair className="h-3 w-3 text-primary-foreground" />
            <p className="text-[11px] font-bold text-primary-foreground">Following your location</p>
          </div>
        )}


        {findMyPet && (
          <div className="absolute top-3 left-3 z-[1000] rounded-full bg-accent/90 px-3 py-1.5 shadow-lg">
            <p className="text-[11px] font-bold text-accent-foreground">🐾 Find My Pet Active</p>
          </div>
        )}

        {/* Selected marker quick card */}
        {selectedMarker && (
          <div className="absolute bottom-[calc(env(safe-area-inset-bottom,0px)+190px)] left-3 right-3 z-[1000]">
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
          panelExpanded ? "max-h-[60vh]" : "max-h-[180px]"
        }`}
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

        <div className="overflow-y-auto px-4 pb-4" style={{ maxHeight: panelExpanded ? "calc(60vh - 60px)" : "120px" }}>
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
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </button>
          ))}
        </div>
      </div>
      <LocationPermissionDialog />
    </div>
  );
};

export default FullscreenMap;
