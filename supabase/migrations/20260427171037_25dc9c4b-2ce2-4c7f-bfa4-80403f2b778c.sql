
-- =============================================================================
-- Security re-check hardening pass 4 — critical fixes
-- =============================================================================

-- ---------- 1) PRIVILEGE ESCALATION FIX: lock down admin role assignment -----
-- Replace the over-broad "Admins can manage roles" ALL policy with scoped
-- policies that prevent admins from granting admin/owner roles.
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

-- Admins may READ all role rows (for moderation views)
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

-- Admins may INSERT only non-privileged roles (never admin/owner)
CREATE POLICY "Admins can insert non-privileged roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  AND role <> ALL (ARRAY['owner'::app_role, 'admin'::app_role])
);

-- Admins may UPDATE only non-privileged roles (and cannot promote to admin/owner)
CREATE POLICY "Admins can update non-privileged roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  AND role <> ALL (ARRAY['owner'::app_role, 'admin'::app_role])
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  AND role <> ALL (ARRAY['owner'::app_role, 'admin'::app_role])
);

-- Admins may DELETE only non-privileged roles
CREATE POLICY "Admins can delete non-privileged roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  AND role <> ALL (ARRAY['owner'::app_role, 'admin'::app_role])
);

-- ---------- 2) ORDER SHIPPING PII: replace broad policy with safe view -------
DROP POLICY IF EXISTS "Store owners can view orders for their items" ON public.orders;

-- Safe view: store owners see only non-PII fulfillment fields per order they have items in.
-- security_invoker = true ensures the caller's RLS still applies on join targets;
-- because public.orders has no policy granting store-owner SELECT, we expose this
-- view as SECURITY DEFINER via a function-backed view to whitelist columns.
CREATE OR REPLACE VIEW public.store_orders_safe
WITH (security_invoker = false) AS
SELECT
  o.id,
  o.buyer_id,
  o.shipping_name,        -- needed to address packages
  o.shipping_city,        -- needed for shipping zone
  o.shipping_country,
  o.status,
  o.total_price,
  o.created_at,
  o.updated_at
FROM public.orders o
WHERE EXISTS (
  SELECT 1
  FROM public.order_items oi
  JOIN public.business_profiles bp ON bp.id = oi.store_id
  WHERE oi.order_id = o.id
    AND bp.user_id = auth.uid()
);

REVOKE ALL ON public.store_orders_safe FROM PUBLIC, anon;
GRANT SELECT ON public.store_orders_safe TO authenticated;

COMMENT ON VIEW public.store_orders_safe IS
  'Store-owner safe projection of orders containing their items. Excludes shipping_phone, shipping_address, and shipping_postal_code (PII). Admins/owners and buyers continue to use public.orders directly under their own RLS.';

-- ---------- 3) CARE PROVIDERS: scope pet access to active bookings only ------
DROP POLICY IF EXISTS "Care providers can view booked pets" ON public.pets;

CREATE POLICY "Care providers can view pets for active bookings"
ON public.pets
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.care_bookings cb
    JOIN public.care_providers cp ON cp.id = cb.provider_id
    WHERE cb.pet_id = pets.id
      AND cp.user_id = auth.uid()
      AND cb.status IN ('confirmed', 'pending', 'in_progress')
      AND (
        cb.booking_date IS NULL
        OR cb.booking_date >= (CURRENT_DATE - INTERVAL '7 days')
      )
  )
);

COMMENT ON POLICY "Care providers can view pets for active bookings" ON public.pets IS
  'Providers can read pet medical/emergency info only while a booking is active or recent (within 7 days), preventing permanent access from historical bookings.';

-- ---------- 4) REALTIME TOPIC ANCHOR: make allow-list intent explicit --------
-- The four existing PERMISSIVE policies already form an allow-list. We add a
-- single RESTRICTIVE policy that requires the topic to match one of the known
-- prefixes, making "deny by default" enforced at the policy layer.
DROP POLICY IF EXISTS "Restrict realtime topics to known prefixes" ON realtime.messages;
CREATE POLICY "Restrict realtime topics to known prefixes"
ON realtime.messages
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (
  realtime.topic() LIKE 'conversation:%'
  OR realtime.topic() LIKE 'user:%'
  OR realtime.topic() LIKE 'findmypet:%'
  OR realtime.topic() LIKE 'tracker:%'
  OR realtime.topic() LIKE 'realtime:%'  -- internal postgres_changes topics (RLS-filtered downstream)
);
