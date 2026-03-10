
-- Pet subscriptions table (mock for now)
CREATE TABLE public.pet_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan text NOT NULL DEFAULT 'findmypet_premium',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days')
);

ALTER TABLE public.pet_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions" ON public.pet_subscriptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions" ON public.pet_subscriptions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions" ON public.pet_subscriptions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Pet trackers table
CREATE TABLE public.pet_trackers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  pet_name text NOT NULL,
  pet_type text NOT NULL DEFAULT 'dog',
  breed text DEFAULT '',
  tracker_device_id text NOT NULL UNIQUE,
  pet_photo text,
  is_lost boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pet_trackers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trackers" ON public.pet_trackers
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trackers" ON public.pet_trackers
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trackers" ON public.pet_trackers
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own trackers" ON public.pet_trackers
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Anyone can see lost pet trackers (for community help)
CREATE POLICY "Anyone can view lost pets" ON public.pet_trackers
  FOR SELECT TO authenticated USING (is_lost = true);

-- Tracker locations table
CREATE TABLE public.tracker_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tracker_id uuid NOT NULL REFERENCES public.pet_trackers(id) ON DELETE CASCADE,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  battery_level integer DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tracker_locations ENABLE ROW LEVEL SECURITY;

-- Users can view locations of their own trackers
CREATE POLICY "Users can view own tracker locations" ON public.tracker_locations
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.pet_trackers
      WHERE pet_trackers.id = tracker_locations.tracker_id
        AND pet_trackers.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert tracker locations" ON public.tracker_locations
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pet_trackers
      WHERE pet_trackers.id = tracker_locations.tracker_id
        AND pet_trackers.user_id = auth.uid()
    )
  );

-- Enable realtime for tracker locations
ALTER PUBLICATION supabase_realtime ADD TABLE public.tracker_locations;
