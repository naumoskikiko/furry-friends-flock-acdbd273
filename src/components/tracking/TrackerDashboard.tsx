import { useEffect, useRef, useState, useCallback } from "react";
import {
  PetTracker,
  useTrackerLocation,
  useGPSSimulator,
  useTrackingHistory,
  useSafeZones,
  useSafeZoneAlerts,
  useBatteryAlert,
  getBatteryColor,
  getBatteryBg,
} from "@/hooks/useTracking";
import { Button } from "@/components/ui/button";
import { MapPin, Battery, Clock, ArrowLeft, Shield, Route, Bluetooth, BluetoothOff, Volume2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import SafeZonePanel from "./SafeZonePanel";
import {
  initBLE,
  ensureBluetoothReady,
  connectToDevice,
  disconnectDevice,
  startLocationNotifications,
  stopLocationNotifications,
  triggerFindTracker,
  onDeviceDisconnected,
  isNativePlatform,
} from "@/lib/bleService";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  tracker: PetTracker;
  onBack: () => void;
}

const SKOPJE: [number, number] = [41.9981, 21.4254];

type BLEStatus = "disconnected" | "connecting" | "connected";

const TrackerDashboard = ({ tracker, onBack }: Props) => {
  const location = useTrackerLocation(tracker.id);
  const { zones, addZone, removeZone, toggleZone } = useSafeZones(tracker.id);
  const batteryLevel = useBatteryAlert(location, tracker.pet_name);
  const outsideZones = useSafeZoneAlerts(location, zones, tracker.pet_name);

  const [historyRange, setHistoryRange] = useState<number>(24);
  const { history } = useTrackingHistory(tracker.id, historyRange);
  const [showHistory, setShowHistory] = useState(false);
  const [showSafeZone, setShowSafeZone] = useState(false);
  const [bleStatus, setBleStatus] = useState<BLEStatus>("disconnected");
  const [finding, setFinding] = useState(false);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const historyLineRef = useRef<L.Polyline | null>(null);
  const zoneCirclesRef = useRef<L.Circle[]>([]);

  // GPS simulator only runs on web preview — never on native (would clobber real BLE).
  useGPSSimulator(isNativePlatform() ? null : tracker.id, SKOPJE[0], SKOPJE[1]);

  const lat = location?.latitude ?? SKOPJE[0];
  const lng = location?.longitude ?? SKOPJE[1];

  // BLE: connect, stream locations into Supabase, react to disconnects.
  useEffect(() => {
    if (!isNativePlatform()) return;
    let cancelled = false;
    let unsubDisconnect: (() => void) | null = null;

    const tryConnect = async () => {
      setBleStatus("connecting");
      const ready = await initBLE();
      if (!ready) {
        if (!cancelled) {
          setBleStatus("disconnected");
          toast.error("Bluetooth not available on this device");
        }
        return;
      }
      const btReady = await ensureBluetoothReady();
      if (!btReady.ok) {
        if (!cancelled) {
          setBleStatus("disconnected");
          toast.error(btReady.reason || "Please enable Bluetooth");
        }
        return;
      }

      const ok = await connectToDevice(tracker.tracker_device_id);
      if (cancelled) return;
      if (!ok) {
        setBleStatus("disconnected");
        return;
      }

      setBleStatus("connected");
      unsubDisconnect = onDeviceDisconnected(tracker.tracker_device_id, () => {
        if (!cancelled) setBleStatus("disconnected");
      });

      // Persist incoming GPS pushes so the realtime location hook + history table stay in sync.
      try {
        await startLocationNotifications(tracker.tracker_device_id, async (loc) => {
          try {
            await supabase.from("tracker_locations").insert({
              tracker_id: tracker.id,
              latitude: loc.latitude,
              longitude: loc.longitude,
              battery_level: 0, // battery comes from a separate read; keep schema happy
            });
          } catch (err) {
            console.error("[BLE] Failed to persist location", err);
          }
        });
      } catch (err) {
        console.error("[BLE] Failed to subscribe to notifications", err);
      }
    };

    tryConnect();

    return () => {
      cancelled = true;
      unsubDisconnect?.();
      stopLocationNotifications(tracker.tracker_device_id);
      disconnectDevice(tracker.tracker_device_id);
    };
  }, [tracker.id, tracker.tracker_device_id]);

  // Auto-reconnect when the link drops.
  useEffect(() => {
    if (!isNativePlatform() || bleStatus !== "disconnected") return;
    const timer = setTimeout(async () => {
      setBleStatus("connecting");
      const ok = await connectToDevice(tracker.tracker_device_id);
      setBleStatus(ok ? "connected" : "disconnected");
    }, 5000);
    return () => clearTimeout(timer);
  }, [bleStatus, tracker.tracker_device_id]);

  const handleFindTracker = async () => {
    setFinding(true);
    const ok = await triggerFindTracker(tracker.tracker_device_id);
    if (ok) toast.success("Tracker is ringing! 🔔");
    else toast.error("Could not reach tracker");
    setTimeout(() => setFinding(false), 2000);
  };

  // Init map
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

  // Smooth marker update
  useEffect(() => {
    if (markerRef.current && location) {
      markerRef.current.setLatLng([location.latitude, location.longitude]);
    }
  }, [location]);

  // Draw history path
  useEffect(() => {
    if (!mapInstance.current) return;
    if (historyLineRef.current) {
      historyLineRef.current.remove();
      historyLineRef.current = null;
    }
    if (showHistory && history.length > 1) {
      const coords: [number, number][] = history.map((h) => [h.latitude, h.longitude]);
      historyLineRef.current = L.polyline(coords, {
        color: "hsl(var(--primary))",
        weight: 3,
        opacity: 0.7,
        dashArray: "6 4",
      }).addTo(mapInstance.current);
    }
  }, [showHistory, history]);

  // Draw safe zone circles
  useEffect(() => {
    if (!mapInstance.current) return;
    zoneCirclesRef.current.forEach((c) => c.remove());
    zoneCirclesRef.current = [];

    const outsideIds = new Set(outsideZones.map((z) => z.id));

    for (const z of zones.filter((z) => z.is_active)) {
      const isOutside = outsideIds.has(z.id);
      const color = isOutside ? "#ef4444" : "#22c55e";
      const circle = L.circle([z.center_lat, z.center_lng], {
        radius: z.radius,
        color,
        fillColor: color,
        fillOpacity: 0.1,
        weight: 2,
        dashArray: "5 5",
      }).addTo(mapInstance.current);
      zoneCirclesRef.current.push(circle);
    }
  }, [zones, outsideZones]);

  const centerOnPet = () => {
    if (mapInstance.current && location) {
      mapInstance.current.flyTo([location.latitude, location.longitude], 17, { duration: 0.8 });
    }
  };

  const HISTORY_OPTIONS = [
    { label: "24h", hours: 24 },
    { label: "7d", hours: 168 },
    { label: "30d", hours: 720 },
  ];

  const bleStatusConfig = {
    disconnected: { icon: BluetoothOff, label: "Disconnected", bg: "bg-destructive/10", color: "text-destructive" },
    connecting: { icon: Bluetooth, label: "Connecting...", bg: "bg-accent/10", color: "text-accent" },
    connected: { icon: Bluetooth, label: "Connected", bg: "bg-green-500/10", color: "text-green-600" },
  };

  const bleConf = bleStatusConfig[bleStatus];
  const BleIcon = bleConf.icon;

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
        {/* BLE Status Badge */}
        <div className={`flex items-center gap-1 rounded-full px-2 py-1 ${bleConf.bg}`}>
          <BleIcon className={`h-3 w-3 ${bleConf.color} ${bleStatus === "connecting" ? "animate-pulse" : ""}`} />
          <span className={`text-[10px] font-semibold ${bleConf.color}`}>{bleConf.label}</span>
        </div>
      </div>

      {/* Map */}
      <div ref={mapRef} className="flex-1 min-h-0" />

      {/* Safe Zone Panel */}
      {showSafeZone && (
        <SafeZonePanel
          zones={zones}
          onAdd={(z) => addZone(z)}
          onRemove={removeZone}
          onToggle={toggleZone}
          onClose={() => setShowSafeZone(false)}
          mapCenter={location ? [location.latitude, location.longitude] : SKOPJE}
        />
      )}

      {/* Info panel */}
      <div className="bg-card p-4 space-y-3 petkeep-card-shadow rounded-t-2xl -mt-4 relative z-10">
        {/* Stats */}
        <div className="flex gap-3">
          <div className={`flex-1 rounded-xl p-3 text-center ${getBatteryBg(batteryLevel)}`}>
            <Battery className={`h-4 w-4 mx-auto ${getBatteryColor(batteryLevel)}`} />
            <p className="text-sm font-bold mt-1">{batteryLevel ?? "--"}%</p>
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

        {/* History toggle */}
        {showHistory && (
          <div className="flex gap-1.5">
            {HISTORY_OPTIONS.map((opt) => (
              <button
                key={opt.hours}
                onClick={() => setHistoryRange(opt.hours)}
                className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-colors ${
                  historyRange === opt.hours
                    ? "petkeep-gradient text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button onClick={centerOnPet} variant="secondary" size="sm" className="flex-1 rounded-xl gap-1.5">
            <MapPin className="h-3.5 w-3.5" />
            Center
          </Button>
          <Button
            onClick={() => setShowHistory(!showHistory)}
            variant={showHistory ? "default" : "secondary"}
            size="sm"
            className="flex-1 rounded-xl gap-1.5"
          >
            <Route className="h-3.5 w-3.5" />
            History
          </Button>
          <Button
            onClick={() => setShowSafeZone(!showSafeZone)}
            variant={showSafeZone ? "default" : "secondary"}
            size="sm"
            className="flex-1 rounded-xl gap-1.5"
          >
            <Shield className="h-3.5 w-3.5" />
            Zones
          </Button>
          <Button
            onClick={handleFindTracker}
            disabled={finding}
            variant="secondary"
            size="sm"
            className="rounded-xl gap-1.5"
          >
            <Volume2 className={`h-3.5 w-3.5 ${finding ? "animate-pulse" : ""}`} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TrackerDashboard;
