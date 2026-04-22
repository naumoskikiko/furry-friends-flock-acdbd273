-- Audit log for admin credit adjustments
CREATE TABLE IF NOT EXISTS public.credit_admin_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid NOT NULL,
  changed_by uuid NOT NULL,
  amount numeric NOT NULL,
  previous_balance numeric NOT NULL,
  new_balance numeric NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.credit_admin_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and owners can view credit admin log"
ON public.credit_admin_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

-- Secure RPC: admin adjusts user credits
CREATE OR REPLACE FUNCTION public.admin_adjust_user_credits(
  _target_user_id uuid,
  _amount numeric,
  _reason text DEFAULT NULL
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller uuid := auth.uid();
  _prev numeric;
  _new numeric;
BEGIN
  IF _caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT (public.has_role(_caller, 'admin') OR public.has_role(_caller, 'owner')) THEN
    RAISE EXCEPTION 'Only admins can adjust credits';
  END IF;

  IF _amount = 0 THEN
    RAISE EXCEPTION 'Amount cannot be zero';
  END IF;

  -- Ensure credits row exists
  INSERT INTO public.credits (user_id, balance)
  VALUES (_target_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT balance INTO _prev FROM public.credits WHERE user_id = _target_user_id FOR UPDATE;
  _new := _prev + _amount;

  IF _new < 0 THEN
    RAISE EXCEPTION 'Resulting balance cannot be negative (current: %, change: %)', _prev, _amount;
  END IF;

  UPDATE public.credits
  SET balance = _new, updated_at = now()
  WHERE user_id = _target_user_id;

  INSERT INTO public.credit_transactions (user_id, amount, type, description)
  VALUES (
    _target_user_id,
    _amount,
    CASE WHEN _amount > 0 THEN 'admin_grant' ELSE 'admin_deduct' END,
    COALESCE(_reason, CASE WHEN _amount > 0 THEN 'Admin granted credits' ELSE 'Admin deducted credits' END)
  );

  INSERT INTO public.credit_admin_log (target_user_id, changed_by, amount, previous_balance, new_balance, reason)
  VALUES (_target_user_id, _caller, _amount, _prev, _new, _reason);

  INSERT INTO public.notifications (user_id, actor_id, type, entity_type, entity_id, message)
  VALUES (
    _target_user_id,
    _caller,
    'credit_adjustment',
    'credits',
    _target_user_id,
    CASE
      WHEN _amount > 0 THEN '🎁 You received ' || _amount || ' PetKeep Credits from an admin'
      ELSE '⚠️ ' || abs(_amount) || ' PetKeep Credits were deducted by an admin'
    END
  );

  RETURN _new;
END;
$$;