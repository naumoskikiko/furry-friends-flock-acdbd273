---
name: Pre-launch security baseline
description: Hardening applied before public launch — RLS, RPC perms, realtime scoping, edge rate limits, HIBP password protection
type: feature
---
Production security baseline (do not regress):

- **Realtime**: `realtime.messages` policies allow ONLY `conversation:<id>` (member-checked) and `user:<uid>` topics. Never re-add `public:%` wildcard.
- **Crash reports**: explicit `WITH CHECK (false)` INSERT policy on `public.crash_reports` for `authenticated` + `anon`. Writes only via `ingest-crash` edge function (service role).
- **RPC perms**: `EXECUTE` revoked from `anon` (and PUBLIC where applicable) on all `admin_*` functions, `delete_user_account`, `process_care_payment`, `prune_old_crash_reports`, `reduce_product_stock`, and all `group_*`/meetup chat helpers. Their internal `has_role` / `auth.uid()` checks remain.
- **Store fulfilment**: store owners must read order data via the view `public.store_order_items_safe` (security_invoker, no buyer PII columns). Never expose `orders.shipping_*` to store owners.
- **Edge rate limiting**: `public.edge_rate_limits` table is server-only (deny-all client policy). `process-payment` uses bucket `process-payment` with 10 attempts / 5 min per user.
- **Auth**: HIBP leaked-password check enabled (`password_hibp_enabled: true`). Email confirmation required (`auto_confirm_email: false`). Anonymous signups disabled.
- **Client password policy**: signup form requires ≥8 chars and at least one letter + one digit (defense in depth).
- **Edge function pattern**: validate JWT via `getClaims()` (not `getUser()`), Zod-validate body, write audit row BEFORE external calls, never leak internal error details to the client.
