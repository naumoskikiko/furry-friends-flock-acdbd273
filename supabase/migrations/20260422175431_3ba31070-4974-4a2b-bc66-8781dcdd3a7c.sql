-- Per-user FindMyPet feature access
CREATE TABLE IF NOT EXISTS public.find_my_pet_access (
  user_id uuid PRIMARY KEY,
  tracking_enabled boolean NOT NULL DEFAULT false,
  chip_enabled boolean NOT NULL DEFAULT false,
  tracking_enabled_until timestamptz,
  chip_enabled_until timestamptz,
  last_reason text,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.find_my_pet_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their own findmypet access"
ON public.find_my_pet_access
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'owner')
);

-- Only admins/owners can insert/update; users cannot self-modify
CREATE POLICY "Admins manage findmypet access"
ON public.find_my_pet_access
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

-- Audit log
CREATE TABLE IF NOT EXISTS public.find_my_pet_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid NOT NULL,
  changed_by uuid NOT NULL,
  tracking_enabled boolean NOT NULL,
  chip_enabled boolean NOT NULL,
  tracking_enabled_until timestamptz,
  chip_enabled_until timestamptz,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.find_my_pet_access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read findmypet access log"
ON public.find_my_pet_access_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

-- Effective access checks (respect expiry)
CREATE OR REPLACE FUNCTION public.findmypet_tracking_allowed(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT tracking_enabled
      AND (tracking_enabled_until IS NULL OR tracking_enabled_until > now())
    FROM public.find_my_pet_access
    WHERE user_id = _user_id
  ), false)
$$;

CREATE OR REPLACE FUNCTION public.findmypet_chip_allowed(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT chip_enabled
      AND (chip_enabled_until IS NULL OR chip_enabled_until > now())
    FROM public.find_my_pet_access
    WHERE user_id = _user_id
  ), false)
$$;

-- Admin RPC to set access
CREATE OR REPLACE FUNCTION public.admin_set_find_my_pet_access(
  _target_user_id uuid,
  _tracking_enabled boolean,
  _chip_enabled boolean,
  _tracking_until timestamptz DEFAULT NULL,
  _chip_until timestamptz DEFAULT NULL,
  _reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller uuid := auth.uid();
BEGIN
  IF _caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT (public.has_role(_caller, 'admin') OR public.has_role(_caller, 'owner')) THEN
    RAISE EXCEPTION 'Only admins can manage FindMyPet access';
  END IF;

  INSERT INTO public.find_my_pet_access (
    user_id, tracking_enabled, chip_enabled,
    tracking_enabled_until, chip_enabled_until,
    last_reason, updated_by, updated_at
  )
  VALUES (
    _target_user_id, _tracking_enabled, _chip_enabled,
    _tracking_until, _chip_until,
    _reason, _caller, now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    tracking_enabled = EXCLUDED.tracking_enabled,
    chip_enabled = EXCLUDED.chip_enabled,
    tracking_enabled_until = EXCLUDED.tracking_enabled_until,
    chip_enabled_until = EXCLUDED.chip_enabled_until,
    last_reason = EXCLUDED.last_reason,
    updated_by = EXCLUDED.updated_by,
    updated_at = now();

  INSERT INTO public.find_my_pet_access_log (
    target_user_id, changed_by, tracking_enabled, chip_enabled,
    tracking_enabled_until, chip_enabled_until, reason
  )
  VALUES (
    _target_user_id, _caller, _tracking_enabled, _chip_enabled,
    _tracking_until, _chip_until, _reason
  );

  -- Notify user
  INSERT INTO public.notifications (user_id, actor_id, type, entity_type, entity_id, message)
  VALUES (
    _target_user_id,
    _caller,
    'findmypet_access',
    'access',
    _target_user_id,
    '🐾 Your FindMyPet access was updated — Tracking: ' ||
      CASE WHEN _tracking_enabled THEN 'ON' ELSE 'OFF' END ||
      ', Chip: ' || CASE WHEN _chip_enabled THEN 'ON' ELSE 'OFF' END
  );
END;
$$;

-- Realtime
ALTER TABLE public.find_my_pet_access REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.find_my_pet_access;