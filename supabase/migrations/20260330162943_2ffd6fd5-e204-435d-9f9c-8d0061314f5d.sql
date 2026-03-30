
-- Adoption listings table for shelters
CREATE TABLE public.adoption_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES care_providers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  name text NOT NULL,
  animal_type text NOT NULL DEFAULT 'dog',
  breed text DEFAULT '',
  age text DEFAULT '',
  gender text DEFAULT '',
  description text DEFAULT '',
  location text DEFAULT '',
  status text NOT NULL DEFAULT 'available',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_adoption_listings_provider ON adoption_listings(provider_id);
CREATE INDEX idx_adoption_listings_status ON adoption_listings(status);

ALTER TABLE adoption_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view available listings"
ON adoption_listings FOR SELECT TO public
USING (status IN ('available', 'adopted'));

CREATE POLICY "Shelter owners can manage own listings"
ON adoption_listings FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all listings"
ON adoption_listings FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Adoption listing images
CREATE TABLE public.adoption_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES adoption_listings(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_adoption_images_listing ON adoption_images(listing_id);

ALTER TABLE adoption_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view adoption images"
ON adoption_images FOR SELECT TO public
USING (true);

CREATE POLICY "Listing owners can manage images"
ON adoption_images FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM adoption_listings
    WHERE adoption_listings.id = adoption_images.listing_id
    AND adoption_listings.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM adoption_listings
    WHERE adoption_listings.id = adoption_images.listing_id
    AND adoption_listings.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all adoption images"
ON adoption_images FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
