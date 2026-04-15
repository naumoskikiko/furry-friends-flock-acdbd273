import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  CREDIT_REWARDS,
  CREDIT_LIMITS,
  CREDIT_SPENDING,
  CREDIT_COOLDOWNS,
  type CreditAction,
  type CreditSpendAction,
} from "@/lib/creditsConfig";

const fromTable = (table: string) => (supabase as any).from(table);

function startOfDay() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function startOfMonth() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export function useCredits() {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [dailyEarned, setDailyEarned] = useState(0);
  const [monthlyEarned, setMonthlyEarned] = useState(0);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);

  // Cooldown tracker: action -> last timestamp (ms)
  const cooldownRef = useRef<Record<string, number>>({});

  const fetchBalance = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("credits")
      .select("balance")
      .eq("user_id", user.id)
      .maybeSingle();
    setBalance(data?.balance ?? 0);
    setLoading(false);
  }, [user]);

  const fetchLimits = useCallback(async () => {
    if (!user) return;

    const [{ data: dailyData }, { data: monthlyData }] = await Promise.all([
      fromTable("credit_daily_log")
        .select("credits_earned")
        .eq("user_id", user.id)
        .gte("created_at", startOfDay()),
      fromTable("credit_daily_log")
        .select("credits_earned")
        .eq("user_id", user.id)
        .gte("created_at", startOfMonth()),
    ]);

    const daily = (dailyData || []).reduce(
      (sum: number, r: any) => sum + Number(r.credits_earned),
      0
    );
    const monthly = (monthlyData || []).reduce(
      (sum: number, r: any) => sum + Number(r.credits_earned),
      0
    );
    setDailyEarned(daily);
    setMonthlyEarned(monthly);
  }, [user]);

  const fetchTransactions = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("credit_transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setTransactions(data || []);
  }, [user]);

  useEffect(() => {
    fetchBalance();
    fetchLimits();
    fetchTransactions();
  }, [fetchBalance, fetchLimits, fetchTransactions]);

  const earnCredits = useCallback(
    async (action: CreditAction, sourceId?: string): Promise<boolean> => {
      if (!user) return false;

      const amount = CREDIT_REWARDS[action];

      // Daily & monthly limit checks
      if (dailyEarned + amount > CREDIT_LIMITS.daily_max) return false;
      if (monthlyEarned + amount > CREDIT_LIMITS.monthly_max) return false;

      // Cooldown check (client-side anti-spam)
      const cooldown = CREDIT_COOLDOWNS[action];
      if (cooldown > 0) {
        const lastTime = cooldownRef.current[action] || 0;
        if (Date.now() - lastTime < cooldown * 1000) return false;
      }

      // Prevent double-reward for same source
      if (sourceId) {
        const { data: existing } = await fromTable("credit_daily_log")
          .select("id")
          .eq("user_id", user.id)
          .eq("action_type", action)
          .eq("source_id", sourceId)
          .limit(1);
        if (existing && existing.length > 0) return false;
      }

      // Record the earning
      await fromTable("credit_daily_log").insert({
        user_id: user.id,
        action_type: action,
        credits_earned: amount,
        source_id: sourceId || null,
      });

      await supabase
        .from("credits")
        .update({
          balance: balance + amount,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      await supabase.from("credit_transactions").insert({
        user_id: user.id,
        amount,
        type: "earn",
        description: `Earned from ${action.replace(/_/g, " ")}`,
      });

      // Update cooldown
      cooldownRef.current[action] = Date.now();

      setBalance((b) => b + amount);
      setDailyEarned((d) => d + amount);
      setMonthlyEarned((m) => m + amount);

      return true;
    },
    [user, balance, dailyEarned, monthlyEarned]
  );

  const spendCredits = useCallback(
    async (action: CreditSpendAction): Promise<boolean> => {
      if (!user) return false;
      const cost = CREDIT_SPENDING[action];
      if (balance < cost) return false;

      await supabase
        .from("credits")
        .update({
          balance: balance - cost,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      await supabase.from("credit_transactions").insert({
        user_id: user.id,
        amount: -cost,
        type: "spend",
        description: `Spent on ${action.replace(/_/g, " ")}`,
      });

      setBalance((b) => b - cost);
      return true;
    },
    [user, balance]
  );

  const applyCreditsToPayment = useCallback(
    async (maxAmount: number): Promise<number> => {
      if (!user || balance <= 0) return 0;
      const creditsToUse = Math.min(balance, maxAmount);

      await supabase
        .from("credits")
        .update({
          balance: balance - creditsToUse,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      await supabase.from("credit_transactions").insert({
        user_id: user.id,
        amount: -creditsToUse,
        type: "spend",
        description: `Used as payment discount`,
      });

      setBalance((b) => b - creditsToUse);
      return creditsToUse;
    },
    [user, balance]
  );

  return {
    balance,
    dailyEarned,
    monthlyEarned,
    loading,
    transactions,
    earnCredits,
    spendCredits,
    applyCreditsToPayment,
    dailyLimit: CREDIT_LIMITS.daily_max,
    monthlyLimit: CREDIT_LIMITS.monthly_max,
    refresh: () => {
      fetchBalance();
      fetchLimits();
      fetchTransactions();
    },
  };
}
