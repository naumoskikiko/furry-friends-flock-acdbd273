
-- 1. Add is_verified flag to pets
ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false;

-- 2. Trigger: update pets.is_verified whenever a verification row is inserted/updated/deleted.
--    Pet is verified if it has AT LEAST ONE approved document.
CREATE OR REPLACE FUNCTION public.refresh_pet_is_verified()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _pet_id uuid;
  _has_verified boolean;
BEGIN
  _pet_id := COALESCE(NEW.pet_id, OLD.pet_id);
  SELECT EXISTS (
    SELECT 1 FROM public.pet_verifications
    WHERE pet_id = _pet_id AND status = 'verified'
  ) INTO _has_verified;
  UPDATE public.pets SET is_verified = _has_verified WHERE id = _pet_id;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_refresh_pet_is_verified ON public.pet_verifications;
CREATE TRIGGER trg_refresh_pet_is_verified
AFTER INSERT OR UPDATE OF status OR DELETE ON public.pet_verifications
FOR EACH ROW EXECUTE FUNCTION public.refresh_pet_is_verified();

-- 3. Trigger: notify owner when an admin reviews their document
CREATE OR REPLACE FUNCTION public.notify_pet_verification_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _pet_name text;
  _doc_label text;
  _msg text;
BEGIN
  -- Only fire when status actually changes to verified or rejected
  IF NEW.status = OLD.status OR NEW.status NOT IN ('verified', 'rejected') THEN
    RETURN NEW;
  END IF;

  SELECT name INTO _pet_name FROM public.pets WHERE id = NEW.pet_id;
  _doc_label := CASE NEW.verification_type
    WHEN 'vaccination' THEN 'vaccination proof'
    WHEN 'neutered' THEN 'neutered/spayed proof'
    WHEN 'health_certificate' THEN 'health certificate'
    WHEN 'pet_passport' THEN 'pet passport'
    WHEN 'ownership_proof' THEN 'ownership proof'
    ELSE NEW.verification_type
  END;

  IF NEW.status = 'verified' THEN
    _msg := '✅ Your ' || _doc_label || ' for ' || COALESCE(_pet_name, 'your pet') || ' has been verified';
  ELSE
    _msg := '❌ Your ' || _doc_label || ' for ' || COALESCE(_pet_name, 'your pet') || ' was rejected'
            || COALESCE(' — ' || NEW.reviewer_notes, '');
  END IF;

  INSERT INTO public.notifications (user_id, actor_id, type, entity_type, entity_id, message)
  VALUES (
    NEW.owner_id,
    COALESCE(NEW.reviewed_by, NEW.owner_id),
    'pet_verification',
    'pet',
    NEW.pet_id,
    _msg
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_pet_verification_review ON public.pet_verifications;
CREATE TRIGGER trg_notify_pet_verification_review
AFTER UPDATE ON public.pet_verifications
FOR EACH ROW EXECUTE FUNCTION public.notify_pet_verification_review();

-- 4. Backfill is_verified for existing pets
UPDATE public.pets p
SET is_verified = EXISTS (
  SELECT 1 FROM public.pet_verifications v
  WHERE v.pet_id = p.id AND v.status = 'verified'
);
