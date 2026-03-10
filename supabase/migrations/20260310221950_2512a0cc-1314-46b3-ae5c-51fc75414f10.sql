
-- Add pet_id to care_bookings so users can attach which pet the appointment is for
ALTER TABLE public.care_bookings ADD COLUMN pet_id uuid REFERENCES public.pets(id) ON DELETE SET NULL;

-- Add provider gallery table
CREATE TABLE public.provider_gallery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.care_providers(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  caption text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.provider_gallery ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view gallery" ON public.provider_gallery
  FOR SELECT TO public USING (true);

CREATE POLICY "Providers can manage gallery" ON public.provider_gallery
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM care_providers WHERE care_providers.id = provider_gallery.provider_id AND care_providers.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM care_providers WHERE care_providers.id = provider_gallery.provider_id AND care_providers.user_id = auth.uid()));

-- Add cancellation policy fields to care_providers
ALTER TABLE public.care_providers ADD COLUMN cancellation_hours integer DEFAULT 24;
ALTER TABLE public.care_providers ADD COLUMN cancellation_policy text DEFAULT 'Free cancellation up to 24 hours before appointment';

-- Add emergency_available flag to care_providers
ALTER TABLE public.care_providers ADD COLUMN emergency_available boolean DEFAULT false;

-- Add response_time_minutes to care_providers (avg response time)
ALTER TABLE public.care_providers ADD COLUMN response_time_minutes integer DEFAULT null;
