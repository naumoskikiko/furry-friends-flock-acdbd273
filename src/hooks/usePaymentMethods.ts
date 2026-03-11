import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const fromTable = (table: string) => (supabase as any).from(table);

const cardSchema = z.object({
  cardNumber: z.string().trim().regex(/^\d{13,19}$/, "Enter a valid card number"),
  expiry: z.string().trim().regex(/^(0[1-9]|1[0-2])\/(\d{2})$/, "Use MM/YY format"),
  cvv: z.string().trim().regex(/^\d{3,4}$/, "Enter a valid CVV"),
  cardholderName: z.string().trim().min(2, "Cardholder name is required").max(80),
});

export interface PaymentMethod {
  id: string;
  user_id: string;
  provider: string;
  provider_payment_method_id: string;
  card_brand: string;
  card_last4: string;
  exp_month: number;
  exp_year: number;
  cardholder_name: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface CardInput {
  cardNumber: string;
  expiry: string;
  cvv: string;
  cardholderName: string;
}

const detectCardBrand = (cardNumber: string) => {
  if (/^4/.test(cardNumber)) return "visa";
  if (/^5[1-5]/.test(cardNumber) || /^2(2[2-9]|[3-6]\d|7[01]|720)/.test(cardNumber)) return "mastercard";
  if (/^3[47]/.test(cardNumber)) return "amex";
  return "card";
};

export function usePaymentMethods() {
  const { user } = useAuth();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setMethods([]);
      setLoading(false);
      return;
    }

    const { data } = await fromTable("payment_methods")
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });

    setMethods((data || []) as PaymentMethod[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const saveCard = useCallback(async (input: CardInput) => {
    if (!user) throw new Error("Not authenticated");

    const normalized = {
      cardNumber: input.cardNumber.replace(/\s+/g, ""),
      expiry: input.expiry.trim(),
      cvv: input.cvv.trim(),
      cardholderName: input.cardholderName.trim(),
    };

    const parsed = cardSchema.safeParse(normalized);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || "Invalid card details");
    }

    const [expMonthText, expYearText] = parsed.data.expiry.split("/");
    const expMonth = Number(expMonthText);
    const expYear = 2000 + Number(expYearText);
    const cardLast4 = parsed.data.cardNumber.slice(-4);
    const cardBrand = detectCardBrand(parsed.data.cardNumber);

    await fromTable("payment_methods")
      .update({ is_default: false })
      .eq("user_id", user.id)
      .eq("is_default", true);

    const { data, error } = await fromTable("payment_methods")
      .insert({
        user_id: user.id,
        provider: "card_manual",
        provider_payment_method_id: `pm_${crypto.randomUUID().replace(/-/g, "")}`,
        card_brand: cardBrand,
        card_last4: cardLast4,
        exp_month: expMonth,
        exp_year: expYear,
        cardholder_name: parsed.data.cardholderName,
        is_default: true,
      })
      .select("*")
      .single();

    if (error) throw error;

    await refresh();
    return data as PaymentMethod;
  }, [user, refresh]);

  const setDefault = useCallback(async (paymentMethodId: string) => {
    if (!user) return;

    await fromTable("payment_methods")
      .update({ is_default: false })
      .eq("user_id", user.id)
      .eq("is_default", true);

    await fromTable("payment_methods")
      .update({ is_default: true })
      .eq("id", paymentMethodId)
      .eq("user_id", user.id);

    await refresh();
  }, [user, refresh]);

  const removeMethod = useCallback(async (paymentMethodId: string) => {
    if (!user) return;

    await fromTable("payment_methods")
      .delete()
      .eq("id", paymentMethodId)
      .eq("user_id", user.id);

    await refresh();

    const nextDefault = methods.find((m) => m.id !== paymentMethodId);
    if (nextDefault) {
      await setDefault(nextDefault.id);
    }
  }, [user, refresh, methods, setDefault]);

  const defaultMethod = methods.find((m) => m.is_default) || null;

  return {
    methods,
    defaultMethod,
    loading,
    refresh,
    saveCard,
    setDefault,
    removeMethod,
  };
}
