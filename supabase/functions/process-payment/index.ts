// Local-gateway payment scaffold for North Macedonia (CPAY / Halkbank / NLB).
//
// THIS IS A STUB. Real merchant API calls are NOT made yet.
// To activate a gateway:
//   1) Add the matching secrets via Cloud Settings → Secrets:
//        CPAY_MERCHANT_ID,    CPAY_TERMINAL_ID,    CPAY_API_KEY,    CPAY_API_URL
//        HALKBANK_MERCHANT_ID, HALKBANK_TERMINAL_ID, HALKBANK_API_KEY, HALKBANK_API_URL
//        NLB_MERCHANT_ID,     NLB_TERMINAL_ID,     NLB_API_KEY,     NLB_API_URL
//   2) Replace the body of `chargeCpay` / `chargeHalkbank` / `chargeNlb` with
//      the real signed request that each bank requires (HMAC-SHA256, hosted
//      payment page redirect URL, etc.). The function shape (input, persisted
//      transaction row, output) is already correct.
//   3) Add a webhook handler (separate function) for asynchronous capture
//      confirmations from each gateway.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type GatewayProvider = "cpay" | "halkbank" | "nlb" | "manual";

interface ChargeRequest {
  gateway: GatewayProvider;
  amount: number;
  currency?: string;
  order_id?: string;
  booking_id?: string;
  saved_payment_method_id?: string;
}

interface ChargeResult {
  ok: boolean;
  status: "captured" | "authorized" | "failed" | "pending";
  gateway_transaction_id?: string;
  redirect_url?: string; // for hosted payment pages
  error_code?: string;
  error_message?: string;
  raw?: unknown;
}

// ---------- Adapter stubs (replace with real bank integrations) ----------

async function chargeCpay(_amount: number, _currency: string): Promise<ChargeResult> {
  const merchant = Deno.env.get("CPAY_MERCHANT_ID");
  if (!merchant) {
    return {
      ok: false,
      status: "failed",
      error_code: "NOT_CONFIGURED",
      error_message: "CPay credentials missing — add CPAY_* secrets to enable.",
    };
  }
  // TODO: real CPay request. CPay uses a redirect-based hosted payment page;
  // typically you POST signed (HMAC-SHA256) order details and receive a URL.
  return {
    ok: true,
    status: "pending",
    gateway_transaction_id: `cpay_stub_${crypto.randomUUID()}`,
    redirect_url: "https://example.cpay.test/redirect-stub",
  };
}

async function chargeHalkbank(_amount: number, _currency: string): Promise<ChargeResult> {
  const merchant = Deno.env.get("HALKBANK_MERCHANT_ID");
  if (!merchant) {
    return {
      ok: false,
      status: "failed",
      error_code: "NOT_CONFIGURED",
      error_message: "Halkbank credentials missing — add HALKBANK_* secrets to enable.",
    };
  }
  // TODO: real Halkbank 3DS request.
  return {
    ok: true,
    status: "pending",
    gateway_transaction_id: `halk_stub_${crypto.randomUUID()}`,
    redirect_url: "https://example.halkbank.test/redirect-stub",
  };
}

async function chargeNlb(_amount: number, _currency: string): Promise<ChargeResult> {
  const merchant = Deno.env.get("NLB_MERCHANT_ID");
  if (!merchant) {
    return {
      ok: false,
      status: "failed",
      error_code: "NOT_CONFIGURED",
      error_message: "NLB credentials missing — add NLB_* secrets to enable.",
    };
  }
  // TODO: real NLB request (typically Asseco / Monri-style integration).
  return {
    ok: true,
    status: "pending",
    gateway_transaction_id: `nlb_stub_${crypto.randomUUID()}`,
    redirect_url: "https://example.nlb.test/redirect-stub",
  };
}

// -----------------------------------------------------------------------

async function dispatch(req: ChargeRequest): Promise<ChargeResult> {
  const currency = req.currency ?? "MKD";
  switch (req.gateway) {
    case "cpay":
      return chargeCpay(req.amount, currency);
    case "halkbank":
      return chargeHalkbank(req.amount, currency);
    case "nlb":
      return chargeNlb(req.amount, currency);
    case "manual":
      // Manual / cash-on-delivery — no gateway call, just persist as captured.
      return { ok: true, status: "captured", gateway_transaction_id: `manual_${crypto.randomUUID()}` };
    default:
      return { ok: false, status: "failed", error_code: "UNKNOWN_GATEWAY", error_message: "Unsupported gateway" };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Validate caller
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace("Bearer ", "");
    if (!jwt) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: userData, error: userErr } = await supabase.auth.getUser(jwt);
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    // Validate body
    const body = (await req.json()) as ChargeRequest;
    if (!body || typeof body.amount !== "number" || body.amount <= 0) {
      return new Response(JSON.stringify({ error: "amount must be > 0" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!["cpay", "halkbank", "nlb", "manual"].includes(body.gateway)) {
      return new Response(JSON.stringify({ error: "invalid gateway" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert pending transaction row (audit trail BEFORE calling the gateway)
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

    if (insErr || !txn) {
      return new Response(JSON.stringify({ error: insErr?.message ?? "insert failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call the gateway adapter
    const result = await dispatch(body);

    // Persist result
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

    return new Response(
      JSON.stringify({
        transaction_id: txn.id,
        status: result.status,
        redirect_url: result.redirect_url,
        gateway_transaction_id: result.gateway_transaction_id,
        error_code: result.error_code,
        error_message: result.error_message,
      }),
      {
        status: result.ok ? 200 : 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
