import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const fromTable = (table: string) => (supabase as any).from(table);

export interface Coupon {
  id: string;
  business_id: string;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_order_amount: number;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export function useCoupons(businessId: string | null) {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!businessId) { setCoupons([]); setLoading(false); return; }
    const { data } = await fromTable("coupons")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });
    setCoupons((data || []) as Coupon[]);
    setLoading(false);
  }, [businessId]);

  useEffect(() => { refresh(); }, [refresh]);

  const addCoupon = async (fields: {
    code: string; discount_type: string; discount_value: number;
    min_order_amount?: number; max_uses?: number | null; expires_at?: string | null;
  }) => {
    if (!businessId) return;
    const { error } = await fromTable("coupons").insert({ business_id: businessId, ...fields });
    if (error) throw error;
    await refresh();
  };

  const updateCoupon = async (id: string, updates: Partial<Coupon>) => {
    const { error } = await fromTable("coupons").update(updates).eq("id", id);
    if (error) throw error;
    await refresh();
  };

  const deleteCoupon = async (id: string) => {
    const { error } = await fromTable("coupons").delete().eq("id", id);
    if (error) throw error;
    await refresh();
  };

  return { coupons, loading, addCoupon, updateCoupon, deleteCoupon, refresh };
}

export function useApplyCoupon() {
  const [applying, setApplying] = useState(false);

  const applyCoupon = async (code: string, storeId: string, orderTotal: number) => {
    setApplying(true);
    try {
      const { data, error } = await fromTable("coupons")
        .select("*")
        .eq("business_id", storeId)
        .eq("code", code.toUpperCase().trim())
        .eq("is_active", true)
        .maybeSingle();

      if (error || !data) throw new Error("Invalid coupon code");

      const coupon = data as Coupon;

      if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) throw new Error("Coupon has expired");
      if (coupon.max_uses && coupon.used_count >= coupon.max_uses) throw new Error("Coupon usage limit reached");
      if (orderTotal < coupon.min_order_amount) throw new Error(`Minimum order of ${coupon.min_order_amount} MKD required`);

      const discount = coupon.discount_type === "percentage"
        ? Math.round(orderTotal * (coupon.discount_value / 100) * 100) / 100
        : Math.min(coupon.discount_value, orderTotal);

      return { coupon, discount };
    } finally {
      setApplying(false);
    }
  };

  const incrementUsage = async (couponId: string, currentCount: number) => {
    await fromTable("coupons").update({ used_count: currentCount + 1 }).eq("id", couponId);
  };

  return { applyCoupon, incrementUsage, applying };
}
