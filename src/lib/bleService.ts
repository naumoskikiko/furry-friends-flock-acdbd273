import { BleClient, BleDevice, ScanResult } from "@capacitor-community/bluetooth-le";

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

// Check if running on native Capacitor
function checkNative(): boolean {
  try {
    return !!(window as any).Capacitor?.isNativePlatform?.();
  } catch {
    return false;
  }
}

export async function initBLE(): Promise<boolean> {
  if (initialized) return true;
  isNative = checkNative();

  if (!isNative) {
    console.log("[BLE] Running in web mode — BLE features require a native device");
    initialized = true;
    return false;
  }

  try {
    await BleClient.initialize({ androidNeverForLocation: false });
    initialized = true;
    return true;
  } catch (err) {
    console.error("[BLE] Initialization failed:", err);
    return false;
  }
}

export function isNativePlatform(): boolean {
  return checkNative();
}

export async function requestPermissions(): Promise<boolean> {
  if (!isNative) return false;
  try {
    await BleClient.initialize({ androidNeverForLocation: false });
    return true;
  } catch {
    return false;
  }
}

export async function scanForTrackers(
  onFound: (device: ScannedDevice) => void,
  durationMs = 10000
): Promise<void> {
  if (!isNative) {
    // Web simulation for preview/demo
    simulateScan(onFound);
    return;
  }

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

  setTimeout(async () => {
    try {
      await BleClient.stopLEScan();
    } catch {}
  }, durationMs);
}

export async function stopScan(): Promise<void> {
  if (!isNative) return;
  try {
    await BleClient.stopLEScan();
  } catch {}
}

export async function connectToDevice(deviceId: string): Promise<boolean> {
  if (!isNative) return true; // Web mock
  try {
    await BleClient.connect(deviceId, () => {
      console.log("[BLE] Device disconnected:", deviceId);
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
    // Web mock
    return {
      trackerId: `PK-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      batteryLevel: Math.floor(Math.random() * 40 + 60),
      firmwareVersion: "1.2.3",
    };
  }

  // Read tracker ID
  const idResult = await BleClient.read(deviceId, TRACKER_SERVICE_UUID, TRACKER_ID_CHAR_UUID);
  const trackerId = new TextDecoder().decode(idResult);

  // Read battery
  let batteryLevel: number | null = null;
  try {
    const battResult = await BleClient.read(deviceId, TRACKER_SERVICE_UUID, BATTERY_CHAR_UUID);
    batteryLevel = new DataView(battResult.buffer).getUint8(0);
  } catch {}

  // Read firmware
  let firmwareVersion: string | null = null;
  try {
    const fwResult = await BleClient.read(deviceId, TRACKER_SERVICE_UUID, FIRMWARE_CHAR_UUID);
    firmwareVersion = new TextDecoder().decode(fwResult);
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
    (value) => {
      try {
        const view = new DataView(value.buffer);
        const latitude = view.getFloat32(0, true);
        const longitude = view.getFloat32(4, true);
        const accuracy = view.getFloat32(8, true);
        onUpdate({
          latitude,
          longitude,
          accuracy,
          timestamp: Date.now(),
        });
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
    const data = new Uint8Array([0x01]);
    await BleClient.write(deviceId, TRACKER_SERVICE_UUID, FIND_CHAR_UUID, data);
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

// ─── Web simulation for demo purposes ──────────────────────
function simulateScan(onFound: (device: ScannedDevice) => void) {
  const mockDevices: Omit<ScannedDevice, "raw">[] = [
    { deviceId: "mock-001", name: "PetKeep Tracker A1", rssi: -45 },
    { deviceId: "mock-002", name: "PetKeep Tracker B2", rssi: -67 },
    { deviceId: "mock-003", name: "PetKeep Tracker C3", rssi: -82 },
  ];

  mockDevices.forEach((d, i) => {
    setTimeout(() => {
      onFound({
        ...d,
        raw: { deviceId: d.deviceId } as BleDevice,
      });
    }, 800 + i * 1200);
  });
}
