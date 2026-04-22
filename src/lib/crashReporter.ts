/**
 * Lightweight production crash reporter.
 *
 * Goal: capture render-time and uncaught runtime errors with enough context
 * (route, user id, app version, platform) to triage post-launch crashes —
 * without pulling in a heavy SDK like Sentry yet.
 *
 * Where reports go:
 *   - Always: the browser/native console (so Logcat / Xcode console show them).
 *   - In production: a same-origin POST to `/__crash` if the host is configured
 *     to receive them. Failures are swallowed — never let the reporter itself
 *     crash the app.
 *
 * Swap the network sink for Sentry, LogRocket, or a Lovable Cloud edge function
 * later by editing `sendToSink` only.
 */
import { supabase } from "@/integrations/supabase/client";

export type CrashSource =
  | "react-error-boundary"
  | "window-error"
  | "unhandled-rejection"
  | "manual";

export interface CrashContext {
  /** Friendly area label from the boundary that caught it ("Messages", etc.). */
  area?: string;
  /** Component stack from React when available. */
  componentStack?: string;
  /** Anything else useful — never put PII in here. */
  extra?: Record<string, unknown>;
}

interface CrashPayload {
  source: CrashSource;
  message: string;
  stack?: string;
  area?: string;
  componentStack?: string;
  route: string;
  userId: string | null;
  userAgent: string;
  appVersion: string;
  timestamp: string;
  extra?: Record<string, unknown>;
}

const APP_VERSION = (import.meta.env.VITE_APP_VERSION as string | undefined) ?? "dev";
const isProd = import.meta.env.PROD;

let cachedUserId: string | null = null;

// Track the current user id so reports can be attributed without an extra
// async hop at the moment of crash. Updated on auth state changes.
supabase.auth.getSession().then(({ data }) => {
  cachedUserId = data.session?.user?.id ?? null;
});
supabase.auth.onAuthStateChange((_event, session) => {
  cachedUserId = session?.user?.id ?? null;
});

function safeRoute(): string {
  try {
    return window.location.pathname + window.location.search;
  } catch {
    return "";
  }
}

async function sendToSink(payload: CrashPayload) {
  // No remote sink in dev — keeps local console readable.
  if (!isProd) return;
  try {
    // Keep the request small and fire-and-forget. Use `keepalive` so it
    // survives a tab close. The endpoint is optional — if the host returns
    // 404 we silently drop. Replace with your real ingestion endpoint
    // (Sentry tunnel, edge function, etc.) when ready.
    await fetch("/__crash", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Never let the reporter itself throw.
  }
}

export function reportCrash(
  source: CrashSource,
  error: unknown,
  context: CrashContext = {},
) {
  const err = error instanceof Error ? error : new Error(String(error));
  const payload: CrashPayload = {
    source,
    message: err.message,
    stack: err.stack,
    area: context.area,
    componentStack: context.componentStack,
    route: safeRoute(),
    userId: cachedUserId,
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
    appVersion: APP_VERSION,
    timestamp: new Date().toISOString(),
    extra: context.extra,
  };

  // Always log locally — shows up in Xcode/Logcat for native builds.
  // Use a stable prefix so it's greppable in device logs.
  // eslint-disable-next-line no-console
  console.error(`[crash:${source}]`, payload);

  void sendToSink(payload);
}
