import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const fromTable = (table: string) => (supabase as any).from(table);

export interface CarePayment {
  id: string;
  booking_id: string;
  user_id: string;
  provider_id: string;
  total_amount: number;
  platform_fee: number;
  provider_earnings: number;
  status: string;
  payment_method: string;
  created_at: string;
}

export interface ProviderBalance {
  id: string;
  provider_id: string;
  available_balance: number;
  pending_balance: number;
  total_earned: number;
  total_platform_fees: number;
  updated_at: string;
}

export interface CarePayout {
  id: string;
  provider_id: string;
  amount: number;
  status: string;
  requested_at: string;
  processed_at: string | null;
}

const PLATFORM_FEE_RATE = 0.10;

export function calculateFees(totalAmount: number) {
  const platformFee = Math.round(totalAmount * PLATFORM_FEE_RATE * 100) / 100;
  const providerEarnings = totalAmount - platformFee;
  return { totalAmount, platformFee, providerEarnings };
}

// Process a simulated payment for a booking
export function useProcessPayment() {
  const { user } = useAuth();

  const processPayment = useCallback(async (bookingId: string, providerId: string, totalAmount: number) => {
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase.rpc("process_care_payment", {
      _booking_id: bookingId,
      _user_id: user.id,
      _provider_id: providerId,
      _total_amount: totalAmount,
    });

    if (error) throw error;
    return data as string; // payment id
  }, [user]);

  return { processPayment };
}

// Get payments for current user (as buyer)
export function useMyPayments() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<CarePayment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPayments = useCallback(async () => {
    if (!user) return;
    const { data } = await fromTable("care_payments")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setPayments((data || []) as CarePayment[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  return { payments, loading, refresh: fetchPayments };
}

// Get provider balance
export function useProviderBalance(providerId: string | null) {
  const [balance, setBalance] = useState<ProviderBalance | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBalance = useCallback(async () => {
    if (!providerId) { setLoading(false); return; }
    const { data } = await fromTable("provider_balances")
      .select("*")
      .eq("provider_id", providerId)
      .maybeSingle();
    setBalance(data as ProviderBalance | null);
    setLoading(false);
  }, [providerId]);

  useEffect(() => { fetchBalance(); }, [fetchBalance]);

  return { balance, loading, refresh: fetchBalance };
}

// Get provider payments
export function useProviderPayments(providerId: string | null) {
  const [payments, setPayments] = useState<CarePayment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPayments = useCallback(async () => {
    if (!providerId) { setLoading(false); return; }
    const { data } = await fromTable("care_payments")
      .select("*")
      .eq("provider_id", providerId)
      .order("created_at", { ascending: false });
    setPayments((data || []) as CarePayment[]);
    setLoading(false);
  }, [providerId]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  return { payments, loading, refresh: fetchPayments };
}

// Get provider payouts
export function useProviderPayouts(providerId: string | null) {
  const [payouts, setPayouts] = useState<CarePayout[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPayouts = useCallback(async () => {
    if (!providerId) { setLoading(false); return; }
    const { data } = await fromTable("care_payouts")
      .select("*")
      .eq("provider_id", providerId)
      .order("requested_at", { ascending: false });
    setPayouts((data || []) as CarePayout[]);
    setLoading(false);
  }, [providerId]);

  useEffect(() => { fetchPayouts(); }, [fetchPayouts]);

  const requestPayout = useCallback(async (amount: number) => {
    if (!providerId) return;
    
    // Create payout request
    await fromTable("care_payouts").insert({
      provider_id: providerId,
      amount,
      status: "pending",
    });

    // Move from available to pending balance
    const { data: currentBalance } = await fromTable("provider_balances")
      .select("available_balance, pending_balance")
      .eq("provider_id", providerId)
      .single();

    if (currentBalance) {
      await fromTable("provider_balances")
        .update({
          available_balance: currentBalance.available_balance - amount,
          pending_balance: currentBalance.pending_balance + amount,
          updated_at: new Date().toISOString(),
        })
        .eq("provider_id", providerId);
    }

    fetchPayouts();
  }, [providerId, fetchPayouts]);

  return { payouts, loading, refresh: fetchPayouts, requestPayout };
}
