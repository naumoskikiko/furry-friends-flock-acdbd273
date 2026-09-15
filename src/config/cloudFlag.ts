/**
 * Single kill-switch for ALL Lovable Cloud usage in this project.
 *
 *   USE_LOVABLE_CLOUD = false  → zero/near-zero Cloud usage
 *     • no DB reads/writes
 *     • no auth network calls
 *     • no storage uploads/downloads
 *     • no edge function invocations
 *     • no realtime channel subscriptions
 *     • no analytics/cron pings to the project URL
 *     • UI keeps rendering with safe empty/fallback states
 *
 *   USE_LOVABLE_CLOUD = true   → normal behavior (re-enables everything)
 *
 * Reads from the optional VITE_USE_LOVABLE_CLOUD env var first, then falls
 * back to the constant below. Set the env var to "true" or flip the constant
 * to re-enable Cloud later — no other code changes needed.
 */
const envFlag = (import.meta as any)?.env?.VITE_USE_LOVABLE_CLOUD;

export const USE_LOVABLE_CLOUD: boolean =
  typeof envFlag === "string"
    ? envFlag.toLowerCase() === "true"
    : /* default → */ false;
