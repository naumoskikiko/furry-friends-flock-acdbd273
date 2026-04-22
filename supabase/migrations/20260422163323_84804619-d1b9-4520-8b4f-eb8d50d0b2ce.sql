CREATE OR REPLACE FUNCTION public.refresh_pet_is_verified()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _pet_id uuid;
  _approved_count int;
BEGIN
  _pet_id := COALESCE(NEW.pet_id, OLD.pet_id);
  SELECT COUNT(DISTINCT verification_type) INTO _approved_count
  FROM public.pet_verifications
  WHERE pet_id = _pet_id
    AND status = 'verified'
    AND verification_type IN ('vaccination', 'health_certificate', 'ownership_proof');
  UPDATE public.pets
  SET is_verified = (_approved_count >= 3)
  WHERE id = _pet_id;
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Recompute existing pets so the new rule takes effect immediately
UPDATE public.pets p
SET is_verified = (
  SELECT COUNT(DISTINCT verification_type) >= 3
  FROM public.pet_verifications
  WHERE pet_id = p.id
    AND status = 'verified'
    AND verification_type IN ('vaccination', 'health_certificate', 'ownership_proof')
);