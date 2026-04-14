import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  initBLE,
  scanForTrackers,
  stopScan,
  connectToDevice,
  readTrackerData,
  getRSSILabel,
  getRSSIBars,
  isNativePlatform,
  type ScannedDevice,
  type TrackerData,
} from "@/lib/bleService";
import {
  Bluetooth,
  Loader2,
  Wifi,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  onDeviceBound: (trackerId: string, batteryLevel: number | null) => void;
  onCancel: () => void;
}

type ScanState = "idle" | "scanning" | "connecting" | "reading" | "done" | "error";

const BLEScanner = ({ onDeviceBound, onCancel }: Props) => {
  const [state, setState] = useState<ScanState>("idle");
  const [devices, setDevices] = useState<ScannedDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<ScannedDevice | null>(null);
  const [trackerData, setTrackerData] = useState<TrackerData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isWeb, setIsWeb] = useState(false);
  const devicesRef = useRef<Map<string, ScannedDevice>>(new Map());

  useEffect(() => {
    setIsWeb(!isNativePlatform());
  }, []);

  const startScan = useCallback(async () => {
    setDevices([]);
    devicesRef.current.clear();
    setError(null);
    setState("scanning");

    const ready = await initBLE();
    if (!ready && isNativePlatform()) {
      setError("Bluetooth is not available. Please enable Bluetooth and Location.");
      setState("error");
      return;
    }

    try {
      await scanForTrackers((device) => {
        devicesRef.current.set(device.deviceId, device);
        setDevices(Array.from(devicesRef.current.values()).sort((a, b) => b.rssi - a.rssi));
      }, 12000);

      setTimeout(() => {
        setState((prev) => (prev === "scanning" ? "idle" : prev));
      }, 12000);
    } catch (err: any) {
      setError(err?.message || "Scan failed");
      setState("error");
    }
  }, []);

  const handleConnect = async (device: ScannedDevice) => {
    setSelectedDevice(device);
    setState("connecting");
    setError(null);

    const connected = await connectToDevice(device.deviceId);
    if (!connected) {
      setError("Could not connect. Make sure the tracker is nearby and powered on.");
      setState("error");
      return;
    }

    setState("reading");
    try {
      const data = await readTrackerData(device.deviceId);
      setTrackerData(data);
      setState("done");
    } catch (err: any) {
      setError("Connected but could not read tracker data. Try again.");
      setState("error");
    }
  };

  const handleConfirm = () => {
    if (trackerData) {
      onDeviceBound(trackerData.trackerId, trackerData.batteryLevel);
    }
  };

  const handleRetry = () => {
    setSelectedDevice(null);
    setTrackerData(null);
    setError(null);
    setState("idle");
  };

  const SignalBars = ({ rssi }: { rssi: number }) => {
    const bars = getRSSIBars(rssi);
    return (
      <div className="flex items-end gap-0.5 h-4">
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={`w-1 rounded-full transition-colors ${
              level <= bars ? "bg-primary" : "bg-muted"
            }`}
            style={{ height: `${level * 25}%` }}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-lg p-4">
      <button onClick={onCancel} className="text-sm text-muted-foreground mb-4 flex items-center gap-1">
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>

      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
          <Bluetooth className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold font-display">Find Tracker</h1>
          <p className="text-sm text-muted-foreground">Scan for nearby BLE trackers</p>
        </div>
      </div>

      {isWeb && (
        <div className="flex items-start gap-2 rounded-xl bg-accent/10 p-3 mb-4 text-sm">
          <Smartphone className="h-4 w-4 text-accent mt-0.5 shrink-0" />
          <p className="text-muted-foreground">
            BLE scanning requires a native app. Showing simulated devices for preview.
          </p>
        </div>
      )}

      {/* Error state */}
      {state === "error" && (
        <div className="rounded-2xl bg-destructive/5 border border-destructive/20 p-6 text-center">
          <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-3" />
          <p className="text-sm text-destructive font-medium mb-1">Something went wrong</p>
          <p className="text-xs text-muted-foreground mb-4">{error}</p>
          <div className="flex gap-2 justify-center">
            <Button onClick={handleRetry} variant="secondary" size="sm" className="rounded-xl gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </Button>
            <Button onClick={onCancel} variant="ghost" size="sm" className="rounded-xl">
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Done state — tracker read successfully */}
      {state === "done" && trackerData && (
        <div className="rounded-2xl bg-card petkeep-card-shadow p-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 mx-auto mb-3">
            <CheckCircle2 className="h-7 w-7 text-green-600" />
          </div>
          <h2 className="font-bold font-display text-lg mb-1">Tracker Found!</h2>

          <div className="bg-secondary/50 rounded-xl p-3 space-y-2 mt-4 text-left">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tracker ID</span>
              <span className="font-mono font-bold">{trackerData.trackerId}</span>
            </div>
            {trackerData.batteryLevel !== null && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Battery</span>
                <span className="font-semibold">{trackerData.batteryLevel}%</span>
              </div>
            )}
            {trackerData.firmwareVersion && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Firmware</span>
                <span className="font-mono text-xs">{trackerData.firmwareVersion}</span>
              </div>
            )}
          </div>

          <Button
            onClick={handleConfirm}
            className="w-full mt-4 rounded-xl h-11 petkeep-gradient"
          >
            Use This Tracker
          </Button>
          <button onClick={handleRetry} className="text-sm text-muted-foreground mt-3 block mx-auto">
            Scan again
          </button>
        </div>
      )}

      {/* Connecting / Reading state */}
      {(state === "connecting" || state === "reading") && (
        <div className="rounded-2xl bg-card petkeep-card-shadow p-8 text-center">
          <Loader2 className="h-10 w-10 text-primary mx-auto mb-4 animate-spin" />
          <p className="font-semibold">
            {state === "connecting" ? "Connecting..." : "Reading tracker data..."}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {selectedDevice?.name || "Device"}
          </p>
        </div>
      )}

      {/* Idle / Scanning state */}
      {(state === "idle" || state === "scanning") && (
        <>
          <Button
            onClick={startScan}
            disabled={state === "scanning"}
            className="w-full rounded-xl h-12 gap-2 mb-4 petkeep-gradient"
          >
            {state === "scanning" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Bluetooth className="h-4 w-4" />
                {devices.length > 0 ? "Scan Again" : "Start Scanning"}
              </>
            )}
          </Button>

          {state === "scanning" && devices.length === 0 && (
            <div className="text-center py-8">
              <div className="relative mx-auto w-16 h-16 mb-4">
                <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" />
                <div className="absolute inset-2 rounded-full border-2 border-primary/50 animate-ping [animation-delay:300ms]" />
                <div className="absolute inset-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bluetooth className="h-5 w-5 text-primary" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">Looking for nearby trackers...</p>
            </div>
          )}

          {devices.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                {devices.length} device{devices.length !== 1 ? "s" : ""} found
              </p>
              {devices.map((device) => {
                const signal = getRSSILabel(device.rssi);
                return (
                  <button
                    key={device.deviceId}
                    onClick={() => handleConnect(device)}
                    disabled={state === "scanning"}
                    className="flex w-full items-center gap-3 rounded-2xl bg-card p-4 petkeep-card-shadow hover:bg-secondary/30 transition-colors text-left"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                      <Bluetooth className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate text-sm">
                        {device.name || "Unknown Device"}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        {device.deviceId}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className={`text-[10px] font-semibold ${signal.color}`}>
                          {signal.label}
                        </p>
                        <p className="text-[9px] text-muted-foreground">{device.rssi} dBm</p>
                      </div>
                      <SignalBars rssi={device.rssi} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default BLEScanner;
