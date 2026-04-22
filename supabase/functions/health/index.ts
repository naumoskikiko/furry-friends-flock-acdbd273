// supabase/functions/health/index.ts
//
// Public health-check endpoint.
//
// Purpose: a single URL we can poll from the client `/status` page, from
// uptime monitors (UptimeRobot, BetterUptime, Pingdom), and from store
// reviewers verifying the backend is reachable. Designed to be cheap and
// deterministic — never returns 5xx for transient app errors so monitors
// can distinguish "platform down" from "app bug".
//
// What it checks:
//   1. The function runtime itself is up (implicit — we returned).
//   2. The Postgres database accepts a trivial read (1-row count from a
//      tiny, always-present table). Wrapped in a short timeout so a slow DB
//      doesn't hang the response.
//
// Returns: JSON with overall + per-component status, plus latency in ms.
// HTTP status is always 200 unless the request itself is malformed —
// component health is encoded in the body so monitors can alert on the
// `status` field rather than HTTP code.
//
// `verify_jwt = false` is set in supabase/config.toml so this works
// anonymously (intended for public probes).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

// Cap any single component check at 3s so the endpoint always returns fast,
// even when Postgres is degraded — uptime monitors prefer "degraded" over
// "timeout".
const CHECK_TIMEOUT_MS = 3_000;

type ComponentStatus = "ok" | "degraded" | "down";
interface ComponentResult {
  status: ComponentStatus;
  latency_ms: number;
  error?: string;
}

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return await Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), ms),
    ),
  ]);
}

async function checkDatabase(): Promise<ComponentResult> {
  const started = performance.now();
  try {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });
    // `boost_pricing` is a tiny config table that always has rows — cheaper
    // than querying user data and avoids leaking row counts.
    const { error } = await withTimeout(
      admin.from("boost_pricing").select("id", { head: true, count: "exact" }).limit(1),
      CHECK_TIMEOUT_MS,
    );
    const latency = Math.round(performance.now() - started);
    if (error) {
      return { status: "down", latency_ms: latency, error: error.message };
    }
    // >1.5s is technically up but worth flagging so monitors can warn early.
    return {
      status: latency > 1500 ? "degraded" : "ok",
      latency_ms: latency,
    };
  } catch (e) {
    return {
      status: "down",
      latency_ms: Math.round(performance.now() - started),
      error: e instanceof Error ? e.message : "unknown",
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startedAt = new Date().toISOString();
  const db = await checkDatabase();

  // Roll up component statuses into one overall verdict. "down" wins, then
  // "degraded", then "ok".
  const overall: ComponentStatus =
    db.status === "down" ? "down" : db.status === "degraded" ? "degraded" : "ok";

  const body = {
    status: overall,
    checked_at: startedAt,
    components: {
      database: db,
      // Implicit — if we got here, the function runtime answered.
      functions: { status: "ok" as const, latency_ms: 0 },
    },
  };

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      // Short cache so a flood of monitors doesn't hammer the DB but a real
      // outage is still visible within ~10s.
      "Cache-Control": "public, max-age=10",
    },
  });
});
