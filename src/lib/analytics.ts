/**
 * Privacy-respecting in-app analytics.
 *
 * Why this exists:
 *   Both Google Play (Data Safety form) and Apple (Privacy Nutrition Labels)
 *   require an accurate declaration of what data the app collects AND a way
 *   for users to opt out of non-essential telemetry. This module is the single
 *   source of truth for that opt-out, so every tracking call routes through it.
 *
 * Design principles:
 *   1. **Opt-in by default in regulated regions** — we ship with analytics ON
 *      but expose a clear toggle in Settings → Privacy. Add a region check
 *      here (e.g. EU/UK → default OFF) when GDPR consent UI lands.
 *   2. **No PII in events** — never pass email, full name, phone, message
 *      bodies, or precise coordinates. User id is hashed-by-Supabase already
 *      and is acceptable for funnel analysis.
 *   3. **Fire-and-forget** — never block UI on analytics. Failures are silent.
 *   4. **Local-first sink** — events buffer to console in dev and POST to a
 *      same-origin `/__analytics` endpoint in prod. Swap for PostHog / Plausible
 *      / a Lovable Cloud edge function by editing `flush()` only.
 */

const STORAGE_KEY = "petkeep:analytics:enabled";
const APP_VERSION = (import.meta.env.VITE_APP_VERSION as string | undefined) ?? "dev";
const isProd = import.meta.env.PROD;

export type AnalyticsEvent = {
  name: string;
  // Keep props simple — strings, numbers, booleans only. No nested objects
  // with user content; reviewers will ask what's in them.
  props?: Record<string, string | number | boolean | null>;
};

interface QueuedEvent extends AnalyticsEvent {
  ts: string;
  route: string;
  appVersion: string;
  sessionId: string;
}

// Per-tab/session id — random, not tied to user. Reset on reload.
const sessionId =
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

// ---------------------------------------------------------------------------
// Opt-out plumbing
// ---------------------------------------------------------------------------
function readEnabled(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    // Default: enabled. Users explicitly disable it from Settings → Privacy.
    if (raw === null) return true;
    return raw === "1";
  } catch {
    return true;
  }
}

let enabled = readEnabled();
const subscribers = new Set<(value: boolean) => void>();

export function isAnalyticsEnabled(): boolean {
  return enabled;
}

export function setAnalyticsEnabled(value: boolean): void {
  enabled = value;
  try {
    localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
  } catch {
    // Storage may be blocked (private mode) — preference still applies in-memory.
  }
  // If the user opts out, drop anything we haven't sent yet so it never leaves
  // the device. This is the user-visible "delete pending data" guarantee.
  if (!value) buffer.length = 0;
  subscribers.forEach((fn) => fn(value));
}

export function subscribeAnalytics(fn: (value: boolean) => void): () => void {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

// ---------------------------------------------------------------------------
// Event buffer + flush
// ---------------------------------------------------------------------------
const buffer: QueuedEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const FLUSH_INTERVAL_MS = 5_000;
const MAX_BUFFER = 25;

function safeRoute(): string {
  try {
    return window.location.pathname;
  } catch {
    return "";
  }
}

async function flush() {
  flushTimer = null;
  if (buffer.length === 0) return;
  // Take a snapshot — new events can keep arriving during the request.
  const batch = buffer.splice(0, buffer.length);

  if (!isProd) {
    // eslint-disable-next-line no-console
    console.debug("[analytics] flush", batch);
    return;
  }

  try {
    await fetch("/__analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: batch }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Never let analytics throw.
  }
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(flush, FLUSH_INTERVAL_MS);
}

// Flush on tab hide so we don't lose the last events when the user backgrounds
// the app — important for mobile where we may never get a `beforeunload`.
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void flush();
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export function trackEvent(name: string, props?: AnalyticsEvent["props"]): void {
  if (!enabled) return;
  buffer.push({
    name,
    props,
    ts: new Date().toISOString(),
    route: safeRoute(),
    appVersion: APP_VERSION,
    sessionId,
  });
  if (buffer.length >= MAX_BUFFER) {
    void flush();
  } else {
    scheduleFlush();
  }
}

export function trackScreen(screen: string): void {
  trackEvent("screen_view", { screen });
}
