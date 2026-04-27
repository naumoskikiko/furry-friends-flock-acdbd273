// supabase/functions/ingest-crash/index.ts
//
// Public crash-report ingestion endpoint.
//
// Why an edge function instead of a direct client insert?
//   1. We want to accept reports from signed-out users (a crash on the auth
//      page is exactly when we need to know).
//   2. We don't want to expose `crash_reports` to anonymous INSERT — that
//      becomes a free-form spam table the moment someone notices.
//   3. The function uses the service role key to write, and applies cheap
//      validation + size caps before insert.
//
// Deployment: this function is auto-deployed. `verify_jwt = false`
// is set in `supabase/config.toml` so signed-out clients can POST.
//
// Auth (best-effort): if the caller passes their JWT in `Authorization`,
// we resolve their user id and attach it to the row. If not, the row is
// stored with `user_id = null`. Either way the report is accepted — losing
// crash data because of an auth hiccup would defeat the point.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Hard caps so a runaway loop can't fill the DB. Generous enough for real
// stack traces but bounded enough to reject obvious abuse.
const MAX_STRING = 8_000;
const MAX_EXTRA_BYTES = 4_000;
const ALLOWED_SOURCES = new Set([
  "react-error-boundary",
  "window-error",
  "unhandled-rejection",
  "manual",
]);

function clamp(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  return v.length > max ? v.slice(0, max) : v;
}

async function resolveUserId(authHeader: string | null): Promise<string | null> {
  if (!authHeader) return null;
  try {
    // Use the anon key + the caller's JWT so we hit RLS-bound `auth.getUser`.
    const supabase = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const source = typeof body.source === "string" && ALLOWED_SOURCES.has(body.source)
    ? body.source
    : "manual";

  const message = clamp(body.message, MAX_STRING);
  if (!message) {
    return new Response(JSON.stringify({ error: "missing_message" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Bound the extra blob — JSON.stringify is fine here because we control
  // the shape on the client.
  let extra: Record<string, unknown> | null = null;
  if (body.extra && typeof body.extra === "object") {
    const raw = JSON.stringify(body.extra);
    if (raw.length <= MAX_EXTRA_BYTES) {
      extra = body.extra as Record<string, unknown>;
    }
  }

  const userId = await resolveUserId(req.headers.get("Authorization"));

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { error } = await admin.from("crash_reports").insert({
    source,
    message,
    stack: clamp(body.stack, MAX_STRING),
    area: clamp(body.area, 200),
    component_stack: clamp(body.componentStack, MAX_STRING),
    route: clamp(body.route, 500),
    user_id: userId,
    user_agent: clamp(body.userAgent, 500),
    app_version: clamp(body.appVersion, 64),
    build_id: clamp(body.buildId, 64),
    extra,
    client_timestamp:
      typeof body.timestamp === "string" ? body.timestamp : null,
  });

  if (error) {
    // Log but still 202 — we don't want clients retrying and amplifying load
    // when the DB is the actual problem.
    console.error("ingest-crash insert failed:", error.message);
    return new Response(JSON.stringify({ ok: false }), {
      status: 202,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 202,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
