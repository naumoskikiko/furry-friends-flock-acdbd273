
-- =============================================================================
-- Security re-check hardening pass 3
-- 1) Scoped SELECT on orders for store owners (so they can fulfill without admin)
-- 2) Scoped SELECT on business_visits for the business owner (own analytics only)
-- 3) Document realtime topic posture (existing policies already deny unknown topics;
--    postgres_changes inherits underlying table RLS — no new leak surface)
-- =============================================================================

-- ---------- 1) orders: store owner can see orders containing their items ------
-- Use the existing SECURITY DEFINER helper user_owns_order_items(_order_id, _user_id)
-- to avoid recursion across orders <-> order_items <-> business_profiles.
DROP POLICY IF EXISTS "Store owners can view orders for their items" ON public.orders;
CREATE POLICY "Store owners can view orders for their items"
ON public.orders
FOR SELECT
TO authenticated
USING (public.user_owns_order_items(id, auth.uid()));

-- ---------- 2) business_visits: business owner can read own analytics ---------
DROP POLICY IF EXISTS "Business owners can view their own visit analytics" ON public.business_visits;
CREATE POLICY "Business owners can view their own visit analytics"
ON public.business_visits
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.business_profiles bp
    WHERE bp.id = business_visits.business_id
      AND bp.user_id = auth.uid()
  )
);

-- ---------- 3) Realtime topic anchor: deny topics outside the known patterns --
-- Existing SELECT policies are PERMISSIVE OR-ed. Because none of them match
-- arbitrary topic names, unknown topics are already denied. We add an explicit
-- catch-all permissive policy that ONLY matches the known-good prefixes, making
-- our intent auditable. (No deny policies — Postgres RLS uses OR over PERMISSIVE,
-- so we simply ensure no over-broad policy exists.)
-- The four existing policies (conversation:%, user:%, findmypet:%, tracker:%)
-- already implement the correct allow-list. No-op here, kept for documentation.

-- Verify expected publication membership unchanged.
-- (Tables: posts, post_likes, post_comments, notifications, conversations,
--  conversation_participants, boost_pricing, post_tags, find_my_pet_access,
--  tracker_locations, messages — all protected by table-level RLS which
--  postgres_changes subscribers inherit.)

COMMENT ON POLICY "Store owners can view orders for their items" ON public.orders
  IS 'Allows store owners to read full shipping details for orders that include their products, enabling fulfillment without admin access.';

COMMENT ON POLICY "Business owners can view their own visit analytics" ON public.business_visits
  IS 'Allows business owners to read visit analytics scoped to their own business_profile.';
