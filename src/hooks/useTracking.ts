import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface PetTracker {
  id: string;
  user_id: string;
  pet_name: string;
  pet_type: string;
  breed: string;
  tracker_device_id: string;
  pet_photo: string | null;
  is_lost: boolean;
  created_at: string;
}

export interface TrackerLocation {
  id: string;
  tracker_id: string;
  latitude: number;
  longitude: number;
  battery_level: number;
  created_at: string;
}

export function useSubscription() {
  const { user } = useAuth();
  const [hasSubscription, setHasSubscription] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const check = async () => {
      const { data } = await supabase
        .from("pet_subscriptions")
        .select("id, status, expires_at")
        .eq("user_id", user.id)
        .eq("status", "active")
        .gte("expires_at", new Date().toISOString())
        .limit(1);
      setHasSubscription((data || []).length > 0);
      setLoading(false);
    };
    check();
  }, [user]);

  const activate = async () => {
    if (!user) return;
    await supabase.from("pet_subscriptions").insert({
      user_id: user.id,
      plan: "findmypet_premium",
      status: "active",
    });
    setHasSubscription(true);
  };

  return { hasSubscription, loading, activate };
}

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
    const { error } = await supabase.from("pet_trackers").insert({
      ...tracker,
      user_id: user.id,
    });
    if (error) throw error;
    await fetchTrackers();
  };

  const toggleLost = async (trackerId: string, isLost: boolean) => {
    await supabase.from("pet_trackers").update({ is_lost: isLost }).eq("id", trackerId);
    await fetchTrackers();
  };

  return { trackers, loading, addTracker, toggleLost, refetch: fetchTrackers };
}

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

    // Realtime subscription
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

// Simulates GPS movement for demo purposes
export function useGPSSimulator(trackerId: string | null, centerLat: number, centerLng: number) {
  const { user } = useAuth();

  useEffect(() => {
    if (!trackerId || !user) return;

    let lat = centerLat + (Math.random() - 0.5) * 0.005;
    let lng = centerLng + (Math.random() - 0.5) * 0.005;
    let battery = 85 + Math.floor(Math.random() * 15);

    const interval = setInterval(async () => {
      lat += (Math.random() - 0.5) * 0.001;
      lng += (Math.random() - 0.5) * 0.001;
      battery = Math.max(10, battery - Math.floor(Math.random() * 2));

      await supabase.from("tracker_locations").insert({
        tracker_id: trackerId,
        latitude: lat,
        longitude: lng,
        battery_level: battery,
      });
    }, 8000);

    return () => clearInterval(interval);
  }, [trackerId, user, centerLat, centerLng]);
}
