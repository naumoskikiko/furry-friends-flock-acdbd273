
-- Create business_profiles table
CREATE TABLE public.business_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  business_name text NOT NULL,
  logo_url text,
  banner_url text,
  description text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  website text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'pet_shop',
  avg_rating numeric NOT NULL DEFAULT 0,
  total_reviews integer NOT NULL DEFAULT 0,
  is_verified boolean NOT NULL DEFAULT false,
  is_suspended boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create products table
CREATE TABLE public.products (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  price numeric NOT NULL DEFAULT 0,
  image_url text,
  category text NOT NULL DEFAULT 'general',
  is_active boolean NOT NULL DEFAULT true,
  stock integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create product-images storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- RLS for business_profiles
ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view business profiles"
  ON public.business_profiles FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can create own business profile"
  ON public.business_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own business profile"
  ON public.business_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can update any business profile"
  ON public.business_profiles FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete any business profile"
  ON public.business_profiles FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can delete own business profile"
  ON public.business_profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS for products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active products"
  ON public.products FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Business owners can insert products"
  ON public.products FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.business_profiles
    WHERE id = products.business_id AND user_id = auth.uid()
  ));

CREATE POLICY "Business owners can update products"
  ON public.products FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.business_profiles
    WHERE id = products.business_id AND user_id = auth.uid()
  ));

CREATE POLICY "Business owners can delete products"
  ON public.products FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.business_profiles
    WHERE id = products.business_id AND user_id = auth.uid()
  ));

CREATE POLICY "Admins can update any product"
  ON public.products FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete any product"
  ON public.products FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Storage policy for product-images
CREATE POLICY "Anyone can view product images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated users can upload product images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'product-images');
