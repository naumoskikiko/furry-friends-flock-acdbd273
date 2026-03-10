
-- Create safe_zones table
CREATE TABLE public.safe_zones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tracker_id UUID NOT NULL REFERENCES public.pet_trackers(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Home',
  center_lat DOUBLE PRECISION NOT NULL,
  center_lng DOUBLE PRECISION NOT NULL,
  radius INTEGER NOT NULL DEFAULT 500,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.safe_zones ENABLE ROW LEVEL SECURITY;

-- Only tracker owner can manage safe zones
CREATE POLICY "Users can view own safe zones" ON public.safe_zones
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM pet_trackers WHERE pet_trackers.id = safe_zones.tracker_id AND pet_trackers.user_id = auth.uid()));

CREATE POLICY "Users can insert own safe zones" ON public.safe_zones
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM pet_trackers WHERE pet_trackers.id = safe_zones.tracker_id AND pet_trackers.user_id = auth.uid()));

CREATE POLICY "Users can update own safe zones" ON public.safe_zones
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM pet_trackers WHERE pet_trackers.id = safe_zones.tracker_id AND pet_trackers.user_id = auth.uid()));

CREATE POLICY "Users can delete own safe zones" ON public.safe_zones
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM pet_trackers WHERE pet_trackers.id = safe_zones.tracker_id AND pet_trackers.user_id = auth.uid()));
