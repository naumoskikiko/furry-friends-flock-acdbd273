---
name: Security Baseline
description: Pre-launch hardening — scoped realtime + broadcast, EXECUTE locked to authenticated, in-body role checks, store_order_items_safe view, edge_rate_limits, HIBP password check, private voice-messages bucket, PetMatch listings filtered to approved.
type: feature
---

# Security Baseline (Production)

## Database
- **Realtime broadcast scoped**:
  - `realtime.messages` SELECT restricted to `conversation:<id>` (membership-verified) and `user:<uid>`.
  - `tracker:<id>` broadcasts only deliverable to the tracker's owner.
  - `findmypet:<uid>` broadcasts only deliverable to that uid.
  - `postgres_changes` on `tracker_locations`/`find_my_pet_access` still goes through table RLS.
- **Function EXECUTE lockdown**:
  - Blanket `REVOKE ALL ... FROM PUBLIC, anon` on every `public.*` function.
  - `GRANT EXECUTE ... TO authenticated` only on user-callable RPCs.
  - Trigger functions never granted directly.
- **Admin RPCs** (`admin_change_user_role`, `admin_set_find_my_pet_access`, `admin_adjust_user_credits`) are SECURITY DEFINER + body-enforced `has_role(auth.uid(), 'admin'|'owner')`.
- **PII isolation**: `store_order_items_safe` view excludes buyer name/address/phone/email.
- **PetMatch listings**: only `is_active=true AND status='approved'` are visible to other authenticated users (plus owners and admins).
- **crash_reports**: `WITH CHECK (false)` on insert for client roles; only ingest-crash edge function (service role) writes.

## Storage
- **voice-messages bucket is PRIVATE.** Read access requires either:
  1. Owning the file (folder = your user id), or
  2. Sharing a `conversation_participants` row with the uploader.
- Client uses `createSignedUrl(path, 600)` at playback time; old messages with `audio_url` field still play (legacy fallback).

## Auth
- HIBP password check enabled.
- Email confirmation required, anonymous signups disabled.
- Client-side password strength: 8+ chars, letter + digit.
- OAuth: Google + Apple (managed via Lovable Cloud).

## Edge Functions
- `process-payment`: Zod validation, `getClaims()` JWT verify, per-user rate limit (10/5min via `edge_rate_limits`).
- `ingest-crash`: anonymous-tolerant, writes via service role only.
- All functions return CORS headers on every response including errors.

## Linter Status
- 0 anon-callable SECURITY DEFINER warnings.
- 0 EXPOSED_SENSITIVE_DATA / MISSING_RLS_PROTECTION findings.
- 33 authenticated-callable SECURITY DEFINER warnings remain — all intentional, protected by in-body authorization checks. Documented & accepted.
