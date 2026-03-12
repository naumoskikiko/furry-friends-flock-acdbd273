
-- Coupons table
CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  code text NOT NULL,
  discount_type text NOT NULL DEFAULT 'percentage',
  discount_value numeric NOT NULL DEFAULT 0,
  min_order_amount numeric NOT NULL DEFAULT 0,
  max_uses integer DEFAULT NULL,
  used_count integer NOT NULL DEFAULT 0,
  expires_at timestamp with time zone DEFAULT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(business_id, code)
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active coupons" ON public.coupons FOR SELECT TO public USING (is_active = true);
CREATE POLICY "Business owners can manage own coupons" ON public.coupons FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM business_profiles bp WHERE bp.id = coupons.business_id AND bp.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM business_profiles bp WHERE bp.id = coupons.business_id AND bp.user_id = auth.uid()));
CREATE POLICY "Admins can manage all coupons" ON public.coupons FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Product variants table
CREATE TABLE public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_label text NOT NULL DEFAULT 'Size',
  variant_value text NOT NULL,
  price_modifier numeric NOT NULL DEFAULT 0,
  stock integer DEFAULT NULL,
  image_url text DEFAULT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view product variants" ON public.product_variants FOR SELECT TO public USING (true);
CREATE POLICY "Business owners can manage variants" ON public.product_variants FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM products p JOIN business_profiles bp ON bp.id = p.business_id WHERE p.id = product_variants.product_id AND bp.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM products p JOIN business_profiles bp ON bp.id = p.business_id WHERE p.id = product_variants.product_id AND bp.user_id = auth.uid()));

-- Store followers table
CREATE TABLE public.store_followers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  store_id uuid NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, store_id)
);

ALTER TABLE public.store_followers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view store follower counts" ON public.store_followers FOR SELECT TO public USING (true);
CREATE POLICY "Users can follow stores" ON public.store_followers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unfollow stores" ON public.store_followers FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Add delivery columns to business_profiles
ALTER TABLE public.business_profiles
  ADD COLUMN IF NOT EXISTS delivery_available boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pickup_available boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS delivery_radius_km integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS delivery_fee numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS free_delivery_above numeric DEFAULT NULL;

-- Add is_featured to products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;
