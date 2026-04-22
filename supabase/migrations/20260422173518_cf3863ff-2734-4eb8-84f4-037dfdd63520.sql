-- Audit log for role changes
CREATE TABLE IF NOT EXISTS public.role_change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid NOT NULL,
  changed_by uuid NOT NULL,
  from_role text,
  to_role text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.role_change_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and owners can view role change log"
ON public.role_change_log FOR SELECT
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

-- Secure RPC: only admins/owners can change roles, never their own.
-- Auto-creates business/provider profile shells on first switch.
CREATE OR REPLACE FUNCTION public.admin_change_user_role(
  _target_user_id uuid,
  _new_role text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller uuid := auth.uid();
  _from_role text;
  _full_name text;
BEGIN
  IF _caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT (public.has_role(_caller, 'admin') OR public.has_role(_caller, 'owner')) THEN
    RAISE EXCEPTION 'Only admins can change user roles';
  END IF;

  IF _caller = _target_user_id THEN
    RAISE EXCEPTION 'Admins cannot change their own role';
  END IF;

  IF _new_role NOT IN ('user', 'provider', 'business') THEN
    RAISE EXCEPTION 'Invalid role: %', _new_role;
  END IF;

  -- Don't downgrade owners or admins through this RPC; use Role Management for elevated roles
  IF public.has_role(_target_user_id, 'owner') OR public.has_role(_target_user_id, 'admin') THEN
    RAISE EXCEPTION 'Cannot change profile type of admin or owner accounts';
  END IF;

  SELECT role, full_name INTO _from_role, _full_name
  FROM public.profiles WHERE user_id = _target_user_id;

  IF _from_role IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  -- Update the profile role
  UPDATE public.profiles
  SET role = _new_role::user_role_type, updated_at = now()
  WHERE user_id = _target_user_id;

  -- Auto-create shells when promoting (data is preserved on demote)
  IF _new_role = 'business' THEN
    INSERT INTO public.business_profiles (user_id, business_name)
    VALUES (_target_user_id, COALESCE(NULLIF(_full_name, ''), 'My Business'))
    ON CONFLICT DO NOTHING;
  ELSIF _new_role = 'provider' THEN
    INSERT INTO public.care_providers (user_id, business_name)
    VALUES (_target_user_id, COALESCE(NULLIF(_full_name, ''), 'My Service'))
    ON CONFLICT DO NOTHING;
  END IF;

  -- Audit log
  INSERT INTO public.role_change_log (target_user_id, changed_by, from_role, to_role)
  VALUES (_target_user_id, _caller, _from_role, _new_role);

  -- Notify the user
  INSERT INTO public.notifications (user_id, actor_id, type, entity_type, entity_id, message)
  VALUES (
    _target_user_id,
    _caller,
    'role_change',
    'profile',
    _target_user_id,
    '🔁 Your account type was changed to ' || _new_role
  );
END;
$$;

-- Add unique constraints to prevent duplicate shells on repeated promotions
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'business_profiles_user_id_unique'
  ) THEN
    ALTER TABLE public.business_profiles ADD CONSTRAINT business_profiles_user_id_unique UNIQUE (user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'care_providers_user_id_unique'
  ) THEN
    ALTER TABLE public.care_providers ADD CONSTRAINT care_providers_user_id_unique UNIQUE (user_id);
  END IF;
END $$;