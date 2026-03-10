
-- Care Providers
CREATE TABLE public.care_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  business_name text NOT NULL,
  description text DEFAULT '',
  category text NOT NULL DEFAULT 'veterinarian',
  location text DEFAULT '',
  latitude double precision,
  longitude double precision,
  phone text DEFAULT '',
  website text DEFAULT '',
  photo_url text,
  is_verified boolean NOT NULL DEFAULT false,
  avg_rating numeric NOT NULL DEFAULT 0,
  total_reviews integer NOT NULL DEFAULT 0,
  total_bookings integer NOT NULL DEFAULT 0,
  opening_hours jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.care_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view providers" ON public.care_providers
  FOR SELECT TO public USING (true);

CREATE POLICY "Users can insert own provider" ON public.care_providers
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own provider" ON public.care_providers
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own provider" ON public.care_providers
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Care Services
CREATE TABLE public.care_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.care_providers(id) ON DELETE CASCADE,
  service_name text NOT NULL,
  description text DEFAULT '',
  price numeric NOT NULL DEFAULT 0,
  duration integer NOT NULL DEFAULT 30,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.care_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active services" ON public.care_services
  FOR SELECT TO public USING (is_active = true);

CREATE POLICY "Providers can insert services" ON public.care_services
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM care_providers WHERE id = provider_id AND user_id = auth.uid()));

CREATE POLICY "Providers can update services" ON public.care_services
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM care_providers WHERE id = provider_id AND user_id = auth.uid()));

CREATE POLICY "Providers can delete services" ON public.care_services
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM care_providers WHERE id = provider_id AND user_id = auth.uid()));

-- Provider Availability
CREATE TABLE public.provider_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.care_providers(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time time NOT NULL DEFAULT '09:00',
  end_time time NOT NULL DEFAULT '17:00',
  is_available boolean NOT NULL DEFAULT true,
  UNIQUE(provider_id, day_of_week)
);

ALTER TABLE public.provider_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view availability" ON public.provider_availability
  FOR SELECT TO public USING (true);

CREATE POLICY "Providers can manage availability" ON public.provider_availability
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM care_providers WHERE id = provider_id AND user_id = auth.uid()));

-- Bookings
CREATE TABLE public.care_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider_id uuid NOT NULL REFERENCES public.care_providers(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.care_services(id) ON DELETE CASCADE,
  booking_date date NOT NULL,
  booking_time time NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  notes text DEFAULT '',
  conversation_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.care_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bookings" ON public.care_bookings
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM care_providers WHERE id = provider_id AND user_id = auth.uid()));

CREATE POLICY "Users can create bookings" ON public.care_bookings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Booking participants can update" ON public.care_bookings
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM care_providers WHERE id = provider_id AND user_id = auth.uid()));

-- Care Reviews
CREATE TABLE public.care_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider_id uuid NOT NULL REFERENCES public.care_providers(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.care_bookings(id) ON DELETE SET NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.care_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reviews" ON public.care_reviews
  FOR SELECT TO public USING (true);

CREATE POLICY "Users can create reviews" ON public.care_reviews
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own reviews" ON public.care_reviews
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Function to update provider avg_rating
CREATE OR REPLACE FUNCTION public.update_provider_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE care_providers SET
    avg_rating = COALESCE((SELECT AVG(rating)::numeric(3,2) FROM care_reviews WHERE provider_id = COALESCE(NEW.provider_id, OLD.provider_id)), 0),
    total_reviews = (SELECT COUNT(*) FROM care_reviews WHERE provider_id = COALESCE(NEW.provider_id, OLD.provider_id))
  WHERE id = COALESCE(NEW.provider_id, OLD.provider_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER update_provider_rating_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.care_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_provider_rating();
