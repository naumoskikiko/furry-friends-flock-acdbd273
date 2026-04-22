-- ============================================================
-- 1. Hide care_providers.admin_notes from public SELECT
-- ============================================================

-- Drop existing SELECT policies on care_providers, recreate without admin_notes exposure.
-- Strategy: keep table-level SELECT for non-admin fields by leaving the row policy in place,
-- but use column-level grants to hide admin_notes from non-admin roles.

-- Revoke wide column access first
REVOKE SELECT ON public.care_providers FROM anon, authenticated;

-- Grant SELECT only on safe columns to anon and authenticated
GRANT SELECT (
  id, user_id, business_name, category, description, location, latitude, longitude,
  phone, website, photo_url, opening_hours, service_radius_km, response_time_minutes,
  emergency_available, cancellation_hours, cancellation_policy, booking_mode,
  avg_rating, total_reviews, total_bookings, is_verified, is_suspended, is_banned,
  suspended_at, banned_at, created_at, updated_at
) ON public.care_providers TO anon, authenticated;

-- Admins/owners get full access including admin_notes
GRANT SELECT ON public.care_providers TO authenticator;
-- (full SELECT including admin_notes is still gated by RLS + the admin policy below)

-- Make sure there's an admin policy granting full access (including admin_notes column)
DROP POLICY IF EXISTS "Admins can view all care provider fields" ON public.care_providers;
CREATE POLICY "Admins can view all care provider fields"
ON public.care_providers
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

-- Provider can see their own row including admin_notes (so they see moderation context if needed)
DROP POLICY IF EXISTS "Providers can view their own admin notes" ON public.care_providers;
CREATE POLICY "Providers can view their own admin notes"
ON public.care_providers
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- ============================================================
-- 2. Restrict realtime channel subscriptions
-- ============================================================

-- Drop the overly permissive realtime policy
DROP POLICY IF EXISTS "Authenticated users can use realtime" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated can use realtime" ON realtime.messages;
DROP POLICY IF EXISTS "authenticated can subscribe to realtime" ON realtime.messages;

-- Helper to determine if a topic is allowed for the current user
-- Allowed topic patterns:
--   conversation:<uuid>     → user must be a participant of that conversation
--   user:<uuid>             → must be the user's own uid
--   public:*                → public broadcast channels (notifications, presence)

CREATE POLICY "Users can subscribe to their conversation channels"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  -- Conversation channels: topic format "conversation:<uuid>"
  (
    realtime.topic() LIKE 'conversation:%'
    AND public.is_conversation_member(
      auth.uid(),
      NULLIF(split_part(realtime.topic(), ':', 2), '')::uuid
    )
  )
  OR
  -- User-specific channels: topic format "user:<uuid>"
  (
    realtime.topic() LIKE 'user:%'
    AND auth.uid()::text = split_part(realtime.topic(), ':', 2)
  )
  OR
  -- Public broadcast topics (e.g. "public:online-users")
  (realtime.topic() LIKE 'public:%')
  OR
  -- Postgres changes channels (table-level subscriptions) remain available;
  -- row visibility is still gated by per-table RLS so this is safe.
  (realtime.topic() LIKE 'realtime:%')
);

-- Allow authenticated users to broadcast/presence on the same allowed topics
CREATE POLICY "Users can broadcast on their conversation channels"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  (
    realtime.topic() LIKE 'conversation:%'
    AND public.is_conversation_member(
      auth.uid(),
      NULLIF(split_part(realtime.topic(), ':', 2), '')::uuid
    )
  )
  OR
  (
    realtime.topic() LIKE 'user:%'
    AND auth.uid()::text = split_part(realtime.topic(), ':', 2)
  )
  OR (realtime.topic() LIKE 'public:%')
);
