import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const fromTable = (table: string) => (supabase as any).from(table);

export interface Boost {
  id: string;
  type: "product" | "store" | "provider";
  target_id: string;
  owner_id: string;
  start_date: string;
  end_date: string;
  price_paid: number;
  status: string;
  created_at: string;
}

export interface BoostPricing {
  id: string;
  boost_type: string;
  duration_hours: number;
  duration_label: string;
  price: number;
}

// Check if a target is currently boosted
export function useIsBoosted(type: "product" | "store" | "provider", targetId: string | null) {
  const [isBoosted, setIsBoosted] = useState(false);

  useEffect(() => {
    if (!targetId) return;
    fromTable("boosts")
      .select("id")
      .eq("type", type)
      .eq("target_id", targetId)
      .eq("status", "active")
      .gte("end_date", new Date().toISOString())
      .limit(1)
      .then(({ data }: any) => setIsBoosted((data || []).length > 0));
  }, [type, targetId]);

  return isBoosted;
}

// Get all active boosts of a type
export function useActiveBoosts(type?: "product" | "store" | "provider") {
  const [boosts, setBoosts] = useState<Boost[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    let q = fromTable("boosts")
      .select("*")
      .eq("status", "active")
      .gte("end_date", new Date().toISOString())
      .order("created_at", { ascending: false });
    if (type) q = q.eq("type", type);
    const { data } = await q;
    setBoosts(data || []);
    setLoading(false);
  }, [type]);

  useEffect(() => { refresh(); }, [refresh]);

  return { boosts, loading, refresh };
}

// Get all boosts (admin view)
export function useAllBoosts() {
  const [boosts, setBoosts] = useState<Boost[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await fromTable("boosts")
      .select("*")
      .order("created_at", { ascending: false });
    setBoosts(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const cancelBoost = async (boostId: string) => {
    await fromTable("boosts").update({ status: "cancelled" }).eq("id", boostId);
    refresh();
  };

  const extendBoost = async (boostId: string, additionalHours: number) => {
    const boost = boosts.find((b) => b.id === boostId);
    if (!boost) return;
    const currentEnd = new Date(boost.end_date);
    const newEnd = new Date(currentEnd.getTime() + additionalHours * 3600000);
    await fromTable("boosts").update({ end_date: newEnd.toISOString(), status: "active" }).eq("id", boostId);
    refresh();
  };

  return { boosts, loading, refresh, cancelBoost, extendBoost };
}

// Get boost pricing — live-syncs across the app via realtime
export function useBoostPricing(boostType?: string) {
  const [pricing, setPricing] = useState<BoostPricing[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    let q = fromTable("boost_pricing").select("*").order("duration_hours", { ascending: true });
    if (boostType) q = q.eq("boost_type", boostType);
    const { data } = await q;
    setPricing(data || []);
    setLoading(false);
  }, [boostType]);

  useEffect(() => { refresh(); }, [refresh]);

  // Subscribe to live pricing changes so admin edits propagate everywhere instantly
  useEffect(() => {
    const channel = supabase
      .channel(`boost-pricing-${boostType || "all"}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "boost_pricing" },
        (payload: any) => {
          const row = (payload.new || payload.old) as BoostPricing | undefined;
          if (!row) return;
          if (boostType && row.boost_type !== boostType) return;
          setPricing((prev) => {
            if (payload.eventType === "DELETE") {
              return prev.filter((p) => p.id !== row.id);
            }
            const next = payload.new as BoostPricing;
            const idx = prev.findIndex((p) => p.id === next.id);
            if (idx === -1) {
              return [...prev, next].sort((a, b) => a.duration_hours - b.duration_hours);
            }
            const copy = [...prev];
            copy[idx] = next;
            return copy;
          });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [boostType]);

  const updatePrice = async (id: string, price: number) => {
    // Optimistic update for the admin actor
    setPricing((prev) => prev.map((p) => (p.id === id ? { ...p, price } : p)));
    const { error } = await fromTable("boost_pricing")
      .update({ price, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      // Revert on failure
      refresh();
      throw error;
    }
  };

  return { pricing, loading, refresh, updatePrice };
}

// Create a boost
export function useCreateBoost() {
  const { user } = useAuth();

  const createBoost = async (
    type: "product" | "store" | "provider",
    targetId: string,
    durationHours: number,
    pricePaid: number
  ) => {
    if (!user) throw new Error("Must be logged in");
    const endDate = new Date(Date.now() + durationHours * 3600000);
    const { error } = await fromTable("boosts").insert({
      type,
      target_id: targetId,
      owner_id: user.id,
      end_date: endDate.toISOString(),
      price_paid: pricePaid,
      status: "active",
    });
    if (error) throw error;
  };

  return { createBoost };
}

// Get boosted target IDs for quick lookup
export function useBoostedIds(type: "product" | "store" | "provider") {
  const [ids, setIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fromTable("boosts")
      .select("target_id")
      .eq("type", type)
      .eq("status", "active")
      .gte("end_date", new Date().toISOString())
      .then(({ data }: any) => {
        setIds(new Set((data || []).map((d: any) => d.target_id)));
      });
  }, [type]);

  return ids;
}
