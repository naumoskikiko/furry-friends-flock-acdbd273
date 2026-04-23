import { BleClient, BleDevice, ScanResult } from "@capacitor-community/bluetooth-le";

/**
 * BLE service for PetKeep trackers.
 *
 * Production-ready native flow:
 *  1. `initBLE()`            – initialise the BLE adapter (Android needs this).
 *  2. `ensureBluetoothReady()` – verify the adapter is powered on; on Android,
 *                                prompt the user to enable Bluetooth.
 *  3. `scanForTrackers()`    – discover nearby trackers advertising our service.
 *  4. `connectToDevice()`    – open a GATT connection (with disconnect callback).
 *  5. `readTrackerData()`    – read tracker id / battery / firmware.
 *  6. `startLocationNotifications()` – subscribe to live GPS pushes.
 *  7. `triggerFindTracker()` – buzz the tracker so the user can locate it.
 *
 * On web (preview / desktop) all native calls short-circuit and the scanner
 * returns mock devices so the UI is testable without hardware.
 */

// PetKeep tracker BLE service/characteristic UUIDs
const TRACKER_SERVICE_UUID = "0000fff0-0000-1000-8000-00805f9b34fb";
const TRACKER_ID_CHAR_UUID = "0000fff1-0000-1000-8000-00805f9b34fb";
const BATTERY_CHAR_UUID = "0000fff2-0000-1000-8000-00805f9b34fb";
const LOCATION_CHAR_UUID = "0000fff3-0000-1000-8000-00805f9b34fb";
const FIRMWARE_CHAR_UUID = "0000fff4-0000-1000-8000-00805f9b34fb";
const FIND_CHAR_UUID = "0000fff5-0000-1000-8000-00805f9b34fb";

export interface ScannedDevice {
  deviceId: string;
  name: string | null;
  rssi: number;
  raw: BleDevice;
}

export interface TrackerData {
  trackerId: string;
  batteryLevel: number | null;
  firmwareVersion: string | null;
}

export interface LocationUpdate {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

let initialized = false;
let isNative = false;

// Track per-device disconnect listeners so callers can react to BLE drops.
const disconnectListeners = new Map<string, Set<() => void>>();

function checkNative(): boolean {
  try {
    return !!(window as any).Capacitor?.isNativePlatform?.();
  } catch {
    return false;
  }
}

export function isNativePlatform(): boolean {
  return checkNative();
}

/**
 * Initialise the BLE stack. On Android this is also where the runtime
 * BLUETOOTH_SCAN / BLUETOOTH_CONNECT permission prompts surface (handled
 * automatically by the plugin on first use).
 */
export async function initBLE(): Promise<boolean> {
  isNative = checkNative();

  if (!isNative) {
    if (!initialized) console.log("[BLE] Web mode — using mock devices");
    initialized = true;
    return false;
  }

  if (initialized) return true;

  try {
    await BleClient.initialize({ androidNeverForLocation: false });
    initialized = true;
    return true;
  } catch (err) {
    console.error("[BLE] Initialization failed:", err);
    return false;
  }
}

/**
 * Make sure the Bluetooth adapter is powered on. On Android we can prompt the
 * system toggle directly; on iOS the OS shows its own modal automatically when
 * a scan is attempted with BT off, so we just surface a clear error.
 */
export async function ensureBluetoothReady(): Promise<{ ok: boolean; reason?: string }> {
  if (!isNative) return { ok: true };

  try {
    const enabled = await BleClient.isEnabled();
    if (enabled) return { ok: true };

    // Android: try to ask the user to enable BT
    try {
      await BleClient.requestEnable();
      const recheck = await BleClient.isEnabled();
      if (recheck) return { ok: true };
      return { ok: false, reason: "Bluetooth is turned off." };
    } catch {
      return {
        ok: false,
        reason: "Please turn on Bluetooth in your device settings.",
      };
    }
  } catch (err) {
    console.error("[BLE] Bluetooth state check failed:", err);
    return { ok: false, reason: "Could not check Bluetooth state." };
  }
}

/**
 * Scan for nearby PetKeep trackers. Resolves once the scan window ends so
 * callers can `await` the full sweep.
 */
export async function scanForTrackers(
  onFound: (device: ScannedDevice) => void,
  durationMs = 10000
): Promise<void> {
  if (!isNative) {
    simulateScan(onFound);
    await new Promise((r) => setTimeout(r, 3500));
    return;
  }

  const ready = await ensureBluetoothReady();
  if (!ready.ok) throw new Error(ready.reason || "Bluetooth unavailable");

  await BleClient.requestLEScan(
    {
      services: [TRACKER_SERVICE_UUID],
      allowDuplicates: false,
    },
    (result: ScanResult) => {
      onFound({
        deviceId: result.device.deviceId,
        name: result.device.name ?? result.localName ?? null,
        rssi: result.rssi ?? -100,
        raw: result.device,
      });
    }
  );

  await new Promise<void>((resolve) => setTimeout(resolve, durationMs));
  try {
    await BleClient.stopLEScan();
  } catch {
    /* already stopped */
  }
}

export async function stopScan(): Promise<void> {
  if (!isNative) return;
  try {
    await BleClient.stopLEScan();
  } catch {}
}

/**
 * Subscribe to disconnect events for a specific device. Returns an unsubscribe
 * function. Useful for triggering UI reconnect logic without polling.
 */
export function onDeviceDisconnected(deviceId: string, cb: () => void): () => void {
  let set = disconnectListeners.get(deviceId);
  if (!set) {
    set = new Set();
    disconnectListeners.set(deviceId, set);
  }
  set.add(cb);
  return () => {
    set?.delete(cb);
  };
}

export async function connectToDevice(deviceId: string): Promise<boolean> {
  if (!isNative) return true;
  try {
    await BleClient.connect(deviceId, () => {
      // Notify all subscribers that the device disconnected.
      const set = disconnectListeners.get(deviceId);
      set?.forEach((cb) => {
        try {
          cb();
        } catch (e) {
          console.warn("[BLE] disconnect listener error", e);
        }
      });
    });
    return true;
  } catch (err) {
    console.error("[BLE] Connection failed:", err);
    return false;
  }
}

export async function disconnectDevice(deviceId: string): Promise<void> {
  if (!isNative) return;
  try {
    await BleClient.disconnect(deviceId);
  } catch {}
}

export async function readTrackerData(deviceId: string): Promise<TrackerData> {
  if (!isNative) {
    return {
      trackerId: `PK-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random()
        .toString(36)
        .substring(2, 6)
        .toUpperCase()}`,
      batteryLevel: Math.floor(Math.random() * 40 + 60),
      firmwareVersion: "1.2.3",
    };
  }

  // Tracker id is mandatory; battery + firmware are best-effort.
  const idResult = await BleClient.read(deviceId, TRACKER_SERVICE_UUID, TRACKER_ID_CHAR_UUID);
  const trackerId = new TextDecoder().decode(idResult).trim();

  let batteryLevel: number | null = null;
  try {
    const battResult = await BleClient.read(deviceId, TRACKER_SERVICE_UUID, BATTERY_CHAR_UUID);
    batteryLevel = new DataView(battResult.buffer).getUint8(0);
  } catch {}

  let firmwareVersion: string | null = null;
  try {
    const fwResult = await BleClient.read(deviceId, TRACKER_SERVICE_UUID, FIRMWARE_CHAR_UUID);
    firmwareVersion = new TextDecoder().decode(fwResult).trim();
  } catch {}

  return { trackerId, batteryLevel, firmwareVersion };
}

export async function startLocationNotifications(
  deviceId: string,
  onUpdate: (loc: LocationUpdate) => void
): Promise<void> {
  if (!isNative) return;

  await BleClient.startNotifications(
    deviceId,
    TRACKER_SERVICE_UUID,
    LOCATION_CHAR_UUID,
    (value: DataView) => {
      try {
        const latitude = value.getFloat32(0, true);
        const longitude = value.getFloat32(4, true);
        const accuracy = value.getFloat32(8, true);
        onUpdate({ latitude, longitude, accuracy, timestamp: Date.now() });
      } catch (err) {
        console.error("[BLE] Failed to parse location data:", err);
      }
    }
  );
}

export async function stopLocationNotifications(deviceId: string): Promise<void> {
  if (!isNative) return;
  try {
    await BleClient.stopNotifications(deviceId, TRACKER_SERVICE_UUID, LOCATION_CHAR_UUID);
  } catch {}
}

export async function triggerFindTracker(deviceId: string): Promise<boolean> {
  if (!isNative) return true;
  try {
    const buffer = new ArrayBuffer(1);
    new Uint8Array(buffer)[0] = 0x01;
    await BleClient.write(deviceId, TRACKER_SERVICE_UUID, FIND_CHAR_UUID, new DataView(buffer));
    return true;
  } catch {
    return false;
  }
}

export function getRSSILabel(rssi: number): { label: string; color: string } {
  if (rssi >= -50) return { label: "Excellent", color: "text-green-500" };
  if (rssi >= -70) return { label: "Good", color: "text-green-400" };
  if (rssi >= -85) return { label: "Fair", color: "text-yellow-500" };
  return { label: "Weak", color: "text-red-500" };
}

export function getRSSIBars(rssi: number): number {
  if (rssi >= -50) return 4;
  if (rssi >= -65) return 3;
  if (rssi >= -80) return 2;
  return 1;
}

// ─── Web simulation for preview/demo ──────────────────────
function simulateScan(onFound: (device: ScannedDevice) => void) {
  const mockDevices: Omit<ScannedDevice, "raw">[] = [
    { deviceId: "mock-001", name: "PetKeep Tracker A1", rssi: -45 },
    { deviceId: "mock-002", name: "PetKeep Tracker B2", rssi: -67 },
    { deviceId: "mock-003", name: "PetKeep Tracker C3", rssi: -82 },
  ];

  mockDevices.forEach((d, i) => {
    setTimeout(() => {
      onFound({ ...d, raw: { deviceId: d.deviceId } as BleDevice });
    }, 800 + i * 1200);
  });
}
