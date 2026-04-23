import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface PetTracker {
  id: string;
  user_id: string;
  pet_name: string;
  pet_type: string;
  breed: string;
  tracker_device_id: string;
  pet_photo: string | null;
  created_at: string;
}

export interface TrackerSubscription {
  id: string;
  tracker_id: string;
  user_id: string;
  plan: "monthly" | "yearly";
  price: number;
  start_date: string;
  end_date: string;
  status: "active" | "expired" | "cancelled";
}

export interface TrackerLocation {
  id: string;
  tracker_id: string;
  latitude: number;
  longitude: number;
  battery_level: number;
  created_at: string;
}

export interface SafeZone {
  id: string;
  tracker_id: string;
  name: string;
  center_lat: number;
  center_lng: number;
  radius: number;
  is_active: boolean;
  created_at: string;
}

// ─── User has ANY active tracker subscription (gate for page access) ──
export function useSubscription() {
  const { user } = useAuth();
  const [hasSubscription, setHasSubscription] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const check = async () => {
      const { data } = await supabase
        .from("tracker_subscriptions")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .gte("end_date", new Date().toISOString())
        .limit(1);
      setHasSubscription((data || []).length > 0);
      setLoading(false);
    };
    check();
  }, [user]);

  // Legacy activate just marks user as having accessed FindMyPet
  const activate = async () => {
    setHasSubscription(true);
  };

  return { hasSubscription, loading, activate };
}

// ─── Per-Tracker Subscriptions ──────────────────────────────
export function useTrackerSubscriptions() {
  const { user } = useAuth();
  const [subs, setSubs] = useState<TrackerSubscription[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSubs = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("tracker_subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setSubs((data as TrackerSubscription[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchSubs(); }, [fetchSubs]);

  const getTrackerSub = useCallback((trackerId: string): TrackerSubscription | null => {
    const now = new Date().toISOString();
    return subs.find(s => s.tracker_id === trackerId && s.status === "active" && s.end_date > now) || null;
  }, [subs]);

  const isTrackerActive = useCallback((trackerId: string): boolean => {
    return getTrackerSub(trackerId) !== null;
  }, [getTrackerSub]);

  const activateTracker = async (trackerId: string, plan: "monthly" | "yearly") => {
    if (!user) return;
    const now = new Date();
    const endDate = new Date(now);
    if (plan === "monthly") {
      endDate.setDate(endDate.getDate() + 30);
    } else {
      endDate.setDate(endDate.getDate() + 365);
    }
    const price = plan === "monthly" ? 5 : 50;

    const { error } = await supabase.from("tracker_subscriptions").insert({
      tracker_id: trackerId,
      user_id: user.id,
      plan,
      price,
      start_date: now.toISOString(),
      end_date: endDate.toISOString(),
      status: "active",
    });
    if (error) throw error;
    await fetchSubs();
  };

  const renewTracker = async (trackerId: string, plan: "monthly" | "yearly") => {
    if (!user) return;
    // Expire old subs for this tracker
    await supabase
      .from("tracker_subscriptions")
      .update({ status: "expired" })
      .eq("tracker_id", trackerId)
      .eq("user_id", user.id);

    await activateTracker(trackerId, plan);
  };

  return { subs, loading, getTrackerSub, isTrackerActive, activateTracker, renewTracker, refetch: fetchSubs };
}

// ─── Trackers ───────────────────────────────────────────────
export function useTrackers() {
  const { user } = useAuth();
  const [trackers, setTrackers] = useState<PetTracker[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrackers = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("pet_trackers")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setTrackers((data as PetTracker[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchTrackers(); }, [fetchTrackers]);

  const addTracker = async (tracker: {
    pet_name: string;
    pet_type: string;
    breed: string;
    tracker_device_id: string;
    pet_photo?: string;
  }) => {
    if (!user) return;
    const { data, error } = await supabase.from("pet_trackers").insert({
      ...tracker,
      user_id: user.id,
    }).select().single();
    if (error) throw error;
    await fetchTrackers();
    return data as PetTracker;
  };

  return { trackers, loading, addTracker, refetch: fetchTrackers };
}

// ─── Tracker Location (realtime) ────────────────────────────
export function useTrackerLocation(trackerId: string | null) {
  const [location, setLocation] = useState<TrackerLocation | null>(null);

  useEffect(() => {
    if (!trackerId) return;

    const fetchLatest = async () => {
      const { data } = await supabase
        .from("tracker_locations")
        .select("*")
        .eq("tracker_id", trackerId)
        .order("created_at", { ascending: false })
        .limit(1);
      if (data && data.length > 0) setLocation(data[0] as TrackerLocation);
    };

    fetchLatest();

    const channel = supabase
      .channel(`tracker-${trackerId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "tracker_locations",
        filter: `tracker_id=eq.${trackerId}`,
      }, (payload) => {
        setLocation(payload.new as TrackerLocation);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [trackerId]);

  return location;
}

// ─── Tracking History ───────────────────────────────────────
export function useTrackingHistory(trackerId: string | null, hours: number = 24) {
  const [history, setHistory] = useState<TrackerLocation[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!trackerId) return;
    setLoading(true);
    const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
    const { data } = await supabase
      .from("tracker_locations")
      .select("*")
      .eq("tracker_id", trackerId)
      .gte("created_at", since)
      .order("created_at", { ascending: true })
      .limit(1000);
    setHistory((data as TrackerLocation[]) || []);
    setLoading(false);
  }, [trackerId, hours]);

  useEffect(() => { fetch(); }, [fetch]);

  return { history, loading, refetch: fetch };
}

// ─── Safe Zones ─────────────────────────────────────────────
export function useSafeZones(trackerId: string | null) {
  const [zones, setZones] = useState<SafeZone[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchZones = useCallback(async () => {
    if (!trackerId) return;
    const { data } = await (supabase as any)
      .from("safe_zones")
      .select("*")
      .eq("tracker_id", trackerId)
      .order("created_at", { ascending: false });
    setZones(data || []);
    setLoading(false);
  }, [trackerId]);

  useEffect(() => { fetchZones(); }, [fetchZones]);

  const addZone = async (zone: { name: string; center_lat: number; center_lng: number; radius: number }) => {
    if (!trackerId) return;
    await (supabase as any).from("safe_zones").insert({ ...zone, tracker_id: trackerId });
    await fetchZones();
  };

  const removeZone = async (zoneId: string) => {
    await (supabase as any).from("safe_zones").delete().eq("id", zoneId);
    await fetchZones();
  };

  const toggleZone = async (zoneId: string, isActive: boolean) => {
    await (supabase as any).from("safe_zones").update({ is_active: isActive }).eq("id", zoneId);
    await fetchZones();
  };

  return { zones, loading, addZone, removeZone, toggleZone };
}

// ─── Safe Zone Alert Check ──────────────────────────────────
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function useSafeZoneAlerts(location: TrackerLocation | null, zones: SafeZone[], petName: string) {
  const [outsideZones, setOutsideZones] = useState<SafeZone[]>([]);
  const [alerted, setAlerted] = useState<Set<string>>(new Set());
  const [returnAlerted, setReturnAlerted] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!location || zones.length === 0) { setOutsideZones([]); return; }
    const activeZones = zones.filter((z) => z.is_active);
    const outside: SafeZone[] = [];

    for (const z of activeZones) {
      const dist = haversineDistance(location.latitude, location.longitude, z.center_lat, z.center_lng);
      if (dist > z.radius) {
        outside.push(z);
        if (!alerted.has(z.id)) {
          toast.warning(`⚠️ ${petName} has left the safe zone "${z.name}"`);
          setAlerted((prev) => new Set(prev).add(z.id));
          setReturnAlerted((prev) => { const n = new Set(prev); n.delete(z.id); return n; });
        }
      } else {
        // Pet is inside - check if they returned
        if (alerted.has(z.id) && !returnAlerted.has(z.id)) {
          toast.success(`✅ ${petName} is back in the safe zone "${z.name}"`);
          setReturnAlerted((prev) => new Set(prev).add(z.id));
          setAlerted((prev) => { const n = new Set(prev); n.delete(z.id); return n; });
        }
      }
    }

    setOutsideZones(outside);
  }, [location, zones, petName, alerted, returnAlerted]);

  return outsideZones;
}

// ─── Battery Alert ──────────────────────────────────────────
export function useBatteryAlert(location: TrackerLocation | null, petName: string) {
  const [lowAlerted, setLowAlerted] = useState(false);

  useEffect(() => {
    if (!location) return;
    const level = location.battery_level;
    if (level <= 20 && !lowAlerted) {
      toast.warning(`🔋 ${petName}'s tracker battery is low (${level}%)`);
      setLowAlerted(true);
    }
    if (level > 30) setLowAlerted(false);
  }, [location, petName, lowAlerted]);

  return location?.battery_level ?? null;
}

// GPS simulator removed — locations come exclusively from real BLE trackers
// to avoid polluting the tracker_locations table with fake data.

// ─── Battery Color Helper ───────────────────────────────────
export function getBatteryColor(level: number | null): string {
  if (level === null) return "text-muted-foreground";
  if (level >= 60) return "text-green-500";
  if (level >= 30) return "text-yellow-500";
  return "text-red-500";
}

export function getBatteryBg(level: number | null): string {
  if (level === null) return "bg-muted";
  if (level >= 60) return "bg-green-500/15";
  if (level >= 30) return "bg-yellow-500/15";
  return "bg-red-500/15";
}
