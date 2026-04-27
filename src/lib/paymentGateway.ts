// Frontend helper for the local payment gateway scaffold.
// See `supabase/functions/process-payment/index.ts` for adapter details.
//
// Until a real bank gateway is wired up, calling this with an unconfigured
// provider returns a `NOT_CONFIGURED` error so the UI can fall back to the
// existing Slide-to-Pay flow.

import { supabase } from "@/integrations/supabase/client";

export type LocalGateway = "cpay" | "halkbank" | "nlb";

export interface ChargeInput {
  gateway: LocalGateway;
  amount: number;
  currency?: "MKD"; // defaults to MKD server-side
  order_id?: string;
  booking_id?: string;
  saved_payment_method_id?: string;
}

export interface ChargeResponse {
  transaction_id: string;
  status: "captured" | "authorized" | "failed" | "pending";
  redirect_url?: string;
  gateway_transaction_id?: string;
  error_code?: string;
  error_message?: string;
}

export async function chargeLocalGateway(input: ChargeInput): Promise<ChargeResponse> {
  const { data, error } = await supabase.functions.invoke<ChargeResponse>(
    "process-payment",
    { body: input }
  );
  if (error) throw error;
  if (!data) throw new Error("Empty response from process-payment");
  return data;
}
