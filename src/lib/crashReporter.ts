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
 * Swap the network sink for Sentry, LogRocket, or a custom edge function
 * later by editing `sendToSink` only.
 */
import { supabase } from "@/integrations/supabase/client";
import { APP_VERSION, APP_BUILD_ID } from "@/lib/appVersion";

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
  buildId: string;
  timestamp: string;
  extra?: Record<string, unknown>;
  /** Recent user/system events leading up to the crash (no PII). */
  breadcrumbs?: Breadcrumb[];
}

/**
 * A breadcrumb is a small, non-sensitive event recorded in a ring buffer.
 * When a crash fires, the buffer is attached so we can reconstruct the
 * user's last few steps — far cheaper than a full session replay and good
 * enough to triage 90% of crashes.
 */
export type BreadcrumbCategory =
  | "navigation"
  | "ui"
  | "network"
  | "auth"
  | "info";

export interface Breadcrumb {
  category: BreadcrumbCategory;
  message: string;
  /** ISO timestamp. */
  at: string;
  /** Optional small bag of context — keep PII out. */
  data?: Record<string, string | number | boolean | null>;
}

// Ring buffer — bounded so a long session can't grow memory unbounded and
// so the eventual POST stays small. 25 entries covers ~last 1-2 minutes of
// activity in practice.
const BREADCRUMB_LIMIT = 25;
const breadcrumbs: Breadcrumb[] = [];

export function addBreadcrumb(
  category: BreadcrumbCategory,
  message: string,
  data?: Breadcrumb["data"],
) {
  breadcrumbs.push({
    category,
    message: message.length > 200 ? message.slice(0, 200) : message,
    at: new Date().toISOString(),
    data,
  });
  if (breadcrumbs.length > BREADCRUMB_LIMIT) {
    breadcrumbs.shift();
  }
}

/** Returns a copy of the current breadcrumb buffer (newest last). */
export function getBreadcrumbs(): Breadcrumb[] {
  return breadcrumbs.slice();
}

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
  // No remote sink in dev — keeps local console readable and avoids polluting
  // the prod crash table with hot-reload noise.
  if (!isProd) return;
  try {
    // The auth header is best-effort — the function tolerates anonymous
    // submissions so we still capture crashes that happen on the auth screen
    // before the session is restored.
    const { data: { session } } = await supabase.auth.getSession();
    const authHeader = session?.access_token
      ? `Bearer ${session.access_token}`
      : `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? ""}`;

    await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ingest-crash`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
          // Required by Supabase edge runtime even for anonymous calls.
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "",
        },
        body: JSON.stringify(payload),
        keepalive: true,
      },
    ).catch(() => {});
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
    buildId: APP_BUILD_ID,
    timestamp: new Date().toISOString(),
    extra: context.extra,
    breadcrumbs: getBreadcrumbs(),
  };

  // Always log locally — shows up in Xcode/Logcat for native builds.
  // Use a stable prefix so it's greppable in device logs.
  // eslint-disable-next-line no-console
  console.error(`[crash:${source}]`, payload);

  void sendToSink(payload);
}
