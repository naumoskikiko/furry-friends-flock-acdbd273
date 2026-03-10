import { useEffect, useRef, useState } from "react";
import { PetTracker, useTrackerLocation, useGPSSimulator } from "@/hooks/useTracking";
import { Button } from "@/components/ui/button";
import { MapPin, AlertTriangle, Bell, Battery, Clock, ArrowLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Props {
  tracker: PetTracker;
  onBack: () => void;
  onToggleLost: (id: string, isLost: boolean) => void;
}

const SKOPJE: [number, number] = [41.9981, 21.4254];

const TrackerDashboard = ({ tracker, onBack, onToggleLost }: Props) => {
  const location = useTrackerLocation(tracker.id);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Start GPS simulator for demo
  useGPSSimulator(tracker.id, SKOPJE[0], SKOPJE[1]);

  const lat = location?.latitude ?? SKOPJE[0];
  const lng = location?.longitude ?? SKOPJE[1];

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, {
      center: [lat, lng],
      zoom: 16,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
    }).addTo(map);

    const icon = L.divIcon({
      html: `<div style="font-size:28px;text-shadow:0 2px 6px rgba(0,0,0,0.3)">🐾</div>`,
      className: "",
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    const marker = L.marker([lat, lng], { icon }).addTo(map);
    markerRef.current = marker;
    mapInstance.current = map;

    return () => { map.remove(); mapInstance.current = null; };
  }, []);

  // Update marker position when location changes
  useEffect(() => {
    if (markerRef.current && location) {
      markerRef.current.setLatLng([location.latitude, location.longitude]);
    }
  }, [location]);

  const centerOnPet = () => {
    if (mapInstance.current && location) {
      mapInstance.current.flyTo([location.latitude, location.longitude], 17, { duration: 0.8 });
    }
  };

  return (
    <div className="mx-auto max-w-lg flex flex-col h-[calc(100dvh-4rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-card/95 backdrop-blur-md z-10">
        <button onClick={onBack} className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold font-display truncate">{tracker.pet_name}</h1>
          <p className="text-[11px] text-muted-foreground font-mono">{tracker.tracker_device_id}</p>
        </div>
        {tracker.is_lost && (
          <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-[10px] font-bold text-destructive animate-pulse">
            LOST
          </span>
        )}
      </div>

      {/* Map */}
      <div ref={mapRef} className="flex-1 min-h-0" />

      {/* Info panel */}
      <div className="bg-card p-4 space-y-3 petkeep-card-shadow rounded-t-2xl -mt-4 relative z-10">
        {/* Stats */}
        <div className="flex gap-3">
          <div className="flex-1 rounded-xl bg-secondary/50 p-3 text-center">
            <Battery className="h-4 w-4 mx-auto text-accent" />
            <p className="text-sm font-bold mt-1">{location?.battery_level ?? "--"}%</p>
            <p className="text-[10px] text-muted-foreground">Battery</p>
          </div>
          <div className="flex-1 rounded-xl bg-secondary/50 p-3 text-center">
            <Clock className="h-4 w-4 mx-auto text-accent" />
            <p className="text-sm font-bold mt-1">
              {location ? formatDistanceToNow(new Date(location.created_at), { addSuffix: true }) : "--"}
            </p>
            <p className="text-[10px] text-muted-foreground">Last Update</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button onClick={centerOnPet} variant="secondary" size="sm" className="flex-1 rounded-xl gap-1.5">
            <MapPin className="h-3.5 w-3.5" />
            Center
          </Button>
          <Button
            onClick={() => onToggleLost(tracker.id, !tracker.is_lost)}
            variant={tracker.is_lost ? "default" : "destructive"}
            size="sm"
            className="flex-1 rounded-xl gap-1.5"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            {tracker.is_lost ? "Found!" : "Mark Lost"}
          </Button>
          <Button variant="secondary" size="sm" className="flex-1 rounded-xl gap-1.5">
            <Bell className="h-3.5 w-3.5" />
            Alerts
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TrackerDashboard;
