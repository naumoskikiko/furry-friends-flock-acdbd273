---
name: Security Baseline
description: Pre-launch hardening manifest — RLS, RPC lockdown, scoped realtime, role escalation prevention, PII-safe order projections, HIBP, anti-scraping policies
type: feature
---

# PetKeep Production Security Baseline

## Database access control
- All `public.*` tables have RLS enabled with scoped policies (owner/admin/owner-of-row patterns).
- `REVOKE ALL ON FUNCTION public.* FROM PUBLIC, anon`. `EXECUTE` granted only to `authenticated` for the 24 client-callable RPCs. Trigger-only and helper functions inaccessible to all client roles.
- All SECURITY DEFINER RPCs enforce `auth.uid() IS NOT NULL` + `has_role()` checks in-body. The Supabase linter flags these as warnings — they are intentional and documented (false positive).

## Privilege escalation hardening
- `user_roles` policies prevent `admin` from granting/promoting anyone to `admin` or `owner`. Admin can only assign `user/provider/business/moderator`. Only `owner` can manage elevated roles, via `Owners can insert/update/delete non-privileged roles` policies.
- `admin_change_user_role()` RPC additionally blocks self-edits and admin/owner downgrades.

## Order / PII safety
- Direct SELECT on `public.orders` is restricted to buyer + admins/owners.
- Store owners use `get_store_owner_orders()` RPC (SECURITY DEFINER) which exposes only `id, buyer_id, shipping_name, shipping_city, shipping_country, status, total_price, timestamps`. **No phone, no street address, no postal code.**
- `store_order_items_safe` view masks PII for store-owner item reads.
- `DashboardCustomersTab` refactored to consume the safe RPC.

## Pet medical/PII safety
- `Care providers can view pets for active bookings` policy: providers only see medical_notes, vet_info, emergency_contact while a booking is `pending/confirmed/in_progress` and within 7 days. No permanent access from historical bookings.

## Storage
- `voice-messages` bucket private; access via 10-min signed URLs and conversation-membership RLS.
- `verification-docs` and `pet-verification-docs` private with owner-scoped policies.

## Realtime
- `realtime.messages` policies form an explicit allow-list: `conversation:%`, `user:%`, `findmypet:%`, `tracker:%`, `realtime:%` (postgres_changes — RLS inherited from underlying tables).
- RESTRICTIVE policy `Restrict realtime topics to known prefixes` enforces deny-by-default.
- `tracker:<id>` and `findmypet:<uid>` topics scoped to owner only.

## Authentication
- Email/password + Apple + Google sign-in via Supabase Auth.
- HIBP password leak check enabled.
- TOTP-based 2FA available via `verify-totp` edge function.
- 13+ age gate at signup.

## Anti-scraping (anonymous denial)
- `profiles`, `store_followers`, `coupons` SELECT restricted to `authenticated` only — no anonymous data harvesting. Profiles still public to all logged-in users (social-network behavior preserved).

## Rate limiting & abuse
- `reports` capped at 10/day/user via trigger.
- `edge_rate_limits` table for per-IP/per-user throttling in edge functions.
- `crash_reports` retention: 30 days (`prune_old_crash_reports`).

## Payments
- 10/90 split enforced server-side in `process_care_payment` SECURITY DEFINER RPC.
- Local gateway scaffold (`process-payment` edge function): CPay/Halkbank/NLB stubs return `NOT_CONFIGURED` until merchant secrets are added.
- No raw card data stored — only `payment_methods` metadata (brand, last4, expiry).

## GDPR / compliance
- `delete_user_account()` + `delete-account` edge function performs full data wipe + auth.users deletion.
- Public `/legal/*` and `/support` routes for store reviewers.
- Analytics opt-out in Settings → Privacy.

## Final scan posture
- 0 critical/error findings.
- 33 SECURITY DEFINER warnings: intentional, documented as false positives.
- Remaining informational warnings (e.g. orders shipping PII) are mitigated via the safe RPC pattern above.
