
-- Create product_images table for multiple product images
CREATE TABLE public.product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  image_url text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

-- Anyone can view product images
CREATE POLICY "Anyone can view product images"
  ON public.product_images FOR SELECT
  TO public
  USING (true);

-- Business owners can insert product images
CREATE POLICY "Business owners can insert product images"
  ON public.product_images FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.products p
      JOIN public.business_profiles bp ON bp.id = p.business_id
      WHERE p.id = product_images.product_id
        AND bp.user_id = auth.uid()
    )
  );

-- Business owners can delete product images
CREATE POLICY "Business owners can delete product images"
  ON public.product_images FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      JOIN public.business_profiles bp ON bp.id = p.business_id
      WHERE p.id = product_images.product_id
        AND bp.user_id = auth.uid()
    )
  );

-- Admins can manage product images
CREATE POLICY "Admins can manage product images"
  ON public.product_images FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
