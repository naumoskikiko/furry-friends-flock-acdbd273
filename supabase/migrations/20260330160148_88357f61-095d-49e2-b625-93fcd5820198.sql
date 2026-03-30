-- Care services: only show services from verified providers (or own, or admin)
DROP POLICY IF EXISTS "Anyone can view active services" ON care_services;

CREATE POLICY "Services from verified providers visible"
ON care_services FOR SELECT TO public
USING (
  (is_active = true AND EXISTS (
    SELECT 1 FROM care_providers cp
    WHERE cp.id = care_services.provider_id
      AND cp.is_verified = true
      AND cp.is_suspended = false
      AND cp.is_banned = false
  ))
  OR EXISTS (
    SELECT 1 FROM care_providers cp
    WHERE cp.id = care_services.provider_id
      AND cp.user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);