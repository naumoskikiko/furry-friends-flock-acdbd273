-- Allow anyone to view pets that are listed in an active petmatch listing
CREATE POLICY "Anyone can view pets in active petmatch listings"
ON public.pets
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.petmatch_listings pl
    WHERE pl.pet_id = pets.id
      AND pl.is_active = true
      AND pl.status = 'approved'
  )
);