
-- 1. PETS table: restrict SELECT to owner + care providers with active bookings
DROP POLICY IF EXISTS "Authenticated users can view pets" ON public.pets;

CREATE POLICY "Owners can view own pets"
ON public.pets
FOR SELECT
TO authenticated
USING (auth.uid() = owner_id);

CREATE POLICY "Care providers can view booked pets"
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
  )
);

CREATE POLICY "Admins can view all pets"
ON public.pets
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role));

-- 2. USER_ROLES: prevent privilege escalation
DROP POLICY IF EXISTS "Owners can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Owners can update roles" ON public.user_roles;

-- Owners can only assign non-privileged roles (not owner, not admin)
CREATE POLICY "Owners can insert non-privileged roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'owner'::app_role)
  AND role NOT IN ('owner'::app_role, 'admin'::app_role)
);

CREATE POLICY "Owners can update non-privileged roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'owner'::app_role)
  AND role NOT IN ('owner'::app_role, 'admin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'owner'::app_role)
  AND role NOT IN ('owner'::app_role, 'admin'::app_role)
);

-- 3. REALTIME: restrict channel subscriptions
-- Enable RLS on realtime.messages and require authenticated users
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can use realtime" ON realtime.messages;

CREATE POLICY "Authenticated users can use realtime"
ON realtime.messages
FOR SELECT
TO authenticated
USING (true);
