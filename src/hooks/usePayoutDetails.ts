import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const fromTable = (t: string) => (supabase as any).from(t);

export interface PayoutDetail {
  id: string;
  user_id: string;
  full_name: string;
  bank_name: string;
  account_number: string;
  transaction_reference: string;
  created_at: string;
  updated_at: string;
}

export interface PayoutRequest {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  admin_notes: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useMyPayoutDetails() {
  const { user } = useAuth();
  const [details, setDetails] = useState<PayoutDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const { data } = await fromTable("payout_details")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    setDetails(data as PayoutDetail | null);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  const save = useCallback(async (vals: { full_name: string; bank_name: string; account_number: string; transaction_reference: string }) => {
    if (!user) throw new Error("Not authenticated");
    if (details) {
      const { error } = await fromTable("payout_details").update(vals).eq("user_id", user.id);
      if (error) throw error;
    } else {
      const { error } = await fromTable("payout_details").insert({ ...vals, user_id: user.id });
      if (error) throw error;
    }
    await fetch();
  }, [user, details, fetch]);

  return { details, loading, save, refresh: fetch };
}

export function useMyPayoutRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const { data } = await fromTable("payout_requests")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setRequests((data || []) as PayoutRequest[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  const requestPayout = useCallback(async (amount: number) => {
    if (!user) throw new Error("Not authenticated");
    const { error } = await fromTable("payout_requests").insert({ user_id: user.id, amount });
    if (error) throw error;
    await fetch();
  }, [user, fetch]);

  return { requests, loading, requestPayout, refresh: fetch };
}

// Admin hooks
export function useAllPayoutRequests() {
  const [requests, setRequests] = useState<(PayoutRequest & { payout_detail?: PayoutDetail; profile?: any })[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const { data } = await fromTable("payout_requests")
      .select("*")
      .order("created_at", { ascending: false });
    const reqs = (data || []) as PayoutRequest[];

    // Fetch payout details and profiles for each unique user
    const userIds = [...new Set(reqs.map(r => r.user_id))];
    const [detailsRes, profilesRes] = await Promise.all([
      fromTable("payout_details").select("*").in("user_id", userIds),
      fromTable("profiles").select("user_id, full_name, username, role").in("user_id", userIds),
    ]);

    const detailsMap = new Map((detailsRes.data || []).map((d: any) => [d.user_id, d]));
    const profilesMap = new Map((profilesRes.data || []).map((p: any) => [p.user_id, p]));

    const enriched = reqs.map(r => ({
      ...r,
      payout_detail: detailsMap.get(r.user_id) as PayoutDetail | undefined,
      profile: profilesMap.get(r.user_id),
    }));

    setRequests(enriched);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const markAs = useCallback(async (id: string, status: "paid" | "pending") => {
    const update: any = { status };
    if (status === "paid") update.paid_at = new Date().toISOString();
    else update.paid_at = null;
    const { error } = await fromTable("payout_requests").update(update).eq("id", id);
    if (error) throw error;
    await fetch();
  }, [fetch]);

  return { requests, loading, refresh: fetch, markAs };
}
