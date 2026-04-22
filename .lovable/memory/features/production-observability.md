---
name: Production Observability
description: Health-check endpoint, breadcrumbs in crash reports, and public /status page for uptime and store-reviewer verification
type: feature
---
# Production Observability

Three layers of post-launch visibility, all required for App Store / Play Store readiness.

## 1. Health-check edge function (`supabase/functions/health`)

- Public (`verify_jwt = false` in `supabase/config.toml`).
- GETs return JSON `{ status, checked_at, components: { database, functions } }`.
- Always HTTP 200 — overall verdict is in the body so monitors alert on `status` field.
- Wraps the DB check in a 3s timeout; flags >1500ms as `degraded`.
- Use for: UptimeRobot/BetterUptime probes, the `/status` page, and store-reviewer smoke tests.

## 2. Breadcrumb ring buffer (`src/lib/crashReporter.ts`)

- `addBreadcrumb(category, message, data?)` pushes into a 25-entry ring.
- Categories: `navigation | ui | network | auth | info`.
- Auto-attached to every `reportCrash()` payload (in `breadcrumbs`) and persisted in `crash_reports.extra` if needed.
- Already wired:
  - `AnalyticsRouteTracker` → `navigation` breadcrumb on every route change.
  - `AuthContext.onAuthStateChange` → `auth` breadcrumb (event name only, no PII).
- **When wiring more breadcrumbs**: NEVER include user input, message bodies, prices, or anything sensitive — store only event names + safe metadata (counts, status codes, durations).

## 3. Public `/status` page (`src/pages/StatusPage.tsx`)

- Unauthenticated route — App Store / Play Store reviewers and end users can reach it.
- Calls `health` with a 6s abort timeout, falls back to "down" on network failure.
- Shows overall banner + per-component grid + app version/build id.
- Refresh button re-pings without reloading the page.
