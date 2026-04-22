/**
 * Network helpers for production mobile resilience.
 *
 * The browser `fetch` API has no built-in timeout — a request to a stalled
 * server hangs forever, blocking React Query and tying up the UI. Mobile
 * cellular makes this routine. These helpers add bounded timeouts, jittered
 * exponential backoff, and a single place to add observability later.
 *
 * Usage:
 *   const res = await fetchWithTimeout(url, { timeoutMs: 8000 });
 *   const data = await fetchJsonWithRetry<MyShape>(url, { retries: 2 });
 *
 * For Supabase calls, prefer the SDK — React Query handles retry/backoff via
 * `App.tsx` defaults. Use these only for raw `fetch` calls (Nominatim, image
 * preflight, third-party APIs, edge function pings, etc.).
 */

export interface FetchWithTimeoutOptions extends RequestInit {
  /** Hard ceiling for the request — aborts via AbortController. Default 10s. */
  timeoutMs?: number;
}

export interface RetryOptions extends FetchWithTimeoutOptions {
  /** Total attempts is `retries + 1`. Default 2 retries (3 attempts). */
  retries?: number;
  /** Base delay in ms before doubling. Default 400ms. */
  baseDelayMs?: number;
  /** Max single delay cap so we don't wait minutes. Default 4000ms. */
  maxDelayMs?: number;
  /** Predicate for whether to retry an HTTP status. Default: 5xx + 408 + 429. */
  shouldRetryStatus?: (status: number) => boolean;
}

const DEFAULT_TIMEOUT = 10_000;

export class TimeoutError extends Error {
  constructor(message = "Request timed out") {
    super(message);
    this.name = "TimeoutError";
  }
}

/**
 * Wrap `fetch` with an AbortController-based timeout.
 *
 * Caller-supplied AbortSignals are respected — we chain ours so cancelling
 * either source aborts the request.
 */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  { timeoutMs = DEFAULT_TIMEOUT, signal, ...init }: FetchWithTimeoutOptions = {},
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(new TimeoutError()), timeoutMs);

  // Forward an external abort to ours so React unmounts cancel cleanly.
  const onExternalAbort = () => controller.abort(signal?.reason);
  if (signal) {
    if (signal.aborted) controller.abort(signal.reason);
    else signal.addEventListener("abort", onExternalAbort, { once: true });
  }

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (err) {
    // Normalize aborts caused by our timeout into a TimeoutError so callers can
    // distinguish "user navigated away" (caller's signal) from "server is dead".
    if (controller.signal.aborted && controller.signal.reason instanceof TimeoutError) {
      throw controller.signal.reason;
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
    if (signal) signal.removeEventListener("abort", onExternalAbort);
  }
}

const defaultShouldRetry = (status: number) =>
  status === 408 || status === 429 || (status >= 500 && status < 600);

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/**
 * GET-style helper with retry + JSON parsing.
 *
 * Retries on:
 *   - Network errors (offline, DNS fail, TCP reset)
 *   - Timeouts
 *   - HTTP 408 / 429 / 5xx
 *
 * Does NOT retry on 4xx (other than 408/429) — those are deterministic and
 * retrying spams the server.
 */
export async function fetchJsonWithRetry<T = unknown>(
  input: RequestInfo | URL,
  {
    retries = 2,
    baseDelayMs = 400,
    maxDelayMs = 4_000,
    shouldRetryStatus = defaultShouldRetry,
    ...init
  }: RetryOptions = {},
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetchWithTimeout(input, init);
      if (res.ok) {
        return (await res.json()) as T;
      }
      if (attempt < retries && shouldRetryStatus(res.status)) {
        lastError = new Error(`HTTP ${res.status}`);
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (err) {
      lastError = err;
      // AbortError from the *caller's* signal should propagate immediately —
      // don't retry a request the user already cancelled.
      if (err instanceof DOMException && err.name === "AbortError") throw err;
      if (attempt >= retries) throw err;
    }

    // Exponential backoff with full jitter: prevents thundering-herd reconnect
    // when 100s of devices come back online at the same time.
    const exp = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
    const jittered = Math.random() * exp;
    await delay(jittered);
  }

  // Unreachable — loop either returns or throws.
  throw lastError ?? new Error("fetchJsonWithRetry exhausted");
}
