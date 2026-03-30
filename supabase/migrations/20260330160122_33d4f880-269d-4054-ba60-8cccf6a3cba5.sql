-- Business profiles: only show verified (or own, or admin)
DROP POLICY IF EXISTS "Anyone can view business profiles" ON business_profiles;

CREATE POLICY "Verified or own or admin can view business profiles"
ON business_profiles FOR SELECT TO public
USING (
  is_verified = true
  OR auth.uid() = user_id
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Products: only show products from verified, non-suspended businesses (or admin/owner)
DROP POLICY IF EXISTS "Anyone can view active products" ON products;

CREATE POLICY "Products visible from verified businesses"
ON products FOR SELECT TO public
USING (
  EXISTS (
    SELECT 1 FROM business_profiles bp
    WHERE bp.id = products.business_id
      AND bp.is_verified = true
      AND bp.is_suspended = false
  )
  OR EXISTS (
    SELECT 1 FROM business_profiles bp
    WHERE bp.id = products.business_id
      AND bp.user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Care providers: only show verified (or own, or admin)
DROP POLICY IF EXISTS "Anyone can view providers" ON care_providers;

CREATE POLICY "Verified or own or admin can view providers"
ON care_providers FOR SELECT TO public
USING (
  (is_verified = true AND is_suspended = false AND is_banned = false)
  OR auth.uid() = user_id
  OR has_role(auth.uid(), 'admin'::app_role)
);