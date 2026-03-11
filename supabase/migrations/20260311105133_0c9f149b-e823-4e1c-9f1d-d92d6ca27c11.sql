
-- Provider verifications table
CREATE TABLE public.provider_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.care_providers(id) ON DELETE CASCADE,
  verification_type text NOT NULL DEFAULT 'license',
  document_url text NOT NULL,
  document_name text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewer_notes text
);

ALTER TABLE public.provider_verifications ENABLE ROW LEVEL SECURITY;

-- Providers can view their own verifications
CREATE POLICY "Providers can view own verifications"
  ON public.provider_verifications FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM care_providers WHERE care_providers.id = provider_verifications.provider_id AND care_providers.user_id = auth.uid()
  ));

-- Providers can submit verifications
CREATE POLICY "Providers can submit verifications"
  ON public.provider_verifications FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM care_providers WHERE care_providers.id = provider_verifications.provider_id AND care_providers.user_id = auth.uid()
  ));

-- Providers can delete pending verifications
CREATE POLICY "Providers can delete pending verifications"
  ON public.provider_verifications FOR DELETE
  TO authenticated
  USING (
    status = 'pending' AND EXISTS (
      SELECT 1 FROM care_providers WHERE care_providers.id = provider_verifications.provider_id AND care_providers.user_id = auth.uid()
    )
  );

-- Admins can view all verifications
CREATE POLICY "Admins can view all verifications"
  ON public.provider_verifications FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update verifications
CREATE POLICY "Admins can update verifications"
  ON public.provider_verifications FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Add service_radius to care_providers
ALTER TABLE public.care_providers ADD COLUMN IF NOT EXISTS service_radius_km integer DEFAULT NULL;
ALTER TABLE public.care_providers ADD COLUMN IF NOT EXISTS booking_mode text NOT NULL DEFAULT 'instant';

-- Storage bucket for verification documents
INSERT INTO storage.buckets (id, name, public) VALUES ('verification-docs', 'verification-docs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS for verification docs
CREATE POLICY "Providers can upload verification docs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'verification-docs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Providers can view own verification docs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'verification-docs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Admins can view all verification docs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'verification-docs' AND public.has_role(auth.uid(), 'admin'));
