// Local-gateway payment scaffold for North Macedonia (CPAY / Halkbank / NLB).
//
// Hardened for launch:
//   • JWT validated via getClaims (no extra round-trip)
//   • Strict Zod input validation
//   • Per-user rate limit (10 attempts / 5 min) using `edge_rate_limits`
//   • All audit rows written before calling external gateway
//   • Stub adapters return NOT_CONFIGURED until real merchant secrets exist

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// ---------- Validation ----------

const ChargeSchema = z.object({
  gateway: z.enum(["cpay", "halkbank", "nlb"]),
  amount: z.number().positive().max(1_000_000), // hard cap, MKD
  currency: z.literal("MKD").optional(),
  order_id: z.string().uuid().optional(),
  booking_id: z.string().uuid().optional(),
  saved_payment_method_id: z.string().uuid().optional(),
}).refine((value) => Boolean(value.order_id) !== Boolean(value.booking_id), {
  message: "Provide exactly one payable resource",
  path: ["order_id"],
});
type ChargeRequest = z.infer<typeof ChargeSchema>;

interface ChargeResult {
  ok: boolean;
  status: "captured" | "authorized" | "failed" | "pending";
  gateway_transaction_id?: string;
  redirect_url?: string;
  error_code?: string;
  error_message?: string;
  raw?: unknown;
}

// ---------- Adapter stubs (replace with real bank integrations) ----------

async function chargeCpay(_amount: number, _currency: string): Promise<ChargeResult> {
  if (!Deno.env.get("CPAY_MERCHANT_ID")) {
    return { ok: false, status: "failed", error_code: "NOT_CONFIGURED",
      error_message: "CPay credentials missing — add CPAY_* secrets to enable." };
  }
  return { ok: true, status: "pending",
    gateway_transaction_id: `cpay_stub_${crypto.randomUUID()}`,
    redirect_url: "https://example.cpay.test/redirect-stub" };
}

async function chargeHalkbank(_amount: number, _currency: string): Promise<ChargeResult> {
  if (!Deno.env.get("HALKBANK_MERCHANT_ID")) {
    return { ok: false, status: "failed", error_code: "NOT_CONFIGURED",
      error_message: "Halkbank credentials missing — add HALKBANK_* secrets to enable." };
  }
  return { ok: true, status: "pending",
    gateway_transaction_id: `halk_stub_${crypto.randomUUID()}`,
    redirect_url: "https://example.halkbank.test/redirect-stub" };
}

async function chargeNlb(_amount: number, _currency: string): Promise<ChargeResult> {
  if (!Deno.env.get("NLB_MERCHANT_ID")) {
    return { ok: false, status: "failed", error_code: "NOT_CONFIGURED",
      error_message: "NLB credentials missing — add NLB_* secrets to enable." };
  }
  return { ok: true, status: "pending",
    gateway_transaction_id: `nlb_stub_${crypto.randomUUID()}`,
    redirect_url: "https://example.nlb.test/redirect-stub" };
}

async function dispatch(req: ChargeRequest): Promise<ChargeResult> {
  const currency = req.currency ?? "MKD";
  switch (req.gateway) {
    case "cpay": return chargeCpay(req.amount, currency);
    case "halkbank": return chargeHalkbank(req.amount, currency);
    case "nlb": return chargeNlb(req.amount, currency);
  }
}

async function verifyPayableResource(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  body: ChargeRequest,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (body.order_id) {
    const { data: order, error } = await supabase
      .from("orders")
      .select("buyer_id,total_paid,total_price,status")
      .eq("id", body.order_id)
      .single();

    if (error || !order) return { ok: false, status: 404, error: "Order not found" };
    if (order.buyer_id !== userId) return { ok: false, status: 403, error: "Not authorized for this order" };
    if (!["pending", "payment_pending"].includes(String(order.status))) {
      return { ok: false, status: 409, error: "Order is not payable" };
    }

    const expected = Number(order.total_paid ?? order.total_price);
    if (!Number.isFinite(expected) || Math.abs(Number(body.amount) - expected) > 0.01) {
      return { ok: false, status: 400, error: "Payment amount mismatch" };
    }
  }

  if (body.booking_id) {
    const { data: booking, error } = await supabase
      .from("care_bookings")
      .select("user_id,provider_id,service_id,status")
      .eq("id", body.booking_id)
      .single();

    if (error || !booking) return { ok: false, status: 404, error: "Booking not found" };
    if (booking.user_id !== userId) return { ok: false, status: 403, error: "Not authorized for this booking" };
    if (String(booking.status) !== "pending") {
      return { ok: false, status: 409, error: "Booking is not payable" };
    }

    const { data: service, error: serviceError } = await supabase
      .from("care_services")
      .select("price,is_active")
      .eq("id", booking.service_id)
      .eq("provider_id", booking.provider_id)
      .single();

    if (serviceError || !service || !service.is_active) {
      return { ok: false, status: 400, error: "Service is not payable" };
    }

    const minimum = Number(service.price);
    if (!Number.isFinite(minimum) || Number(body.amount) < minimum) {
      return { ok: false, status: 400, error: "Payment amount mismatch" };
    }
  }

  return { ok: true };
}

// ---------- Rate limiting (server-side, per user) ----------

const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const RATE_LIMIT_MAX = 10;

async function checkRateLimit(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<{ allowed: boolean; remaining: number }> {
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
  const { count } = await supabase
    .from("edge_rate_limits")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("bucket", "process-payment")
    .gte("created_at", since);

  const used = count ?? 0;
  if (used >= RATE_LIMIT_MAX) return { allowed: false, remaining: 0 };

  await supabase.from("edge_rate_limits").insert({
    user_id: userId,
    bucket: "process-payment",
  });
  return { allowed: true, remaining: RATE_LIMIT_MAX - used - 1 };
}

// ---------- Handler ----------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "method not allowed" });

  try {
    // Auth (use anon key + getClaims to verify the user-supplied JWT)
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json(401, { error: "Unauthorized" });
    const jwt = authHeader.slice("Bearer ".length);

    const verifier = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const { data: claims, error: claimsErr } = await verifier.auth.getClaims(jwt);
    if (claimsErr || !claims?.claims?.sub) return json(401, { error: "Unauthorized" });
    const userId = claims.claims.sub as string;

    // Service-role client for DB writes (audit + rate limit table)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Rate limit BEFORE doing anything expensive
    const rl = await checkRateLimit(supabase, userId);
    if (!rl.allowed) {
      return json(429, { error: "Too many payment attempts. Please wait a few minutes." });
    }

    // Validate body
    let raw: unknown;
    try { raw = await req.json(); } catch { return json(400, { error: "invalid JSON" }); }
    const parsed = ChargeSchema.safeParse(raw);
    if (!parsed.success) {
      return json(400, { error: "invalid request", details: parsed.error.flatten().fieldErrors });
    }
    const body = parsed.data;

    const payable = await verifyPayableResource(supabase, userId, body);
    if (!payable.ok) return json(payable.status, { error: payable.error });

    // Persist pending audit row
    const { data: txn, error: insErr } = await supabase
      .from("payment_gateway_transactions")
      .insert({
        user_id: userId,
        gateway: body.gateway,
        order_id: body.order_id ?? null,
        booking_id: body.booking_id ?? null,
        amount: body.amount,
        currency: body.currency ?? "MKD",
        status: "pending",
      })
      .select("id")
      .single();

    if (insErr || !txn) return json(500, { error: "audit insert failed" });

    const result = await dispatch(body);

    await supabase
      .from("payment_gateway_transactions")
      .update({
        status: result.status,
        gateway_transaction_id: result.gateway_transaction_id ?? null,
        error_code: result.error_code ?? null,
        error_message: result.error_message ?? null,
        raw_response: result.raw ?? null,
      })
      .eq("id", txn.id);

    return json(result.ok ? 200 : 400, {
      transaction_id: txn.id,
      status: result.status,
      redirect_url: result.redirect_url,
      gateway_transaction_id: result.gateway_transaction_id,
      error_code: result.error_code,
      error_message: result.error_message,
      rate_limit_remaining: rl.remaining,
    });
  } catch (e) {
    // Never leak internal error details to the client
    console.error("process-payment error:", e);
    return json(500, { error: "internal server error" });
  }
});
