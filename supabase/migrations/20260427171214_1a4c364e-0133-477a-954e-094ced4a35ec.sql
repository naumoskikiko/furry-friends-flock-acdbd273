
-- Restrict anonymous access to user-derived data (anti-scraping / anti-harvesting).
-- Profiles remain public to authenticated users (social network behavior).

-- ---------- profiles: authenticated only ----------
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by authenticated users"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- ---------- store_followers: authenticated only ----------
DROP POLICY IF EXISTS "Anyone can view store follower counts" ON public.store_followers;
CREATE POLICY "Authenticated users can view store followers"
ON public.store_followers
FOR SELECT
TO authenticated
USING (true);

-- ---------- coupons: authenticated only ----------
DROP POLICY IF EXISTS "Anyone can view active coupons" ON public.coupons;
CREATE POLICY "Authenticated users can view active coupons"
ON public.coupons
FOR SELECT
TO authenticated
USING (is_active = true);
