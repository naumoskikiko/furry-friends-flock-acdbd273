
-- Product reviews table
CREATE TABLE public.product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  rating integer NOT NULL,
  comment text DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(product_id, user_id)
);

ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view product reviews" ON public.product_reviews
  FOR SELECT TO public USING (true);

CREATE POLICY "Users can create reviews" ON public.product_reviews
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reviews" ON public.product_reviews
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reviews" ON public.product_reviews
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Product wishlist table
CREATE TABLE public.product_wishlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(product_id, user_id)
);

ALTER TABLE public.product_wishlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wishlist" ON public.product_wishlist
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can add to wishlist" ON public.product_wishlist
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove from wishlist" ON public.product_wishlist
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
