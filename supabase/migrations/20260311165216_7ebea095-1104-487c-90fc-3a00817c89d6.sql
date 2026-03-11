
-- Create boosts table
CREATE TABLE public.boosts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('product', 'store', 'provider')),
  target_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  start_date timestamp with time zone NOT NULL DEFAULT now(),
  end_date timestamp with time zone NOT NULL,
  price_paid numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.boosts ENABLE ROW LEVEL SECURITY;

-- Anyone can view active boosts (needed to show badges)
CREATE POLICY "Anyone can view active boosts"
  ON public.boosts FOR SELECT
  TO public
  USING (true);

-- Authenticated users can create boosts for their own items
CREATE POLICY "Users can create own boosts"
  ON public.boosts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

-- Users can update own boosts
CREATE POLICY "Users can update own boosts"
  ON public.boosts FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id);

-- Admins can manage all boosts
CREATE POLICY "Admins can manage all boosts"
  ON public.boosts FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create boost_pricing table for admin-configurable prices
CREATE TABLE public.boost_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  boost_type text NOT NULL CHECK (boost_type IN ('product', 'store', 'provider')),
  duration_hours integer NOT NULL,
  duration_label text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (boost_type, duration_hours)
);

ALTER TABLE public.boost_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view boost pricing"
  ON public.boost_pricing FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins can manage boost pricing"
  ON public.boost_pricing FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default pricing
INSERT INTO public.boost_pricing (boost_type, duration_hours, duration_label, price) VALUES
  ('product', 24, '24 hours', 300),
  ('product', 72, '3 days', 700),
  ('product', 168, '7 days', 1200),
  ('product', 720, '30 days', 3500),
  ('store', 24, '24 hours', 500),
  ('store', 72, '3 days', 1000),
  ('store', 168, '7 days', 1800),
  ('store', 720, '30 days', 5000),
  ('provider', 24, '24 hours', 250),
  ('provider', 72, '3 days', 600),
  ('provider', 168, '7 days', 900),
  ('provider', 720, '30 days', 2500);
