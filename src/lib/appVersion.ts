/**
 * Single source of truth for the running app version.
 *
 * Values are baked in at build time by `vite.config.ts`:
 *   - VITE_APP_VERSION  → semver from package.json
 *   - VITE_APP_BUILD_ID → short commit SHA (CI) or ISO timestamp (local)
 *   - VITE_APP_BUILD_MODE → "development" | "production"
 *
 * Surface in Settings → Support and include in every crash report so support
 * tickets and Logcat entries can be triaged without guessing which build the
 * user was on.
 */

export const APP_VERSION = (import.meta.env.VITE_APP_VERSION as string | undefined) ?? "0.0.0";
export const APP_BUILD_ID = (import.meta.env.VITE_APP_BUILD_ID as string | undefined) ?? "dev";
export const APP_BUILD_MODE = (import.meta.env.VITE_APP_BUILD_MODE as string | undefined) ?? "development";

/** Compact human-readable label, e.g. "v1.4.2 · a1b2c3d". */
export function formatAppVersion(): string {
  return `v${APP_VERSION} · ${APP_BUILD_ID}`;
}
