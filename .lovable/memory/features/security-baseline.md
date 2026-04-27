---
name: Security Baseline
description: Pre-launch hardening — scoped realtime, EXECUTE locked to authenticated only, in-body role checks, store_order_items_safe view, edge_rate_limits, HIBP password check, payment edge function with Zod + getClaims.
type: feature
---

# Security Baseline (Production)

## Database
- **Realtime scoped**: `realtime.messages` restricted to `conversation:<id>` (membership-verified) and `user:<uid>`. No `public:%` wildcard.
- **Function EXECUTE lockdown**:
  - Blanket `REVOKE ALL ... FROM PUBLIC, anon` on every `public.*` function.
  - `GRANT EXECUTE ... TO authenticated` only on user-callable RPCs (chat, groups, meetups, stock, care payments, account deletion, admin RPCs).
  - Trigger functions (`update_*`, `handle_new_user`, `notify_*`, `prune_*`, `check_report_rate_limit`) are NOT granted — they run as triggers or via service role only.
- **Admin RPCs** (`admin_change_user_role`, `admin_set_find_my_pet_access`, `admin_adjust_user_credits`) require `authenticated` EXECUTE because the function body enforces `has_role(auth.uid(), 'admin'|'owner')`. SECURITY DEFINER is required for cross-table writes that bypass RLS.
- **PII isolation**: `store_order_items_safe` security-invoker view excludes buyer name/address/phone/email for store owners.
- **crash_reports**: `WITH CHECK (false)` on insert for client roles; only ingest-crash edge function (service role) writes.

## Auth
- HIBP password check enabled.
- Email confirmation required, anonymous signups disabled.
- Client-side password strength: 8+ chars, letter + digit.
- OAuth: Google + Apple (managed via Lovable Cloud).

## Edge Functions
- `process-payment`: Zod schema validation, `getClaims()` JWT verification, per-user rate limit (10/5min via `edge_rate_limits` table).
- `ingest-crash`: anonymous-tolerant, writes via service role only.
- All functions return CORS headers on every response including errors.

## Linter Status
- 0 anon-callable SECURITY DEFINER warnings.
- 33 authenticated-callable warnings remain — all intentional, documented, and protected by in-body authorization checks. Marked as accepted in security findings.
